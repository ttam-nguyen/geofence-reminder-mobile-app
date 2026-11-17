module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!(@react-navigation|@react-native|react-native|react-native-safe-area-context|react-native-screens|react-native-get-random-values|react-native-pager-view|react-native-image-zoom-viewer)/)',
  ],
  moduleNameMapper: {
    '^@op-engineering/op-sqlite$': '<rootDir>/__mocks__/@op-engineering/op-sqlite.js',
    '^sqliteAdapter$': '<rootDir>/__mocks__/sqliteAdapterMock.js',
    '^../stores/reminderStore$': '<rootDir>/__mocks__/reminderStoreMock.js',
    '^react-native-maps$': '<rootDir>/__mocks__/react-native-maps.js',
    '^react-native-geolocation-service$': '<rootDir>/__mocks__/react-native-geolocation-service.js',
  },
};
