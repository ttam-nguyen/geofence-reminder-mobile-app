module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!(@react-navigation|@react-native|react-native|react-native-safe-area-context|react-native-screens|react-native-get-random-values|react-native-pager-view|react-native-image-zoom-viewer|react-native-maps)/)',
  ],
};
