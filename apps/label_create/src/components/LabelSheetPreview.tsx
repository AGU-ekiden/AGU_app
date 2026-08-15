import { useEffect, useRef, useState } from "react";
import type { BrandSettings, MemberRecord, PaperPreset, PrintOffset, TemplateDefinition } from "../types";

interface Props {
  records: MemberRecord[];
  template: TemplateDefinition;
  preset: PaperPreset;
  offset: PrintOffset;
  brand: BrandSettings;
}

function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function LabelSheetPreview({ records, template, preset, offset, brand }: Props) {
  const perPage = Math.max(1, preset.columns * preset.rows);
  const pages = chunk(records, perPage);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      const pagePx = preset.pageWidthMm * 3.7795275591;
      setScale(width > 0 ? Math.min(1, width / pagePx) : 1);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [preset.pageWidthMm]);

  const Component = template.Component;

  return (
    <div className="panel preview-panel">
      <div className="panel-title no-print">
        プレビュー({records.length}件 / 全{pages.length || 0}ページ)
      </div>
      <div ref={containerRef} className="preview-scroll">
        <div id="print-area">
          {pages.length === 0 && <p className="hint no-print">データを読み込むとここにプレビューが表示されます。</p>}
          {pages.map((pageRecords, pageIndex) => (
            <div
              key={pageIndex}
              className="sheet-page"
              style={{
                width: `${preset.pageWidthMm}mm`,
                height: `${preset.pageHeightMm}mm`,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                marginBottom: `${(1 - scale) * -preset.pageHeightMm * 3.7795275591}px`,
              }}
            >
              {pageRecords.map((member, i) => {
                const col = i % preset.columns;
                const row = Math.floor(i / preset.columns);
                const left = preset.marginLeftMm + offset.offsetXMm + col * (preset.labelWidthMm + preset.gapXMm);
                const top = preset.marginTopMm + offset.offsetYMm + row * (preset.labelHeightMm + preset.gapYMm);
                return (
                  <div
                    key={member.__rowIndex}
                    className="sheet-label-slot"
                    style={{ left: `${left}mm`, top: `${top}mm` }}
                  >
                    <Component
                      member={member}
                      brand={brand}
                      widthMm={preset.labelWidthMm}
                      heightMm={preset.labelHeightMm}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
