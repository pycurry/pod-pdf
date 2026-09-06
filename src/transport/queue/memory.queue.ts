import { v4 as uuidv4 } from 'uuid';
import { IQueueManager, PdfJob } from './queue.interface';
import { GeneratePdfRequestDto } from '../schemas/generate.schema';
import { JobProcessor } from './job.processor';
import { WebhookDispatcher } from './webhook.dispatcher';
import { SnsDispatcher } from './sns.dispatcher';

export class MemoryQueueManager implements IQueueManager {
  private jobs: Map<string, PdfJob> = new Map();
  private isRunning: boolean = false;

  getQueueType(): string {
    return 'memory';
  }

  async start(): Promise<void> {
    this.isRunning = true;
    console.log('⚡ Memory queue worker started.');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('🛑 Memory queue worker stopped.');
  }

  async enqueue(payload: GeneratePdfRequestDto): Promise<string> {
    const jobId = `job_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const job: PdfJob = {
      jobId,
      payload,
      status: 'QUEUED',
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(jobId, job);

    // Trigger asynchronous execution in next tick
    setImmediate(() => this.processSingleJob(jobId));

    return jobId;
  }

  async getJob(jobId: string): Promise<PdfJob | null> {
    return this.jobs.get(jobId) || null;
  }

  async listJobs(limit: number = 50): Promise<PdfJob[]> {
    const allJobs = Array.from(this.jobs.values());
    return allJobs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  private async processSingleJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'PROCESSING';
      job.updatedAt = new Date().toISOString();

      const result = await JobProcessor.processJob(job.payload);

      job.status = 'COMPLETED';
      job.result = result;
      job.updatedAt = new Date().toISOString();
      console.log(`✅ [Job ${jobId}] PDF generation completed (${result.size} bytes in ${result.durationMs}ms)`);
    } catch (error: any) {
      job.status = 'FAILED';
      job.error = error.message || 'Unknown processing error';
      job.updatedAt = new Date().toISOString();
      console.error(`❌ [Job ${jobId}] PDF generation failed:`, error);
    }

    // Dispatch webhook and SNS notifications
    await Promise.allSettled([
      WebhookDispatcher.dispatch(job),
      SnsDispatcher.dispatch(job),
    ]);
  }
}

