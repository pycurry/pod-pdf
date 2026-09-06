import { z } from 'zod';

export const saveTemplateSchema = z.object({
  basePdf: z.union([
    z.string(),
    z.object({
      width: z.number().positive(),
      height: z.number().positive(),
      padding: z.array(z.number()).length(4).optional(),
      staticSchema: z.array(z.any()).optional(),
    }),
  ]),
  schemas: z.array(z.array(z.any())).min(1, 'Template must contain at least one page schema'),
  sampledata: z.array(z.record(z.any())).optional(),
  columns: z.array(z.string()).optional(),
});

export type SaveTemplateDto = z.infer<typeof saveTemplateSchema>;

