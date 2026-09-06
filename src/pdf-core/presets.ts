import { PageDimensionPreset } from './types';

export type PageOrientation = 'portrait' | 'landscape';
export type DimensionUnit = 'mm' | 'in';

export const PAGE_PRESETS: Record<string, PageDimensionPreset> = {
  THERMAL_4X6: {
    name: 'thermal-4x6',
    label: '4" x 6" Thermal Label',
    width: 101.6,
    height: 152.4,
    description: 'Standard enterprise logistics, container and shipping roll label (101.6mm x 152.4mm / 4" x 6")',
  },
  THERMAL_4X8: {
    name: 'thermal-4x8',
    label: '4" x 8" Freight Label',
    width: 101.6,
    height: 203.2,
    description: 'Extended freight and pallet logistics label (101.6mm x 203.2mm / 4" x 8")',
  },
  A4: {
    name: 'a4',
    label: 'A4 Document',
    width: 210.0,
    height: 297.0,
    description: 'ISO standard multi-page manifest and document sheet (210mm x 297mm)',
  },
  LETTER: {
    name: 'letter',
    label: 'US Letter',
    width: 215.9,
    height: 279.4,
    description: 'Standard North American document size (8.5" x 11" / 215.9mm x 279.4mm)',
  },
  LEGAL: {
    name: 'legal',
    label: 'US Legal',
    width: 215.9,
    height: 355.6,
    description: 'Standard North American legal document size (8.5" x 14" / 215.9mm x 355.6mm)',
  },
};

/**
 * Convert value between mm and inches (1 inch = 25.4 mm)
 */
export function convertDimension(value: number, fromUnit: DimensionUnit, toUnit: DimensionUnit): number {
  if (fromUnit === toUnit) return value;
  if (fromUnit === 'in' && toUnit === 'mm') {
    return parseFloat((value * 25.4).toFixed(2));
  }
  if (fromUnit === 'mm' && toUnit === 'in') {
    return parseFloat((value / 25.4).toFixed(2));
  }
  return value;
}

/**
 * Returns dimensions adjusted for portrait or landscape orientation
 */
export function getOrientedDimensions(
  width: number,
  height: number,
  orientation: PageOrientation
): { width: number; height: number } {
  const minDim = Math.min(width, height);
  const maxDim = Math.max(width, height);

  if (orientation === 'landscape') {
    return { width: maxDim, height: minDim };
  }
  return { width: minDim, height: maxDim };
}
