import { GeneratePdfRequestDto } from '../schemas/generate.schema';

export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface JobResult {
  key: string;
  url: string;
  size: number;
  pageCount: number;
  durationMs: number;
  storageType: string;
}

export interface PdfJob {
  jobId: string;
  payload: GeneratePdfRequestDto;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  result?: JobResult;
  error?: string;
}

export interface IQueueManager {
  getQueueType(): string;
  enqueue(payload: GeneratePdfRequestDto): Promise<string>;
  getJob(jobId: string): Promise<PdfJob | null>;
  listJobs(limit?: number): Promise<PdfJob[]>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

