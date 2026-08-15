import { TEMPLATES } from "../templates/registry";

interface Props {
  templateId: string;
  onChange: (id: string) => void;
}

export function TemplatePicker({ templateId, onChange }: Props) {
  return (
    <div className="panel">
      <div className="panel-title">3. テンプレートを選ぶ</div>
      <div className="template-grid">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            className={t.id === templateId ? "template-card active" : "template-card"}
            onClick={() => onChange(t.id)}
          >
            <span className="template-swatch" style={{ background: t.swatch }} />
            <span className="template-name">{t.name}</span>
            <span className="template-desc">{t.description}</span>
          </button>
        ))}
        <div className="template-card template-card-future" aria-hidden>
          <span className="template-swatch template-swatch-future">+</span>
          <span className="template-name">今後追加予定</span>
          <span className="template-desc">src/templates に追加するとここに表示されます</span>
        </div>
      </div>
    </div>
  );
}
