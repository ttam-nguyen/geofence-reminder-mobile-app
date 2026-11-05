# Plan 7: Core UI Flows

## Feature Name
Core Screens — Onboarding, Home Dashboard, Create Reminder, List, Details, Map, Settings

## Goal
Implement all required screens from spec §7.2 using the design system (Plan 1) and domain services (Plans 2-6). No ads or paid themes yet — those are Plans 8 and 9.

## Architecture
- Screens built with React Navigation (stack + bottom tabs)
- Each screen consumes Zustand stores (reminderStore, orchestrationStore, notificationStore)
- Offline states handled per screen (search unavailable, location unavailable, no geofence registration)
- Accessibility: WCAG AA contrast, text scaling support, screen reader labels

## Tech Stack
| Layer | Choice |
|---|---|
| Screens | React Native components (using design system from Plan 1) |
| Navigation | React Navigation 6.x (Stack Navigator, Bottom Tab Navigator) |
| State | Zustand stores from Plans 2-6 |
| Offline detection | `react-native-netinfo` |

## Spec References
- §7.2 Required screens: onboarding, home dashboard, create reminder, reminder list, reminder details, map, settings
- §7.3 UI design system: consumes tokens from Plan 1
- §7 Onboarding: explain concept, background location, notification permissions, monitoring status
- §10 Quality: scenarios 13 (offline creation), 15 (search offline message), 17 (notification permission denial), 18 (location revocation detected)

## Global Constraints
- No ads or paid themes (Plans 8, 9) — clean screens for MVP core
- All screens use design tokens from Plan 1 (no hardcoded styles)
- Offline states clearly communicated (not blocking, but visible)
- Accessibility: contrast ratio ≥ 4.5:1 for body text, `accessibilityLabel` on all interactive elements
- Responsive: minimum 375px width (iPhone SE 2nd gen), safe area respected
- No forced full-screen ads, no blocking on ad failure (N/A for this plan)

## Review Focus
- All 7 required screens from spec §7.2 implemented
- Onboarding explains concept, background location need, notification permissions
- Create reminder screen supports all 3 location methods (GPS/map/search)
- Reminder list shows status, search/filter works, edit/delete actions work
- Reminder details show full content, target location on map, state, edit/delete
- Map shows current location, saved reminders, radius visualization
- Settings shows notification/sound/vibration preferences, theme selection (placeholder), privacy info
- Offline states displayed correctly on all screens

## Files to Create

```
src/ui/
  OnboardingScreen.tsx        — 3-screen onboarding flow (concept, location, notifications)
  HomeScreen.tsx              — Dashboard: reminder overview, active count, quick actions, nav tabs
  CreateReminderScreen.tsx    — Full create reminder: title, description, location picker (GPS/map/search), radius, save
  ReminderListScreen.tsx      — List: search/filter, status badges, edit/delete actions
  ReminderDetailScreen.tsx    — Details: content, map preview, state, edit/delete
  MapScreen.tsx               — Full map: current location, all reminders, radius visualization
  SettingsScreen.tsx          — Preferences: notifications, sound/vibration, themes (placeholder), privacy

src/ui/components/
  ReminderListItem.tsx        — List item: title, place, radius, status badge
  ReminderMapView.tsx         — Map view inline (for details screen)
  OfflineBanner.tsx           — Banner: "You are offline. Core features work, search unavailable."
  PermissionWarning.tsx       — Warning: "Location access is required for geofences. Enable in Settings."

src/__tests__/
  ui/
    OnboardingScreen.test.tsx  — Renders all 3 onboarding screens, progresses correctly
    HomeScreen.test.tsx        — Shows active count, renders reminder list preview
    CreateReminderScreen.test.tsx — Renders all 3 location methods, validates title required, saves reminder
    ReminderListScreen.test.tsx — Renders list, search/filter works, edit/delete actions
    ReminderDetailScreen.test.tsx — Shows full content, map preview, state, edit/delete
    MapScreen.test.tsx         — Renders map, shows current location, reminders, radius circles
    SettingsScreen.test.tsx    — Renders all settings sections, toggles work

```

## Interfaces

### Screen Component Interfaces

```typescript
// OnboardingScreen.tsx
interface OnboardingScreenProps {
  onComplete: () => void; // called after last screen
}

// HomeScreen.tsx
interface HomeScreenProps {
  navigation: NavigationProp<RootStackParamList, 'Home'>;
}

// CreateReminderScreen.tsx
interface CreateReminderScreenProps {
  navigation: NavigationProp<RootStackParamList, 'CreateReminder'>;
  initialLocation?: TargetLocation; // pre-filled from GPS or map
  onSaved: (reminderId: string) => void; // callback after save
}

// ReminderListScreen.tsx
interface ReminderListScreenProps {
  navigation: NavigationProp<RootStackParamList, 'ReminderList'>;
}

// ReminderDetailScreen.tsx
interface ReminderDetailScreenProps {
  route: RouteProp<RootStackParamList, 'ReminderDetail'>; // params: { reminderId: string }
  navigation: NavigationProp<RootStackParamList, 'ReminderDetail'>;
}

// MapScreen.tsx
interface MapScreenProps {
  navigation: NavigationProp<RootStackParamList, 'Map'>;
}

// SettingsScreen.tsx
interface SettingsScreenProps {
  navigation: NavigationProp<RootStackParamList, 'Settings'>;
}
```

## Tasks (Checkbox — Test-First)

- [ ] **Step 7.1:** Implement onboarding screen
  - Create `src/ui/OnboardingScreen.tsx` — 3 screens:
    1. "GPS Reminder" concept explanation + visual
    2. Why background location is required (with toggle to Settings)
    3. Notification permissions explanation + request button
  - Test: renders all 3 screens, progresses forward/backward, calls `onComplete` on last screen
  - Expected: Onboarding flows correctly, skips if already completed (persisted flag)

- [ ] **Step 7.2:** Implement home dashboard
  - Create `src/ui/HomeScreen.tsx` — shows:
    - Active reminder count (ARMED + WAITING_FOR_EXIT)
    - Quick "Add Reminder" FAB (navigates to CreateReminder)
    - Active reminders list preview (scrollable, navigates to full list)
    - Bottom tab navigation (Home, Map, Settings)
  - Test: renders with active count, FAB navigates to create screen, list preview shows reminders
  - Expected: Dashboard renders correctly, navigation works

- [ ] **Step 7.3:** Implement create reminder screen
  - Create `src/ui/CreateReminderScreen.tsx` — full form:
    - Title (required, validated)
    - Description (optional)
    - Location: 3 tabs (Current GPS, Map Pin, Search)
    - Radius presets (100m, 200m, 500m, 1km) + custom input
    - Notification preferences (sound, vibration toggles)
    - Save button (disabled if title empty or location not set)
  - Test: validates required fields, all 3 location methods accessible, radius presets selectable, saves reminder via store
  - Expected: Reminder created with correct status (WAITING_FOR_EXIT or ARMED based on inside/outside)

- [ ] **Step 7.4:** Implement reminder list screen
  - Create `src/ui/ReminderListScreen.tsx` — shows:
    - Search bar (filter by title/location name)
    - Filter tabs (All, Active, Completed, Cancelled)
    - Reminder list items (title, place, radius, status badge)
    - Edit (navigates to edit mode on CreateReminderScreen)
    - Delete (with confirmation)
  - Test: search filters correctly, filter tabs switch view, edit/delete actions dispatch
  - Expected: List renders all reminders, search/filter works

- [ ] **Step 7.5:** Implement reminder detail screen
  - Create `src/ui/ReminderDetailScreen.tsx` — shows:
    - Full reminder content (title, description)
    - Target location on small map view
    - Radius visualization
    - Current state (status badge)
    - Edit button (navigates to edit mode)
    - Delete/Cancel button (with confirmation)
  - Test: displays all fields, map shows target location, edit/delete work
  - Expected: Details screen shows complete reminder info

- [ ] **Step 7.6:** Implement map screen
  - Create `src/ui/MapScreen.tsx` — full interactive map:
    - Current location dot (if permission granted)
    - All reminder pins (color-coded by status)
    - Radius circles for all reminders
    - "Use Current Location" button
  - Test: renders map, shows current location when available, displays reminder pins and circles
  - Expected: Map screen fully functional

- [ ] **Step 7.7:** Implement settings screen
  - Create `src/ui/SettingsScreen.tsx` — sections:
    - Notification preferences (enable/disable notifications, sound, vibration)
    - Theme selection (placeholder: "Frosted Future" only for MVP)
    - Privacy & permissions (location status, notification status, guidance links)
    - App information (version, build number)
  - Test: renders all sections, toggles update store, privacy info displays correctly
  - Expected: Settings screen fully functional

- [ ] **Step 7.8:** Implement helper components
  - Create `src/ui/components/ReminderListItem.tsx`, `OfflineBanner.tsx`, `PermissionWarning.tsx`
  - Test: components render with correct theme tokens, offline banner shows when no network
  - Expected: Components reusable across screens

- [ ] **Step 7.9:** Integrate all screens into navigation
  - Update `src/navigation/AppNavigator.tsx` with full route definitions
  - Test: navigation between all screens works, deep linking to reminders works
  - Expected: Full navigation flow functional

- [ ] **Step 7.10:** Real-device test — all screens
  - Deploy to physical device (iOS + Android)
  - Test: create reminder (GPS + map pin), view in list, see details, edit, delete
  - Test: onboarding flow (skip if already completed)
  - Expected: All screens functional on both platforms

- [ ] **Step 7.11:** Create commit
  - Command: `git add . && git commit -m "feat: core UI — onboarding, home, create reminder, list, details, map, settings"`
  - Expected: Clean commit at revision `v7-core-ui`

## Verification Commands

```bash
# TypeScript check
npx tsc --noEmit

# Lint check
npx eslint src/ui/ src/ui/components/

# Unit tests (all screens)
npx vitest run src/__tests__/ui/

# Visual verification (manual, both platforms)
npx react-native run-ios --simulator "iPhone 14"   # or physical device
npx react-native run-android --variant=debug         # or physical device
# Manual: full user flow — onboarding → create reminder (GPS) → view in list → see details → edit → delete
# Manual: offline mode — disconnect network, verify core features work, search shows unavailable
```

## Drift-Check Command

```bash
git diff v7-core-ui..HEAD -- src/ui/ src/ui/components/ src/navigation/AppNavigator.tsx
```
