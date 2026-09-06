import { TemplateCompiler } from '../src/pdf-core/compiler';
import { PdfEngine } from '../src/pdf-core/generator';
import logisticLabelTemplate from '../src/storage/default-templates/logistic-container-label-v2.json';

describe('PDF Core Engine Tests', () => {
  describe('TemplateCompiler', () => {
    it('should merge globalData with page data correctly', () => {
      const compiled = TemplateCompiler.compile({
        template: logisticLabelTemplate,
        globalData: {
          carrier: 'GlobalExpress',
          serviceLevel: 'Express-Air',
        },
        pages: [
          {
            pageIndex: 0,
            data: {
              containerId: 'CONT-9901',
              destinationHub: 'BOM-T3',
              weight: '450kg',
              barcode_tracking: '1Z9999999999999999',
              qrcode_manifest: 'https://logistics.internal/manifest/9901',
              matrix_code: 'SKU:A99-B|BATCH:12|LOC:Z4',
            },
          },
        ],
      });

      expect(compiled.inputs.length).toBe(1);
      expect(compiled.inputs[0].carrier).toBe('GlobalExpress');
      expect(compiled.inputs[0].serviceLevel).toBe('Express-Air');
      expect(compiled.inputs[0].containerId).toBe('CONT-9901');
      expect(compiled.inputs[0].destinationHub).toBe('BOM-T3');
      expect(compiled.inputs[0].weight).toBe('450kg');
      expect(compiled.inputs[0].barcode_tracking).toBe('1Z9999999999999999');
    });

    it('should expand single-page template schema for multi-page requests', () => {
      const compiled = TemplateCompiler.compile({
        template: logisticLabelTemplate,
        globalData: { carrier: 'SwiftLogistics' },
        pages: [
          { pageIndex: 0, data: { containerId: 'CONT-1' } },
          { pageIndex: 1, data: { containerId: 'CONT-2' } },
          { pageIndex: 2, data: { containerId: 'CONT-3' } },
        ],
      });

      expect(compiled.template.schemas.length).toBe(3);
      expect(compiled.inputs.length).toBe(3);
      expect(compiled.inputs[0].containerId).toBe('CONT-1');
      expect(compiled.inputs[1].containerId).toBe('CONT-2');
      expect(compiled.inputs[2].containerId).toBe('CONT-3');
    });
  });

  describe('PdfEngine.generatePdf', () => {
    it('should generate a valid PDF for 4x6 inch logistic container label with barcodes and QR codes', async () => {
      const result = await PdfEngine.generatePdf({
        template: logisticLabelTemplate,
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
      });

      expect(result).toBeDefined();
      expect(result.pageCount).toBe(1);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.sizeBytes).toBeGreaterThan(1000);
      expect(Buffer.isBuffer(result.pdfBuffer)).toBe(true);

      // Validate PDF signature
      const header = result.pdfBuffer.subarray(0, 5).toString('ascii');
      expect(header).toBe('%PDF-');
    });

    it('should generate a multi-page PDF document', async () => {
      const result = await PdfEngine.generatePdf({
        template: logisticLabelTemplate,
        globalData: { carrier: 'GlobalExpress' },
        pages: [
          {
            pageIndex: 0,
            data: {
              containerId: 'CONT-PAGE-1',
              destinationHub: 'DXB-01',
              barcode_tracking: '1Z1111111111111111',
              qrcode_manifest: 'https://manifest/1',
              matrix_code: 'MAT-1',
            },
          },
          {
            pageIndex: 1,
            data: {
              containerId: 'CONT-PAGE-2',
              destinationHub: 'LHR-02',
              barcode_tracking: '1Z2222222222222222',
              qrcode_manifest: 'https://manifest/2',
              matrix_code: 'MAT-2',
            },
          },
        ],
      });

      expect(result.pageCount).toBe(2);
      expect(result.sizeBytes).toBeGreaterThan(1500);
    });
  });
});

