/**
 * Icon — the app's single icon renderer.
 *
 * Source: Lucide 1.2.100 (ISC), fetched through the design-taste skill's pinned icon resolver and
 * rasterised to 1x/2x/3x PNG. Real licensed icons, no drawn glyphs and no icon font dependency.
 * React Native resolves the @2x/@3x variants automatically from the base file name.
 *
 * Icons are drawn white on transparent so a single asset can be tinted per state.
 */

import React from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

const SOURCES = {
  house: require('../assets/icons/house.png'),
  map: require('../assets/icons/map.png'),
  settings: require('../assets/icons/settings.png'),
  search: require('../assets/icons/search.png'),
  sliders: require('../assets/icons/sliders-horizontal.png'),
  pin: require('../assets/icons/map-pin.png'),
  star: require('../assets/icons/star.png'),
  clock: require('../assets/icons/clock.png'),
  trash: require('../assets/icons/trash-2.png'),
  pencil: require('../assets/icons/pencil.png'),
  'chevron-down': require('../assets/icons/chevron-down.png'),
  'chevron-right': require('../assets/icons/chevron-right.png'),
  plus: require('../assets/icons/plus.png'),
  check: require('../assets/icons/check.png'),
  close: require('../assets/icons/x.png'),
} as const;

export type IconName = keyof typeof SOURCES;

interface IconProps {
  name: IconName;
  /** Square size in dp. Lucide art is drawn on a 24 dp grid. */
  size?: number;
  color?: string;
  style?: StyleProp<ImageStyle>;
}

export function Icon({ name, size = 24, color, style }: IconProps) {
  return (
    <Image
      source={SOURCES[name]}
      accessibilityIgnoresInvertColors
      style={[{ width: size, height: size, tintColor: color }, style]}
    />
  );
}
