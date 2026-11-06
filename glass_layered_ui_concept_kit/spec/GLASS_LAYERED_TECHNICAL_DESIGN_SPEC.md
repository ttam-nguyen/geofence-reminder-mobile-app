# Glass Layered UI Kit — Technical Recreation Guide

## Package contents
- `screens/glass_layered_multi_screen_concept.png`: generated multi-screen visual concept board.
- `assets/backgrounds/glass_frosted_geometric_background.png`: original 1440 × 2560 px frosted geometric background artwork, suitable as a subtle screen backdrop.
- `assets/icons/*.svg`: editable 24 × 24 stroke icons in a consistent line style.
- `design_tokens.json`: machine-readable theme tokens.
- `README.md`: quick-start notes.

The concept board is a visual direction reference, not production-ready source code or a pixel-perfect specification. Use the tokens below as the initial implementation baseline and validate on real devices.

## 1. Visual principles
Glass Layered is a light, premium glassmorphism system:
1. Frosted geometric reflections behind the interface (selected background direction B).
2. Moderate signal-red accents (selected accent direction B).
3. Lightly frosted, readability-first cards (selected transparency direction A).
4. Free dark mode (selected dark-mode direction A).
5. Clear hierarchy, restrained blur, and subtle elevation. Do not make every surface translucent.

## 2. Color palette
| Token | Hex / value | Usage |
|---|---|---|
| Graphite | `#171D22` | Deep surfaces, high-contrast text on light backgrounds |
| Text primary | `#27323A` | Primary text on light glass |
| Steel grey | `#68747C` | Secondary text, inactive icons |
| Frost | `#E5EAED` | Main light background base |
| White | `#FFFFFF` | Highlights, light glass tint |
| Signal red | `#F52232` | Primary action, selected tab, location pin, key signal |
| Waiting amber | `#D99A42` | Waiting-for-exit status (pair with text/icon, not color alone) |
| Success green | `#3C8D70` | Optional completed/success state |
| Light glass fill | `rgba(255,255,255,0.72)` | Default light glass cards |
| Dark glass fill | `rgba(34,43,50,0.72)` | Dark-mode glass cards |
| Glass border | `rgba(255,255,255,0.58)` | Fine glass edge highlight |

Red should be used selectively. Avoid using red as a general background fill for large surfaces. Status must always be communicated with text/icon as well as color.

## 3. Geometry and spacing
All dimensions below are Flutter logical pixels (dp), not physical device pixels.
- 4 dp base spacing grid.
- Screen horizontal padding: 20 dp (16 dp on compact devices if needed).
- Section vertical gap: 24 dp.
- Card internal padding: 16 dp.
- Small radius: 10 dp.
- Input radius: 14 dp.
- Standard card radius: 20 dp.
- Large feature card radius: 24 dp.
- Pill button radius: 28 dp or full capsule.
- Modal radius: 28 dp.
- Standard control height: 48–52 dp.
- Minimum interactive target: 48 × 48 dp (follow platform accessibility guidance).
- Bottom navigation height: 72–80 dp plus system safe area.

Use consistent radii. Avoid mixing many unrelated corner shapes.

## 4. Typography
Suggested family pairing:
- Primary: Inter or Manrope.
- Technical labels: IBM Plex Mono.
Use the primary family for readable UI. Use monospace only for coordinates, distances, GPS diagnostics, and compact technical metadata.

| Style | Size | Weight | Line height |
|---|---:|---:|---:|
| Screen title | 26 dp | 600 | 32 dp |
| Section title | 19 dp | 600 | 24 dp |
| Card title | 17 dp | 600 | 22 dp |
| Body | 15 dp | 400 | 22 dp |
| Secondary | 13 dp | 400 | 18 dp |
| Micro label | 11 dp | 500 | 14 dp |

Do not use all-caps or dot-matrix type for long content. Keep technical typography as an accent.

## 5. Glass surface recipes
Use distinct surface levels:
- Level 0 — Background: opaque silver base plus geometric reflections.
- Level 1 — Standard glass card: white tint at approximately 72% opacity, blur sigma 12, 1 dp white border, soft shadow.
- Level 2 — Floating control: slightly brighter fill (78–85%), blur sigma 14–16, stronger edge highlight and modestly stronger shadow.
- Level 3 — Navigation glass: 78–85% fill, blur sigma 10–14, fine top border; maintain clear icon/label contrast.
- Level 4 — Information glass: 65–72% fill, blur sigma 8–12, minimal shadow.

Suggested shadow: `rgba(23,29,34,0.10)`, blur 18 dp, offset `(0, 6)`. Treat these as starting values; adjust for contrast and background complexity.

Glass must sit above a visually varied but low-detail backdrop. A transparent card over a flat white canvas will not read as glass. Conversely, a high-detail wallpaper harms legibility. The included background is intentionally subtle.

## 6. Component specifications
### GlassCard
- Fill: `rgba(255,255,255,0.72)` in light mode.
- Blur: sigma 12.
- Border: 1 dp `rgba(255,255,255,0.58)`.
- Radius: 20 dp.
- Padding: 16 dp.
- Shadow: 0 6 dp 18 dp at 10% graphite.

### Primary glass button
- Height: 52 dp.
- Radius: 28 dp.
- Fill: white at 80–85% opacity.
- Border: 1 dp white at 65%.
- Label: 15–16 dp, weight 600, graphite.
- Leading plus/action icon: signal red.
- Press state: scale to 0.98 and reduce elevation; no long animation.

### Reminder card
- Radius: 20 dp.
- Padding: 16 dp.
- Leading icon: 24 dp.
- Title: 17 dp semibold.
- Metadata: 13 dp secondary; radius shown in metres/kilometres.
- Status: explicit label plus icon/indicator.
- Tap target: full card, minimum 48 dp high.
- Use amber for “Waiting for exit” and red for selected/active emphasis only if product semantics support it. Do not imply continuous tracking.

### Bottom navigation
- 3 destinations: Home, Map, Settings.
- Height: 72–80 dp plus safe area.
- Selected icon/label: signal red.
- Unselected: steel grey.
- Translucent navigation surface with subtle upper edge.
- Keep labels visible; do not rely on icons alone.

### Location radius visual
- Render as concentric rings or a map circle, not a decorative radar that falsely suggests live tracking.
- Center marker: signal red.
- Outer radius: thin white/steel stroke with a subtle translucent fill.
- Show numeric radius elsewhere in text.
- Animate radius changes gently (roughly 180–260 ms).
- Provide a static reduced-motion alternative.

## 7. Background artwork
Use `assets/backgrounds/glass_frosted_geometric_background.png` as a low-contrast screen backdrop. Recommended:
- `BoxFit.cover`.
- Add a light silver overlay if content contrast needs improvement.
- Avoid placing small text directly over bright reflection boundaries.
- Keep background art static; do not animate a large full-screen blur.
- For dark mode, create a separate graphite-toned variant rather than simply applying a black tint to this light asset.

## 8. Icon system
The included SVGs use:
- 24 × 24 viewBox.
- 1.7 px stroke.
- Rounded caps and joins.
- No fill by default.
- Graphite stroke, recolored through theme tokens at render time.

Use red only for selected/primary states. Keep icons consistent in optical size and stroke weight. For production, prefer a single licensed icon family or these supplied SVGs; do not mix outline and filled styles randomly.

Included icons: home, map-pin, settings, plus, chevron-right, bell, search, edit, trash, locate, radar, check, close, menu, clock, wifi-off.

## 9. Flutter implementation notes
Suggested building blocks:
- `BackdropFilter(filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12))`
- `ClipRRect(borderRadius: BorderRadius.circular(20), child: ...)`
- `DecoratedBox` with translucent `Color`.
- `Border.all(color: Colors.white.withOpacity(0.58), width: 1)`
- `BoxShadow(color: graphite.withOpacity(0.10), blurRadius: 18, offset: Offset(0, 6))`

Create reusable widgets:
- `GlassCard`
- `GlassButton`
- `GlassNavigationBar`
- `GlassStatusPanel`
- `GlassInputField`
- `ReminderCard`
- `LocationRadiusOverlay`
- `RadiusSelector`

Performance:
- Do not nest multiple BackdropFilters unnecessarily.
- Avoid expensive blur inside long scrolling lists; consider a shared backdrop or lower blur.
- Profile on lower-end supported devices.
- Keep the interactive map itself unblurred; put glass controls above it.
- Provide a reduced-transparency setting that swaps blur for opaque surfaces.
- Support dynamic text scaling and safe areas.
- Respect system reduced-motion settings.

## 10. Dark mode
Dark mode is free and part of the base product.
Suggested starting palette:
- Background: `#11171C`
- Elevated graphite: `#202A31`
- Glass fill: `rgba(34,43,50,0.78)`
- Primary text: `#F3F6F7`
- Secondary text: `#B5C0C6`
- Border: `rgba(255,255,255,0.14)`
- Accent: `#F52232`

Use light text on dark glass. Do not use the light-mode text tokens unchanged.

## 11. Accessibility and usability
- Maintain WCAG-informed contrast; translucent effects must never compromise legibility.
- Minimum 48 dp touch targets.
- Support text scaling.
- Provide reduced transparency and reduced motion settings.
- Do not use color as the only status cue.
- Test with VoiceOver and TalkBack.
- Ensure buttons and icons have semantic labels.
- Avoid micro-text below 11 dp for essential information.

## 12. Design QA checklist
- Does every screen use the same spacing/radius/type scale?
- Are glass surfaces readable over every background region?
- Is red reserved for meaningful emphasis?
- Are active/waiting states understandable without color?
- Does the UI remain usable with blur disabled?
- Does the map remain interactive and visually clear?
- Does the interface fit small and large phones?
- Does dark mode look intentionally designed?
- Are animations subtle and respectful of reduced-motion preferences?
- Do ads remain clearly separated from reminders and actions?

## 13. Design intent
The target is a refined, premium, futuristic glass interface—not a cluttered sci-fi dashboard. The visual hierarchy and usability of the reminder workflow always take priority over decorative effects.
