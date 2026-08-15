import type { TemplateDefinition } from "../../types";
import { FreshTealLabel } from "./FreshTealLabel";

export const freshTealTemplate: TemplateDefinition = {
  id: "fresh-teal",
  name: "フレッシュティール",
  description:
    "白地に爽やかなアクセントカラーとロゴの透かしをあしらった、スポーツ・部活/サークル系コミュニティ向けデザイン。ロゴ画像をアップロードすると自動で透かしになります。",
  swatch: "linear-gradient(135deg, #ffffff 0%, #eafaf6 55%, #00897b 100%)",
  requiredFields: ["name"],
  recommendedFields: ["plan", "memberId", "address", "postalCode", "kana", "phone", "tag"],
  supportsLogo: true,
  Component: FreshTealLabel,
};
