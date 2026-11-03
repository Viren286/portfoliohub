import { developer } from "./developer";
import { editorial } from "./editorial";
import { minimal } from "./minimal";
import type { TemplateDefinition } from "./shared";

/** Code-side template registry. The database `Template` table controls tier and enabled state. */
export const TEMPLATES: Record<string, TemplateDefinition> = {
  [minimal.slug]: minimal,
  [developer.slug]: developer,
  [editorial.slug]: editorial,
};

export function getTemplate(slug: string): TemplateDefinition | undefined {
  return TEMPLATES[slug];
}

export type { TemplateDefinition };
