import type { TemplateDefinition } from "../../types";
import { ElegantGoldLabel } from "./ElegantGoldLabel";

export const elegantGoldTemplate: TemplateDefinition = {
  id: "elegant-gold",
  name: "エレガントゴールド",
  description: "黒地にゴールドの縁取りをあしらった、有料会員向けの高級感あるデザイン。",
  swatch: "linear-gradient(135deg, #1d1f28, #101116 60%, #c9a24b)",
  requiredFields: ["name"],
  recommendedFields: ["plan", "memberId", "address", "postalCode", "kana", "phone", "tag"],
  supportsLogo: true,
  Component: ElegantGoldLabel,
};
