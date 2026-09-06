import { GeneratePdfOptions, GeneratePdfResult } from './types';
import { TemplateCompiler } from './compiler';
import { getPdfPlugins } from './plugins';

export class PdfEngine {
  /**
   * Generates a PDF buffer using the pdfme generator and registered barcode/text/image plugins.
   */
  public static async generatePdf(options: GeneratePdfOptions): Promise<GeneratePdfResult> {
    const startTime = Date.now();

    // 1. Compile template and page inputs
    const { template, inputs } = TemplateCompiler.compile(options);

    // 2. Dynamic import to safely support ESM in Node.js runtime
    const { generate } = await import('@pdfme/generator');
    const plugins = await getPdfPlugins();

    // 3. Generate PDF with pdfme
    const pdfUint8Array = await generate({
      template,
      inputs,
      plugins: plugins as any,
    });

    const pdfBuffer = Buffer.from(pdfUint8Array);
    const durationMs = Date.now() - startTime;

    return {
      pdfBuffer,
      pageCount: inputs.length,
      durationMs,
      sizeBytes: pdfBuffer.length,
    };
  }
}

