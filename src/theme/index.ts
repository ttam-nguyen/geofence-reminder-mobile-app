// Glass Layered theme tokens — dark graphite-first.

import { Platform } from 'react-native';

export const Colors = {
  background: '#171D22',
  surface: '#222B32',
  surfaceGlass: 'rgba(41, 52, 61, 0.78)',
  surfaceGlassStrong: 'rgba(52, 65, 75, 0.88)',
  borderGlass: 'rgba(255, 255, 255, 0.18)',
  textPrimary: '#F2F5F6',
  textSecondary: '#B7C1C8',
  textMuted: '#87949D',
  signalRed: '#F52232',
  signalRedPressed: '#C91828',
  signalRedSoft: 'rgba(245, 34, 50, 0.16)',
  waitingAmber: '#D99A42',
  successGreen: '#3C8D70',
  infoBlue: '#4D9BE8',
  disabledFill: '#46515A',
  danger: '#E34A52',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Typography = {
  h1: { fontSize: 32, fontWeight: '700', color: Colors.textPrimary },
  h2: { fontSize: 24, fontWeight: '600', color: Colors.textPrimary },
  h3: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  body: { fontSize: 16, fontWeight: '400', color: Colors.textPrimary },
  bodySmall: { fontSize: 14, fontWeight: '400', color: Colors.textSecondary },
  caption: { fontSize: 12, fontWeight: '400', color: Colors.textMuted },
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const PlatformConstants = {
  minTouchTarget: Platform.OS === 'ios' ? 44 : 48,
} as const;
