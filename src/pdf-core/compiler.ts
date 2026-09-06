import { GeneratePdfOptions } from './types';

export interface CompiledPdfJob {
  template: any;
  inputs: Record<string, string>[];
}

export class TemplateCompiler {
  /**
   * Compiles the template and payload pages into a format ready for pdfme generator.
   * - Merges globalData into each page's data.
   * - Ensures schemas array matches the number of requested pages.
   * - Stringifies input values for compatibility with pdfme plugins.
   */
  public static compile(options: GeneratePdfOptions): CompiledPdfJob {
    const { template, globalData = {}, pages } = options;

    if (!template) {
      throw new Error('Template is required for PDF compilation');
    }

    if (!template.schemas || !Array.isArray(template.schemas) || template.schemas.length === 0) {
      throw new Error('Template must contain a non-empty schemas array');
    }

    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      throw new Error('At least one page is required in the payload');
    }

    // Sort pages by pageIndex
    const sortedPages = [...pages].sort((a, b) => a.pageIndex - b.pageIndex);
    const targetPageCount = sortedPages.length;

    // Clone template schemas to match targetPageCount
    const originalSchemas = template.schemas;
    const compiledSchemas: any[][] = [];

    for (let i = 0; i < targetPageCount; i++) {
      // If template defines a schema for page i, use it; otherwise clone the first/last schema page
      const schemaForPage =
        i < originalSchemas.length
          ? originalSchemas[i]
          : originalSchemas[0]; // Reuse single-page template across multi-page payloads
      compiledSchemas.push(JSON.parse(JSON.stringify(schemaForPage)));
    }

    const compiledTemplate = {
      ...template,
      schemas: compiledSchemas,
    };

    // Compile inputs for each page
    const compiledInputs: Record<string, string>[] = sortedPages.map((page) => {
      const mergedData = { ...globalData, ...(page.data || {}) };
      const normalizedInputs: Record<string, string> = {};

      for (const [key, value] of Object.entries(mergedData)) {
        if (value === null || value === undefined) {
          normalizedInputs[key] = '';
        } else if (typeof value === 'object') {
          normalizedInputs[key] = JSON.stringify(value);
        } else {
          normalizedInputs[key] = String(value);
        }
      }

      return normalizedInputs;
    });

    return {
      template: compiledTemplate,
      inputs: compiledInputs,
    };
  }
}

