// Mock for react-native-maps — provides no-op components for Jest.

import React from 'react';
import { View } from 'react-native';

export const PROVIDER_DEFAULT = undefined;

export const MapView = jest.fn(({ children, ...props }) => (
  <View {...props} testID="mock.mapView">
    {children}
  </View>
));

export const Marker = jest.fn(({ children, ...props }) => (
  <View {...props} testID="mock.marker" />
));

export const Circle = jest.fn(({ ...props }) => (
  <View {...props} testID="mock.circle" />
));

export default {
  PROVIDER_DEFAULT,
  MapView,
  Marker,
  Circle,
};
