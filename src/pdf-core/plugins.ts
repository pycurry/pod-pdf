import { Plugins } from '@pdfme/common';

let cachedPlugins: Plugins | null = null;

export async function getPdfPlugins(): Promise<Plugins> {
  if (cachedPlugins) return cachedPlugins;

  const schemas = await import('@pdfme/schemas');
  const { text, image, barcodes, line, rectangle, ellipse } = schemas;

  const datamatrixPlugin = {
    ...barcodes.gs1datamatrix,
    propPanel: {
      ...barcodes.gs1datamatrix.propPanel,
      defaultSchema: {
        ...barcodes.gs1datamatrix.propPanel.defaultSchema,
        type: 'datamatrix',
      },
    },
  };

  cachedPlugins = {
    text,
    image,
    line: line as any,
    rectangle: rectangle as any,
    ellipse: ellipse as any,
    qrcode: barcodes.qrcode as any,
    code128: barcodes.code128 as any,
    datamatrix: datamatrixPlugin as any,
    gs1datamatrix: barcodes.gs1datamatrix as any,
    ean13: barcodes.ean13 as any,
    itf14: barcodes.itf14 as any,
    code39: barcodes.code39 as any,
    upce: barcodes.upce as any,
    upca: barcodes.upca as any,
    pdf417: barcodes.pdf417 as any,
  };

  return cachedPlugins;
}

