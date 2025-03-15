// Define types for our settings system

// Base setting interface
export interface BaseSetting {
  id: string;
  label: string;
  type: string;
  description?: string;
}

// Slider setting
export interface SliderSetting extends BaseSetting {
  type: "slider";
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

// Color setting
export interface ColorSetting extends BaseSetting {
  type: "color";
  defaultValue: string;
}

// Select setting
export interface SelectSetting extends BaseSetting {
  type: "select";
  options: { label: string; value: string | number }[];
  defaultValue: string | number;
}

// Toggle setting
export interface ToggleSetting extends BaseSetting {
  type: "toggle";
  defaultValue: boolean;
}

// Button setting
export interface ButtonSetting extends BaseSetting {
  type: "button";
  buttonText: string;
  variant?: "primary" | "secondary" | "danger";
}

// Group setting (for organizing settings)
export interface SettingGroup {
  id: string;
  label: string;
  settings: Setting[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

// Union type for all setting types
export type Setting =
  | SliderSetting
  | ColorSetting
  | SelectSetting
  | ToggleSetting
  | ButtonSetting;

// Panel configuration
export interface PanelConfig {
  id: string;
  groups: SettingGroup[];
}

// Complete settings configuration
export interface SettingsConfig {
  panels: Record<string, PanelConfig>;
}
