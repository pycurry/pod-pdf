import { v4 as uuidv4 } from 'uuid';
import { GeneratePdfRequestDto } from '../schemas/generate.schema';
import { JobResult } from './queue.interface';
import { PdfEngine } from '../../pdf-core/generator';
import { StorageFactory } from '../../storage/storage.factory';

export class JobProcessor {
  public static async processJob(payload: GeneratePdfRequestDto): Promise<JobResult> {
    const storage = StorageFactory.getStorageProvider();

    // 1. Resolve template
    let template = payload.customTemplate;

    if (!template) {
      template = await storage.getTemplate(payload.templateName);
      if (!template) {
        throw new Error(`Template '${payload.templateName}' not found in storage.`);
      }
    }

    // 2. Generate PDF
    const { pdfBuffer, pageCount, durationMs } = await PdfEngine.generatePdf({
      template,
      globalData: payload.globalData,
      pages: payload.pages,
    });

    // 3. Determine output filename
    const filename =
      payload.outputFilename ||
      `${payload.templateName}-${Date.now()}-${uuidv4().substring(0, 8)}.pdf`;

    // 4. Save to storage
    const saveResult = await storage.saveOutputPdf(filename, pdfBuffer);

    return {
      key: saveResult.key,
      url: saveResult.url,
      size: saveResult.size,
      pageCount,
      durationMs,
      storageType: saveResult.storageType,
    };
  }
}

