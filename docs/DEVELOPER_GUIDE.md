# pod-PDF: Developer & Extension Guide

This guide provides step-by-step instructions for running **pod-PDF** locally, deploying it with Docker Compose, and extending the codebase with new features, plugins, storage providers, and message queue drivers.

---

## 1. Quickstart: Running Locally

### Prerequisites
- Node.js 18+ (`node -v` >= 18.0.0)
- npm 9+ (`npm -v` >= 9.0.0)

### Step 1: Install Dependencies
```bash
# Install backend dependencies
npm install

# Install GUI dependencies & build frontend bundle
npm run build:gui
```

### Step 2: Configure Environment
Copy the example environment file:
```bash
cp .env.example .env
```
Default `.env` settings will run completely offline using local disk storage (`STORAGE_TYPE=local`) and in-memory queue (`QUEUE_DRIVER=memory`).

### Step 3: Build & Start
```bash
# Build backend bundle
npm run build

# Start the microservice
npm start
```

You will see:
```text
==================================================================
  📦 pod-PDF Enterprise Label & Multi-Page PDF Microservice
  🌐 REST API:    http://localhost:3000/api/v1
  🎨 GUI Designer: http://localhost:3000/designer
  🩺 Healthcheck:  http://localhost:3000/api/v1/health
  💾 Storage:      LOCAL
  ⚡ Queue Driver: MEMORY
==================================================================
```

### Step 4: Run Tests
```bash
# Run all unit and integration tests
npm test

# Run tests with code coverage report
npm run test:coverage
```

---

## 2. Running with Docker & Docker Compose

### Starting the Full Stack
```bash
docker compose up --build
```

This spins up:
- `pod-pdf-service`: The microservice on port `3000`
- `pod-pdf-localstack`: LocalStack on port `4566` (providing S3, SQS, SNS emulation)

### Starting with Apache Kafka
To run with Kafka and Zookeeper enabled:
```bash
docker compose --profile kafka up --build
```

---

## 3. REST API Reference & Examples

### 3.1 Healthcheck
- **Endpoint**: `GET /api/v1/health`
- **Example**:
  ```bash
  curl -s http://localhost:3000/api/v1/health
  ```
- **Response**:
  ```json
  {
    "success": true,
    "service": "pod-PDF Microservice",
    "version": "1.0.0",
    "status": "UP",
    "uptimeSeconds": 45,
    "environment": "development",
    "storage": {
      "provider": "local"
    },
    "queue": {
      "driver": "memory"
    },
    "timestamp": "2026-08-30T14:45:09.830Z"
  }
  ```

---

### 3.2 Synchronous PDF Generation (`asyncMode: false`)
Generates PDF inline and returns the storage key and download URL.

- **Endpoint**: `POST /api/v1/generate`
- **Example**:
  ```bash
  curl -X POST http://localhost:3000/api/v1/generate \
    -H "Content-Type: application/json" \
    -d '{
      "templateName": "logistic-container-label-v2",
      "outputFilename": "shipment-98234-labels.pdf",
      "asyncMode": false,
      "globalData": {
        "carrier": "GlobalExpress",
        "serviceLevel": "Express-Air"
      },
      "pages": [
        {
          "pageIndex": 0,
          "data": {
            "containerId": "CONT-2026-9901",
            "destinationHub": "BOM-T3",
            "weight": "450kg",
            "barcode_tracking": "1Z9999999999999999",
            "qrcode_manifest": "https://logistics.internal/manifest/9901",
            "matrix_code": "SKU:A99-B|BATCH:12|LOC:Z4"
          }
        }
      ]
    }'
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "status": "COMPLETED",
    "data": {
      "key": "output/shipment-98234-labels.pdf",
      "url": "http://localhost:3000/api/v1/storage/download?key=output%2Fshipment-98234-labels.pdf",
      "size": 33690,
      "pageCount": 1,
      "durationMs": 520,
      "storageType": "local"
    },
    "timestamp": "2026-08-30T14:45:59.987Z"
  }
  ```

---

### 3.3 Asynchronous PDF Generation (`asyncMode: true`)
Pushes job to queue (SQS, Kafka, or Memory queue) and returns immediately with `jobId`.

- **Endpoint**: `POST /api/v1/generate`
- **Example**:
  ```bash
  curl -X POST http://localhost:3000/api/v1/generate \
    -H "Content-Type: application/json" \
    -d '{
      "templateName": "logistic-container-label-v2",
      "outputFilename": "async-batch-label.pdf",
      "asyncMode": true,
      "webhookUrl": "https://webhook.site/your-unique-id",
      "globalData": { "carrier": "FedEx" },
      "pages": [
        {
          "pageIndex": 0,
          "data": { "containerId": "CONT-9988" }
        }
      ]
    }'
  ```
- **Response** (`202 Accepted`):
  ```json
  {
    "success": true,
    "status": "QUEUED",
    "jobId": "job_1788101171876_3aa83cea",
    "message": "PDF generation job has been queued for asynchronous processing",
    "checkStatusUrl": "/api/v1/jobs/job_1788101171876_3aa83cea",
    "timestamp": "2026-08-30T14:46:11.877Z"
  }
  ```

- **Query Job Status**:
  ```bash
  curl -s http://localhost:3000/api/v1/jobs/job_1788101171876_3aa83cea
  ```

---

### 3.4 Instant Preview (`POST /api/v1/preview`)
Renders PDF inline without saving to S3. Supports Base64 Data URL or raw binary streaming.

- **Base64 Data URL**:
  ```bash
  curl -X POST http://localhost:3000/api/v1/preview \
    -H "Content-Type: application/json" \
    -d '{
      "templateName": "logistic-container-label-v2",
      "pages": [{ "pageIndex": 0, "data": { "containerId": "TEST-1" } }]
    }'
  ```
- **Binary Stream** (`?format=binary`):
  ```bash
  curl -X POST "http://localhost:3000/api/v1/preview?format=binary" \
    -H "Content-Type: application/json" \
    -d '{
      "templateName": "logistic-container-label-v2",
      "pages": [{ "pageIndex": 0, "data": { "containerId": "TEST-1" } }]
    }' --output preview.pdf
  ```

---

### 3.5 Template Management CRUD
- **List all templates**: `GET /api/v1/templates`
- **Get template by name**: `GET /api/v1/templates/:name`
- **Save / Update template**: `POST /api/v1/templates/:name`
- **Delete template**: `DELETE /api/v1/templates/:name`
- **List dimension presets**: `GET /api/v1/presets`

---

## 4. How to Extend the Platform

### 4.1 Adding a New Barcode or Schema Plugin
To support a new barcode format (e.g., Aztec, MaxiCode, or custom table plugin):

1. Open `src/pdf-core/plugins.ts`.
2. Import or construct the plugin definition adhering to `@pdfme/common`'s `Plugin` interface.
3. Add the plugin to `getPdfPlugins()`:
   ```ts
   export async function getPdfPlugins(): Promise<Plugins> {
     // ...
     cachedPlugins['myCustomPlugin'] = customPluginDefinition;
     return cachedPlugins;
   }
   ```
4. Expose the same plugin in `src/gui/src/App.tsx` so visual designers can place the element on the canvas.

---

### 4.2 Adding a New Storage Provider (e.g., GCS / Azure Blob)
To add another cloud storage backend:

1. Create `src/storage/gcs.provider.ts` implementing `IStorageProvider`:
   ```ts
   import { IStorageProvider, SavePdfResult } from './types';

   export class GcsStorageProvider implements IStorageProvider {
     getProviderName(): string { return 'gcs'; }
     async saveTemplate(name: string, template: any): Promise<void> { ... }
     async getTemplate(name: string): Promise<any | null> { ... }
     async listTemplates(): Promise<string[]> { ... }
     async deleteTemplate(name: string): Promise<boolean> { ... }
     async saveOutputPdf(filename: string, buffer: Buffer): Promise<SavePdfResult> { ... }
     async getPdfBuffer(key: string): Promise<Buffer | null> { ... }
     async getPresignedDownloadUrl(key: string, expiresIn?: number): Promise<string> { ... }
     async getPresignedUploadUrl(key: string, expiresIn?: number): Promise<string> { ... }
   }
   ```
2. Update `src/config/env.ts` to allow `STORAGE_TYPE: z.enum(['s3', 'local', 'gcs'])`.
3. Add instantiation branch in `src/storage/storage.factory.ts`.

---

### 4.3 Adding a New Message Queue Driver (e.g., RabbitMQ / Redis BullMQ)
To add another message broker:

1. Create `src/transport/queue/rabbitmq.worker.ts` implementing `IQueueManager`:
   ```ts
   import { IQueueManager, PdfJob } from './queue.interface';

   export class RabbitMqQueueManager implements IQueueManager {
     getQueueType(): string { return 'rabbitmq'; }
     async start(): Promise<void> { ... }
     async stop(): Promise<void> { ... }
     async enqueue(payload: GeneratePdfRequestDto): Promise<string> { ... }
     async getJob(jobId: string): Promise<PdfJob | null> { ... }
     async listJobs(limit?: number): Promise<PdfJob[]> { ... }
   }
   ```
2. In the consumer callback, execute `JobProcessor.processJob(job.payload)` and trigger `WebhookDispatcher.dispatch(job)`.
3. Update `src/transport/queue/index.ts` to add the new queue manager option in `QueueFactory`.

---

### 4.4 Creating New Default Templates
1. Add a new `.json` file inside `src/storage/default-templates/` (e.g. `pallet-tag-v1.json`).
2. When the server starts up, `StorageFactory.seedDefaultTemplates()` will automatically detect the new file and seed it into the active storage provider.

