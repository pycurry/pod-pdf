import axios from 'axios';
import { PdfJob } from './queue.interface';

export class WebhookDispatcher {
  /**
   * Dispatches job completion or failure notification to external webhookUrl
   */
  public static async dispatch(job: PdfJob): Promise<boolean> {
    const webhookUrl = job.payload.webhookUrl;
    if (!webhookUrl) return false;

    const payload = {
      event: job.status === 'COMPLETED' ? 'pdf.generated' : 'pdf.failed',
      jobId: job.jobId,
      status: job.status,
      templateName: job.payload.templateName,
      outputFilename: job.payload.outputFilename,
      result: job.result,
      error: job.error,
      timestamp: new Date().toISOString(),
    };

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await axios.post(webhookUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'pod-PDF-Webhook-Dispatcher/1.0',
            'X-Job-Id': job.jobId,
          },
          timeout: 10000,
        });

        console.log(`📡 Webhook successfully delivered for job ${job.jobId} -> ${webhookUrl}`);
        return true;
      } catch (error: any) {
        console.warn(
          `⚠️ Webhook delivery failed (attempt ${attempt}/${maxRetries}) for job ${job.jobId}:`,
          error.message
        );
        if (attempt < maxRetries) {
          await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, attempt - 1)));
        }
      }
    }

    return false;
  }
}

