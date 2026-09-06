import { Request, Response, NextFunction } from 'express';
import { StorageFactory } from '../../storage/storage.factory';
import { PAGE_PRESETS } from '../../pdf-core/presets';

export class TemplatesController {
  /**
   * GET /api/v1/templates
   * List all stored templates
   */
  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const storage = StorageFactory.getStorageProvider();
      const templates = await storage.listTemplates();

      res.status(200).json({
        success: true,
        data: {
          templates,
          count: templates.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/templates/:name
   * Retrieve template definition by name
   */
  public static async getByName(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const name = req.params.name;
      const storage = StorageFactory.getStorageProvider();
      const template = await storage.getTemplate(name);

      if (!template) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: `Template '${name}' was not found in storage`,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          name,
          template,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/templates/:name
   * Create or update a template definition
   */
  public static async save(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const name = req.params.name;
      const template = req.body;
      const storage = StorageFactory.getStorageProvider();

      await storage.saveTemplate(name, template);

      res.status(200).json({
        success: true,
        message: `Template '${name}' saved successfully`,
        data: {
          name,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/templates/:name
   * Delete a template by name
   */
  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const name = req.params.name;
      const storage = StorageFactory.getStorageProvider();
      const deleted = await storage.deleteTemplate(name);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: `Template '${name}' not found or could not be deleted`,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Template '${name}' deleted successfully`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/presets
   * List standard page dimension presets (4x6 thermal, A4, Letter, etc.)
   */
  public static async listPresets(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      data: {
        presets: Object.values(PAGE_PRESETS),
      },
      timestamp: new Date().toISOString(),
    });
  }
}

