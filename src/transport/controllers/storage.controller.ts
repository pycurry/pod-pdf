import { Request, Response, NextFunction } from 'express';
import { StorageFactory } from '../../storage/storage.factory';

export class StorageController {
  /**
   * GET /api/v1/storage/download?key=...
   * Direct download endpoint for generated PDFs (especially in local mode)
   */
  public static async download(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const key = req.query.key as string;
      if (!key) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAM',
            message: 'Query parameter "key" is required',
          },
        });
        return;
      }

      const storage = StorageFactory.getStorageProvider();
      const buffer = await storage.getPdfBuffer(key);

      if (!buffer) {
        res.status(404).json({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: `File with key '${key}' was not found in storage`,
          },
        });
        return;
      }

      const filename = key.split('/').pop() || 'document.pdf';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

