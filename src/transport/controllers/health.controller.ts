import { Request, Response } from 'express';
import { StorageFactory } from '../../storage/storage.factory';
import { QueueFactory } from '../queue';
import { env } from '../../config/env';

export class HealthController {
  public static async check(_req: Request, res: Response): Promise<void> {
    const storage = StorageFactory.getStorageProvider();
    const queue = QueueFactory.getQueueManager();

    res.status(200).json({
      success: true,
      service: 'pod-PDF Microservice',
      version: '1.0.0',
      status: 'UP',
      uptimeSeconds: Math.floor(process.uptime()),
      environment: env.NODE_ENV,
      storage: {
        provider: storage.getProviderName(),
        bucket: env.STORAGE_TYPE === 's3' ? env.AWS_S3_BUCKET : undefined,
      },
      queue: {
        driver: queue.getQueueType(),
      },
      timestamp: new Date().toISOString(),
    });
  }
}

