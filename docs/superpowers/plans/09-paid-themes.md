# Plan 9: Paid Themes

## Feature Name
Paid Theme Store — Catalog, Previews, In-App Purchase, Restore, Entitlements

## Goal
Implement a theme marketplace where users can purchase additional visual themes (reskins) using native platform in-app purchases. Default "Frosted Future" theme remains free. Purchases persist across devices (iOS) or account (Android).

## Architecture
- Theme catalog: JSON-based theme definitions (color tokens, typography overrides, icon sets)
- Theme store: Zustand store for active theme, purchase state, entitlements
- IAP integration: `react-native-iap` for Google Play and App Store purchases
- Restore purchases: iOS `SKPaymentQueue.restoreCompletedTransactions()`, Android purchase query
- Theme switching: hot-reload theme tokens without app restart

## Tech Stack
| Layer | Choice |
|---|---|
| IAP | `react-native-iap` v12.x (supports iOS App Store + Google Play) |
| Theme config | JSON files in `src/themes/` (color tokens, typography overrides) |
| State | Zustand store (extends theme from Plan 1) |
| Persistence | AsyncStorage or SQLite for purchase records |

## Spec References
- §8.2 Paid theme/reskin purchases: default Frosted Future free, optional paid themes
- §8.2 Requirements: theme preview before purchase, clear free/paid labels + prices, native IAP integration, restore purchases, persist selected theme, persist/validate entitlements
- §8.2 Handle interrupted, cancelled, pending, refunded, restored purchases
- §8.2 Do not lock reminder functionality behind purchases
- §8.2 New themes added through theme config/design tokens, not business logic changes

## Global Constraints
- Default "Frosted Future" theme is always free and accessible
- Paid themes are appearance-only — no changes to reminder business logic
- Theme preview available before purchase (live preview of current screen)
- Clear free/paid labels and prices in theme store
- Purchase failure (interrupted, cancelled, pending) does not lock themes
- Refund handling: theme remains active (platform decides, app cannot control)
- Restore purchases works after reinstall or device change (iOS: App Store account, Android: Google account)
- Theme switching is non-blocking — app continues to function with previous theme

## Review Focus
- Theme catalog renders with correct free/paid labels and prices
- Theme preview shows live changes on current screen before purchase
- Purchase flow completes successfully on iOS and Android
- Restore purchases recovers previously purchased themes
- Selected theme persists across app restarts
- Default theme always accessible (never locked behind purchase)
- Purchase failures handled gracefully (no crash, no lockout)

## Files to Create

```
src/themes/
  frostedFuture.ts           — Default theme (always free)
  monochromeMinimal.ts       — Example paid theme 1
  industrialTech.ts          — Example paid theme 2
  futuristicGlow.ts          — Example paid theme 3
  index.ts                   — Theme registry: list all available themes

src/services/
  ThemeService.ts            — Load theme by ID, apply theme tokens, switch themes

src/services/
  PurchaseService.ts         — IAP: purchase, restore, validate entitlements

src/stores/
  themeStore.ts              — Zustand store: active theme, purchased themes, entitlements

src/ui/
  ThemeStoreScreen.tsx       — Theme marketplace: catalog, previews, purchase buttons

src/__tests__/
  services/
    ThemeService.test.ts     — Load/apply themes, switch themes
    PurchaseService.test.ts  — Purchase flow, restore purchases, entitlement validation

```

## Interfaces

### Theme Config (`src/themes/`)

```typescript
// Each theme file exports a ThemeConfig object (subset of full Theme from Plan 1)
export interface ThemeConfig {
  id: string; // e.g., 'frosted_future', 'monochrome_minimal'
  name: string; // Display name
  isFree: boolean;
  price?: string; // e.g., '$2.99' (only for paid themes)
  productIds: {
    ios: string; // App Store product ID
    android: string; // Google Play product ID
  };
  colors: Partial<ColorTokens>; // overrides frosted base
  typography?: Partial<TypographyTokens>; // overrides (optional)
  radii?: Partial<RadiusTokens>; // overrides (optional)
}

// Theme registry
export const themeRegistry: ThemeConfig[];
export function getTheme(id: string): ThemeConfig | undefined;
```

### Theme Service (`src/services/ThemeService.ts`)

```typescript
export class ThemeService {
  // Get all available themes
  getAllThemes(): ThemeConfig[];

  // Apply a theme by ID (updates global theme tokens)
  applyTheme(themeId: string): void;

  // Get currently active theme ID
  getActiveThemeId(): string;
}
```

### Purchase Service (`src/services/PurchaseService.ts`)

```typescript
export enum PurchaseStatus {
  PENDING = 'pending',
  PURCHASED = 'purchased',
  FAILED = 'failed',
  REFUNDED = 'refunded', // informational only — app cannot detect refunds reliably
}

export interface PurchaseRecord {
  themeId: string;
  status: PurchaseStatus;
  platformProductId: string;
  transactionId?: string;
  purchaseDate?: number; // epoch ms
}

export class PurchaseService {
  // Purchase a theme (triggers platform IAP flow)
  purchaseTheme(themeId: string): Promise<PurchaseRecord>;

  // Restore previously purchased themes
  restorePurchases(): Promise<PurchaseRecord[]>;

  // Check if a theme is purchased (entitlement)
  isThemePurchased(themeId: string): Promise<boolean>;

  // Subscribe to purchase updates (for pending → purchased/failed transitions)
  onPurchaseUpdate(listener: (records: PurchaseRecord[]) => void): () => void;
}
```

### Theme Store (`src/stores/themeStore.ts`)

```typescript
interface ThemeAppState {
  activeThemeId: string; // 'frosted_future' default, or purchased theme ID
  purchasedThemes: PurchaseRecord[];
  availableThemes: ThemeConfig[];
  activeThemeConfig: ThemeConfig | null; // resolved config (base + overrides)
  applyTheme: (themeId: string) => Promise<void>;
  purchaseTheme: (themeId: string) => Promise<PurchaseRecord>;
  restorePurchases: () => Promise<PurchaseRecord[]>;
  isThemeAvailable: (themeId: string) => boolean; // free or purchased
}

export const useThemeStore = create<ThemeAppState>((set, get) => ({...}));
```

### Theme Store Screen (`src/ui/ThemeStoreScreen.tsx`)

```typescript
// Marketplace screen: lists all themes, shows preview, purchase button for paid themes
interface ThemeStoreScreenProps {
  navigation: NavigationProp<RootStackParamList, 'ThemeStore'>;
}

// Theme card in catalog
interface ThemeCardProps {
  theme: ThemeConfig;
  isPurchased: boolean;
  isActive: boolean;
  onPreview: (theme: ThemeConfig) => void; // live preview
  onPurchase: (theme: ThemeConfig) => Promise<void>; // trigger IAP
  onActivate: (theme: ThemeConfig) => void; // activate (if already purchased)
}
```

## Tasks (Checkbox — Test-First)

- [ ] **Step 9.1:** Define theme configs (default + example paid themes)
  - Create `src/themes/frostedFuture.ts` (full theme, always free)
  - Create `src/themes/monochromeMinimal.ts`, `industrialTech.ts`, `futuristicGlow.ts` (paid examples)
  - Create `src/themes/index.ts` — registry exports all themes
  - Test: all themes load, IDs unique, product IDs defined for paid themes
  - Expected: Theme registry compiles, all themes accessible

- [ ] **Step 9.2:** Implement ThemeService (load, apply, switch)
  - Create `src/services/ThemeService.ts` — resolves full theme (base + overrides)
  - Test: `src/__tests__/services/ThemeService.test.ts` — apply theme updates tokens, switch themes works
  - Expected: Theme switching applies new tokens without restart

- [ ] **Step 9.3:** Implement PurchaseService (IAP integration)
  - Create `src/services/PurchaseService.ts` — wraps `react-native-iap`
  - Test: `src/__tests__/services/PurchaseService.test.ts` — purchase flow, restore purchases, entitlement check
  - Expected: IAP flows work on both platforms (real device test required)

- [ ] **Step 9.4:** Implement ThemeStore Zustand store
  - Create `src/stores/themeStore.ts` — manages active theme, purchased themes, entitlements
  - Test: store loads persisted purchases, applies active theme on startup
  - Expected: Store state persists across restarts

- [ ] **Step 9.5:** Implement ThemeStoreScreen (marketplace UI)
  - Create `src/ui/ThemeStoreScreen.tsx` — catalog of themes:
    - Free theme (Frosted Future) always visible, "Active" badge
    - Paid themes: preview button, purchase button with price
    - Purchased themes: activate button
  - Test: renders catalog, previews work (live theme change), purchase buttons trigger IAP
  - Expected: Marketplace UI functional

- [ ] **Step 9.6:** Integrate theme store into Settings
  - Add "Themes" section to SettingsScreen (navigates to ThemeStoreScreen)
  - Test: Settings links to theme store, theme changes apply across app
  - Expected: Theme store accessible from Settings

- [ ] **Step 9.7:** Restore purchases flow
  - Test: uninstall/reinstall app → restore purchases recovers purchased themes
  - Test: interrupted purchase (user cancels) → theme not locked, can retry
  - Test: pending purchase (Google Play) → resolves to purchased or failed
  - Expected: All purchase states handled correctly

- [ ] **Step 9.8:** Real-device test — IAP flow
  - Deploy to physical device (iOS sandbox + Android alpha track)
  - Test: purchase a paid theme → completes, entitlement saved
  - Test: restore purchases → recovers purchased themes
  - Expected: IAP works on both platforms (sandbox/test environment)

- [ ] **Step 9.9:** Create commit
  - Command: `git add . && git commit -m "feat: paid themes — catalog, previews, IAP, restore, entitlements"`
  - Expected: Clean commit at revision `v9-paid-themes`

## Verification Commands

```bash
# TypeScript check
npx tsc --noEmit

# Lint check
npx eslint src/services/ThemeService.ts src/services/PurchaseService.ts src/stores/themeStore.ts src/ui/ThemeStoreScreen.tsx

# Unit tests
npx vitest run src/__tests__/services/ThemeService.test.ts src/__tests__/services/PurchaseService.test.ts

# Real-device test (sandbox/test environment, both platforms)
npx react-native run-ios --simulator "iPhone 14"   # or physical device (sandbox)
npx react-native run-android --variant=debug         # or physical device (alpha track)
# Manual: purchase theme → verify entitlement saved, restart app → theme persists
# Manual: restore purchases → recovers purchased themes
```

## Drift-Check Command

```bash
git diff v9-paid-themes..HEAD -- src/themes/ src/services/ThemeService.ts src/services/PurchaseService.ts src/stores/themeStore.ts src/ui/ThemeStoreScreen.tsx
```
