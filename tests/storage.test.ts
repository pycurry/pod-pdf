import fs from 'fs';
import path from 'path';
import { LocalStorageProvider } from '../src/storage/local.provider';
import { StorageFactory } from '../src/storage/storage.factory';
import { S3StorageProvider } from '../src/storage/s3.provider';
import { env } from '../src/config/env';

describe('Storage Providers & Factory Tests', () => {
  const testStorageDir = './data/test-storage';

  const testConfig = {
    ...env,
    LOCAL_STORAGE_DIR: testStorageDir,
    STORAGE_TYPE: 'local' as const,
  };

  afterAll(async () => {
    if (fs.existsSync(testStorageDir)) {
      await fs.promises.rm(testStorageDir, { recursive: true, force: true });
    }
  });

  describe('LocalStorageProvider', () => {
    let provider: LocalStorageProvider;

    beforeEach(() => {
      provider = new LocalStorageProvider(testConfig);
    });

    it('should have provider name "local"', () => {
      expect(provider.getProviderName()).toBe('local');
    });

    it('should save, retrieve, list, and delete a template', async () => {
      const templateName = 'unit-test-label';
      const sampleTemplate = {
        basePdf: { width: 100, height: 150 },
        schemas: [[{ name: 'barcode', type: 'code128' }]],
      };

      // Save
      await provider.saveTemplate(templateName, sampleTemplate);

      // Get
      const fetched = await provider.getTemplate(templateName);
      expect(fetched).toEqual(sampleTemplate);

      // List
      const list = await provider.listTemplates();
      expect(list).toContain(templateName);

      // Delete
      const deleted = await provider.deleteTemplate(templateName);
      expect(deleted).toBe(true);

      // Get after delete
      const afterDelete = await provider.getTemplate(templateName);
      expect(afterDelete).toBeNull();
    });

    it('should save PDF buffer and allow reading it back', async () => {
      const filename = 'test-document.pdf';
      const dummyPdfContent = Buffer.from('%PDF-1.4 Mock PDF Content Header');

      const result = await provider.saveOutputPdf(filename, dummyPdfContent);
      expect(result.key).toBe(`output/${filename}`);
      expect(result.size).toBe(dummyPdfContent.length);
      expect(result.url).toContain('/api/v1/storage/download');

      const buffer = await provider.getPdfBuffer(result.key);
      expect(buffer).not.toBeNull();
      expect(buffer?.toString()).toBe(dummyPdfContent.toString());
    });

    it('should generate valid download and upload URLs', async () => {
      const downloadUrl = await provider.getPresignedDownloadUrl('output/sample.pdf');
      expect(downloadUrl).toContain('output%2Fsample.pdf');

      const uploadUrl = await provider.getPresignedUploadUrl('output/sample.pdf');
      expect(uploadUrl).toContain('output%2Fsample.pdf');
    });
  });

  describe('StorageFactory & Default Template Seeding', () => {
    it('should initialize local storage provider and seed default templates', async () => {
      StorageFactory.resetInstance();
      const provider = StorageFactory.getStorageProvider(testConfig);
      expect(provider).toBeDefined();

      await StorageFactory.seedDefaultTemplates(provider);

      const templates = await provider.listTemplates();
      expect(templates).toContain('logistic-container-label-v2');
      expect(templates).toContain('shipment-manifest-v1');

      const defaultTemplate = await provider.getTemplate('logistic-container-label-v2');
      expect(defaultTemplate).toBeDefined();
      expect(defaultTemplate.schemas.length).toBeGreaterThan(0);
    });
  });
});

