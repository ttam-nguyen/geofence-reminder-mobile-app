// Mock for react-native-maps — provides a no-op MapView component for tests.

const React = require('react');
const { View } = require('react-native');

const MapView = React.forwardRef((props, ref) =>
  React.createElement(View, { ...props, ref }, props.children),
);

const Marker = React.forwardRef((props, ref) =>
  React.createElement(View, { ...props, ref }, props.children),
);

module.exports = {
  __esModule: true,
  default: MapView,
  MapView,
  Marker,
  PROVIDER_DEFAULT: undefined,
  PROVIDER_GOOGLE: 'google',
};
