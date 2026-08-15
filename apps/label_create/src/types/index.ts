// Core domain types shared across the app.

/** One row of data parsed from the spreadsheet (CSV / Excel). */
export type RawRow = Record<string, string>;

/** Canonical field keys the app knows how to map spreadsheet columns onto.
 *  New templates can introduce their own extra keys via `extraFields`, so this
 *  list only needs to cover fields that are broadly useful across templates. */
export type CanonicalFieldKey =
  | "name"
  | "kana"
  | "memberId"
  | "plan"
  | "postalCode"
  | "address"
  | "company"
  | "department"
  | "email"
  | "phone"
  | "validUntil"
  | "joinedDate"
  | "tag";

export interface FieldDefinition {
  key: CanonicalFieldKey;
  label: string;
  required?: boolean;
  /** Header strings (case-insensitive, whitespace-trimmed) that auto-map to this field. */
  aliases: string[];
}

/** A member/label record after column mapping has been applied. */
export type MemberRecord = {
  [key in CanonicalFieldKey]?: string;
} & {
  /** Original raw row, kept around so custom templates can reach columns
   *  that aren't part of the canonical field set. */
  __raw: RawRow;
  __rowIndex: number;
};

/** Maps a canonical field key to the spreadsheet header the user picked. */
export type ColumnMapping = Partial<Record<CanonicalFieldKey, string>>;

export interface BrandSettings {
  organizationName: string;
  logoDataUrl?: string;
  accentColor: string;
}

export interface LabelTemplateProps {
  member: MemberRecord;
  brand: BrandSettings;
  /** Physical size of the label this template is being rendered into. */
  widthMm: number;
  heightMm: number;
}

/** A pluggable label design. Drop a new one in `src/templates` and register
 *  it in `src/templates/registry.ts` to make it available in the UI. */
export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  /** Small illustrative swatch shown in the template picker (CSS gradient or color). */
  swatch: string;
  requiredFields: CanonicalFieldKey[];
  recommendedFields: CanonicalFieldKey[];
  supportsLogo: boolean;
  Component: React.ComponentType<LabelTemplateProps>;
}

/** A physical label sheet layout (commercial preset or user-defined custom). */
export interface PaperPreset {
  id: string;
  name: string;
  category: "commercial" | "custom-builtin";
  note?: string;
  pageWidthMm: number;
  pageHeightMm: number;
  labelWidthMm: number;
  labelHeightMm: number;
  columns: number;
  rows: number;
  marginTopMm: number;
  marginLeftMm: number;
  /** Gap between labels, horizontally / vertically. */
  gapXMm: number;
  gapYMm: number;
}

/** Fine offset applied on top of a PaperPreset to compensate for printer/paper drift. */
export interface PrintOffset {
  offsetXMm: number;
  offsetYMm: number;
}
