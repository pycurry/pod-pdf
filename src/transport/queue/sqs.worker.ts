import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import { v4 as uuidv4 } from 'uuid';
import { IQueueManager, PdfJob } from './queue.interface';
import { GeneratePdfRequestDto } from '../schemas/generate.schema';
import { JobProcessor } from './job.processor';
import { WebhookDispatcher } from './webhook.dispatcher';
import { SnsDispatcher } from './sns.dispatcher';
import { env } from '../../config/env';

export class SqsQueueManager implements IQueueManager {
  private client: SQSClient;
  private queueUrl: string;
  private isRunning: boolean = false;
  private pollIntervalMs: number = 2000;
  private jobs: Map<string, PdfJob> = new Map();

  constructor() {
    this.queueUrl = env.SQS_QUEUE_URL || '';
    this.client = new SQSClient({
      region: env.AWS_REGION,
      ...(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
        ? {
            credentials: {
              accessKeyId: env.AWS_ACCESS_KEY_ID,
              secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            },
          }
        : {}),
      ...(env.AWS_ENDPOINT ? { endpoint: env.AWS_ENDPOINT } : {}),
    });
  }

  getQueueType(): string {
    return 'sqs';
  }

  async start(): Promise<void> {
    if (!this.queueUrl) {
      console.warn('⚠️ SQS_QUEUE_URL is not set. SQS worker will not poll.');
      return;
    }

    this.isRunning = true;
    console.log(`⚡ AWS SQS worker started polling on: ${this.queueUrl}`);
    this.pollLoop();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('🛑 AWS SQS worker stopped.');
  }

  async enqueue(payload: GeneratePdfRequestDto): Promise<string> {
    const jobId = `sqs_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const job: PdfJob = {
      jobId,
      payload,
      status: 'QUEUED',
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(jobId, job);

    if (this.queueUrl) {
      const messageBody = JSON.stringify({ jobId, payload });
      const command = new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: messageBody,
        MessageAttributes: {
          jobId: { DataType: 'String', StringValue: jobId },
        },
      });

      await this.client.send(command);
    } else {
      console.warn('⚠️ No SQS_QUEUE_URL configured. Processing locally as fallback.');
      setImmediate(() => this.processJobDirectly(job));
    }

    return jobId;
  }

  async getJob(jobId: string): Promise<PdfJob | null> {
    return this.jobs.get(jobId) || null;
  }

  async listJobs(limit: number = 50): Promise<PdfJob[]> {
    return Array.from(this.jobs.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  private async pollLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        const receiveCmd = new ReceiveMessageCommand({
          QueueUrl: this.queueUrl,
          MaxNumberOfMessages: 5,
          WaitTimeSeconds: 10,
          VisibilityTimeout: 60,
        });

        const response = await this.client.send(receiveCmd);
        if (response.Messages && response.Messages.length > 0) {
          for (const message of response.Messages) {
            if (!message.Body || !message.ReceiptHandle) continue;

            try {
              const parsed = JSON.parse(message.Body);
              const jobId = parsed.jobId;
              const payload = parsed.payload;

              let job = this.jobs.get(jobId);
              if (!job) {
                job = {
                  jobId,
                  payload,
                  status: 'QUEUED',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                this.jobs.set(jobId, job);
              }

              await this.processJobDirectly(job);

              // Delete processed message from SQS
              const deleteCmd = new DeleteMessageCommand({
                QueueUrl: this.queueUrl,
                ReceiptHandle: message.ReceiptHandle,
              });
              await this.client.send(deleteCmd);
            } catch (err: any) {
              console.error('Error processing SQS message:', err);
            }
          }
        }
      } catch (error: any) {
        if (this.isRunning) {
          console.warn('SQS poll error:', error.message);
          await new Promise((r) => setTimeout(r, this.pollIntervalMs));
        }
      }
    }
  }

  private async processJobDirectly(job: PdfJob): Promise<void> {
    try {
      job.status = 'PROCESSING';
      job.updatedAt = new Date().toISOString();

      const result = await JobProcessor.processJob(job.payload);

      job.status = 'COMPLETED';
      job.result = result;
      job.updatedAt = new Date().toISOString();
    } catch (error: any) {
      job.status = 'FAILED';
      job.error = error.message || 'Unknown processing error';
      job.updatedAt = new Date().toISOString();
    }

    await Promise.allSettled([
      WebhookDispatcher.dispatch(job),
      SnsDispatcher.dispatch(job),
    ]);
  }
}

