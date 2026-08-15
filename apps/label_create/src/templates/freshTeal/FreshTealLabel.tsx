import type { LabelTemplateProps } from "../../types";
import "./freshTeal.css";

/** A clean, airy design for sports/community memberships — white base,
 *  a solid accent-colored edge bar, and a large low-opacity logo watermark
 *  in the background. Designed with a running/ekiden team's brand in mind,
 *  but works for any club that uploads a logo and picks an accent color. */
export function FreshTealLabel({ member, brand, widthMm, heightMm }: LabelTemplateProps) {
  const compact = heightMm < 30;

  return (
    <div className="ft-label" style={{ width: `${widthMm}mm`, height: `${heightMm}mm` }}>
      {brand.logoDataUrl && <img className="ft-watermark" src={brand.logoDataUrl} alt="" />}
      <div className="ft-accent-bar" style={{ background: brand.accentColor }} />

      <div className="ft-content">
        <div className="ft-header">
          {brand.logoDataUrl && <img className="ft-logo" src={brand.logoDataUrl} alt="" />}
          <span className="ft-brand-name" style={{ color: brand.accentColor }}>
            {brand.organizationName}
          </span>
        </div>

        <div className="ft-body">
          <div className="ft-name">
            {member.name ? (
              <>
                {member.name}
                <span className="ft-name-suffix">様</span>
              </>
            ) : (
              "お名前"
            )}
          </div>
          {member.kana && !compact && <div className="ft-kana">{member.kana}</div>}

          {(member.address || member.postalCode) && (
            <div className="ft-address">
              {member.postalCode && <span className="ft-postal">〒{member.postalCode}</span>}
              {member.address && <span className="ft-address-text">{member.address}</span>}
            </div>
          )}
          {member.phone && !compact && <div className="ft-phone">TEL {member.phone}</div>}
        </div>

        <div className="ft-footer">
          {member.plan && (
            <span className="ft-badge" style={{ background: brand.accentColor }}>
              {member.plan}
            </span>
          )}
          {member.tag && (
            <span className="ft-tag" style={{ borderColor: brand.accentColor, color: brand.accentColor }}>
              {member.tag}
            </span>
          )}
          {member.memberId && <span className="ft-member-id">No. {member.memberId}</span>}
        </div>
      </div>
    </div>
  );
}
