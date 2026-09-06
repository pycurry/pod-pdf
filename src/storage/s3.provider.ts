import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { IStorageProvider, SavePdfResult } from './types';
import { EnvConfig } from '../config/env';

export class S3StorageProvider implements IStorageProvider {
  private client: S3Client;
  private bucket: string;
  private templatePrefix: string;
  private outputPrefix: string;
  private defaultExpiresIn: number;

  constructor(config: EnvConfig) {
    this.bucket = config.AWS_S3_BUCKET;
    this.templatePrefix = config.AWS_S3_KEY_PREFIX_TEMPLATES.replace(/^\/+|\/+$/g, '') + '/';
    this.outputPrefix = config.AWS_S3_KEY_PREFIX_OUTPUT.replace(/^\/+|\/+$/g, '') + '/';
    this.defaultExpiresIn = config.AWS_S3_PRESIGNED_EXPIRES_IN;

    const s3Config: S3ClientConfig = {
      region: config.AWS_REGION,
    };

    if (config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY) {
      s3Config.credentials = {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      };
    }

    if (config.AWS_ENDPOINT) {
      s3Config.endpoint = config.AWS_ENDPOINT;
      s3Config.forcePathStyle = true; // Required for LocalStack and MinIO
    }

    this.client = new S3Client(s3Config);
  }

  getProviderName(): string {
    return 's3';
  }

  private normalizeTemplateKey(name: string): string {
    const cleanName = name.endsWith('.json') ? name : `${name}.json`;
    return `${this.templatePrefix}${cleanName}`;
  }

  private normalizeOutputKey(filename: string): string {
    const cleanName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    return `${this.outputPrefix}${cleanName}`;
  }

  async saveTemplate(name: string, template: any): Promise<void> {
    const key = this.normalizeTemplateKey(name);
    const content = typeof template === 'string' ? template : JSON.stringify(template, null, 2);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: Buffer.from(content, 'utf-8'),
      ContentType: 'application/json',
      Metadata: {
        templateName: name,
        updatedAt: new Date().toISOString(),
      },
    });

    await this.client.send(command);
  }

  async getTemplate(name: string): Promise<any | null> {
    const key = this.normalizeTemplateKey(name);
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      if (!response.Body) return null;

      const bodyString = await this.streamToString(response.Body as Readable);
      return JSON.parse(bodyString);
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async listTemplates(): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: this.templatePrefix,
      });

      const response = await this.client.send(command);
      if (!response.Contents) return [];

      return response.Contents.map((item) => {
        const key = item.Key || '';
        const nameWithoutPrefix = key.slice(this.templatePrefix.length);
        return nameWithoutPrefix.replace(/\.json$/, '');
      }).filter((name) => name.length > 0);
    } catch (error) {
      console.error('Error listing templates in S3:', error);
      return [];
    }
  }

  async deleteTemplate(name: string): Promise<boolean> {
    const key = this.normalizeTemplateKey(name);
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      console.error(`Error deleting template ${name} from S3:`, error);
      return false;
    }
  }

  async saveOutputPdf(filename: string, buffer: Buffer): Promise<SavePdfResult> {
    const key = this.normalizeOutputKey(filename);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
      ContentDisposition: `inline; filename="${filename}"`,
    });

    await this.client.send(command);

    const presignedUrl = await this.getPresignedDownloadUrl(key);

    return {
      key,
      url: presignedUrl,
      size: buffer.length,
      bucket: this.bucket,
      storageType: 's3',
    };
  }

  async getPdfBuffer(key: string): Promise<Buffer | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      if (!response.Body) return null;

      return await this.streamToBuffer(response.Body as Readable);
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async getPresignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string> {
    const expiresIn = expiresInSeconds || this.defaultExpiresIn;
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  async getPresignedUploadUrl(key: string, expiresInSeconds?: number): Promise<string> {
    const expiresIn = expiresInSeconds || this.defaultExpiresIn;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: 'application/pdf',
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  private async streamToString(stream: Readable): Promise<string> {
    const buffer = await this.streamToBuffer(stream);
    return buffer.toString('utf-8');
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}

