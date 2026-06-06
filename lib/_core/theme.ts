import { Platform } from "react-native";

// ─── Theme colors — defined inline to avoid CJS/ESM interop issues on Android ──

export const themeColors = {
  background:    { light: '#f2f0ec', dark: '#0f0f0f' },
  surface:       { light: '#ffffff', dark: '#1a1a1a' },
  darkSurface:   { light: '#1a1a1a', dark: '#0a0a0a' },
  foreground:    { light: '#1a1a1a', dark: '#f0eeea' },
  muted:         { light: '#888888', dark: '#666666' },
  border:        { light: '#e0dbd4', dark: '#2a2a2a' },
  divider:       { light: '#ece9e4', dark: '#222222' },
  subtleBg:      { light: '#f0eeea', dark: '#1e1e1e' },
  lavender:      { light: '#b8a9f0', dark: '#9b8de0' },
  lavenderMuted: { light: '#7a6eb0', dark: '#6a5ea0' },
  lavenderDeep:  { light: '#5a4fa0', dark: '#4a3f90' },
  pastelGreen:   { light: '#c8e6c9', dark: '#1a3a1a' },
  pastelPink:    { light: '#f8d7e3', dark: '#3a1a2a' },
  pastelYellow:  { light: '#fef3c7', dark: '#3a2a00' },
  pastelBlue:    { light: '#dbeafe', dark: '#0a1a3a' },
  pastelGreenText:   { light: '#14532d', dark: '#86efac' },
  pastelPinkText:    { light: '#831843', dark: '#f9a8d4' },
  pastelYellowText:  { light: '#78350f', dark: '#fcd34d' },
  pastelBlueText:    { light: '#1e3a8a', dark: '#93c5fd' },
  pastelGreenLabel:  { light: '#166534', dark: '#4ade80' },
  pastelPinkLabel:   { light: '#9d174d', dark: '#f472b6' },
  pastelYellowLabel: { light: '#92400e', dark: '#fbbf24' },
  pastelBlueLabel:   { light: '#1e40af', dark: '#60a5fa' },
  tagWorkBg:       { light: '#ede9fe', dark: '#2d1f5e' },
  tagWorkText:     { light: '#5b21b6', dark: '#c4b5fd' },
  tagPersonalBg:   { light: '#fce7f3', dark: '#3d0f2a' },
  tagPersonalText: { light: '#9d174d', dark: '#f9a8d4' },
  tagHealthBg:     { light: '#dcfce7', dark: '#052e16' },
  tagHealthText:   { light: '#166534', dark: '#86efac' },
  tagHighBg:       { light: '#fee2e2', dark: '#3f0f0f' },
  tagHighText:     { light: '#991b1b', dark: '#fca5a5' },
  accentMaroon:   { light: '#7a3a3a', dark: '#7a3a3a' },
  accentRed:      { light: '#c0392b', dark: '#c0392b' },
  accentNavy:     { light: '#2e5fa3', dark: '#2e5fa3' },
  accentGreen:    { light: '#27774a', dark: '#27774a' },
  accentCharcoal: { light: '#2a2a2a', dark: '#2a2a2a' },
  success: { light: '#22c55e', dark: '#16a34a' },
  warning: { light: '#f59e0b', dark: '#d97706' },
  error:   { light: '#ef4444', dark: '#dc2626' },
  pillInactive:     { light: '#eceae5', dark: '#2a2a2a' },
  pillInactiveText: { light: '#666666', dark: '#888888' },
} as const;

export type ColorScheme = "light" | "dark";
export const ThemeColors = themeColors;

type ThemeColorTokens = typeof themeColors;
type ThemeColorName = keyof ThemeColorTokens;
type SchemePalette = Record<ColorScheme, Record<ThemeColorName, string>>;
type SchemePaletteItem = SchemePalette[ColorScheme];

function buildSchemePalette(colors: ThemeColorTokens): SchemePalette {
  const palette: SchemePalette = {
    light: {} as SchemePalette["light"],
    dark:  {} as SchemePalette["dark"],
  };
  (Object.keys(colors) as ThemeColorName[]).forEach((name) => {
    const swatch = colors[name];
    palette.light[name] = swatch.light;
    palette.dark[name]  = swatch.dark;
  });
  return palette;
}

export const SchemeColors = buildSchemePalette(themeColors);

type RuntimePalette = SchemePaletteItem & {
  text: string;
  background: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  border: string;
};

function buildRuntimePalette(scheme: ColorScheme): RuntimePalette {
  const base = SchemeColors[scheme];
  return {
    ...base,
    text:           base.foreground,
    background:     base.background,
    tint:           base.lavender,
    icon:           base.muted,
    tabIconDefault: base.muted,
    tabIconSelected: base.lavender,
    border:         base.border,
  };
}

export const Colors = {
  light: buildRuntimePalette("light"),
  dark:  buildRuntimePalette("dark"),
} satisfies Record<ColorScheme, RuntimePalette>;

export type ThemeColorPalette = (typeof Colors)[ColorScheme];

/**
 * expo-google-fonts font family name constants.
 * Use these in StyleSheet.create fontFamily values.
 */
export const FontFamily = {
  poppins: {
    regular:   "Poppins_400Regular",
    semiBold:  "Poppins_600SemiBold",
    bold:      "Poppins_700Bold",
    extraBold: "Poppins_800ExtraBold",
    black:     "Poppins_900Black",
  },
  inter: {
    regular:  "Inter_400Regular",
    semiBold: "Inter_600SemiBold",
    bold:     "Inter_700Bold",
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    sans:    "system-ui",
    serif:   "ui-serif",
    rounded: "ui-rounded",
    mono:    "ui-monospace",
  },
  default: {
    sans:    "normal",
    serif:   "serif",
    rounded: "normal",
    mono:    "monospace",
  },
  web: {
    sans:    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif:   "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono:    "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
