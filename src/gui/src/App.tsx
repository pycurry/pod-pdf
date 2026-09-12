import { useEffect, useRef, useState } from 'react';
import { Designer } from '@pdfme/ui';
import { text, image, barcodes, line, rectangle, ellipse } from '@pdfme/schemas';

// Distinct SVG icons for barcode differentiation
const BARCODE_ICONS: Record<string, string> = {
  // QR Code: Classic 3-corner finder squares + matrix cells
  qrcode: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" stroke-width="2"></rect><rect x="5" y="5" width="3" height="3" fill="currentColor"></rect><rect x="14" y="3" width="7" height="7" stroke-width="2"></rect><rect x="16" y="5" width="3" height="3" fill="currentColor"></rect><rect x="3" y="14" width="7" height="7" stroke-width="2"></rect><rect x="5" y="16" width="3" height="3" fill="currentColor"></rect><rect x="14" y="14" width="3" height="3" fill="currentColor"></rect><rect x="18" y="18" width="3" height="3" fill="currentColor"></rect><rect x="18" y="14" width="3" height="3" fill="currentColor"></rect></svg>`,

  // Code 128: Crisp linear shipping barcode with varying bar widths
  code128: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"><line x1="3" y1="4" x2="3" y2="20" stroke-width="2"></line><line x1="6" y1="4" x2="6" y2="20" stroke-width="3"></line><line x1="10" y1="4" x2="10" y2="20" stroke-width="1.5"></line><line x1="13" y1="4" x2="13" y2="20" stroke-width="2.5"></line><line x1="17" y1="4" x2="17" y2="20" stroke-width="1"></line><line x1="21" y1="4" x2="21" y2="20" stroke-width="2"></line></svg>`,

  // DataMatrix: Distinctive solid 'L' border on bottom and left, alternating clock track on top and right
  datamatrix: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M4 4v16h16" stroke-width="2.5"></path><line x1="8" y1="4" x2="10" y2="4" stroke-width="2"></line><line x1="14" y1="4" x2="16" y2="4" stroke-width="2"></line><line x1="20" y1="8" x2="20" y2="10" stroke-width="2"></line><line x1="20" y1="14" x2="20" y2="16" stroke-width="2"></line><rect x="7" y="7" width="2.5" height="2.5" fill="currentColor"></rect><rect x="13" y="7" width="2.5" height="2.5" fill="currentColor"></rect><rect x="10" y="10" width="2.5" height="2.5" fill="currentColor"></rect><rect x="16" y="10" width="2.5" height="2.5" fill="currentColor"></rect><rect x="7" y="13" width="2.5" height="2.5" fill="currentColor"></rect><rect x="13" y="13" width="2.5" height="2.5" fill="currentColor"></rect></svg>`,

  // GS1 DataMatrix: DataMatrix with distinctive corner brackets
  gs1datamatrix: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 5v14h14" stroke-width="2.5"></path><rect x="6" y="8" width="2" height="2" fill="currentColor"></rect><rect x="11" y="8" width="2" height="2" fill="currentColor"></rect><rect x="8" y="11" width="2" height="2" fill="currentColor"></rect><rect x="13" y="11" width="2" height="2" fill="currentColor"></rect><rect x="6" y="14" width="2" height="2" fill="currentColor"></rect><path d="M17 3h4v4" stroke-width="1.8"></path><path d="M21 17v4h-4" stroke-width="1.8"></path></svg>`,

  // EAN-13: Characteristic guard bars on left, center, and right that extend down
  ean13: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"><line x1="3" y1="4" x2="3" y2="21" stroke-width="2"></line><line x1="5" y1="4" x2="5" y2="21" stroke-width="1.5"></line><line x1="8" y1="4" x2="8" y2="18"></line><line x1="10" y1="4" x2="10" y2="18" stroke-width="2"></line><line x1="12" y1="4" x2="12" y2="21" stroke-width="1.5"></line><line x1="14" y1="4" x2="14" y2="21" stroke-width="1.5"></line><line x1="17" y1="4" x2="17" y2="18" stroke-width="2"></line><line x1="20" y1="4" x2="20" y2="21" stroke-width="1.5"></line><line x1="22" y1="4" x2="22" y2="21" stroke-width="2"></line></svg>`,

  // ITF-14: Master shipping carton enclosed in a heavy rectangular bearer box
  itf14: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><rect x="2" y="4" width="20" height="16" stroke-width="2.5"></rect><line x1="5" y1="7" x2="5" y2="17" stroke-width="1.5"></line><line x1="8" y1="7" x2="8" y2="17" stroke-width="2.5"></line><line x1="12" y1="7" x2="12" y2="17" stroke-width="1"></line><line x1="15" y1="7" x2="15" y2="17" stroke-width="2"></line><line x1="18" y1="7" x2="18" y2="17" stroke-width="1.5"></line></svg>`,

  // Code 39: Standard discrete barcode pattern with start/stop lines
  code39: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"><line x1="3" y1="4" x2="3" y2="20" stroke-width="2.5"></line><line x1="6" y1="4" x2="6" y2="20" stroke-width="1"></line><line x1="9" y1="4" x2="9" y2="20" stroke-width="2.5"></line><line x1="13" y1="4" x2="13" y2="20" stroke-width="1"></line><line x1="16" y1="4" x2="16" y2="20" stroke-width="2.5"></line><line x1="20" y1="4" x2="20" y2="20" stroke-width="1.5"></line></svg>`,

  // UPC-A: 12-digit standard retail barcode with split pattern
  upca: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"><line x1="3" y1="4" x2="3" y2="21" stroke-width="2"></line><line x1="5" y1="4" x2="5" y2="21" stroke-width="1.5"></line><line x1="8" y1="4" x2="8" y2="18" stroke-width="2"></line><line x1="11" y1="4" x2="11" y2="18" stroke-width="1"></line><line x1="13" y1="4" x2="13" y2="21" stroke-width="1.5"></line><line x1="16" y1="4" x2="16" y2="18" stroke-width="2"></line><line x1="19" y1="4" x2="19" y2="21" stroke-width="1.5"></line><line x1="21" y1="4" x2="21" y2="21" stroke-width="2"></line></svg>`,

  // UPC-E: Compact 6-digit retail barcode
  upce: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"><line x1="4" y1="4" x2="4" y2="21" stroke-width="2"></line><line x1="6" y1="4" x2="6" y2="21" stroke-width="1"></line><line x1="9" y1="4" x2="9" y2="18" stroke-width="2"></line><line x1="12" y1="4" x2="12" y2="18" stroke-width="2.5"></line><line x1="15" y1="4" x2="15" y2="18" stroke-width="1.5"></line><line x1="18" y1="4" x2="18" y2="21" stroke-width="2"></line></svg>`,

  // PDF-417: Stacked 2D barcode rows
  pdf417: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"><line x1="3" y1="4" x2="3" y2="20" stroke-width="2.5"></line><line x1="21" y1="4" x2="21" y2="20" stroke-width="2.5"></line><line x1="6" y1="6" x2="18" y2="6" stroke-dasharray="2 1.5"></line><line x1="6" y1="9.5" x2="18" y2="9.5" stroke-dasharray="3 1"></line><line x1="6" y1="13" x2="18" y2="13" stroke-dasharray="1.5 2"></line><line x1="6" y1="16.5" x2="18" y2="16.5" stroke-dasharray="2 1.5"></line></svg>`,
};

const PLUGIN_DESCRIPTIONS: Record<string, string> = {
  text: 'Text: Single or multi-line dynamic/static text',
  image: 'Image: Static or dynamic graphic',
  line: 'Line: Divider line',
  rectangle: 'Rectangle: Border box or background block',
  ellipse: 'Ellipse: Circle or oval shape',
  qrcode: 'QR Code: 2D Quick Response matrix',
  code128: 'Code 128: Universal logistics & shipping barcode',
  datamatrix: 'DataMatrix: 2D square matrix for packaging & containers',
  gs1datamatrix: 'GS1 DataMatrix: GS1 compliant 2D barcode',
  ean13: 'EAN-13: Standard 13-digit retail barcode',
  itf14: 'ITF-14: Master carton & shipping container barcode with bearer box',
  code39: 'Code 39: Alphanumeric industrial barcode',
  upce: 'UPC-E: Compact 6-digit retail barcode',
  upca: 'UPC-A: Standard 12-digit retail barcode',
  pdf417: 'PDF-417: High-capacity stacked 2D transport barcode',
};

const datamatrixPlugin = {
  ...barcodes.gs1datamatrix,
  icon: BARCODE_ICONS.datamatrix,
  propPanel: {
    ...barcodes.gs1datamatrix.propPanel,
    defaultSchema: {
      ...barcodes.gs1datamatrix.propPanel.defaultSchema,
      type: 'datamatrix',
    },
  },
};

const plugins = {
  text,
  image,
  line,
  rectangle,
  ellipse,
  qrcode: { ...barcodes.qrcode, icon: BARCODE_ICONS.qrcode },
  code128: { ...barcodes.code128, icon: BARCODE_ICONS.code128 },
  datamatrix: datamatrixPlugin,
  gs1datamatrix: { ...barcodes.gs1datamatrix, icon: BARCODE_ICONS.gs1datamatrix },
  ean13: { ...barcodes.ean13, icon: BARCODE_ICONS.ean13 },
  itf14: { ...barcodes.itf14, icon: BARCODE_ICONS.itf14 },
  code39: { ...barcodes.code39, icon: BARCODE_ICONS.code39 },
  upce: { ...barcodes.upce, icon: BARCODE_ICONS.upce },
  upca: { ...barcodes.upca, icon: BARCODE_ICONS.upca },
  pdf417: { ...barcodes.pdf417, icon: BARCODE_ICONS.pdf417 },
};

type DimensionUnit = 'mm' | 'in';
type PageOrientation = 'portrait' | 'landscape';

interface PresetItem {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  description: string;
}

const PRESETS: PresetItem[] = [
  { id: 'thermal-4x6', name: '4" × 6" Thermal Label (Logistics)', widthMm: 101.6, heightMm: 152.4, description: '4x6" Roll' },
  { id: 'thermal-4x8', name: '4" × 8" Freight Label', widthMm: 101.6, heightMm: 203.2, description: '4x8" Roll' },
  { id: 'a4', name: 'A4 Document (210 × 297 mm)', widthMm: 210.0, heightMm: 297.0, description: 'ISO A4' },
  { id: 'letter', name: 'US Letter (8.5" × 11")', widthMm: 215.9, heightMm: 279.4, description: 'US Letter' },
  { id: 'legal', name: 'US Legal (8.5" × 14")', widthMm: 215.9, heightMm: 355.6, description: 'US Legal' },
  { id: 'custom', name: '✨ Custom Dimensions...', widthMm: 101.6, heightMm: 152.4, description: 'Custom' },
];

const DEFAULT_SAMPLE_PAYLOAD = {
  templateName: "logistic-container-label-v2",
  outputFilename: "shipment-98234-labels.pdf",
  asyncMode: false,
  globalData: {
    carrier: "GlobalExpress",
    serviceLevel: "Express-Air"
  },
  pages: [
    {
      pageIndex: 0,
      data: {
        containerId: "CONT-2026-9901",
        destinationHub: "BOM-T3",
        weight: "450kg",
        barcode_tracking: "1Z9999999999999999",
        qrcode_manifest: "https://logistics.internal/manifest/9901",
        matrix_code: "SKU:A99-B|BATCH:12|LOC:Z4"
      }
    }
  ]
};

const DEFAULT_TEMPLATE = {
  basePdf: {
    width: 101.6,
    height: 152.4,
    padding: [4, 4, 4, 4]
  },
  schemas: [
    [
      {
        name: "carrier",
        type: "text",
        position: { x: 6, y: 6 },
        width: 50,
        height: 7,
        fontSize: 14
      },
      {
        name: "barcode_tracking",
        type: "code128",
        position: { x: 6, y: 30 },
        width: 88,
        height: 30
      }
    ]
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'designer' | 'tester'>('designer');
  const [templateList, setTemplateList] = useState<string[]>([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('logistic-container-label-v2');
  const [currentTemplate, setCurrentTemplate] = useState<any>(DEFAULT_TEMPLATE);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sizing & Orientation State
  const [selectedPresetId, setSelectedPresetId] = useState<string>('thermal-4x6');
  const [orientation, setOrientation] = useState<PageOrientation>('portrait');
  const [dimensionUnit, setDimensionUnit] = useState<DimensionUnit>('mm');
  const [customWidth, setCustomWidth] = useState<number>(101.6);
  const [customHeight, setCustomHeight] = useState<number>(152.4);

  // Tester state
  const [testPayloadText, setTestPayloadText] = useState<string>(
    JSON.stringify(DEFAULT_SAMPLE_PAYLOAD, null, 2)
  );
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const designerContainerRef = useRef<HTMLDivElement | null>(null);
  const designerInstanceRef = useRef<Designer | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch templates list on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/v1/templates');
      const data = await res.json();
      if (data.success && data.data?.templates) {
        setTemplateList(data.data.templates);
        if (data.data.templates.length > 0 && !data.data.templates.includes(selectedTemplateName)) {
          setSelectedTemplateName(data.data.templates[0]);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch templates:', err);
    }
  };

  // Helper to sync dimensions state from template
  const syncDimensionsFromTemplate = (template: any) => {
    if (!template?.basePdf) return;
    const width = template.basePdf.width || 101.6;
    const height = template.basePdf.height || 152.4;

    const isLandscape = width > height;
    const detectedOrientation: PageOrientation = isLandscape ? 'landscape' : 'portrait';
    setOrientation(detectedOrientation);

    // Normalize to portrait dimensions to find matching preset
    const minDim = parseFloat(Math.min(width, height).toFixed(1));
    const maxDim = parseFloat(Math.max(width, height).toFixed(1));

    const matched = PRESETS.find(
      (p) => p.id !== 'custom' &&
        Math.abs(p.widthMm - minDim) < 1.0 &&
        Math.abs(p.heightMm - maxDim) < 1.0
    );

    if (matched) {
      setSelectedPresetId(matched.id);
      if (dimensionUnit === 'in') {
        setCustomWidth(parseFloat((width / 25.4).toFixed(2)));
        setCustomHeight(parseFloat((height / 25.4).toFixed(2)));
      } else {
        setCustomWidth(width);
        setCustomHeight(height);
      }
    } else {
      setSelectedPresetId('custom');
      if (dimensionUnit === 'in') {
        setCustomWidth(parseFloat((width / 25.4).toFixed(2)));
        setCustomHeight(parseFloat((height / 25.4).toFixed(2)));
      } else {
        setCustomWidth(width);
        setCustomHeight(height);
      }
    }
  };

  // Load selected template
  useEffect(() => {
    if (!selectedTemplateName) return;
    loadTemplate(selectedTemplateName);
  }, [selectedTemplateName]);

  const loadTemplate = async (name: string) => {
    try {
      const res = await fetch(`/api/v1/templates/${encodeURIComponent(name)}`);
      const data = await res.json();
      if (data.success && data.data?.template) {
        setCurrentTemplate(data.data.template);
        syncDimensionsFromTemplate(data.data.template);
        if (designerInstanceRef.current) {
          designerInstanceRef.current.updateTemplate(data.data.template);
        }
      }
    } catch (err) {
      console.error('Failed to load template:', err);
    }
  };

  // Initialize pdfme Designer
  useEffect(() => {
    if (activeTab !== 'designer' || !designerContainerRef.current) return;

    if (!designerInstanceRef.current) {
      designerInstanceRef.current = new Designer({
        domContainer: designerContainerRef.current,
        template: currentTemplate,
        plugins: plugins as any,
        options: {
          icons: BARCODE_ICONS,
        },
      });

      designerInstanceRef.current.onSaveTemplate((updatedTemplate) => {
        setCurrentTemplate(updatedTemplate);
        syncDimensionsFromTemplate(updatedTemplate);
      });
    } else {
      designerInstanceRef.current.updateTemplate(currentTemplate);
    }

    // Attach rich tooltips to sidebar plugin buttons
    const applyTooltips = () => {
      if (!designerContainerRef.current) return;
      Object.entries(PLUGIN_DESCRIPTIONS).forEach(([type, desc]) => {
        const btn = designerContainerRef.current?.querySelector(
          `.pdfme-designer-plugin-${type}`
        ) as HTMLElement | null;
        if (btn) {
          btn.setAttribute('title', desc);
        }
      });
    };

    const timer = setTimeout(applyTooltips, 150);

    return () => {
      clearTimeout(timer);
      if (designerInstanceRef.current) {
        designerInstanceRef.current.destroy();
        designerInstanceRef.current = null;
      }
    };
  }, [activeTab]);

  const handleSaveTemplate = async () => {
    if (!designerInstanceRef.current) return;
    const updated = designerInstanceRef.current.getTemplate();
    setCurrentTemplate(updated);

    try {
      const res = await fetch(`/api/v1/templates/${encodeURIComponent(selectedTemplateName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ Template '${selectedTemplateName}' saved successfully!`);
        fetchTemplates();
      } else {
        showToast(`❌ Error saving: ${data.error?.message}`);
      }
    } catch (err: any) {
      showToast(`❌ Network error: ${err.message}`);
    }
  };

  // Apply dimensions & orientation to template
  const applyDimensions = (
    widthMm: number,
    heightMm: number,
    targetOrientation: PageOrientation = orientation
  ) => {
    let finalWidthMm = widthMm;
    let finalHeightMm = heightMm;

    // Apply orientation: portrait (height >= width), landscape (width >= height)
    const minDim = Math.min(widthMm, heightMm);
    const maxDim = Math.max(widthMm, heightMm);

    if (targetOrientation === 'landscape') {
      finalWidthMm = maxDim;
      finalHeightMm = minDim;
    } else {
      finalWidthMm = minDim;
      finalHeightMm = maxDim;
    }

    const current = designerInstanceRef.current ? designerInstanceRef.current.getTemplate() : currentTemplate;
    const padding = current.basePdf?.padding || [4, 4, 4, 4];

    const newTemplate = {
      ...current,
      basePdf: {
        ...(typeof current.basePdf === 'object' ? current.basePdf : {}),
        width: finalWidthMm,
        height: finalHeightMm,
        padding,
      },
    };

    setCurrentTemplate(newTemplate);
    if (designerInstanceRef.current) {
      designerInstanceRef.current.updateTemplate(newTemplate);
    }
  };

  // Preset dropdown changed
  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);

    if (presetId === 'custom') {
      showToast('Enter custom width & height below');
      return;
    }

    const preset = PRESETS.find((p) => p.id === presetId);
    if (preset) {
      if (dimensionUnit === 'in') {
        setCustomWidth(parseFloat((preset.widthMm / 25.4).toFixed(2)));
        setCustomHeight(parseFloat((preset.heightMm / 25.4).toFixed(2)));
      } else {
        setCustomWidth(preset.widthMm);
        setCustomHeight(preset.heightMm);
      }
      applyDimensions(preset.widthMm, preset.heightMm, orientation);
      showToast(`Changed size to ${preset.name}`);
    }
  };

  // Orientation toggle
  const handleOrientationChange = (newOrientation: PageOrientation) => {
    if (newOrientation === orientation) return;
    setOrientation(newOrientation);

    // Calculate current width and height in mm
    let widthMm = customWidth;
    let heightMm = customHeight;
    if (dimensionUnit === 'in') {
      widthMm = customWidth * 25.4;
      heightMm = customHeight * 25.4;
    }

    if (selectedPresetId !== 'custom') {
      const preset = PRESETS.find((p) => p.id === selectedPresetId);
      if (preset) {
        widthMm = preset.widthMm;
        heightMm = preset.heightMm;
      }
    }

    applyDimensions(widthMm, heightMm, newOrientation);
    showToast(`Orientation switched to ${newOrientation.toUpperCase()}`);
  };

  // Unit switch (mm <-> in)
  const handleUnitChange = (newUnit: DimensionUnit) => {
    if (newUnit === dimensionUnit) return;
    if (newUnit === 'in') {
      setCustomWidth(parseFloat((customWidth / 25.4).toFixed(2)));
      setCustomHeight(parseFloat((customHeight / 25.4).toFixed(2)));
    } else {
      setCustomWidth(parseFloat((customWidth * 25.4).toFixed(2)));
      setCustomHeight(parseFloat((customHeight * 25.4).toFixed(2)));
    }
    setDimensionUnit(newUnit);
  };

  // Apply custom dimensions button
  const handleApplyCustomDimensions = () => {
    let widthMm = customWidth;
    let heightMm = customHeight;
    if (dimensionUnit === 'in') {
      widthMm = parseFloat((customWidth * 25.4).toFixed(2));
      heightMm = parseFloat((customHeight * 25.4).toFixed(2));
    }

    if (widthMm <= 0 || heightMm <= 0) {
      showToast('❌ Width and height must be greater than 0');
      return;
    }

    applyDimensions(widthMm, heightMm, orientation);
    showToast(`Custom dimensions applied: ${widthMm} mm × ${heightMm} mm`);
  };

  const handleGenerateTestPdf = async () => {
    try {
      setIsGenerating(true);
      const parsed = JSON.parse(testPayloadText);

      // If user is currently editing template in designer, pass current customTemplate
      if (designerInstanceRef.current) {
        parsed.customTemplate = designerInstanceRef.current.getTemplate();
      }

      const res = await fetch('/api/v1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      const data = await res.json();
      if (data.success && data.data?.url) {
        setPreviewPdfUrl(data.data.url);
        showToast(`🎉 PDF Generated (${data.data.size} bytes in ${data.data.durationMs}ms)`);
      } else {
        showToast(`❌ Generation failed: ${data.error?.message || JSON.stringify(data)}`);
      }
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Computed display dimension info
  const curWidthMm = currentTemplate?.basePdf?.width || 101.6;
  const curHeightMm = currentTemplate?.basePdf?.height || 152.4;
  const curWidthIn = (curWidthMm / 25.4).toFixed(2);
  const curHeightIn = (curHeightMm / 25.4).toFixed(2);

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="top-bar">
        <div className="brand-section">
          <div className="brand-logo">
            📦 pod-PDF <span className="brand-badge">Enterprise</span>
          </div>
        </div>

        <div className="controls-section">
          <div className="control-group">
            <label className="control-label">Template:</label>
            <select
              className="select-input"
              value={selectedTemplateName}
              onChange={(e) => setSelectedTemplateName(e.target.value)}
            >
              {templateList.map((tpl) => (
                <option key={tpl} value={tpl}>
                  {tpl}
                </option>
              ))}
            </select>
          </div>

          {activeTab === 'designer' && (
            <>
              {/* Paper Size Preset */}
              <div className="control-group">
                <label className="control-label">Paper Size:</label>
                <select
                  className="select-input"
                  value={selectedPresetId}
                  onChange={(e) => handlePresetChange(e.target.value)}
                >
                  {PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Orientation Selector: Portrait / Landscape */}
              <div className="control-group">
                <label className="control-label">Orientation:</label>
                <div className="btn-group">
                  <button
                    type="button"
                    className={`btn-group-item ${orientation === 'portrait' ? 'active' : ''}`}
                    onClick={() => handleOrientationChange('portrait')}
                    title="Portrait Orientation"
                  >
                    📄 Portrait
                  </button>
                  <button
                    type="button"
                    className={`btn-group-item ${orientation === 'landscape' ? 'active' : ''}`}
                    onClick={() => handleOrientationChange('landscape')}
                    title="Landscape Orientation"
                  >
                    🖼️ Landscape
                  </button>
                </div>
              </div>

              {/* Custom Dimensions (Width, Height, Unit) */}
              {selectedPresetId === 'custom' && (
                <div className="control-group" style={{ background: '#1e293b', padding: '3px 8px', borderRadius: '6px', border: '1px solid #334155' }}>
                  <label className="control-label">W:</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    className="num-input"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(parseFloat(e.target.value) || 0)}
                  />

                  <label className="control-label" style={{ marginLeft: '4px' }}>H:</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    className="num-input"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(parseFloat(e.target.value) || 0)}
                  />

                  <select
                    className="select-input"
                    style={{ padding: '4px 6px', fontSize: '12px', marginLeft: '4px' }}
                    value={dimensionUnit}
                    onChange={(e) => handleUnitChange(e.target.value as DimensionUnit)}
                  >
                    <option value="mm">mm</option>
                    <option value="in">inches</option>
                  </select>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ marginLeft: '6px' }}
                    onClick={handleApplyCustomDimensions}
                  >
                    Apply
                  </button>
                </div>
              )}

              {/* Save Template Button */}
              <button className="btn btn-success" onClick={handleSaveTemplate}>
                💾 Save Template
              </button>
            </>
          )}
        </div>
      </header>

      {/* Tabs & Dimension Info */}
      <div className="tabs-container">
        <div className="tabs-left">
          <button
            className={`tab-btn ${activeTab === 'designer' ? 'active' : ''}`}
            onClick={() => setActiveTab('designer')}
          >
            🎨 Visual Template Designer
          </button>
          <button
            className={`tab-btn ${activeTab === 'tester' ? 'active' : ''}`}
            onClick={() => setActiveTab('tester')}
          >
            ⚡ Payload Tester & Live PDF Preview
          </button>
        </div>

        <div className="tab-right-info">
          <span className="size-badge" title="Canvas Page Dimensions">
            📐 {curWidthMm} × {curHeightMm} mm ({curWidthIn}" × {curHeightIn}") · {orientation.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'designer' ? (
          <div className="designer-wrapper" ref={designerContainerRef} />
        ) : (
          <div className="tester-panel">
            <div className="tester-left">
              <div className="tester-header">
                <span>Request Payload (JSON)</span>
                <button
                  className="btn btn-outline"
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                  onClick={() => setTestPayloadText(JSON.stringify(DEFAULT_SAMPLE_PAYLOAD, null, 2))}
                >
                  Reset Sample
                </button>
              </div>

              <textarea
                className="json-editor"
                value={testPayloadText}
                onChange={(e) => setTestPayloadText(e.target.value)}
                spellCheck={false}
              />

              <div className="tester-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleGenerateTestPdf}
                  disabled={isGenerating}
                >
                  {isGenerating ? '⏳ Generating...' : '🚀 Generate PDF'}
                </button>
              </div>
            </div>

            <div className="tester-preview">
              {previewPdfUrl ? (
                <iframe
                  title="PDF Preview"
                  className="preview-iframe"
                  src={previewPdfUrl}
                />
              ) : (
                <div style={{ color: '#64748b', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
                  <p>Click <strong>Generate PDF</strong> to render and preview the output document</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {toastMessage && <div className="toast">{toastMessage}</div>}
    </div>
  );
}
