import { Kafka, Producer, Consumer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { IQueueManager, PdfJob } from './queue.interface';
import { GeneratePdfRequestDto } from '../schemas/generate.schema';
import { JobProcessor } from './job.processor';
import { WebhookDispatcher } from './webhook.dispatcher';
import { SnsDispatcher } from './sns.dispatcher';
import { env } from '../../config/env';

export class KafkaQueueManager implements IQueueManager {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;
  private topic: string;
  private jobs: Map<string, PdfJob> = new Map();
  private isConnected: boolean = false;

  constructor() {
    this.topic = env.KAFKA_TOPIC_JOBS;
    const brokers = env.KAFKA_BROKERS.split(',').map((b) => b.trim());

    this.kafka = new Kafka({
      clientId: env.KAFKA_CLIENT_ID,
      brokers,
    });
  }

  getQueueType(): string {
    return 'kafka';
  }

  async start(): Promise<void> {
    try {
      this.producer = this.kafka.producer();
      await this.producer.connect();

      this.consumer = this.kafka.consumer({ groupId: env.KAFKA_GROUP_ID });
      await this.consumer.connect();
      await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });

      this.isConnected = true;
      console.log(`⚡ Kafka worker connected to topic '${this.topic}' (Brokers: ${env.KAFKA_BROKERS})`);

      await this.consumer.run({
        eachMessage: async ({ message }) => {
          if (!message.value) return;

          try {
            const raw = message.value.toString();
            const parsed = JSON.parse(raw);
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
          } catch (err) {
            console.error('Error processing Kafka message:', err);
          }
        },
      });
    } catch (error: any) {
      console.warn('⚠️ Kafka connection failed. Async jobs will fallback to local processing:', error.message);
      this.isConnected = false;
    }
  }

  async stop(): Promise<void> {
    this.isConnected = false;
    if (this.producer) {
      await this.producer.disconnect();
    }
    if (this.consumer) {
      await this.consumer.disconnect();
    }
    console.log('🛑 Kafka worker stopped.');
  }

  async enqueue(payload: GeneratePdfRequestDto): Promise<string> {
    const jobId = `kafka_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const job: PdfJob = {
      jobId,
      payload,
      status: 'QUEUED',
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(jobId, job);

    if (this.isConnected && this.producer) {
      await this.producer.send({
        topic: this.topic,
        messages: [
          {
            key: jobId,
            value: JSON.stringify({ jobId, payload }),
          },
        ],
      });
    } else {
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

