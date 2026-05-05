export type ThemeId =
  | "ivory-editorial"
  | "soft-minimal"
  | "art-deco"
  | "brutalist-cream"
  | "retro-futuristic"
  | "organic-zen";

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  description: string;
  swatch: { bg: string; fg: string; accent: string };
}

export const THEMES: ThemeMeta[] = [
  {
    id: "ivory-editorial",
    name: "Ivory Editorial",
    description: "Espresso on ivory, gold serif headlines.",
    swatch: { bg: "#F7F1E3", fg: "#2A1810", accent: "#B8893A" },
  },
  {
    id: "soft-minimal",
    name: "Soft Minimal",
    description: "Quiet cream, sage accent, generous whitespace.",
    swatch: { bg: "#FAF7F2", fg: "#23201C", accent: "#8AA48A" },
  },
  {
    id: "art-deco",
    name: "Art Deco Boutique",
    description: "Emerald, brass and ornate serifs.",
    swatch: { bg: "#F2E8D5", fg: "#1B1A14", accent: "#0E4D3F" },
  },
  {
    id: "brutalist-cream",
    name: "Brutalist Cream",
    description: "Raw black, electric orange, hard edges.",
    swatch: { bg: "#EFE7D6", fg: "#0A0A0A", accent: "#FF5B1F" },
  },
  {
    id: "retro-futuristic",
    name: "Retro-Futuristic",
    description: "Coral & deep navy with mono glow.",
    swatch: { bg: "#F5ECDC", fg: "#0E1B36", accent: "#FF6F61" },
  },
  {
    id: "organic-zen",
    name: "Organic Zen",
    description: "Bone, terracotta and soft blobs.",
    swatch: { bg: "#F4EDE0", fg: "#2A2420", accent: "#B5613B" },
  },
];

export const DEFAULT_THEME: ThemeId = "ivory-editorial";
