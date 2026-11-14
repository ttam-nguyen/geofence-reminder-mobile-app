module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  env: {
    browser: true,
    es2021: true,
    'react-native/react-native': true,
  },
  globals: {
    __dirname: 'readonly',
    require: 'readonly',
  },
  rules: {
    'no-undef': 'error',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
  ignorePatterns: ['node_modules/', 'android/', 'ios/', 'babel.config.js', 'metro.config.js'],
};
