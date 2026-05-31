/**
 * App color palette — dark map canvas with a light-green / turquoise accent system.
 * Keep all color usage flowing through here so theming stays consistent.
 */
export const colors = {
  // Surfaces
  bg: '#0B0F14', // deep near-black behind the map
  sheet: '#0E1116', // bottom-sheet / modal surface
  sheetElevated: '#161B22',
  scrim: 'rgba(6, 9, 12, 0.55)', // dim layer behind a blurred modal

  // Brand accents (turquoise -> light green)
  turquoise: '#2DD4BF',
  turquoiseLight: '#5EEAD4',
  green: '#34D399',
  greenLight: '#6EE7B7',

  // Status
  online: '#22C55E',

  // Text
  text: '#FFFFFF',
  textMuted: '#9BA4AF',
  textFaint: '#6B7280',

  // Controls
  control: 'rgba(20, 24, 30, 0.92)', // floating round map buttons
  controlBorder: 'rgba(255,255,255,0.06)',
  white: '#FFFFFF',
  black: '#000000',
} as const;

/** Brand gradient used on primary CTAs (e.g. Post Status). */
export const brandGradient = [colors.turquoise, colors.green] as const;

export type AppColors = typeof colors;
