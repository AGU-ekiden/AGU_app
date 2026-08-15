import type { LabelTemplateProps } from "../../types";
import "./simpleSender.css";

/** A plain, no-frills label for return-address / sender use. Unlike the
 *  member-facing templates it has no 様 suffix, badge, or brand header —
 *  just name, address, and phone — and the name wraps instead of
 *  truncating, since sender names are often a long organization name
 *  rather than a short personal name. */
export function SimpleSenderLabel({ member, widthMm, heightMm }: LabelTemplateProps) {
  return (
    <div className="ss-label" style={{ width: `${widthMm}mm`, height: `${heightMm}mm` }}>
      <div className="ss-frame">
        <div className="ss-name">{member.name || "差出人名"}</div>

        {(member.address || member.postalCode) && (
          <div className="ss-address">
            {member.postalCode && <span className="ss-postal">〒{member.postalCode}</span>}
            {member.address && <span className="ss-address-text">{member.address}</span>}
          </div>
        )}

        {member.phone && <div className="ss-phone">TEL {member.phone}</div>}
      </div>
    </div>
  );
}
