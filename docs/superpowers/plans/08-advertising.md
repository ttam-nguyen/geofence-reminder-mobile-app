# Plan 8: Advertising

## Feature Name
Ad Integration — Banner Ads, List Ads, Rewarded Ads, Consent Flow

## Goal
Integrate Google AdMob with banner ads (home dashboard, settings), list ads (reminder list), and optional user-initiated rewarded full-screen ads. Handle offline state, ad failures, and consent requirements without blocking core app functionality.

## Architecture
- Ad modules as optional dependencies — ad failure does not crash or block core screens
- Banner ads: fixed-position components in Home and Settings screens
- List ads: interleaved into reminder list (every N items, visually separated)
- Rewarded ads: voluntary, user-initiated from Settings screen only
- Consent flow: GDPR/CCPA age-gating where applicable (MVP: basic consent banner for regions requiring it)
- All ad UI visually separated from reminders (clear labels, spacing)

## Tech Stack
| Layer | Choice |
|---|---|
| Ads (banner + interstitial) | `react-native-google-mobile-ads` v14.x |
| Rewarded ads | `react-native-google-mobile-ads` (rewarded ad unit) |
| Consent | Custom consent banner (region detection + basic CMP) |
| Offline handling | Ad components render as empty placeholder when offline or no-fill |

## Spec References
- §8.1 Advertising: banner ads, list ads, optional rewarded ads (user-initiated from Settings)
- §8.1 Rules: never forced full-screen, never interrupt creation/editing/save/alert delivery
- §8.1 Clearly label ads, visually separate from reminders
- §8.1 Ad failure/offline must not affect reminder functionality
- §8.1 Do not load ads in blocking way
- §8.1 Consent, privacy, age-related requirements, platform advertising policies
- §10 Quality: scenario 16 (ad network failure/offline does not block reminders)

## Global Constraints
- Ads are **never** loaded or displayed during reminder creation, editing, saving, or alert delivery
- Rewarded ads are **never** forced — user explicitly initiates from Settings
- Ads clearly labeled "Advertisement" or "Sponsored"
- Visual separation: spacing + divider between ads and reminders in list
- Ad failure (no-fill, timeout, offline) → render empty placeholder, no crash, no user-visible error
- Ad loading is asynchronous and non-blocking
- GDPR/CCPA: basic consent banner for EU/UK users (MVP: show banner, collect "not interested" = skip)
- Age gating: no personalized ads for users under 16 (MVP: default to non-personalized)

## Review Focus
- Banner ads render in Home and Settings screens without layout shift
- List ads interleaved correctly, visually separated from reminders
- Rewarded ads only accessible from Settings, user-initiated
- Ad failure (offline, no-fill) handled gracefully — core screens unaffected
- Consent banner displays for EU/UK users (basic implementation)
- Ads never interfere with reminder creation, editing, saving, or notification delivery

## Files to Create

```
src/services/
  AdService.ts               — Central ad service: load, show, handle events

src/services/
  ConsentService.ts          — Basic consent banner: region detection, consent collection

src/ui/
  AdBanner.tsx               — Reusable banner ad component (fixed position)
  AdListItem.tsx             — Reusable ad item component (for list interleaving)
  RewardedAdModal.tsx        — Rewarded ad modal (Settings screen trigger)

src/__tests__/
  services/
    AdService.test.ts        — Load/show ads, handle failure, offline handling
    ConsentService.test.ts   — Region detection, consent collection

```

## Interfaces

### Ad Service (`src/services/AdService.ts`)

```typescript
export enum AdPlacement {
  BANNER_HOME = 'banner_home',
  BANNER_SETTINGS = 'banner_settings',
  LIST_AD = 'list_ad',
  REWARDED_SETTINGS = 'rewarded_settings',
}

export interface AdServiceInterface {
  // Initialize ad SDK (called once on app start)
  initialize(): Promise<void>;

  // Load a banner ad (pre-fetch for rendering)
  loadBanner(placement: AdPlacement.BANNER_HOME | AdPlacement.BANNER_SETTINGS): Promise<void>;

  // Show a rewarded ad (user-initiated from Settings)
  showRewardedAd(): Promise<{ earned: boolean; reward?: string }>;

  // Check if ads are available (online + SDK initialized)
  isAdsAvailable(): boolean;

  // Pause ad loading during critical operations (create/edit/save/trigger)
  pauseAds(): void;

  // Resume ad loading after critical operations
  resumeAds(): void;
}

// Ad unit IDs (configurable, from environment or config)
const BANNER_HOME_ID = __DEV__ ? 'test-banner-id' : 'production-banner-home-id';
const BANNER_SETTINGS_ID = __DEV__ ? 'test-banner-id' : 'production-banner-settings-id';
const REWARDED_ID = __DEV__ ? 'test-rewarded-id' : 'production-rewarded-id';
```

### Consent Service (`src/services/ConsentService.ts`)

```typescript
export enum ConsentState {
  UNKNOWN = 'unknown',
  GET_REQUIRED = 'get_required',
  GET_NOT_REQUIRED = 'get_not_required',
  OBTAINED = 'obtained',
}

export interface ConsentServiceInterface {
  // Check if consent is required (EU/UK users)
  checkConsentRequired(): Promise<boolean>;

  // Show consent banner (if required and not obtained)
  showConsentBanner(): Promise<void>;

  // Get current consent state
  getConsentState(): Promise<ConsentState>;

  // Check if personalized ads are allowed
  isPersonalizedAdsAllowed(): Promise<boolean>;
}
```

### Ad Components

```typescript
// AdBanner.tsx
interface AdBannerProps {
  placement: AdPlacement.BANNER_HOME | AdPlacement.BANNER_SETTINGS;
  visible?: boolean; // false during critical operations
}

// AdListItem.tsx
interface AdListItemProps {
  index: number; // position in list (for interleaving)
}

// RewardedAdModal.tsx
interface RewardedAdModalProps {
  visible: boolean;
  onClose: () => void;
  onReward: (reward: string) => void;
}
```

## Tasks (Checkbox — Test-First)

- [ ] **Step 8.1:** Implement AdService (initialize, load, show, pause/resume)
  - Create `src/services/AdService.ts` — wraps `react-native-google-mobile-ads`
  - Test: `src/__tests__/services/AdService.test.ts` — initialize SDK, load banner, show rewarded ad, handle no-fill error
  - Expected: Ad service loads without blocking core functionality

- [ ] **Step 8.2:** Implement ConsentService (basic GDPR/CCPA)
  - Create `src/services/ConsentService.ts` — detects EU/UK region, shows consent banner
  - Test: `src/__tests__/services/ConsentService.test.ts` — EU user sees banner, non-EU skips, consent state persisted
  - Expected: Consent flow works for required regions

- [ ] **Step 8.3:** Implement banner ad component
  - Create `src/ui/AdBanner.tsx` — fixed-position banner at bottom of screen
  - Renders as empty placeholder when offline or no-fill (no layout shift)
  - Test: renders in Home and Settings screens, hides during critical operations
  - Expected: Banner ad displays correctly, doesn't shift layout

- [ ] **Step 8.4:** Implement list ad component
  - Create `src/ui/AdListItem.tsx` — interleaved into reminder list (every 10 items)
  - Visually separated from reminders (label "Advertisement", divider, different background)
  - Test: renders correctly in list, spacing separates from reminder items
  - Expected: List ads visible but clearly separated

- [ ] **Step 8.5:** Implement rewarded ad modal
  - Create `src/ui/RewardedAdModal.tsx` — triggered from Settings screen only
  - Shows "Watch ad to [benefit]" (MVP: benefit TBD — placeholder "Support development")
  - Test: user initiates, ad plays, reward callback fires on completion
  - Expected: Rewarded ad plays, reward delivered to user

- [ ] **Step 8.6:** Integrate ads into screens
  - Add banner to HomeScreen (bottom) and SettingsScreen (bottom)
  - Interleave list ads into ReminderListScreen (every 10 items)
  - Add rewarded ad button to SettingsScreen ("Watch Ad" → opens RewardedAdModal)
  - Test: ads render in correct screens, pause/resume during create/edit/save works
  - Expected: Ads integrated without blocking core flows

- [ ] **Step 8.7:** Offline/failure handling
  - Test: offline → ads render as empty placeholder, core screens unaffected
  - Test: no-fill response → ad slot empty, no crash, no user-visible error
  - Test: ad timeout → skip ad, core screens unaffected
  - Expected: Ad failures never block reminders

- [ ] **Step 8.8:** Real-device test — ad rendering
  - Deploy to physical device (iOS + Android)
  - Test: banner ads display in Home and Settings
  - Test: list ads interleaved correctly, visually separated
  - Test: rewarded ad plays from Settings
  - Expected: Ads render correctly on both platforms

- [ ] **Step 8.9:** Create commit
  - Command: `git add . && git commit -m "feat: advertising — banner ads, list ads, rewarded ads, consent flow"`
  - Expected: Clean commit at revision `v8-advertising`

## Verification Commands

```bash
# TypeScript check
npx tsc --noEmit

# Lint check
npx eslint src/services/AdService.ts src/services/ConsentService.ts src/ui/AdBanner.tsx src/ui/AdListItem.tsx src/ui/RewardedAdModal.tsx

# Unit tests
npx vitest run src/__tests__/services/AdService.test.ts src/__tests__/services/ConsentService.test.ts

# Real-device test (manual, both platforms)
npx react-native run-ios --simulator "iPhone 14"   # or physical device
npx react-native run-android --variant=debug         # or physical device
# Manual: verify banner ads render, list ads interleaved, rewarded ad plays
# Manual: offline → ads empty placeholder, core features work
```

## Drift-Check Command

```bash
git diff v8-advertising..HEAD -- src/services/AdService.ts src/services/ConsentService.ts src/ui/AdBanner.tsx src/ui/AdListItem.tsx src/ui/RewardedAdModal.tsx
```
