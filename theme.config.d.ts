export type ColorKey =
  | 'primary'
  | 'background'
  | 'surface'
  | 'foreground'
  | 'muted'
  | 'border'
  | 'success'
  | 'warning'
  | 'error'
  | 'categoryWork'
  | 'categoryPersonal'
  | 'categoryHealth'
  | 'categoryStudy'
  | 'categoryFinance'
  | 'lavender'
  | 'softPink'
  | 'softBlue'
  | 'softGreen'
  | 'warmOrange'
  | 'neutralLight'
  | 'neutralDark';

export type ThemeColorPalette = Record<ColorKey, string>;
