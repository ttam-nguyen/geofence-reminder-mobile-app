# Maestro E2E — Later Phase Only

Do not install or configure Maestro during the initial UI implementation unless the user explicitly requests it.

## Preparation required now
- Every interactive element gets a stable `testID`.
- Every icon-only control gets an accessibility label.
- Selected, disabled, expanded and loading states are exposed to accessibility.
- Keep `tracking/INTERACTION_REGISTRY.md` current.
- Prefer deterministic fixtures and predictable screen transitions.

## First proposed flows (after UI freeze)

1. `onboarding_happy_path.yaml`
2. `home_to_create_save_detail.yaml`
3. `edit_reminder.yaml`
4. `delete_reminder.yaml`
5. `search_and_filter_reminders.yaml`
6. `settings_toggles.yaml`
7. `offline_create_reminder.yaml`

## Example placeholder flow

This is a template only. Replace selectors with the actual test IDs and confirm Maestro's current syntax before running.

```yaml
appId: com.gpsreminder
---
- launchApp
- tapOn:
    id: home.createReminder.button
- tapOn:
    id: createReminder.title.input
- inputText: "Pick up package"
- tapOn:
    id: createReminder.location.current.button
- assertVisible:
    id: createReminder.arrivalZone.value
- tapOn:
    id: createReminder.save.button
- assertVisible: "Pick up package"
```

Maestro operates at the accessibility layer and does not require an in-app test SDK for ordinary React Native flows. Keep geofencing acceptance separate: physical-device validation is mandatory.
