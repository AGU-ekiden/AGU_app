import { FIELD_DEFINITIONS } from "../data/fieldDictionary";
import type { CanonicalFieldKey, ColumnMapping, TemplateDefinition } from "../types";

interface Props {
  headers: string[];
  mapping: ColumnMapping;
  onChange: (mapping: ColumnMapping) => void;
  template: TemplateDefinition;
}

export function ColumnMapper({ headers, mapping, onChange, template }: Props) {
  const relevantFields = FIELD_DEFINITIONS.filter(
    (f) =>
      template.requiredFields.includes(f.key) ||
      template.recommendedFields.includes(f.key) ||
      mapping[f.key]
  );

  function setField(key: CanonicalFieldKey, header: string) {
    const next = { ...mapping };
    if (header) next[key] = header;
    else delete next[key];
    onChange(next);
  }

  const missingRequired = template.requiredFields.filter((key) => !mapping[key]);

  return (
    <div className="panel">
      <div className="panel-title">2. 列を項目に割り当てる</div>
      <p className="hint">見出し名から自動的に推定しています。違っていれば選び直してください。</p>
      <div className="mapping-grid">
        {relevantFields.map((field) => (
          <label key={field.key} className="mapping-row">
            <span className="mapping-label">
              {field.label}
              {template.requiredFields.includes(field.key) && <span className="required-mark">*</span>}
            </span>
            <select value={mapping[field.key] ?? ""} onChange={(e) => setField(field.key, e.target.value)}>
              <option value="">―未使用―</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {missingRequired.length > 0 && (
        <div className="error-box">
          必須項目が未設定です:{" "}
          {missingRequired.map((k) => FIELD_DEFINITIONS.find((f) => f.key === k)?.label).join("、")}
        </div>
      )}
    </div>
  );
}
