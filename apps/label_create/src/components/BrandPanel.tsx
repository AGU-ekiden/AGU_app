import type { ChangeEvent } from "react";
import type { BrandSettings, TemplateDefinition } from "../types";

interface Props {
  brand: BrandSettings;
  onChange: (brand: BrandSettings) => void;
  template: TemplateDefinition;
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export function BrandPanel({ brand, onChange, template }: Props) {
  function handleLogoFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      alert("ロゴ画像は2MB以下にしてください。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange({ ...brand, logoDataUrl: reader.result as string });
    reader.readAsDataURL(file);
  }

  return (
    <div className="panel">
      <div className="panel-title">4. ブランド設定</div>
      <div className="field-stack">
        <label className="field">
          <span>団体名・サービス名</span>
          <input
            type="text"
            className="text-input"
            value={brand.organizationName}
            onChange={(e) => onChange({ ...brand, organizationName: e.target.value })}
          />
        </label>

        <label className="field">
          <span>アクセントカラー</span>
          <input
            type="color"
            value={brand.accentColor}
            onChange={(e) => onChange({ ...brand, accentColor: e.target.value })}
          />
        </label>

        {template.supportsLogo && (
          <label className="field">
            <span>ロゴ画像(任意・2MBまで)</span>
            <input type="file" accept="image/*" onChange={handleLogoFile} />
            {brand.logoDataUrl && (
              <div className="logo-preview-row">
                <img src={brand.logoDataUrl} alt="ロゴプレビュー" className="logo-preview" />
                <button className="link-button" onClick={() => onChange({ ...brand, logoDataUrl: undefined })}>
                  削除
                </button>
              </div>
            )}
          </label>
        )}
      </div>
    </div>
  );
}
