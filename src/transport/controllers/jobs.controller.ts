import { Request, Response, NextFunction } from 'express';
import { QueueFactory } from '../queue';

export class JobsController {
  /**
   * GET /api/v1/jobs/:jobId
   * Retrieve async job status and result
   */
  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const jobId = req.params.jobId;
      const queueManager = QueueFactory.getQueueManager();
      const job = await queueManager.getJob(jobId);

      if (!job) {
        res.status(404).json({
          success: false,
          error: {
            code: 'JOB_NOT_FOUND',
            message: `Job '${jobId}' was not found`,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: job,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/jobs
   * List recent async jobs
   */
  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const queueManager = QueueFactory.getQueueManager();
      const jobs = await queueManager.listJobs(limit);

      res.status(200).json({
        success: true,
        data: {
          jobs,
          count: jobs.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

