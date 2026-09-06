import { Request, Response, NextFunction } from 'express';
import { GeneratePdfRequestDto, PreviewPdfRequestDto } from '../schemas/generate.schema';
import { JobProcessor } from '../queue/job.processor';
import { QueueFactory } from '../queue';
import { PdfEngine } from '../../pdf-core/generator';
import { StorageFactory } from '../../storage/storage.factory';

export class GenerateController {
  /**
   * POST /api/v1/generate
   * Main endpoint for synchronous or asynchronous PDF generation
   */
  public static async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload: GeneratePdfRequestDto = req.body;

      if (payload.asyncMode) {
        // Asynchronous queue processing
        const queueManager = QueueFactory.getQueueManager();
        const jobId = await queueManager.enqueue(payload);

        res.status(202).json({
          success: true,
          status: 'QUEUED',
          jobId,
          message: 'PDF generation job has been queued for asynchronous processing',
          checkStatusUrl: `/api/v1/jobs/${jobId}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Synchronous inline generation
      const result = await JobProcessor.processJob(payload);

      res.status(200).json({
        success: true,
        status: 'COMPLETED',
        data: {
          key: result.key,
          url: result.url,
          size: result.size,
          pageCount: result.pageCount,
          durationMs: result.durationMs,
          storageType: result.storageType,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/preview
   * Instant inline preview generation (returns PDF binary stream or base64 data)
   */
  public static async preview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload: PreviewPdfRequestDto = req.body;
      const storage = StorageFactory.getStorageProvider();

      let template = payload.template;
      if (!template && payload.templateName) {
        template = await storage.getTemplate(payload.templateName);
        if (!template) {
          res.status(404).json({
            success: false,
            error: {
              code: 'TEMPLATE_NOT_FOUND',
              message: `Template '${payload.templateName}' not found`,
            },
          });
          return;
        }
      }

      if (!template) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Either template object or templateName must be provided for preview',
          },
        });
        return;
      }

      const { pdfBuffer, pageCount, durationMs } = await PdfEngine.generatePdf({
        template,
        globalData: payload.globalData,
        pages: payload.pages,
      });

      const format = req.query.format as string;
      if (format === 'binary') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
        return;
      }

      const base64Pdf = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

      res.status(200).json({
        success: true,
        data: {
          dataUrl: base64Pdf,
          sizeBytes: pdfBuffer.length,
          pageCount,
          durationMs,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

