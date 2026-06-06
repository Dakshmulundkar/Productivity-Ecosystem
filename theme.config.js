/** @type {const} */
const themeColors = {
  // Backgrounds
  background:    { light: '#f2f0ec', dark: '#0f0f0f' },
  surface:       { light: '#ffffff', dark: '#1a1a1a' },
  darkSurface:   { light: '#1a1a1a', dark: '#0a0a0a' },

  // Text
  foreground:    { light: '#1a1a1a', dark: '#f0eeea' },
  muted:         { light: '#888888', dark: '#666666' },

  // Borders / dividers
  border:        { light: '#e0dbd4', dark: '#2a2a2a' },
  divider:       { light: '#ece9e4', dark: '#222222' },
  subtleBg:      { light: '#f0eeea', dark: '#1e1e1e' },

  // Brand accent — lavender
  lavender:      { light: '#b8a9f0', dark: '#9b8de0' },
  lavenderMuted: { light: '#7a6eb0', dark: '#6a5ea0' },
  lavenderDeep:  { light: '#5a4fa0', dark: '#4a3f90' },

  // Pastel stat card backgrounds
  pastelGreen:   { light: '#c8e6c9', dark: '#1a3a1a' },
  pastelPink:    { light: '#f8d7e3', dark: '#3a1a2a' },
  pastelYellow:  { light: '#fef3c7', dark: '#3a2a00' },
  pastelBlue:    { light: '#dbeafe', dark: '#0a1a3a' },

  // Pastel text — darkest shade of each family
  pastelGreenText:   { light: '#14532d', dark: '#86efac' },
  pastelPinkText:    { light: '#831843', dark: '#f9a8d4' },
  pastelYellowText:  { light: '#78350f', dark: '#fcd34d' },
  pastelBlueText:    { light: '#1e3a8a', dark: '#93c5fd' },

  // Pastel label — mid shade of each family
  pastelGreenLabel:  { light: '#166534', dark: '#4ade80' },
  pastelPinkLabel:   { light: '#9d174d', dark: '#f472b6' },
  pastelYellowLabel: { light: '#92400e', dark: '#fbbf24' },
  pastelBlueLabel:   { light: '#1e40af', dark: '#60a5fa' },

  // Tag badge colors
  tagWorkBg:       { light: '#ede9fe', dark: '#2d1f5e' },
  tagWorkText:     { light: '#5b21b6', dark: '#c4b5fd' },
  tagPersonalBg:   { light: '#fce7f3', dark: '#3d0f2a' },
  tagPersonalText: { light: '#9d174d', dark: '#f9a8d4' },
  tagHealthBg:     { light: '#dcfce7', dark: '#052e16' },
  tagHealthText:   { light: '#166534', dark: '#86efac' },
  tagHighBg:       { light: '#fee2e2', dark: '#3f0f0f' },
  tagHighText:     { light: '#991b1b', dark: '#fca5a5' },

  // Accent colors (event cards, calendar)
  accentMaroon:   { light: '#7a3a3a', dark: '#7a3a3a' },
  accentRed:      { light: '#c0392b', dark: '#c0392b' },
  accentNavy:     { light: '#2e5fa3', dark: '#2e5fa3' },
  accentGreen:    { light: '#27774a', dark: '#27774a' },
  accentCharcoal: { light: '#2a2a2a', dark: '#2a2a2a' },

  // Status
  success: { light: '#22c55e', dark: '#16a34a' },
  warning: { light: '#f59e0b', dark: '#d97706' },
  error:   { light: '#ef4444', dark: '#dc2626' },

  // Pill inactive state
  pillInactive:     { light: '#eceae5', dark: '#2a2a2a' },
  pillInactiveText: { light: '#666666', dark: '#888888' },
};

module.exports = { themeColors };
// Named export for ES module imports
module.exports.themeColors = themeColors;
