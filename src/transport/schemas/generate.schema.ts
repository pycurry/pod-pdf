import { z } from 'zod';

export const pageDataSchema = z.object({
  pageIndex: z.number().int().min(0, 'pageIndex must be a non-negative integer'),
  data: z.record(z.any()).default({}),
});

export const generatePdfRequestSchema = z.object({
  templateName: z.string().min(1, 'templateName is required'),
  outputFilename: z.string().optional(),
  asyncMode: z.boolean().default(false),
  webhookUrl: z.string().url('webhookUrl must be a valid URL').optional().or(z.literal('')),
  globalData: z.record(z.any()).default({}),
  pages: z.array(pageDataSchema).min(1, 'At least one page data entry is required'),
  customTemplate: z.any().optional(), // For ad-hoc or unpersisted templates
});

export type PageDataDto = z.infer<typeof pageDataSchema>;
export type GeneratePdfRequestDto = z.infer<typeof generatePdfRequestSchema>;

export const previewPdfRequestSchema = z.object({
  template: z.any().optional(),
  templateName: z.string().optional(),
  globalData: z.record(z.any()).default({}),
  pages: z.array(pageDataSchema).min(1, 'At least one page is required'),
});

export type PreviewPdfRequestDto = z.infer<typeof previewPdfRequestSchema>;

