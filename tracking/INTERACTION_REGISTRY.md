# Interaction Registry — Maestro Preparation

Keep this file updated in the same change that adds or changes a UI control. Every interactive element must have a stable, unique `testID` and a useful accessibility label.

Do not build Maestro flows yet. This registry is the source of truth for later E2E authoring.

## Naming convention

Format: `screen.element.action` in lower camel case, e.g. `home.createReminder.button`.

Requirements:
- Stable across visual refactors.
- Unique across the app.
- No array index in IDs.
- Prefer IDs on the actual pressable/input element.
- Add `accessibilityLabel`, `accessibilityRole`, and state props (`accessibilityState`) as applicable.
- For text inputs, add a stable `testID` and label.
- Do not use visible text as the only automation selector.

## Registry

| testID | Screen | Element | Type | Expected behavior | Status |
|---|---|---|---|---|---|
| `navigation.tab.home` | Global | Home tab | Tab | Navigate to Home | Planned |
| `navigation.tab.map` | Global | Map tab | Tab | Navigate to Map | Planned |
| `navigation.tab.settings` | Global | Settings tab | Tab | Navigate to Settings | Planned |
| `home.createReminder.button` | Home | Add reminder | Button | Open Create Reminder | Planned |
| `home.reminder.card.<reminderId>` | Home | Reminder card | Pressable | Open reminder detail | Planned |
| `home.reminder.expand.<reminderId>` | Home | Expand reminder | Button | Expand/collapse card | Planned |
| `createReminder.title.input` | Create | Title | TextInput | Enter title | Planned |
| `createReminder.description.input` | Create | Description | TextInput | Enter description | Planned |
| `createReminder.location.current.button` | Create | Current location | Button | Select current/mock location | Planned |
| `createReminder.location.pin.button` | Create | Map pin | Button | Select map pin | Planned |
| `createReminder.location.search.button` | Create | Search | Button | Start optional place search or show deferred state | Planned |
| `createReminder.arrivalZone.value` | Create | Fixed 200m arrival zone | Read-only text | Explain the automatic fixed arrival-zone radius | Planned |
| `createReminder.sound.switch` | Create | Sound | Switch | Toggle sound preference | Planned |
| `createReminder.vibration.switch` | Create | Vibration | Switch | Toggle vibration preference | Planned |
| `createReminder.save.button` | Create | Save reminder | Button | Validate and save mock reminder | Planned |
| `reminders.search.input` | List | Search | TextInput | Filter reminders locally | Planned |
| `reminders.filter.all` | List | All filter | Button | Show all reminders | Planned |
| `reminders.filter.active` | List | Active filter | Button | Show active reminders | Planned |
| `reminders.filter.waiting` | List | Waiting filter | Button | Show waiting reminders | Planned |
| `reminders.filter.triggered` | List | Triggered filter | Button | Show triggered reminders | Planned |
| `reminders.filter.completed` | List | Completed filter | Button | Show completed reminders | Planned |
| `reminderDetail.edit.button` | Detail | Edit | Button | Open edit form | Planned |
| `reminderDetail.delete.button` | Detail | Delete | Button | Open confirmation | Planned |
| `reminderDetail.delete.confirm` | Detail | Confirm delete | Button | Delete reminder | Planned |
| `settings.notifications.enabled.switch` | Settings | Notifications | Switch | Toggle notification preference | Planned |
| `settings.notifications.sound.switch` | Settings | Sound | Switch | Toggle sound preference | Planned |
| `settings.notifications.vibration.switch` | Settings | Vibration | Switch | Toggle vibration preference | Planned |

For dynamic reminder IDs, use the stable reminder UUID in the generated identifier and document how Maestro will select the current fixture.

## Update protocol

When implementing a control:
1. Assign its `testID` before considering it complete.
2. Add or update the registry row.
3. Add accessibility label and role.
4. Ensure disabled/selected/expanded states are exposed.
5. Verify IDs are unique.
6. Record any removed or renamed identifier in the change summary.

## Developer Tools controls (dev builds only)

| testID | Screen | Element | Type | Expected behavior | Status |
|---|---|---|---|---|---|
| `settings.developerTools.row` | Settings | Developer Tools | Navigation row | Visible only when build-gated developer mode is enabled | Planned |
| `developerTools.buildStatus.label` | Developer Tools | DEV BUILD label | Text | Clearly identify development build | Planned |
| `developerTools.stationaryDuration.control` | Developer Tools | Stationary duration | Input/slider | Change dev-only arrival confirmation duration | Planned |
| `developerTools.geofenceRadius.control` | Developer Tools | Geofence radius | Input/slider | Change dev-only test radius | Planned |
| `developerTools.speedThreshold.control` | Developer Tools | Speed threshold | Input/slider | Change dev-only test speed limit | Planned |
| `developerTools.locationSampleGap.control` | Developer Tools | Maximum sample gap | Input/slider | Change dev-only freshness tolerance | Planned |
| `developerTools.horizontalAccuracy.control` | Developer Tools | Maximum horizontal accuracy | Input/slider | Change dev-only accepted accuracy | Planned |
| `developerTools.reset.button` | Developer Tools | Reset defaults | Button | Restore dev-mode defaults | Planned |
| `developerTools.simulateEnter.button` | Developer Tools | Simulate ENTER | Button | Inject clearly labeled test event; not a real OS geofence event | Planned |
| `developerTools.simulateExit.button` | Developer Tools | Simulate EXIT | Button | Inject clearly labeled test event; not a real OS geofence event | Planned |
