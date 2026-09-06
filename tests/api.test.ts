import request from 'supertest';
import { createApp } from '../src/transport/server';
import { StorageFactory } from '../src/storage/storage.factory';
import { QueueFactory } from '../src/transport/queue';
import { env } from '../src/config/env';

describe('pod-PDF REST API Integration Tests', () => {
  let app: any;

  beforeAll(async () => {
    const storage = StorageFactory.getStorageProvider({
      ...env,
      STORAGE_TYPE: 'local',
      LOCAL_STORAGE_DIR: './data/test-api-storage',
    });
    await StorageFactory.seedDefaultTemplates(storage);

    const queueManager = QueueFactory.getQueueManager();
    await queueManager.start();

    app = createApp();
  });

  afterAll(async () => {
    const queueManager = QueueFactory.getQueueManager();
    await queueManager.stop();
  });

  describe('GET /api/v1/health', () => {
    it('should return UP status and service information', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.service).toBe('pod-PDF Microservice');
      expect(res.body.status).toBe('UP');
    });
  });

  describe('GET /api/v1/presets', () => {
    it('should return available page dimension presets', async () => {
      const res = await request(app).get('/api/v1/presets');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.presets.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('GET /api/v1/templates', () => {
    it('should list all stored templates including default templates', async () => {
      const res = await request(app).get('/api/v1/templates');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.templates).toContain('logistic-container-label-v2');
    });
  });

  describe('POST /api/v1/generate (Synchronous Mode)', () => {
    it('should generate PDF synchronously with exact readme payload schema', async () => {
      const payload = {
        templateName: 'logistic-container-label-v2',
        outputFilename: 'shipment-98234-labels.pdf',
        asyncMode: false,
        webhookUrl: 'https://api.internal.system/v1/pdf-callback',
        globalData: {
          carrier: 'GlobalExpress',
          serviceLevel: 'Express-Air',
        },
        pages: [
          {
            pageIndex: 0,
            data: {
              containerId: 'CONT-2026-9901',
              destinationHub: 'BOM-T3',
              weight: '450kg',
              barcode_tracking: '1Z9999999999999999',
              qrcode_manifest: 'https://logistics.internal/manifest/9901',
              matrix_code: 'SKU:A99-B|BATCH:12|LOC:Z4',
            },
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/generate')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('COMPLETED');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.key).toBe('output/shipment-98234-labels.pdf');
      expect(res.body.data.size).toBeGreaterThan(1000);
      expect(res.body.data.pageCount).toBe(1);
      expect(res.body.data.url).toBeDefined();
    });

    it('should return 400 when payload is invalid', async () => {
      const invalidPayload = {
        asyncMode: false,
        pages: [],
      };

      const res = await request(app)
        .post('/api/v1/generate')
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/generate (Asynchronous Mode)', () => {
    it('should accept job asynchronously and return 202 with jobId', async () => {
      const payload = {
        templateName: 'logistic-container-label-v2',
        outputFilename: 'async-api-test.pdf',
        asyncMode: true,
        globalData: { carrier: 'DHL' },
        pages: [
          {
            pageIndex: 0,
            data: { containerId: 'DHL-8899' },
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/generate')
        .send(payload);

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('QUEUED');
      expect(res.body.jobId).toBeDefined();

      const jobId = res.body.jobId;

      // Poll job status
      const jobRes = await request(app).get(`/api/v1/jobs/${jobId}`);
      expect(jobRes.status).toBe(200);
      expect(jobRes.body.data.jobId).toBe(jobId);
    });
  });

  describe('POST /api/v1/preview', () => {
    it('should generate inline preview data URL', async () => {
      const res = await request(app)
        .post('/api/v1/preview')
        .send({
          templateName: 'logistic-container-label-v2',
          globalData: { carrier: 'FedEx' },
          pages: [{ pageIndex: 0, data: { containerId: 'FDX-123' } }],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dataUrl).toContain('data:application/pdf;base64,');
    });

    it('should generate inline preview binary stream when format=binary', async () => {
      const res = await request(app)
        .post('/api/v1/preview?format=binary')
        .send({
          templateName: 'logistic-container-label-v2',
          globalData: { carrier: 'UPS' },
          pages: [{ pageIndex: 0, data: { containerId: 'UPS-123' } }],
        });

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/pdf');
    });
  });

  describe('Template Management CRUD', () => {
    const customTemplateName = 'test-custom-crud-template';
    const customTemplate = {
      basePdf: { width: 101.6, height: 152.4 },
      schemas: [
        [
          {
            name: 'title',
            type: 'text',
            position: { x: 10, y: 10 },
            width: 80,
            height: 10,
          },
        ],
      ],
    };

    it('should create, fetch, and delete a template via REST', async () => {
      // 1. Create
      const postRes = await request(app)
        .post(`/api/v1/templates/${customTemplateName}`)
        .send(customTemplate);
      expect(postRes.status).toBe(200);

      // 2. Fetch
      const getRes = await request(app).get(`/api/v1/templates/${customTemplateName}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.name).toBe(customTemplateName);

      // 3. Delete
      const deleteRes = await request(app).delete(`/api/v1/templates/${customTemplateName}`);
      expect(deleteRes.status).toBe(200);

      // 4. Fetch after delete
      const getAfterDeleteRes = await request(app).get(`/api/v1/templates/${customTemplateName}`);
      expect(getAfterDeleteRes.status).toBe(404);
    });
  });
});

