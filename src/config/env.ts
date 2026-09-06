import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  STORAGE_TYPE: z.enum(['s3', 'local']).default('local'),
  LOCAL_STORAGE_DIR: z.string().default('./data/storage'),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().default('pod-pdf-storage-bucket'),
  AWS_S3_KEY_PREFIX_TEMPLATES: z.string().default('templates/'),
  AWS_S3_KEY_PREFIX_OUTPUT: z.string().default('output/'),
  AWS_S3_PRESIGNED_EXPIRES_IN: z.coerce.number().default(3600),
  AWS_ENDPOINT: z.string().optional(),
  QUEUE_DRIVER: z.enum(['memory', 'sqs', 'kafka']).default('memory'),
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('pod-pdf-service'),
  KAFKA_TOPIC_JOBS: z.string().default('pdf-generation-jobs'),
  KAFKA_GROUP_ID: z.string().default('pod-pdf-group'),
  SQS_QUEUE_URL: z.string().optional(),
  SNS_TOPIC_ARN: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let parsedEnv: EnvConfig;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment configuration validation failed:', error.format());
  }
  throw error;
}

export const env = parsedEnv;

