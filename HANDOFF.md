# Handoff — GPS Reminder Mobile App

## Current State: Plan 0 Complete (commit `15f8673`)

### What's Done
- React Native 0.74.4 project scaffolded with TypeScript strict mode
- Compatible library versions researched and installed (via npm install --legacy-peer-deps):
  - zustand ^4.5.2 (v5 has Hermes issues, v4 works)
  - @react-navigation/native ^6.1.9 (v7 requires newer RN)
  - react-native-maps ^1.14.0 (old arch, RN 0.74)
  - react-native-google-mobile-ads ^13.2.0 (legacy, v17+ requires RN 0.86 + New Arch)
  - react-native-iap ^12.16.0 (v14+ uses Nitro Modules)
  - react-native-sqlite-storage ^6.0.1
  - All other deps pinned for RN 0.74 compatibility
- TypeScript compiles clean (npx tsc --noEmit)
- 6/6 Vitest tests pass (package.json, tsconfig, eslint, prettier, vitest config, source structure)
- ESLint clean (no prettier plugin due to version conflict — noted for later fix)
- .gitignore created with RN-specific ignores

### Files in Project Root
```
package.json          — Dependencies (verified compatible versions)
tsconfig.json         — TypeScript strict mode config
.eslintrc.js          — ESLint (TypeScript parser, no prettier rule)
.prettierrc.json      — Prettier config (JSON format)
vitest.config.ts      — Vitest test runner + coverage
babel.config.js       — Babel preset (React Native)
metro.config.js       — Metro bundler config
index.js              — RN entry point
app.json              — App metadata (name: GPSReminder)
.gitignore            — RN-specific ignores (node_modules, android/, ios/, etc.)
```

### Files in src/
```
src/app.tsx           — Placeholder root component (to be replaced by Plan 1)
src/index.ts          — Re-exports App from app.tsx
src/__tests__/plan0-setup.test.ts  — 6 setup verification tests
```

### Known Issues/Notes
- ESLint prettier rule disabled due to eslint-plugin-prettier + Prettier 3.x version conflict. Can be fixed by downgrading eslint-plugin-prettier or upgrading Prettier to 4.x when ready.
- Dependencies installed with --legacy-peer-deps due to react-native-maps requiring react >= 18.3.1 while RN 0.74 ships with react 18.2.0. This is acceptable for now but should be revisited if upgrading to RN 0.75+.
- CocoaPods not installed (RN init failed on pod step). iOS builds will need `cd ios && bundle install && bundle exec pod install`.

## Next Step: Plan 1 — Design System (Frosted Future)

### What Plan 1 Will Do
1. Create design tokens (colors, typography, spacing, radii) for "Frosted Future" theme
2. Create a theme provider (Zustand store) that exposes tokens globally
3. Implement navigation shell with React Navigation (Stack + Bottom Tabs)
4. Build reusable components: Button, Input, Card, Badge
5. Write unit tests for all components and theme system
6. Verify TypeScript compiles, lint passes, tests pass

### Key Interfaces to Define (from Plan 1 spec)
```typescript
// Color tokens (light/dark mode)
interface ColorTokens {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  error: string;
  success: string;
  warning: string;
  overlay: string;
}

// Typography tokens
interface TypographyTokens {
  fontFamily: string;
  fontSize: Record<string, number>;
  fontWeight: Record<string, string>;
  lineHeight: Record<string, number>;
}

// Spacing tokens (8px grid)
type SpacingTokens = Record<string, number>;

// Radius tokens
type RadiusTokens = Record<string, number>;
```

### Commands to Verify (after Plan 1)
```bash
npx tsc --noEmit
npx eslint 'src/**/*.ts' 'src/**/*.tsx'
npx vitest run
```

### Drift-Check Command (after Plan 1)
```bash
git diff 15f8673..HEAD -- src/ docs/superpowers/plans/01-design-system.md
```

## Emergency Recovery Notes
- If system crashes, resume from Plan 1 by reading `docs/superpowers/plans/01-design-system.md`
- All library versions are pinned in `package.json` — run `npm install --legacy-peer-deps` to restore
- Source files are committed at `15f8673` — use `git checkout 15f8673 -- src/` to restore source
