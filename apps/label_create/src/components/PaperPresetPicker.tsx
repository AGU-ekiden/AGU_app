import { PAPER_PRESETS } from "../data/paperPresets";
import type { PaperPreset, PrintOffset } from "../types";

interface Props {
  presetId: string;
  onPresetChange: (id: string) => void;
  customPreset: PaperPreset;
  onCustomPresetChange: (preset: PaperPreset) => void;
  offset: PrintOffset;
  onOffsetChange: (offset: PrintOffset) => void;
}

const NUMBER_FIELDS: { key: keyof PaperPreset; label: string }[] = [
  { key: "pageWidthMm", label: "用紙 幅(mm)" },
  { key: "pageHeightMm", label: "用紙 高さ(mm)" },
  { key: "labelWidthMm", label: "ラベル 幅(mm)" },
  { key: "labelHeightMm", label: "ラベル 高さ(mm)" },
  { key: "columns", label: "列数" },
  { key: "rows", label: "行数" },
  { key: "marginTopMm", label: "上余白(mm)" },
  { key: "marginLeftMm", label: "左余白(mm)" },
  { key: "gapXMm", label: "横間隔(mm)" },
  { key: "gapYMm", label: "縦間隔(mm)" },
];

export function PaperPresetPicker({
  presetId,
  onPresetChange,
  customPreset,
  onCustomPresetChange,
  offset,
  onOffsetChange,
}: Props) {
  const selected = PAPER_PRESETS.find((p) => p.id === presetId) ?? PAPER_PRESETS[0];
  const isCustom = presetId === "custom";

  return (
    <div className="panel">
      <div className="panel-title">5. 用紙を選ぶ</div>
      <label className="field">
        <span>用紙プリセット</span>
        <select value={presetId} onChange={(e) => onPresetChange(e.target.value)}>
          {PAPER_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {selected.note && <p className="hint">{selected.note}</p>}

      {isCustom && (
        <div className="mapping-grid">
          {NUMBER_FIELDS.map(({ key, label }) => (
            <label key={key} className="mapping-row">
              <span className="mapping-label">{label}</span>
              <input
                type="number"
                step="0.1"
                className="text-input"
                value={customPreset[key] as number}
                onChange={(e) =>
                  onCustomPresetChange({ ...customPreset, [key]: Number(e.target.value) || 0 })
                }
              />
            </label>
          ))}
        </div>
      )}

      <div className="panel-subtitle">印刷位置の微調整</div>
      <p className="hint">
        プリンターや用紙の個体差でズレる場合は、実際に印刷したものを台紙と重ねて確認しながら調整してください。
      </p>
      <div className="mapping-grid">
        <label className="mapping-row">
          <span className="mapping-label">横オフセット(mm)</span>
          <input
            type="number"
            step="0.1"
            className="text-input"
            value={offset.offsetXMm}
            onChange={(e) => onOffsetChange({ ...offset, offsetXMm: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="mapping-row">
          <span className="mapping-label">縦オフセット(mm)</span>
          <input
            type="number"
            step="0.1"
            className="text-input"
            value={offset.offsetYMm}
            onChange={(e) => onOffsetChange({ ...offset, offsetYMm: Number(e.target.value) || 0 })}
          />
        </label>
      </div>
    </div>
  );
}
