import { useEffect, useRef, useState } from 'react';
import { Designer } from '@pdfme/ui';
import { text, image, barcodes, line, rectangle, ellipse } from '@pdfme/schemas';

import { BARCODE_ICONS } from './assets/icons';


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

  // New Template Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [newPresetId, setNewPresetId] = useState<string>('thermal-4x6');
  const [newOrientation, setNewOrientation] = useState<PageOrientation>('portrait');
  const [newCustomWidth, setNewCustomWidth] = useState<number>(101.6);
  const [newCustomHeight, setNewCustomHeight] = useState<number>(152.4);
  const [newCustomUnit, setNewCustomUnit] = useState<DimensionUnit>('mm');
  const [newIncludeStarter, setNewIncludeStarter] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const designerContainerRef = useRef<HTMLDivElement | null>(null);
  const designerInstanceRef = useRef<Designer | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenNewModal = () => {
    const timestamp = Math.floor(Math.random() * 899 + 100);
    setNewTemplateName(`label-template-${timestamp}`);
    setNewPresetId('thermal-4x6');
    setNewOrientation('portrait');
    setNewCustomWidth(101.6);
    setNewCustomHeight(152.4);
    setNewCustomUnit('mm');
    setNewIncludeStarter(true);
    setIsNewModalOpen(true);
  };

  const handleCreateNewTemplate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = newTemplateName.trim();
    if (!cleanName) {
      showToast('❌ Template name cannot be empty');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanName)) {
      showToast('❌ Template name can only contain letters, numbers, hyphens, and underscores');
      return;
    }

    let widthMm = newCustomWidth;
    let heightMm = newCustomHeight;

    if (newPresetId !== 'custom') {
      const preset = PRESETS.find((p) => p.id === newPresetId);
      if (preset) {
        widthMm = preset.widthMm;
        heightMm = preset.heightMm;
      }
    } else if (newCustomUnit === 'in') {
      widthMm = parseFloat((newCustomWidth * 25.4).toFixed(2));
      heightMm = parseFloat((newCustomHeight * 25.4).toFixed(2));
    }

    // Apply orientation
    const minDim = Math.min(widthMm, heightMm);
    const maxDim = Math.max(widthMm, heightMm);
    const finalWidth = newOrientation === 'landscape' ? maxDim : minDim;
    const finalHeight = newOrientation === 'landscape' ? minDim : maxDim;

    const initialSchema = newIncludeStarter ? [
      {
        name: "title",
        type: "text",
        position: { x: 6, y: 6 },
        width: Math.min(finalWidth - 12, 60),
        height: 8,
        fontSize: 14,
        content: "Template Title",
      },
      {
        name: "barcode_tracking",
        type: "code128",
        position: { x: 6, y: 20 },
        width: Math.min(finalWidth - 12, 88),
        height: 25,
        content: "1Z9999999999999999",
      }
    ] : [];

    const newTemplateObj = {
      basePdf: {
        width: finalWidth,
        height: finalHeight,
        padding: [4, 4, 4, 4],
      },
      schemas: [initialSchema],
    };

    try {
      setIsCreating(true);
      const res = await fetch(`/api/v1/templates/${encodeURIComponent(cleanName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplateObj),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🎉 Created new template '${cleanName}'!`);
        setIsNewModalOpen(false);
        await fetchTemplates();
        setSelectedTemplateName(cleanName);
      } else {
        showToast(`❌ Failed to create template: ${data.error?.message || JSON.stringify(data)}`);
      }
    } catch (err: any) {
      showToast(`❌ Network error: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!window.confirm(`Are you sure you want to delete template '${selectedTemplateName}'?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/templates/${encodeURIComponent(selectedTemplateName)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🗑️ Deleted template '${selectedTemplateName}'`);
        await fetchTemplates();
      } else {
        showToast(`❌ Error deleting: ${data.error?.message}`);
      }
    } catch (err: any) {
      showToast(`❌ Network error: ${err.message}`);
    }
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
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenNewModal}
              title="Create a new template"
            >
              ➕ New
            </button>
            {templateList.length > 1 && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ color: '#ef4444', borderColor: '#ef4444', padding: '4px 7px' }}
                onClick={handleDeleteTemplate}
                title={`Delete '${selectedTemplateName}'`}
              >
                🗑️
              </button>
            )}
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

      {/* New Template Modal */}
      {isNewModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsNewModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span>📄</span> Create New Template
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsNewModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewTemplate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Template Identifier:</label>
                  <input
                    type="text"
                    className="form-input-text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="e.g. shipping-pallet-v1"
                    autoFocus
                    required
                  />
                  <span className="form-hint">
                    Unique name stored in S3/storage (alphanumeric, hyphens, underscores).
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Starting Paper Size:</label>
                  <select
                    className="form-select"
                    value={newPresetId}
                    onChange={(e) => setNewPresetId(e.target.value)}
                  >
                    {PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {newPresetId === 'custom' && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Width:</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        className="form-input-text"
                        value={newCustomWidth}
                        onChange={(e) => setNewCustomWidth(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Height:</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        className="form-input-text"
                        value={newCustomHeight}
                        onChange={(e) => setNewCustomHeight(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="form-group" style={{ width: '80px' }}>
                      <label className="form-label">Unit:</label>
                      <select
                        className="form-select"
                        value={newCustomUnit}
                        onChange={(e) => setNewCustomUnit(e.target.value as DimensionUnit)}
                      >
                        <option value="mm">mm</option>
                        <option value="in">in</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Initial Orientation:</label>
                  <div className="btn-group" style={{ alignSelf: 'flex-start' }}>
                    <button
                      type="button"
                      className={`btn-group-item ${newOrientation === 'portrait' ? 'active' : ''}`}
                      onClick={() => setNewOrientation('portrait')}
                    >
                      📄 Portrait
                    </button>
                    <button
                      type="button"
                      className={`btn-group-item ${newOrientation === 'landscape' ? 'active' : ''}`}
                      onClick={() => setNewOrientation('landscape')}
                    >
                      🖼️ Landscape
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                    <input
                      type="checkbox"
                      checked={newIncludeStarter}
                      onChange={(e) => setNewIncludeStarter(e.target.checked)}
                    />
                    Include starter elements (Title text & Code 128 barcode)
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ color: '#64748b', borderColor: '#cbd5e1' }}
                  onClick={() => setIsNewModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isCreating}
                >
                  {isCreating ? 'Creating...' : '✨ Create & Open'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
