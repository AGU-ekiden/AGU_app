import type { BrandSettings, ColumnMapping, PaperPreset, PrintOffset } from "../types";
import { DEFAULT_PRESET_ID, PAPER_PRESETS } from "../data/paperPresets";

const KEY = "label-create:settings:v1";

export interface PersistedSettings {
  brand: BrandSettings;
  mapping: ColumnMapping;
  templateId: string;
  presetId: string;
  customPreset: PaperPreset;
  offset: PrintOffset;
}

export const DEFAULT_SETTINGS: PersistedSettings = {
  brand: {
    organizationName: "MEMBERSHIP CLUB",
    accentColor: "#c9a24b",
  },
  mapping: {},
  templateId: "elegant-gold",
  presetId: DEFAULT_PRESET_ID,
  customPreset: PAPER_PRESETS.find((p) => p.id === "custom")!,
  offset: { offsetXMm: 0, offsetYMm: 0 },
};

export function loadSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      brand: { ...DEFAULT_SETTINGS.brand, ...parsed.brand },
      customPreset: { ...DEFAULT_SETTINGS.customPreset, ...parsed.customPreset },
      offset: { ...DEFAULT_SETTINGS.offset, ...parsed.offset },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: PersistedSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Storage may be unavailable (private browsing, quota); failing silently
    // is fine here since settings are a convenience, not critical data.
  }
}
