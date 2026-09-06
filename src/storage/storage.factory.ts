import fs from 'fs';
import path from 'path';
import { IStorageProvider } from './types';
import { S3StorageProvider } from './s3.provider';
import { LocalStorageProvider } from './local.provider';
import { env, EnvConfig } from '../config/env';

export class StorageFactory {
  private static instance: IStorageProvider | null = null;

  public static getStorageProvider(config: EnvConfig = env): IStorageProvider {
    if (!StorageFactory.instance) {
      if (config.STORAGE_TYPE === 's3') {
        try {
          StorageFactory.instance = new S3StorageProvider(config);
          console.log(`📦 Storage provider initialized: AWS S3 (Bucket: ${config.AWS_S3_BUCKET})`);
        } catch (error) {
          console.warn('⚠️ Failed to initialize S3 storage provider. Falling back to local storage.', error);
          StorageFactory.instance = new LocalStorageProvider(config);
        }
      } else {
        StorageFactory.instance = new LocalStorageProvider(config);
        console.log(`📦 Storage provider initialized: Local Filesystem (${config.LOCAL_STORAGE_DIR})`);
      }
    }

    return StorageFactory.instance;
  }

  public static setStorageProvider(provider: IStorageProvider): void {
    StorageFactory.instance = provider;
  }

  public static resetInstance(): void {
    StorageFactory.instance = null;
  }

  /**
   * Seed default templates into storage if they do not already exist
   */
  public static async seedDefaultTemplates(provider: IStorageProvider): Promise<void> {
    try {
      const candidateDirs = [
        path.resolve(__dirname, 'default-templates'),
        path.resolve(__dirname, '../../src/storage/default-templates'),
        path.resolve(process.cwd(), 'src/storage/default-templates'),
        path.resolve(process.cwd(), 'dist/storage/default-templates'),
      ];

      const defaultTemplatesDir = candidateDirs.find((dir) => fs.existsSync(dir));
      if (!defaultTemplatesDir) return;

      const files = await fs.promises.readdir(defaultTemplatesDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const templateName = file.replace(/\.json$/, '');
          const existing = await provider.getTemplate(templateName);
          if (!existing) {
            const rawContent = await fs.promises.readFile(
              path.join(defaultTemplatesDir, file),
              'utf-8'
            );
            const templateJson = JSON.parse(rawContent);
            await provider.saveTemplate(templateName, templateJson);
            console.log(`🌱 Seeded default template: ${templateName}`);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to seed default templates:', error);
    }
  }
}
