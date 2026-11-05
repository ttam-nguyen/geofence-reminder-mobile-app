import { defineConfig } from 'vitest/config';
import reactNative from '@react-native/babel-preset';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['node_modules/', 'src/__tests__/'],
    },
  },
  babel: {
    presets: [reactNative],
  },
});
