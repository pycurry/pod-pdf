import qrcode from './qrcode.svg?raw';
import code128 from './code128.svg?raw';
import datamatrix from './datamatrix.svg?raw';
import gs1datamatrix from './gs1datamatrix.svg?raw';
import ean13 from './ean13.svg?raw';
import itf14 from './itf14.svg?raw';
import code39 from './code39.svg?raw';
import upca from './upca.svg?raw';
import upce from './upce.svg?raw';
import pdf417 from './pdf417.svg?raw';
import text from './text.svg?raw';
import image from './image.svg?raw';
import line from './line.svg?raw';
import rectangle from './rectangle.svg?raw';
import ellipse from './ellipse.svg?raw';

export const BARCODE_ICONS: Record<string, string> = {
  qrcode,
  code128,
  datamatrix,
  gs1datamatrix,
  ean13,
  itf14,
  code39,
  upca,
  upce,
  pdf417,
};

export const ALL_PLUGIN_ICONS: Record<string, string> = {
  ...BARCODE_ICONS,
  text,
  image,
  line,
  rectangle,
  ellipse,
};

export default ALL_PLUGIN_ICONS;

