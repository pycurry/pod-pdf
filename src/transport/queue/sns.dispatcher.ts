import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { PdfJob } from './queue.interface';
import { env } from '../../config/env';

export class SnsDispatcher {
  private static client: SNSClient | null = null;

  private static getClient(): SNSClient | null {
    if (!env.SNS_TOPIC_ARN) return null;

    if (!SnsDispatcher.client) {
      SnsDispatcher.client = new SNSClient({
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

    return SnsDispatcher.client;
  }

  public static async dispatch(job: PdfJob): Promise<boolean> {
    if (!env.SNS_TOPIC_ARN) return false;

    const client = SnsDispatcher.getClient();
    if (!client) return false;

    try {
      const message = JSON.stringify({
        event: job.status === 'COMPLETED' ? 'pdf.generated' : 'pdf.failed',
        jobId: job.jobId,
        status: job.status,
        templateName: job.payload.templateName,
        outputFilename: job.payload.outputFilename,
        result: job.result,
        error: job.error,
        timestamp: new Date().toISOString(),
      });

      const command = new PublishCommand({
        TopicArn: env.SNS_TOPIC_ARN,
        Subject: `pod-PDF Job ${job.jobId} ${job.status}`,
        Message: message,
        MessageAttributes: {
          jobId: { DataType: 'String', StringValue: job.jobId },
          status: { DataType: 'String', StringValue: job.status },
        },
      });

      await client.send(command);
      console.log(`📢 SNS notification dispatched for job ${job.jobId} -> ${env.SNS_TOPIC_ARN}`);
      return true;
    } catch (error: any) {
      console.warn(`⚠️ Failed to publish SNS notification for job ${job.jobId}:`, error.message);
      return false;
    }
  }
}

