export interface SavePdfResult {
  key: string;
  url: string;
  size: number;
  bucket?: string;
  storageType: string;
}

export interface TemplateMetadata {
  name: string;
  updatedAt?: string;
  size?: number;
}

export interface IStorageProvider {
  /**
   * Return provider name ('s3' | 'local')
   */
  getProviderName(): string;

  /**
   * Save or overwrite a template definition JSON
   */
  saveTemplate(name: string, template: any): Promise<void>;

  /**
   * Retrieve a template definition JSON by name
   */
  getTemplate(name: string): Promise<any | null>;

  /**
   * List all stored template names
   */
  listTemplates(): Promise<string[]>;

  /**
   * Delete a template by name
   */
  deleteTemplate(name: string): Promise<boolean>;

  /**
   * Save a generated PDF buffer to storage
   */
  saveOutputPdf(filename: string, buffer: Buffer): Promise<SavePdfResult>;

  /**
   * Read raw PDF buffer from storage
   */
  getPdfBuffer(key: string): Promise<Buffer | null>;

  /**
   * Generate a pre-signed or secure download URL
   */
  getPresignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Generate a pre-signed upload URL for direct client uploads
   */
  getPresignedUploadUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

