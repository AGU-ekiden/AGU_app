import type { TemplateDefinition } from "../../types";
import { SimpleSenderLabel } from "./SimpleSenderLabel";

export const simpleSenderTemplate: TemplateDefinition = {
  id: "simple-sender",
  name: "シンプル(差出人用)",
  description:
    "装飾のないシンプルなデザイン。差出人名・住所・電話番号のみを表示し、長い団体名でも折り返して収まります。差出人ラベルにおすすめ。",
  swatch: "linear-gradient(135deg, #ffffff 0%, #f5f5f7 60%, #d8d9de 100%)",
  requiredFields: ["name"],
  recommendedFields: ["address", "postalCode", "phone"],
  supportsLogo: false,
  Component: SimpleSenderLabel,
};
