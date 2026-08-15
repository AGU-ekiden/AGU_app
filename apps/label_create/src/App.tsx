import { useEffect, useMemo, useState } from "react";
import { SheetSourcePicker } from "./components/SheetSourcePicker";
import { ColumnMapper } from "./components/ColumnMapper";
import { TemplatePicker } from "./components/TemplatePicker";
import { BrandPanel } from "./components/BrandPanel";
import { PaperPresetPicker } from "./components/PaperPresetPicker";
import { LabelSheetPreview } from "./components/LabelSheetPreview";
import type { ParsedTable } from "./lib/csv";
import { autoDetectMapping } from "./data/fieldDictionary";
import { buildMemberRecords } from "./lib/records";
import { getTemplate } from "./templates/registry";
import { PAPER_PRESETS } from "./data/paperPresets";
import { loadSettings, saveSettings } from "./lib/storage";
import type { CanonicalFieldKey } from "./types";
import "./App.css";

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [table, setTable] = useState<ParsedTable | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);

  useEffect(() => saveSettings(settings), [settings]);

  const template = getTemplate(settings.templateId);
  const preset = settings.presetId === "custom" ? settings.customPreset : PAPER_PRESETS.find((p) => p.id === settings.presetId) ?? PAPER_PRESETS[0];

  const records = useMemo(() => {
    if (!table) return [];
    return buildMemberRecords(table.rows, settings.mapping);
  }, [table, settings.mapping]);

  function handleLoaded(newTable: ParsedTable, label: string) {
    setTable(newTable);
    setSourceLabel(label);
    const detected = autoDetectMapping(newTable.headers) as Partial<Record<CanonicalFieldKey, string>>;
    setSettings((s) => ({ ...s, mapping: { ...detected, ...s.mapping } }));
  }

  return (
    <div className="app-shell">
      <header className="app-header no-print" style={{ position: 'relative' }}>
        <a
          href="https://agu-portal.pages.dev/"
          style={{
            position: 'absolute', top: 16, right: 28,
            display: 'inline-flex', alignItems: 'center',
            height: 28, padding: '0 10px', borderRadius: 8,
            background: '#c9a227',
            color: '#10254a', fontSize: 12, fontWeight: 700, textDecoration: 'none',
          }}
        >
          ← ポータル
        </a>
        <h1>会員ラベル作成</h1>
        <p>スプレッドシートの会員データから、印刷用のラベルシートを作成します。</p>
      </header>

      <div className="app-body">
        <div className="app-sidebar no-print">
          <SheetSourcePicker onLoaded={handleLoaded} />

          {table && (
            <>
              {sourceLabel && <p className="source-label">読み込み元: {sourceLabel}({table.rows.length}件)</p>}
              <ColumnMapper
                headers={table.headers}
                mapping={settings.mapping}
                onChange={(mapping) => setSettings((s) => ({ ...s, mapping }))}
                template={template}
              />
              <TemplatePicker
                templateId={settings.templateId}
                onChange={(templateId) => setSettings((s) => ({ ...s, templateId }))}
              />
              <BrandPanel
                brand={settings.brand}
                onChange={(brand) => setSettings((s) => ({ ...s, brand }))}
                template={template}
              />
              <PaperPresetPicker
                presetId={settings.presetId}
                onPresetChange={(presetId) => setSettings((s) => ({ ...s, presetId }))}
                customPreset={settings.customPreset}
                onCustomPresetChange={(customPreset) => setSettings((s) => ({ ...s, customPreset }))}
                offset={settings.offset}
                onOffsetChange={(offset) => setSettings((s) => ({ ...s, offset }))}
              />

              <button className="primary-button print-button" onClick={() => window.print()}>
                印刷 / PDFに保存
              </button>
            </>
          )}
        </div>

        <div className="app-main">
          <PrintPageStyle widthMm={preset.pageWidthMm} heightMm={preset.pageHeightMm} />
          {table ? (
            <LabelSheetPreview
              records={records}
              template={template}
              preset={preset}
              offset={settings.offset}
              brand={settings.brand}
            />
          ) : (
            <div className="empty-state">
              <p>まずは左側からスプレッドシートを読み込んでください。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PrintPageStyle({ widthMm, heightMm }: { widthMm: number; heightMm: number }) {
  return <style>{`@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }`}</style>;
}
