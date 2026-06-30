import type { ComponentType } from "react";
import type { WeddingWebsiteContent } from "../types";
import { ClassicTemplate } from "./ClassicTemplate";
import { EditorialTemplate } from "./EditorialTemplate";
import { GardenTemplate } from "./GardenTemplate";
import { MinimalistTemplate } from "./MinimalistTemplate";
import { RomanceTemplate } from "./RomanceTemplate";

export type WeddingTemplateDefinition = {
  key: string;
  label: string;
  suggestedTheme?: string;
  Component: ComponentType<{
    content: WeddingWebsiteContent;
    theme: string;
  }>;
};

export const WEDDING_TEMPLATE_REGISTRY: Record<string, WeddingTemplateDefinition> = {
  classic: {
    key: "classic",
    label: "Classic",
    Component: ClassicTemplate,
  },
  editorial: {
    key: "editorial",
    label: "Editorial",
    Component: EditorialTemplate,
  },
  romance: {
    key: "romance",
    label: "Romance",
    suggestedTheme: "blush",
    Component: RomanceTemplate,
  },
  minimalist: {
    key: "minimalist",
    label: "Minimalist",
    Component: MinimalistTemplate,
  },
  garden: {
    key: "garden",
    label: "Garden",
    suggestedTheme: "sage",
    Component: GardenTemplate,
  },
};

export const DEFAULT_WEDDING_TEMPLATE = "classic";

export function resolveWeddingTemplate(template: string): WeddingTemplateDefinition {
  return (
    WEDDING_TEMPLATE_REGISTRY[template] ??
    WEDDING_TEMPLATE_REGISTRY[DEFAULT_WEDDING_TEMPLATE]
  );
}

export function weddingTemplateOptions() {
  return Object.values(WEDDING_TEMPLATE_REGISTRY);
}

export function isValidWeddingTemplate(template: string): boolean {
  return template in WEDDING_TEMPLATE_REGISTRY;
}
