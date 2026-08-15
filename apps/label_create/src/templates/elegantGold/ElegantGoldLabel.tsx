import type { LabelTemplateProps } from "../../types";
import "./elegantGold.css";

/** A dark, gold-trimmed membership label — the default "high-end member"
 *  look. Shows the org brand/logo, the member's name, an optional plan
 *  badge + member ID, and (when present) an address block, so it works
 *  equally well as a mailing label or a membership card sticker. */
export function ElegantGoldLabel({ member, brand, widthMm, heightMm }: LabelTemplateProps) {
  const compact = heightMm < 30;

  return (
    <div className="eg-label" style={{ width: `${widthMm}mm`, height: `${heightMm}mm` }}>
      <div className="eg-frame">
        <div className="eg-header">
          {brand.logoDataUrl ? (
            <img className="eg-logo" src={brand.logoDataUrl} alt="" />
          ) : (
            <span className="eg-brand-mark" style={{ color: brand.accentColor }}>
              ✦
            </span>
          )}
          <span className="eg-brand-name">{brand.organizationName}</span>
        </div>

        <div className="eg-body">
          <div className="eg-name">
            {member.name ? (
              <>
                {member.name}
                <span className="eg-name-suffix">様</span>
              </>
            ) : (
              "お名前"
            )}
          </div>
          {member.kana && !compact && <div className="eg-kana">{member.kana}</div>}

          {(member.address || member.postalCode) && (
            <div className="eg-address">
              {member.postalCode && <span className="eg-postal">〒{member.postalCode}</span>}
              {member.address && <span className="eg-address-text">{member.address}</span>}
            </div>
          )}
          {member.phone && !compact && <div className="eg-phone">TEL {member.phone}</div>}
        </div>

        <div className="eg-footer">
          {member.plan && (
            <span className="eg-badge" style={{ borderColor: brand.accentColor, color: brand.accentColor }}>
              {member.plan}
            </span>
          )}
          {member.tag && (
            <span className="eg-tag" style={{ borderColor: brand.accentColor, color: brand.accentColor }}>
              {member.tag}
            </span>
          )}
          {member.memberId && <span className="eg-member-id">No. {member.memberId}</span>}
        </div>

        <span className="eg-corner eg-corner-tl" style={{ borderColor: brand.accentColor }} />
        <span className="eg-corner eg-corner-br" style={{ borderColor: brand.accentColor }} />
      </div>
    </div>
  );
}
