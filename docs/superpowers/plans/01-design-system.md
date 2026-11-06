# Plan 1: Foundation & Design System (Glass Layered)

## Feature Name
Design System — Glass Layered Theme Tokens, Navigation Shell, Reusable Components

## Goal
Implement the **Glass Layered** design system with color tokens, typography scale, spacing, corner radii, elevation/blur rules, and navigation shell. All UI components built on these tokens.

## Architecture
- Theme context provider with token objects (color, typography, spacing, radii, elevation)
- Navigation stack: React Navigation with custom theme integration
- Reusable components: Button, Input, Card, Badge (status), Divider, Icon wrapper
- Dark mode support via `useColorScheme()` from React Native

## Tech Stack
| Layer | Choice |
|---|---|
| Styling | React Native StyleSheet (design tokens as JS constants) |
| Theme | Zustand store + Context Provider |
| Navigation | React Navigation 6.x (Stack + Bottom Tabs) |
| Icons | Custom SVG components from `assets/icons/` (16 icons, 24×24, 1.7px stroke) |

## Spec References
- §7.1 Visual direction: **Glass Layered** (light, premium glassmorphism) — see `glass_layered_ui_concept_kit/spec/GLASS_LAYERED_TECHNICAL_DESIGN_SPEC.md`
- §7.2 Required screens: all screens consume these tokens/components
- §7.3 UI design system: import tokens from `glass_layered_ui_concept_kit/spec/design_tokens.json`

## Global Constraints
- Glass Layered aesthetic: frosted-glass surfaces, geometric background (`assets/backgrounds/glass_frosted_geometric_background.png`), soft neutral backgrounds, signal-red accent `#F52232`
- High contrast, accessible controls (WCAG AA minimum for body text)
- Safe-area aware (notch, status bar, home indicator)
- Dark mode: explicit dark tokens (background `#11171C`, glass fill `rgba(34,43,50,0.78)`)
- No hardcoded color strings in screen code — all via tokens
- Responsive: works on phones (minimum 375px width), tablets not required for MVP
- Minimum 48dp touch targets for all interactive elements

## Review Focus
- Theme tokens match Glass Layered spec values (colors, radii, spacing)
- Navigation shell renders without errors on iOS 13+ and Android 10+
- Dark mode toggle produces correct token swap (explicit dark, not inverted light)
- All reusable components accept `theme` prop or consume context

## Files to Create

```
src/theme/
  colors.ts                  — Color token definitions (light + dark palettes)
  typography.ts              — Font families, sizes, weights, line heights
  spacing.ts                 — Spacing scale (4px base: 4, 8, 12, 16, 20, 24, 32, 48)
  radii.ts                   — Corner radius scale (small 10, input 14, card 20, large 24, pill 28)
  elevation.ts               — Shadow/elevation tokens (glass surface shadows)
  blur.ts                    — Blur/translucency tokens (levels 1–4, sigma 8–16)
  motion.ts                  — Animation duration + easing constants (180–260ms)
  index.ts                   — Re-export all tokens

src/theme/ThemeContext.tsx   — ThemeProvider, useTheme() hook, dark mode detection

src/navigation/
  AppNavigator.tsx           — Root navigator (stack + tab structure)
  navigationTypes.ts         — TypeScript route param types

src/components/
  Button.tsx                 — Primary, secondary, ghost variants; loading state; disabled state
  Input.tsx                  — Text input with label, error state, icon prefix/suffix
  Card.tsx                   — Glass-morphism card (translucent background, subtle shadow)
  Badge.tsx                  — Status badge (signal red / waiting amber / success green)
  Divider.tsx                — Fine divider line (token-based color)
  SafeAreaWrapper.tsx        — Safe area provider wrapper

src/__tests__/
  theme/
    tokens.test.ts           — Verify all token keys exist, no hardcoded strings in component tests
  components/
    Button.test.tsx          — Renders variants, handles onPress, shows loading state
    Input.test.tsx           — Renders label, error, accepts text input
    Card.test.tsx            — Renders with children, applies glass styling
    Badge.test.tsx           — Color matches status enum
```

## Interfaces

### Theme Tokens (`src/theme/index.ts`)

```typescript
export interface ColorTokens {
  // Base neutrals (light mode) — Glass Layered palette
  background: string;       // #E5EAED (Frost)
  surface: string;          // #FFFFFF
  surfaceOverlay: string;   // rgba(255, 255, 255, 0.72)
  primary: string;          // #F52232 (Signal red)
  primaryText: string;      // #171D22 (Graphite)
  secondary: string;        // #68747C (Steel grey)
  secondaryText: string;    // #27323A (Text primary)
  divider: string;          // rgba(0, 0, 0, 0.08)
  error: string;            // #F52232 (Signal red)
  warning: string;          // #D99A42 (Waiting amber)
  success: string;          // #3C8D70 (Success green)
  // Overlay colors (glass effect)
  glassBackground: string;  // rgba(255, 255, 255, 0.65)
  glassBorder: string;      // rgba(255, 255, 255, 0.58)
}

export interface TypographyTokens {
  fontFamily: string;       // 'Inter' or 'Manrope' (RN default fallback)
  sizes: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number };
  weights: { regular: string; medium: string; semibold: string; bold: string };
  lineHeights: { tight: number; normal: number; relaxed: number };
}

export interface SpacingTokens {
  xs: number; sm: number; md: number; lg: number; xl: number; xxl: number; xxxl: number;
}

export interface RadiusTokens {
  none: number; sm: number; md: number; lg: number; xl: number; full: number;
}

export interface ElevationTokens {
  shadow0: ViewStyle; // no shadow
  shadow1: ViewStyle;
  shadow2: ViewStyle;
  shadow3: ViewStyle;
}

export interface MotionTokens {
  durationFast: number; // ms (100)
  durationNormal: number; // ms (200)
  durationSlow: number; // ms (350)
  easingEaseOut: string;
  easingEaseInOut: string;
}

export interface Theme {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radii: RadiusTokens;
  elevation: ElevationTokens;
  motion: MotionTokens;
  isDark: boolean;
}
```

### Theme Context (`src/theme/ThemeContext.tsx`)

```typescript
export const useTheme = () => useContext(ThemeContext);
// Returns: Theme
```

### Component Interfaces

```typescript
// Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
}

// Badge.tsx
interface BadgeProps {
  status: 'armed' | 'triggered' | 'completed' | 'waiting_for_exit' | 'draft' | 'cancelled';
  children: React.ReactNode;
}

// Card.tsx
interface CardProps {
  glass?: boolean; // frosted glass variant
  children: React.ReactNode;
  style?: ViewStyle;
}

// Input.tsx
interface InputProps {
  label?: string;
  error?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmitEditing?: () => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
```

## Tasks (Checkbox — Test-First)

- [x] **Step 1.1:** Define color tokens (light + dark palettes)
  - Create `src/theme/colors.ts` with Glass Layered palette (from `design_tokens.json`):
    - Light: background `#E5EAED`, surface `#FFFFFF`, accent `#F52232` (Signal red)
    - Dark: background `#1A1D23`, surface `#252830`, accent `#FC8181` (adjusted for contrast)
  - Test: `src/__tests__/theme/tokens.test.ts` — assert all color keys exist, no hardcoded hex in components
  - Expected: All colors defined, light/dark pairs cover all use cases

- [x] **Step 1.2:** Define typography, spacing, radii tokens
  - Create `src/theme/typography.ts`, `spacing.ts`, `radii.ts`
  - Test: assert scale consistency (spacing multiples of 4, radii progression)
  - Expected: All scales defined and internally consistent

- [x] **Step 1.3:** Define elevation, blur, motion tokens
  - Create `src/theme/elevation.ts`, `blur.ts`, `motion.ts`
  - Test: assert motion durations are positive numbers, elevation objects are valid ViewStyle
  - Expected: All tokens defined

- [x] **Step 1.4:** Implement ThemeContext + useTheme hook
  - Create `src/theme/ThemeContext.tsx`
  - Test: Provider wraps app, useTheme returns correct tokens, dark mode swap works
  - Expected: Theme context available throughout component tree

- [x] **Step 1.5:** Implement navigation shell
  - Create `src/navigation/AppNavigator.tsx` with placeholder routes:
    - Home (tab)
    - Map (tab)
    - Settings (tab)
  - Create `src/navigation/navigationTypes.ts` with route param types
  - Test: Navigator renders, navigation actions dispatch correctly
  - Expected: App navigates between placeholder screens

- [x] **Step 1.6:** Implement reusable components
  - Create `src/components/Button.tsx`, `Input.tsx`, `Card.tsx`, `Badge.tsx`, `Divider.tsx`
  - Test each component in `src/__tests__/components/`
  - Expected: All components render, accept correct props, apply theme tokens

- [x] **Step 1.7:** Implement SafeAreaWrapper
  - Create `src/components/SafeAreaWrapper.tsx`
  - Test: Wraps content, respects safe areas on devices with notches
  - Expected: Content inset matches device safe area

- [x] **Step 1.8:** Integrate theme into navigation shell
  - Navigation components consume theme tokens (tab bar colors, header styling)
  - Test: Navigation renders with correct theme colors in light + dark mode
  - Expected: Navigation shell fully themed

- [x] **Step 1.9:** Create commit
  - Command: `git add . && git commit -m "feat: design system — Glass Layered tokens, navigation shell, reusable components"`
  - Expected: Clean commit at revision `v1-design-system`

## Verification Commands

```bash
# TypeScript check
npx tsc --noEmit

# Lint check
npx eslint src/theme/ src/navigation/ src/components/

# Test execution (design system)
npx vitest run src/__tests__/theme/ src/__tests__/components/

# Visual verification (manual)
npx react-native run-ios --simulator "iPhone 14"
npx react-native run-android
# Verify: light mode shows correct palette, dark mode swaps correctly, navigation uses theme colors
```

## Drift-Check Command

```bash
git diff <plan0-commit>..HEAD -- src/theme/ src/navigation/ src/components/
```
