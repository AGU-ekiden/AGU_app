import type { TemplateDefinition } from "../types";
import { elegantGoldTemplate } from "./elegantGold/meta";
import { freshTealTemplate } from "./freshTeal/meta";
import { simpleSenderTemplate } from "./simpleSender/meta";

/** All available label templates.
 *
 *  To add a new template:
 *   1. Create `src/templates/<yourTemplate>/` with a React component that
 *      implements `LabelTemplateProps` (see `types/index.ts`) and a
 *      companion CSS file that sizes itself from the `widthMm`/`heightMm`
 *      props using mm units, so it renders correctly at any label size.
 *   2. Export a `TemplateDefinition` describing it (id, name, required
 *      fields, etc.) from a `meta.ts` file, following the pattern in
 *      `elegantGold/meta.ts`.
 *   3. Import it here and add it to the array below — it will automatically
 *      appear in the template picker. */
export const TEMPLATES: TemplateDefinition[] = [elegantGoldTemplate, freshTealTemplate, simpleSenderTemplate];

export function getTemplate(id: string): TemplateDefinition {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
