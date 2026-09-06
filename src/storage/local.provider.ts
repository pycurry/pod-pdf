import fs from 'fs';
import path from 'path';
import { IStorageProvider, SavePdfResult } from './types';
import { EnvConfig } from '../config/env';

export class LocalStorageProvider implements IStorageProvider {
  private baseDir: string;
  private templateDir: string;
  private outputDir: string;
  private port: number;

  constructor(config: EnvConfig) {
    this.port = config.PORT;
    this.baseDir = path.resolve(config.LOCAL_STORAGE_DIR);
    this.templateDir = path.join(this.baseDir, 'templates');
    this.outputDir = path.join(this.baseDir, 'output');

    this.ensureDirectoryExists(this.templateDir);
    this.ensureDirectoryExists(this.outputDir);
  }

  getProviderName(): string {
    return 'local';
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private normalizeTemplateName(name: string): string {
    return name.endsWith('.json') ? name : `${name}.json`;
  }

  private normalizeOutputFilename(filename: string): string {
    return filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  }

  async saveTemplate(name: string, template: any): Promise<void> {
    const filename = this.normalizeTemplateName(name);
    const filePath = path.join(this.templateDir, filename);
    const content = typeof template === 'string' ? template : JSON.stringify(template, null, 2);
    await fs.promises.writeFile(filePath, content, 'utf-8');
  }

  async getTemplate(name: string): Promise<any | null> {
    const filename = this.normalizeTemplateName(name);
    const filePath = path.join(this.templateDir, filename);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  async listTemplates(): Promise<string[]> {
    if (!fs.existsSync(this.templateDir)) return [];

    const files = await fs.promises.readdir(this.templateDir);
    return files
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.replace(/\.json$/, ''));
  }

  async deleteTemplate(name: string): Promise<boolean> {
    const filename = this.normalizeTemplateName(name);
    const filePath = path.join(this.templateDir, filename);

    if (!fs.existsSync(filePath)) return false;

    await fs.promises.unlink(filePath);
    return true;
  }

  async saveOutputPdf(filename: string, buffer: Buffer): Promise<SavePdfResult> {
    const cleanFilename = this.normalizeOutputFilename(filename);
    const filePath = path.join(this.outputDir, cleanFilename);

    await fs.promises.writeFile(filePath, buffer);

    const relativeKey = `output/${cleanFilename}`;
    const url = await this.getPresignedDownloadUrl(relativeKey);

    return {
      key: relativeKey,
      url,
      size: buffer.length,
      bucket: 'local-filesystem',
      storageType: 'local',
    };
  }

  async getPdfBuffer(key: string): Promise<Buffer | null> {
    // If key has 'output/' prefix, strip it or resolve against baseDir
    const cleanKey = key.startsWith('output/') ? key.slice('output/'.length) : key;
    const filePath = path.join(this.outputDir, cleanKey);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    return await fs.promises.readFile(filePath);
  }

  async getPresignedDownloadUrl(key: string, _expiresInSeconds?: number): Promise<string> {
    const cleanKey = encodeURIComponent(key);
    return `http://localhost:${this.port}/api/v1/storage/download?key=${cleanKey}`;
  }

  async getPresignedUploadUrl(key: string, _expiresInSeconds?: number): Promise<string> {
    const cleanKey = encodeURIComponent(key);
    return `http://localhost:${this.port}/api/v1/storage/upload?key=${cleanKey}`;
  }
}

