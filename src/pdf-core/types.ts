export interface PageInput {
  pageIndex: number;
  data: Record<string, any>;
}

export interface GeneratePdfOptions {
  template: any;
  globalData?: Record<string, any>;
  pages: PageInput[];
}

export interface GeneratePdfResult {
  pdfBuffer: Buffer;
  pageCount: number;
  durationMs: number;
  sizeBytes: number;
}

export interface PageDimensionPreset {
  name: string;
  label: string;
  width: number;  // mm
  height: number; // mm
  description: string;
}

