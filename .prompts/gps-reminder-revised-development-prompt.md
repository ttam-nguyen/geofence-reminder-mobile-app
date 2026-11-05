# GPS Reminder — Revised Product Specification & Engineering Planning Prompt

> **Purpose:** Give an AI coding agent or engineering team a self-contained product specification and require it to produce a repository-aware, testable implementation plan before writing application code.
>
> **Important:** This document is a product/specification and planning prompt. It is not permission to start implementation immediately. First inspect the repository, resolve material unknowns, and produce the implementation plan(s) for review.

---

# Part 1 — Role and working method

Act as a senior mobile software architect and implementation planner experienced with Flutter, native iOS and Android location services, offline-first applications, mobile notifications, accessibility, privacy, and mobile monetization.

You are responsible for turning the product requirements below into a practical engineering plan that another engineer—with no access to the original discussion—can execute.

Use the `writing-plans` skill by obra / Superpowers as the planning standard.

## Mandatory workflow

1. **Do not write application code yet.**
2. Inspect the repository and its existing conventions before proposing implementation details.
3. Identify whether this project is new or an existing application.
4. Read applicable project instructions such as `AGENTS.md`, `CLAUDE.md`, README files, package manifests, CI configuration, and existing architecture documentation.
5. Verify available build, test, lint, and type-check commands from the repository. Do not invent commands.
6. Identify the actual VCS and current revision. Include a planned-at revision and a drift-check command in each implementation plan.
7. Map the files and modules that will be created or changed, with one clear responsibility per file.
8. Split this project into multiple independently testable plans. Do not force all subsystems into one oversized plan.
9. Write small, testable tasks. Each task must include files, interfaces, tests, commands, expected results, and a commit step.
10. Review every plan against the requirements and fix gaps before presenting it.
11. Stop and ask for clarification only when a material decision cannot be safely inferred. Ask one question at a time and recommend a default.

If the repository is empty or has no established build/test commands, make establishing the project skeleton and verification baseline an explicit first plan. State what could not be verified.

## Planning output requirements

For every implementation plan:

- Use the required `writing-plans` header:
  - Feature name
  - Goal
  - Architecture
  - Tech Stack
  - Spec reference
  - Global Constraints
  - Review Focus
- List exact files to create, modify, or test, based on repository inspection.
- Define the interfaces consumed and produced by each task.
- Use checkbox steps.
- Prefer the test-first sequence:
  1. Write a failing test.
  2. Run it and confirm the expected failure.
  3. Implement the smallest change.
  4. Run the focused test and confirm it passes.
  5. Run relevant broader checks.
  6. Commit the completed change.
- Include exact commands and expected outcomes, verified against the repository.
- Avoid vague instructions such as “handle edge cases,” “add validation,” or “test thoroughly.” Name the behavior and test.
- Do not write speculative full implementations where signatures, contracts, and tests are sufficient.
- Identify dependencies between plans and state their execution order.
- Include a self-review for specification coverage, task granularity, interface/type consistency, review-focus tests, and proportionality.
- Do not begin implementation until the user has reviewed and approved the plan(s).

Default plan location, unless repository conventions or user instructions say otherwise:

`docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`

For a multi-plan effort, use a dedicated subdirectory with numbered plans and an index README, following the installed skill's conventions.

---

# Part 2 — Product definition

## Product name

Working name: **GPS Reminder**. The final brand name is undecided. Keep the product name, app display name, icons, and other branding configurable rather than scattering literals throughout the code.

## Product purpose

Build a free, cross-platform mobile application for iOS and Android that reminds users when they physically enter a geographic area.

The app is location-triggered, not time-triggered. Users create one-time reminders associated with a place and a radius. When the device detects entry into that area, the app delivers a local notification and, where permitted, sound and vibration.

The product's central promise is:

**Remember what you need to do when you arrive somewhere—not at an arbitrary time.**

## Confirmed product decisions

| Area | Decision |
|---|---|
| Platforms | iOS and Android |
| Preferred shared UI framework | Flutter, subject to repository and technical validation |
| Trigger | Entry only |
| Reminder frequency | One-time |
| Location selection | Current GPS, map pin, address/business search |
| Current-location creation | Wait for exit, then trigger on next entry |
| Remote-location creation | Arm immediately if user is outside the target radius |
| Core operation | Offline-first |
| Map offline behavior | Previously cached/downloaded map data must be usable offline |
| Background operation | Work in background and after normal app closure; support swipe-away behavior as far as each OS permits |
| Primary alerts | Local notification, sound and vibration subject to OS permissions/settings |
| SMS | Reserved for the final development phase; not part of MVP |
| Monetization | Free app supported by ads |
| Ad placements | Banner ads and ads within the reminders list |
| Full-screen ads | Voluntary, user-initiated rewarded ads accessible from Settings; never forced |
| Default visual design | Direction D, “Frosted Future / Glass Minimal,” from the first four-way sci-fi concept exploration |
| Paid customization | Optional purchase of additional visual themes/reskins; default theme remains free |

Do not silently change these decisions. If technical research shows a requirement cannot be met exactly, explain the platform limitation and propose the closest honest behavior.

---

# Part 3 — Functional requirements

## 3.1 Reminder creation

Users can create a reminder with:

- Required title.
- Optional description.
- Target latitude and longitude.
- Human-readable location name, when available.
- Configurable radius in meters.
- Location selection source: current GPS, map, or search.
- Notification preferences.
- Creation and modification timestamps.
- Persistent lifecycle status.

Provide initial radius choices of:

- 100 meters
- 200 meters
- 500 meters
- 1 kilometer
- Custom radius

Treat these as product defaults, not guarantees of location accuracy. Validate sensible minimum and maximum values against platform behavior and usability testing.

## 3.2 Location selection

All three location-selection methods must produce the same canonical target-location model.

### Current GPS location

- Obtain a fresh device location with an accuracy value and timestamp.
- Explain when location accuracy is poor or unavailable.
- Save the selected coordinates as the reminder target.
- Determine whether the user is inside the target radius.
- If inside, create the reminder in `WAITING_FOR_EXIT`.
- If outside, create it in `ARMED`.

### Map pin

- Show an interactive map.
- Let the user place and reposition a pin.
- Show the selected radius around the pin.
- Save coordinates and an optional human-readable label.
- Determine the user's relationship to the target radius at creation time.
- Previously cached map data must support offline map viewing and pin selection where the chosen provider and its license permit it.

### Address or business search

- Search for addresses, businesses, and places when internet access is available.
- Display results for user confirmation.
- Convert the selected result into the canonical target-location model.
- If offline, clearly explain that live search is unavailable. Do not imply that a live search succeeded.
- Consider offline search only as a separately evaluated future enhancement; it is not required for the first release.

## 3.3 Entry-only reminder behavior

The app must trigger only when the user enters a reminder's target radius.

At creation, determine whether the user is currently inside the target radius:

**If inside:**
1. Set status to `WAITING_FOR_EXIT`.
2. Do not trigger on initial registration or initial region-state evaluation.
3. Wait for a confirmed exit.
4. Transition to `ARMED`.
5. Trigger on the next confirmed entry.

**If outside:**
1. Set status to `ARMED`.
2. Trigger on the next confirmed entry.

This behavior applies regardless of whether the location came from GPS, map selection, or search.

Do not assume that the location-selection method determines whether the user is inside. Use the device's current location and the selected target/radius.

## 3.4 Reminder lifecycle

Use explicit, persisted states:

- `DRAFT`
- `WAITING_FOR_EXIT`
- `ARMED`
- `TRIGGERED`
- `COMPLETED`
- `CANCELLED`

Requirements:

- A reminder triggers at most once.
- Duplicate or delayed OS events must not produce duplicate alerts.
- A reminder in `WAITING_FOR_EXIT` must not trigger on entry-like initialization events.
- Exit events never trigger an entry-only reminder.
- A triggered reminder must no longer be monitored as an active reminder.
- State must survive app process termination and device restart where the OS permits restoration.
- Editing the target or radius must safely recalculate the reminder's state and geofence registration.
- Deleting/cancelling a reminder must unregister its geofence.
- Multiple reminders may share the same coordinates and must be handled independently.
- Define what happens when the user's current location cannot be determined at creation or edit time. Do not silently arm a reminder when the inside/outside condition is unknown.

The implementation plan must define transaction boundaries and idempotency so an event cannot cause a notification to be delivered twice after a crash or retry.

## 3.5 Reminder management

Users must be able to:

- View all reminders.
- See each reminder's status.
- View reminder details.
- Edit title, description, location, radius, and alert preferences.
- Delete/cancel reminders.
- Search or filter reminders.
- See when a reminder has triggered/completed.

A history view may be included if it fits the MVP without delaying core geofencing reliability. Do not build a large analytics system.

---

# Part 4 — Offline-first requirements

Offline operation is a core product requirement, not a later enhancement.

Without internet, users must still be able to:

- Create a reminder using current GPS.
- Create a reminder by placing a pin on previously cached/downloaded map data.
- View, edit, and delete locally stored reminders.
- Register/manage supported geofences.
- Receive local notifications.
- View saved reminder details and status.
- Use the reminder engine without cloud services.

Internet may be required for:

- Initial map downloads.
- Live address search.
- Live business/place search.
- Advertising requests.
- Optional future SMS delivery.
- Optional future cloud backup/synchronization.

Requirements:

- Local storage is the source of truth for MVP reminders.
- No login or cloud account is required for core use.
- Do not block reminder creation because an ad or network request fails.
- Do not block local notification delivery because the device is offline.
- Map caching must respect the chosen provider's technical restrictions, licensing, attribution, and offline-use terms. Do not assume arbitrary tile downloading/caching is allowed.
- Research and recommend a map provider based on offline support, cost, licensing, Flutter integration, and long-term viability before committing to it.
- Clearly distinguish “map data is cached” from “search works offline.”

---

# Part 5 — Background location and platform constraints

Use native OS geofencing/region monitoring rather than continuous GPS polling.

Preferred platform mechanisms:

- iOS: Core Location region/condition monitoring appropriate to the deployment target and current Apple APIs.
- Android: Google Play Services Geofencing API and appropriate background event handling.

The implementation plan must verify current official platform documentation, API availability, limits, permission rules, and lifecycle behavior. Do not hardcode remembered limits without checking current documentation.

Support, to the extent each OS allows:

- App foreground.
- App background.
- User switching apps.
- Normal app closure.
- User swiping the app away from the recent-apps/app-switcher UI.
- Device restart and restoration of eligible reminders.

Be explicit that swipe-away, force-stop, force-quit, reboot, manufacturer battery management, disabled location services, and revoked permissions do not behave identically across iOS and Android. Never promise behavior the OS does not guarantee.

The app must:

- Explain background location permission in user-facing language.
- Request permissions contextually and progressively.
- Detect unavailable/revoked permissions and show a clear monitoring warning.
- Avoid continuous tracking and unnecessary location collection.
- Maintain a platform-specific geofence registration manager.
- Respect OS geofence/region limits.
- Define a deterministic prioritization policy if the user has more reminders than can be registered simultaneously.
- Recover registrations after app/device restart where supported.
- Handle stale registrations and removed reminders.
- Use entry/exit state reconciliation carefully to avoid false triggers.

The plan must include real-device validation for both platforms. Simulator-only success is insufficient for background geofencing acceptance.

---

# Part 6 — Notification and alert requirements

Local notifications are the MVP alert mechanism.

When a reminder triggers:

- Display the reminder title and useful context.
- Play an alert sound when allowed by the OS and user settings.
- Vibrate when supported and permitted.
- Allow the user to open the reminder.
- Ensure the notification does not depend on an internet connection.

The app must explain if notification permissions are disabled or alert delivery is restricted.

Do not promise an alarm that overrides silent mode, Focus modes, Do Not Disturb, or OS notification settings unless a platform-specific capability is researched, approved, and justified.

## SMS deferral

SMS is explicitly out of scope for MVP and all early phases.

Do not implement SMS, request SMS permissions, select an SMS provider, or add SMS UI in the initial release.

Keep the alert-delivery architecture modular enough to add SMS in the final development phase. SMS would be an optional future delivery channel, likely requiring network access, provider configuration, user consent, cost disclosure, and platform/policy review.

---

# Part 7 — UI/UX and visual design requirements

## 7.1 Selected default visual direction

Use **Direction D — Frosted Future / Glass Minimal** from the first four-way visual exploration.

This is the selected default theme. Do not substitute the industrial, neon, or monochrome directions as the default.

Visual characteristics:

- Frosted-glass and translucent layered surfaces.
- Soft neutral backgrounds and subtle depth.
- Monochrome foundation with restrained red signal accents.
- Precise, readable typography.
- Fine dividers and understated geometric/dot-matrix details.
- Refined location rings and map overlays.
- Calm, polished motion.
- Generous spacing and clear hierarchy.
- High contrast and accessible controls.

The design may take broad inspiration from minimalist futuristic consumer hardware interfaces, but must create an original identity. Do not copy Nothing logos, proprietary Glyph assets, exact brand screens, or imply affiliation.

Do not turn the app into a cluttered sci-fi dashboard or game HUD. Usability and accessibility take priority over decoration.

## 7.2 Required screens

1. **Onboarding and permissions**
   - Explain the location-reminder concept.
   - Explain why background location is required.
   - Explain notification permissions.
   - Show permission/monitoring status and recovery guidance.

2. **Home dashboard**
   - Reminder overview.
   - Clear Add Reminder action.
   - Active, waiting-for-exit, and completed states.
   - Reminder list.
   - Map and Settings navigation.
   - Clearly separated ad placement.

3. **Create reminder**
   - Title and optional description.
   - Current GPS, map pin, and search selection.
   - Map preview and target-radius circle.
   - Radius presets/custom value.
   - Save action.
   - Clear offline/search-unavailable states.

4. **Reminder list**
   - Title, place, radius, and status.
   - Search/filter.
   - Edit/delete actions.
   - Ads visually separated from reminders.

5. **Reminder details**
   - Reminder content.
   - Target location and radius.
   - Current state.
   - Edit/delete actions.

6. **Map**
   - Current location where permission is available.
   - Saved reminder locations.
   - Radius visualization.
   - Cached/offline map state indicator where useful.

7. **Settings**
   - Notification preferences.
   - Sound/vibration preferences.
   - Theme selection/store.
   - Advertising preferences.
   - Privacy and permission guidance.
   - App information.

## 7.3 UI design system

Before implementing all screens, define and document:

- Color tokens for the default theme.
- Typography scale and font licensing.
- Spacing scale.
- Corner radii.
- Elevation, blur, and translucency rules.
- Icon style.
- Button and input states.
- Status colors and status iconography.
- Animation/motion guidelines.
- Responsive behavior and safe-area rules.
- Accessibility contrast and text scaling.

Build reusable components and theme tokens rather than styling screens independently.

Provide a practical light/dark appearance strategy. The default Frosted Future design should remain recognizable in both appearances.

The UI plan should include reviewable screen designs or wireframes before full screen implementation. Do not treat a generated concept image as a production-ready layout specification.

---

# Part 8 — Monetization

## 8.1 Advertising

The app is free and ad-supported.

Confirmed placements:

- Banner advertisements.
- Advertisements within the reminders list.
- Optional user-initiated full-screen rewarded advertisements accessible from Settings.

Rules:

- Never show a forced full-screen ad.
- Never interrupt reminder creation, editing, saving, or alert delivery.
- Rewarded ads must be explicitly initiated by the user.
- Clearly label advertisements and visually separate them from reminders.
- An ad failure, timeout, no-fill response, or offline state must not affect reminder functionality.
- Do not load or show ads in a way that blocks core screens.
- Respect consent, privacy, age-related requirements where applicable, and platform advertising policies.

The exact ad network, frequency caps, rewarded-ad benefit, consent flow, and privacy disclosures are not yet decided. Research viable options and present a recommendation before implementation. Do not assume a rewarded ad grants a particular benefit; ask the product owner if the reward itself is material.

## 8.2 Paid theme/reskin purchases

The default Frosted Future theme must remain free.

Offer optional paid visual themes/reskins as appearance-only purchases.

Requirements:

- Theme preview before purchase.
- Clear free/paid labels and prices.
- Native platform in-app purchase integration.
- Restore purchases.
- Persist selected theme.
- Persist and validate purchase entitlements.
- Handle interrupted, cancelled, pending, refunded, and restored purchases.
- Do not lock reminder functionality behind purchases.
- New themes must be added through theme configuration/design tokens rather than changes to reminder business logic.

Possible future themes, not committed for launch:

- Monochrome Minimal.
- Industrial Tech.
- Futuristic Glow.
- Additional original themes.

Theme marketplace timing is a product decision to confirm during planning. The architecture should support it, but do not let theme purchases delay the core reminder MVP.

---

# Part 9 — Data model and privacy

Use local persistent storage as the MVP source of truth.

At minimum, define models for:

## Reminder

- `id`: UUID
- `title`: string
- `description`: nullable string
- `latitude`: numeric
- `longitude`: numeric
- `locationName`: nullable string
- `radiusMeters`: numeric
- `locationSource`: enum (`current_gps`, `map_pin`, `place_search`)
- `status`: lifecycle enum
- `createdAt`: timestamp
- `updatedAt`: timestamp
- `triggeredAt`: nullable timestamp
- `completedAt`: nullable timestamp
- Notification preferences needed by the product

## Reminder event / diagnostic record

Use a minimal event record sufficient to debug state transitions and duplicate event handling:

- Event identifier.
- Reminder identifier.
- Event type.
- Event timestamp.
- Previous and resulting states.
- Processing outcome/reason.

Avoid collecting a continuous location history. Store only location data necessary for the reminder feature and troubleshooting, with a documented retention policy.

## Notification delivery record

Record enough information to diagnose local notification scheduling/delivery where the platform exposes it. Do not claim to know that a user heard or saw a notification if the OS does not provide that confirmation.

The plan must decide whether these supporting records are required for MVP or can be simplified.

---

# Part 10 — Quality, reliability, and acceptance criteria

Create automated tests for business logic and state transitions, plus native/platform tests for geofencing behavior.

Required scenarios:

1. Create a reminder while inside the target radius: status is `WAITING_FOR_EXIT`.
2. Initial geofence registration while inside does not trigger.
3. Confirmed exit transitions to `ARMED`.
4. Next confirmed entry triggers exactly once.
5. Create a reminder outside the radius: status is `ARMED`.
6. Enter the target radius: trigger exactly once.
7. Repeated/duplicate entry events do not duplicate alerts.
8. Exit alone never triggers.
9. Two reminders at the same coordinates are handled independently.
10. Edit location/radius safely updates state and registration.
11. Cancel/delete removes registration where possible.
12. Restart restores reminder state and eligible geofences.
13. Offline creation using current GPS works.
14. Offline map pin selection works with cached map data.
15. Live search clearly reports that internet is unavailable.
16. Ad network failure/offline state does not block reminders.
17. Notification permission denial is explained.
18. Location permission revocation is detected and explained.
19. Geofence capacity is handled without silently losing reminders.
20. Theme selection persists across restarts.
21. Purchase restoration and entitlement state are handled correctly when theme purchases are implemented.

Initial engineering targets should be measured on real devices. Do not invent a guaranteed geofence latency. Establish realistic test conditions and report observed latency, missed events, battery impact, and OS-specific limitations.

A release candidate must demonstrate:

- No duplicate completion in repeated-event tests.
- Correct state restoration.
- Correct registration/removal behavior.
- Correct offline core behavior.
- No continuous GPS polling during normal operation.
- Clear permission and monitoring status.
- No blocking dependency on ads or network access.
- Usable and accessible primary flows on supported screen sizes.

---

# Part 11 — Required project decomposition

This project contains multiple subsystems. Do not write one giant implementation plan.

After repository reconnaissance, propose a dependency-ordered set of independently testable plans. A likely decomposition is:

1. **Foundation and design system**
   - App structure, architecture boundaries, theme tokens, navigation shell, local persistence baseline, test/lint baseline.

2. **Reminder domain and local data**
   - Models, lifecycle state machine, repositories, migrations, deterministic business-logic tests.

3. **Native geofencing proof of concept**
   - One geofence on iOS and Android, background behavior, permission flow, event delivery, device test harness.
   - This is a critical technical risk and should be validated early, before extensive UI work.

4. **Geofence orchestration and reminder integration**
   - Registration manager, capacity policy, inside/outside initialization, exit-to-arm, entry-to-trigger, idempotency, recovery.

5. **Location selection and maps**
   - Current GPS, map pins, address/place search, offline cached map evaluation and implementation.

6. **Notifications and app lifecycle recovery**
   - Local notifications, sound/vibration settings, app/device restart recovery, permission states.

7. **Core UI flows**
   - Home, create reminder, list, details, map, settings, onboarding, accessibility and offline states.

8. **Advertising**
   - Banner/list placements, optional rewarded ads, consent and privacy behavior, failure/offline handling.

9. **Paid themes**
   - Theme catalog, previews, purchase/restore, entitlement handling, theme persistence.

10. **Release hardening**
    - Real-device test matrix, performance/battery review, store disclosures, privacy documentation, release checklist.

This is a proposed decomposition, not a mandate to create ten plans regardless of repository reality. Merge or split only when each resulting plan remains independently reviewable and testable. State dependencies and identify the earliest useful end-to-end vertical slice.

SMS is not part of these plans. Add it only as a separately approved final-phase plan after the core application is stable.

---

# Part 12 — Research and unresolved decisions

Do not silently choose vendors or invent requirements. Research current official documentation and prepare recommendations for:

1. Map provider and permitted offline caching approach.
2. Flutter/native integration strategy and current supported APIs.
3. iOS and Android background geofencing behavior, limits, permissions, and swipe-away/force-stop constraints.
4. Local notification package versus native implementation.
5. Ad network and consent requirements.
6. In-app purchase implementation for paid themes.
7. Supported minimum iOS and Android versions.

For each recommendation, state:
- Proposed choice.
- Why it fits.
- Material trade-offs.
- Costs or licensing implications.
- Offline implications.
- Platform-specific limitations.
- Whether it requires product-owner approval.

Ask the user only about decisions that materially affect product behavior or cost and cannot be resolved through repository inspection or a well-supported recommendation. Ask one question at a time and include a recommended default.

---

# Part 13 — Required deliverables before coding

Return the following:

1. **Repository reconnaissance summary**
   - Existing project structure and conventions.
   - Current VCS and revision.
   - Verified build/test/lint commands.
   - Existing relevant dependencies and modules.
   - Unknowns or missing infrastructure.

2. **Architecture proposal**
   - Shared Flutter boundaries.
   - Native iOS/Android boundaries.
   - Persistence and geofence registration responsibilities.
   - Event flow and failure handling.
   - Offline map strategy.
   - Monetization boundaries.

3. **Plan decomposition**
   - Numbered plans in dependency order.
   - Scope and independently testable outcome of each.
   - Dependencies and critical-path risks.

4. **Implementation plan files**
   - Saved in the repository's established plan location, or the writing-plans default if none exists.
   - Exact file paths based on inspected repository structure.
   - Exact interfaces, tasks, tests, commands, and expected results.

5. **Self-review**
   - Requirement-to-plan coverage.
   - Missing tests and failure modes.
   - Interface/type consistency.
   - Task granularity.
   - Verification-command validity.
   - Any decisions still requiring approval.

6. **Human handoff**
   - Link the plan files.
   - Explain the recommended execution approach.
   - Ask the user to confirm that the plans capture the desired product.
   - Do not begin coding until the user approves.

---

# Final instruction

The goal is not to produce the longest possible plan. The goal is to make the important product and engineering decisions explicit, split the work into reviewable units, and give an engineer enough context to implement each unit safely without guessing.

Prioritize a real-device geofencing proof of concept early. A polished UI, map experience, or advertising integration cannot compensate for unreliable background reminder delivery.

Keep the core reminder engine offline-capable, local-first, privacy-conscious, and independent of advertising, map search, SMS, and paid themes.
