# UI/UX Specification — Glass Layered Luxury

This document translates the supplied concept image and original product spec into implementable rules. The image is a reference for mood and composition, not a pixel-perfect source.

## 1. Design concept

**Name:** Glass Layered  
**Mood:** Luxury, precise, calm, tactile, modern, technical without looking industrial.  
**Visual metaphor:** A premium instrument panel viewed through layered smoked glass. Content floats above a deep graphite environment; subtle light and depth communicate hierarchy. Signal red is reserved for primary actions, location pins, and selected/urgent states.

The visual should feel deliberate and restrained. Avoid a generic dashboard look, excessive gradients, neon outlines, excessive blur, or a glass card around every single control.

## 2. Color tokens

Use semantic tokens rather than hardcoded colors inside screens.

| Token | Hex | Use |
|---|---|---|
| `background` | `#171D22` | Main graphite canvas |
| `surface` | `#222B32` | Elevated surface base |
| `surfaceGlass` | `#29343D` at 72–84% opacity | Frosted card fill |
| `surfaceGlassStrong` | `#34414B` at 88% opacity | Inputs, focused cards |
| `borderGlass` | `#FFFFFF` at 14–22% opacity | Hairline glass edge |
| `textPrimary` | `#F2F5F6` | Main text |
| `textSecondary` | `#B7C1C8` | Supporting text |
| `textMuted` | `#87949D` | Hints, metadata |
| `signalRed` | `#F52232` | Primary CTA, selected tab, map pin |
| `signalRedPressed` | `#C91828` | Pressed state |
| `signalRedSoft` | `#F52232` at 16% opacity | Selected/active background |
| `waitingAmber` | `#D99A42` | Waiting-for-exit status |
| `successGreen` | `#3C8D70` | Active/armed confirmation |
| `infoBlue` | `#4D9BE8` | Current user location |
| `disabledFill` | `#46515A` | Disabled controls |
| `danger` | `#E34A52` | Destructive actions |

The supplied spec lists a lighter Frost palette; this kit intentionally interprets the supplied screen concept as a dark graphite-first theme. The app may later support a light theme, but do not build theme switching in the first UI milestone.

## 3. Typography

Use system fonts initially to avoid font packaging and licensing overhead. Use Inter for primary UI and IBM Plex Mono for technical metadata only if the font files and license are intentionally added later.

| Style | Size | Weight | Use |
|---|---:|---|---|
| Display | 30 | Semibold | Dashboard count / hero |
| Screen title | 22 | Semibold | Screen headings |
| Section title | 17 | Semibold | Group headings |
| Body | 15 | Regular | Main content |
| Label | 13 | Medium | Field labels, badges |
| Caption | 11 | Medium | Metadata |

Line height should be comfortable and not compressed. Avoid using 11px for important information. Respect Dynamic Type / Android font scaling.

## 4. Spacing, geometry, elevation

Use a 4dp grid: `4, 8, 12, 16, 20, 24, 32, 40, 48`.

- Small radius: 10
- Input radius: 14
- Card radius: 20
- Large panel radius: 24
- Pill radius: 999
- Standard screen horizontal padding: 20
- Card internal padding: 16
- Gap between cards: 12
- Touch target: aim for at least 44pt iOS / 48dp Android
- Shadows: soft graphite shadow, low opacity, blur-like elevation; avoid harsh black drop shadows.

Glass surfaces use:
- translucent graphite fill,
- 1px white border at low opacity,
- subtle top-edge highlight,
- restrained shadow,
- optional blur only after a compatible native blur dependency is validated.

Never make body text low contrast just to achieve a glass effect. Body text must meet WCAG AA contrast (4.5:1).

## 5. Component definitions

### Buttons
Pill-shaped primary and secondary actions.

States:
- Default: signal-red fill for primary; translucent glass for secondary.
- Pressed: darker red / brighter border, slight scale to 0.98 or opacity response.
- Disabled: muted fill, muted text, no press animation, disabled accessibility state.
- Loading: spinner replaces or precedes label; prevent duplicate submission.
- Destructive: red outline or danger fill with confirmation for irreversible deletion.

Use full-width primary CTA at the bottom of forms when practical. Do not place two competing primary CTAs next to each other.

### Cards
Reminder cards are expandable/collapsible list items.
- Collapsed: location icon, title, distance, status badge, overflow action.
- Expanded: description, full location, radius, created/triggered metadata, primary action to open details.
- Expansion animation: 180–240ms, ease-out, respect reduced motion.
- Card press opens detail; expansion affordance must be a separate accessible control if both actions exist.

### Status badges
Compact rounded badges with both text and color/icon; never rely on color alone.
- Active/Armed: green dot + `Active`
- Waiting for Exit: amber dot + `Waiting for Exit`
- Triggered: red or neutral emphasis + `Triggered`
- Completed: muted + `Completed`
- Paused: muted amber/gray + `Paused`
- Draft: neutral + `Draft`
- Cancelled: muted + `Cancelled`

Note: The concept image uses simplified labels. Internally preserve the full state names from the product spec.

### Fieldsets
Group related fields inside a labeled section:
- Section label above.
- Glass panel background.
- Consistent vertical spacing.
- Optional helper text.
- Error text adjacent to the field.
- Inputs have visible focus/selected states.

### Inputs
- Rounded rectangle, not pill by default.
- Glass-strong fill.
- Clear label and placeholder.
- Focus border uses signal red at moderate opacity.
- Validation text is concise and announced to screen readers.
- Character counters only when useful.

### Segmented controls / tabs
Pill-like segmented controls with clear selected background and text. Provide selected accessibility state.

### Icon buttons
Minimum touch target, descriptive accessibility label, pressed feedback. Never rely on an unlabeled glyph.

### Loading / progress
- Small spinner for short actions.
- Skeleton only when content genuinely loads.
- Progress indicator for multi-step onboarding or long operations.
- No fake progress percentages.
- Never block local reminder CRUD on a network request.

### Navigation
Bottom tabs: Home, Map, Settings.
Selected tab uses signal red icon/label. Inactive tabs use muted text. Provide visible active indicator and accessibility selected state.
Stack screens use back affordance, title, and optional contextual actions.

## 6. Screen specifications

### 6.1 Onboarding (3 steps)
1. **Location reminders:** explain “Remember the right thing when you arrive.”
2. **Location permission:** explain why location is needed, then request the appropriate permission only when the user chooses to continue.
3. **Notification permission:** explain alerts, then request permission.

Rules:
- Skip is available where it does not undermine a required permission flow.
- Do not request Always/background location on the first screen. Use progressive permission education and request the minimum needed at the point of feature use.
- Show step indicator and back/continue actions.
- Explain that reminder functionality depends on OS permission and background restrictions.

### 6.2 Home Dashboard
Top area:
- compact app identity / greeting,
- active reminder count and waiting count as two compact metric tiles,
- optional visual location/radar motif (decorative only; do not imply live GPS if unavailable).

Main:
- `My Reminders` section header and add (`+`) action.
- Show a short list of reminder cards.
- Empty state with a clear Create Reminder CTA.
- Optional theme promotion/ad area is excluded from MVP. Do not insert placeholder ads.

Interactions:
- Add opens Create Reminder.
- Reminder card opens Detail.
- Overflow opens Edit / Complete where valid / Delete.
- Bottom tabs navigate Home, Map, Settings.

### 6.3 Create Reminder
Use a scrollable form with a persistent bottom Save CTA where safe-area and keyboard handling allow.

Fields:
1. Reminder Title (required, 1–100 characters).
2. Description (optional, 0–500 characters).
3. Location Selection segmented choices:
   - Current Location
   - Map Pin
   - Search (online-only, deferred; show disabled/coming-later only during initial UI if not implemented)
4. Map/location preview panel. During UI phase, use a designed placeholder and deterministic mock coordinates.
5. **Fixed arrival zone:** show an informational row reading `Arrival zone · 200 m`. This is not an input and has no selection control. Production radius is fixed at 200 meters for all reminders. The radius circle appears on the map preview so users understand the approximate arrival area.
6. Notification preference: sound on/off, vibration on/off (or a single notification preference panel).
7. Save Reminder.

The user does not configure the radius or arrival-detection threshold. Developer-only builds may override these values through the gated Developer Tools screen; see `docs/DEVELOPER_MODE.md`.

Validation:
- Empty title cannot save.
- Trim leading/trailing whitespace.
- Character limit visible when approaching limit.
- Location is required.
- Disable save while submitting.
- Show inline errors.

### 6.4 Reminder List
- Screen title `Reminders`.
- Search field or search affordance.
- Status filter segmented control: All, Active, Waiting, Triggered, Completed.
- Cards show title, distance/location summary, status badge, overflow menu.
- Empty state changes based on filter/search.
- Search works locally and offline.
- Filter state is preserved while screen remains mounted.

### 6.5 Reminder Detail
- Header with back, title, contextual overflow.
- Hero summary card with location icon, reminder title, distance, status.
- Map preview with target pin and fixed 200m radius circle (placeholder during early UI).
- Description section.
- Location and fixed arrival-zone metadata.
- Arrival behavior summary: `Notify after 2 minutes stationary inside the arrival zone`.
- Created/triggered/completed metadata as applicable.
- Bottom actions: Edit and Delete.
- Delete requires confirmation.
- Triggered is terminal: do not show re-arm or cancel controls for a triggered reminder.

### 6.6 Map
- Full map area with target markers and user location.
- Radius circles for active monitored reminders.
- Legend with reminder label and user location.
- Zoom controls only if supported and useful.
- Map tab remains navigable even when location permission is denied; show an explanatory state.
- During UI phase, use a static visual map placeholder with deterministic pins. Do not add live map SDK yet.

### 6.7 Settings
Groups:
- Notifications: enable/disable notifications, sound, vibration.
- Appearance: current theme label only in MVP; theme store excluded.
- Privacy: location use explanation and privacy policy placeholder/link once available.
- About: app version and support/contact placeholder.
- Permission status should be visible and provide a route to system settings when denied.

Do not include ads, rewarded video, or paid themes in MVP settings.

When the build-time developer-mode flag is enabled, show a separate `Developer Tools` row at the bottom of Settings. It must carry a visible `DEV` indicator and open the test-only configuration screen described in `docs/DEVELOPER_MODE.md`. In a production build, neither the row nor its route may exist.

## 7. Interaction and motion principles

- Screen transition: subtle native-stack transition; do not custom animate navigation unless necessary.
- Button press: short tactile response, 100–160ms.
- Card expand: 180–240ms.
- Loading: use activity indicator for indeterminate work.
- Map marker selection: subtle scale/opacity response.
- Avoid spring overshoot on a luxury interface.
- Respect OS reduced-motion preference; provide `durationReduced` token and remove nonessential movement.
- Never communicate status through animation alone.

## 8. Responsive and accessibility requirements

- Minimum layout width: 375pt/dp.
- Respect safe areas and keyboard.
- Support larger text sizes without clipping key actions.
- Accessibility labels for all icon-only buttons.
- Accessibility roles and selected/disabled states.
- Touch targets >=44pt iOS / 48dp Android where practical.
- WCAG AA contrast for body text.
- Screen-reader order follows visual order.
- Error messages are programmatically associated with fields.
- Do not convey status by color alone.

## 9. Initial UI scope exclusions

During UI-first milestones:
- no real geofence registration,
- no background location,
- no actual local notification delivery,
- no live geocoding/place search,
- no ad network,
- no in-app purchases,
- no backend/cloud account,
- no analytics,
- no persistent database until the mock UI flow is approved.

All of these must sit behind service/repository interfaces so they can be integrated later without rewriting screens.


## 10. Developer Tools screen (developer builds only)

The Developer Tools screen is a separate diagnostic surface, not part of normal user settings. It is reachable only when the build-time `GPS_REMINDER_DEV_MODE` flag is explicitly enabled in a Debug build and the runtime native build configuration confirms it.

Include a persistent `DEV BUILD` label and a summary of the effective test values. Provide controls for stationary duration, geofence radius, speed threshold, location sample gap, and accepted horizontal accuracy. Include a reset-to-dev-defaults action and a clearly labeled simulated ENTER/EXIT event tool. Simulated events must be visually distinguished from real OS geofence events.

Do not add developer controls to Create Reminder. Normal users always see the fixed 200m arrival-zone information only. Detailed configuration and safety rules live in `docs/DEVELOPER_MODE.md`.
