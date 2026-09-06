import { MemoryQueueManager } from '../src/transport/queue/memory.queue';
import { GeneratePdfRequestDto } from '../src/transport/schemas/generate.schema';
import { StorageFactory } from '../src/storage/storage.factory';
import { env } from '../src/config/env';

describe('Queue Manager & Worker Tests', () => {
  let queueManager: MemoryQueueManager;

  beforeAll(async () => {
    const storage = StorageFactory.getStorageProvider({
      ...env,
      STORAGE_TYPE: 'local',
      LOCAL_STORAGE_DIR: './data/test-queue-storage',
    });
    await StorageFactory.seedDefaultTemplates(storage);
  });

  beforeEach(async () => {
    queueManager = new MemoryQueueManager();
    await queueManager.start();
  });

  afterEach(async () => {
    await queueManager.stop();
  });

  it('should enqueue a job and complete generation in background', async () => {
    const payload: GeneratePdfRequestDto = {
      templateName: 'logistic-container-label-v2',
      outputFilename: 'async-test-label.pdf',
      asyncMode: true,
      globalData: {
        carrier: 'GlobalExpress',
        serviceLevel: 'Express-Air',
      },
      pages: [
        {
          pageIndex: 0,
          data: {
            containerId: 'CONT-ASYNC-100',
            destinationHub: 'BOM-T3',
            weight: '120kg',
            barcode_tracking: '1Z999888777666',
            qrcode_manifest: 'https://test/manifest',
            matrix_code: 'MAT-ASYNC',
          },
        },
      ],
    };

    const jobId = await queueManager.enqueue(payload);
    expect(jobId).toBeDefined();
    expect(jobId.startsWith('job_')).toBe(true);

    // Initial state should be QUEUED or PROCESSING
    let job = await queueManager.getJob(jobId);
    expect(job).toBeDefined();

    // Wait for background worker processing
    let retries = 0;
    while (job && job.status !== 'COMPLETED' && job.status !== 'FAILED' && retries < 20) {
      await new Promise((r) => setTimeout(r, 100));
      job = await queueManager.getJob(jobId);
      retries++;
    }

    expect(job?.status).toBe('COMPLETED');
    expect(job?.result).toBeDefined();
    expect(job?.result?.size).toBeGreaterThan(1000);
    expect(job?.result?.key).toContain('async-test-label.pdf');
  });

  it('should mark job as FAILED when template does not exist', async () => {
    const payload: GeneratePdfRequestDto = {
      templateName: 'non-existent-template-xyz',
      asyncMode: true,
      globalData: {},
      pages: [{ pageIndex: 0, data: {} }],
    };

    const jobId = await queueManager.enqueue(payload);
    let job = await queueManager.getJob(jobId);

    let retries = 0;
    while (job && job.status !== 'COMPLETED' && job.status !== 'FAILED' && retries < 20) {
      await new Promise((r) => setTimeout(r, 100));
      job = await queueManager.getJob(jobId);
      retries++;
    }

    expect(job?.status).toBe('FAILED');
    expect(job?.error).toContain('not found in storage');
  });
});
