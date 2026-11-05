# Handoff — GPS Reminder Mobile App

## Current State: Plan 1 Complete (commit `55c50c3e`)

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
- 33/33 Vitest tests pass (setup + theme tokens + theme context + component files)
- ESLint clean (no prettier plugin due to version conflict — noted for later fix)
- .gitignore created with RN-specific ignores

### Plan 1 Deliverables (commit `55c50c3e`)
- Theme tokens: colors (light/dark), typography, spacing, radii, elevation, motion, blur
- ThemeContext with ThemeProvider + useTheme() hook (auto dark mode detection)
- Navigation shell: AppNavigator with Stack + Bottom Tabs, placeholder screens
- 6 reusable components: Button, Input, Card, Badge, Divider, SafeAreaWrapper
- All components consume theme tokens via useTheme() context

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

## Next Step: Plan 2 — Reminder Domain (Reminder entity, Zustand store, validation)

### What Plan 2 Will Do
1. Create Reminder entity with fields: id, title, description, geofence (location + radius), triggerType (enter/exit/both), isActive, createdAt, updatedAt
2. Create Zustand store for reminders CRUD operations (add, update, delete, list)
3. Implement reminder validation rules from spec (§5.1-5.2)
4. Create reminder form UI (consumes Input, Button components from Plan 1)
5. Write unit tests for entity, store, and validation logic
6. Verify TypeScript compiles, lint passes, tests pass

### Drift-Check Command (after Plan 2)
```bash
git diff 55c50c3e..HEAD -- src/ docs/superpowers/plans/02-reminder-domain.md
```

### Key Interfaces (from Plan 2 spec)
```typescript
interface Reminder {
  id: string;
  title: string;
  description?: string;
  geofence: {
    latitude: number;
    longitude: number;
    radius: number; // meters, 10-500m
  };
  triggerType: 'enter' | 'exit' | 'both';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ReminderStore {
  reminders: Reminder[];
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateReminder: (id: string, updates: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;
  toggleActive: (id: string) => void;
}
```

## Emergency Recovery Notes
- If system crashes, resume from Plan 1 by reading `docs/superpowers/plans/01-design-system.md`
- All library versions are pinned in `package.json` — run `npm install --legacy-peer-deps` to restore
- Source files are committed at `15f8673` — use `git checkout 15f8673 -- src/` to restore source
