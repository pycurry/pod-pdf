import { createApp } from './transport/server';
import { StorageFactory } from './storage/storage.factory';
import { QueueFactory } from './transport/queue';
import { env } from './config/env';

async function bootstrap() {
  console.log('🚀 Starting pod-PDF Microservice...');

  // 1. Initialize Storage & Seed Default Templates
  const storage = StorageFactory.getStorageProvider(env);
  await StorageFactory.seedDefaultTemplates(storage);

  // 2. Initialize & Start Queue Worker
  const queueManager = QueueFactory.getQueueManager();
  await queueManager.start();

  // 3. Start Express Server
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`
==================================================================
  📦 pod-PDF Enterprise Label & Multi-Page PDF Microservice
  🌐 REST API:    http://localhost:${env.PORT}/api/v1
  🎨 GUI Designer: http://localhost:${env.PORT}/designer
  🩺 Healthcheck:  http://localhost:${env.PORT}/api/v1/health
  💾 Storage:      ${storage.getProviderName().toUpperCase()}
  ⚡ Queue Driver: ${queueManager.getQueueType().toUpperCase()}
==================================================================
    `);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      await queueManager.stop();
      console.log('Server closed. Process terminating.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('❌ Fatal error during bootstrap:', err);
  process.exit(1);
});

