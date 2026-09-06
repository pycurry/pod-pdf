import { IQueueManager } from './queue.interface';
import { MemoryQueueManager } from './memory.queue';
import { SqsQueueManager } from './sqs.worker';
import { KafkaQueueManager } from './kafka.worker';
import { env } from '../../config/env';

export * from './queue.interface';
export * from './memory.queue';
export * from './sqs.worker';
export * from './kafka.worker';
export * from './job.processor';
export * from './webhook.dispatcher';
export * from './sns.dispatcher';

export class QueueFactory {
  private static instance: IQueueManager | null = null;

  public static getQueueManager(): IQueueManager {
    if (!QueueFactory.instance) {
      if (env.QUEUE_DRIVER === 'sqs') {
        QueueFactory.instance = new SqsQueueManager();
      } else if (env.QUEUE_DRIVER === 'kafka') {
        QueueFactory.instance = new KafkaQueueManager();
      } else {
        QueueFactory.instance = new MemoryQueueManager();
      }
    }
    return QueueFactory.instance;
  }

  public static setQueueManager(manager: IQueueManager): void {
    QueueFactory.instance = manager;
  }

  public static resetInstance(): void {
    QueueFactory.instance = null;
  }
}

