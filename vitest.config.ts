import { defineConfig } from 'vitest/config';
import reactNative from '@react-native/babel-preset';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
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
  esbuild: {
    tsconfigRaw: '{ "compilerOptions": { "jsx": "react" } }',
  },
  babel: {
    presets: [reactNative],
  },
});
