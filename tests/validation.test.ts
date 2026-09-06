import { generatePdfRequestSchema, previewPdfRequestSchema } from '../src/transport/schemas/generate.schema';
import { saveTemplateSchema } from '../src/transport/schemas/template.schema';

describe('Schema Validation Tests', () => {
  describe('generatePdfRequestSchema', () => {
    it('should validate standard synchronous payload from spec', () => {
      const validPayload = {
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

      const result = generatePdfRequestSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.templateName).toBe('logistic-container-label-v2');
        expect(result.data.asyncMode).toBe(false);
        expect(result.data.pages.length).toBe(1);
      }
    });

    it('should validate asynchronous payload without outputFilename or webhookUrl', () => {
      const asyncPayload = {
        templateName: 'logistic-container-label-v2',
        asyncMode: true,
        pages: [
          {
            pageIndex: 0,
            data: {
              containerId: 'CONT-100',
            },
          },
        ],
      };

      const result = generatePdfRequestSchema.safeParse(asyncPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.asyncMode).toBe(true);
        expect(result.data.globalData).toEqual({});
      }
    });

    it('should reject payload missing templateName', () => {
      const invalidPayload = {
        pages: [{ pageIndex: 0, data: {} }],
      };

      const result = generatePdfRequestSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject payload with empty pages array', () => {
      const invalidPayload = {
        templateName: 'test-template',
        pages: [],
      };

      const result = generatePdfRequestSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject payload with negative pageIndex', () => {
      const invalidPayload = {
        templateName: 'test-template',
        pages: [{ pageIndex: -1, data: {} }],
      };

      const result = generatePdfRequestSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject payload with invalid webhookUrl format', () => {
      const invalidPayload = {
        templateName: 'test-template',
        webhookUrl: 'not-a-valid-url',
        pages: [{ pageIndex: 0, data: {} }],
      };

      const result = generatePdfRequestSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('saveTemplateSchema', () => {
    it('should validate template with basePdf dimension object', () => {
      const template = {
        basePdf: {
          width: 101.6,
          height: 152.4,
          padding: [4, 4, 4, 4],
        },
        schemas: [
          [
            {
              name: 'trackingNumber',
              type: 'text',
              position: { x: 10, y: 10 },
              width: 50,
              height: 10,
            },
          ],
        ],
      };

      const result = saveTemplateSchema.safeParse(template);
      expect(result.success).toBe(true);
    });

    it('should reject template with empty schemas array', () => {
      const template = {
        basePdf: { width: 100, height: 100 },
        schemas: [],
      };

      const result = saveTemplateSchema.safeParse(template);
      expect(result.success).toBe(false);
    });
  });
});

