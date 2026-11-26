# PinPing — store publishing kit

Everything needed to publish the app, in one place, with the values already filled in where the
code answers the question.

**Status legend**

- ✅ ready — text or value you can paste into the console as-is
- ⬜ fill — a human decision or an account detail I cannot know (legal entity, contact email, prices)
- 🔧 code — a change that must land before submission, with the file named

App name: **PinPing**. The mascot in the icon is also PinPing: a cat with glasses and a megaphone.
It is a character, not a product feature, so the copy never has to explain it.

---

## 0. Before you use this document

This file is a working draft, not a submission pack. If you are an agent asked to fill in the store
console, a listing form or a translation hand-off from it, **confirm the following with the owner
first and stop at anything that is not confirmed**. Do not invent values for the open fields, and do
not treat `✅` as "already published" — it only means the text exists in this repo.

Ask, and record the answer in this file:

1. **Who is the publisher of record?** Legal entity name, postal address, country, and the mailbox
   that will be published as support contact. Both stores reject a privacy policy without an entity
   and a reachable contact, and the address appears on the listing permanently.
2. **Is the app name final?** `PinPing` is a working name. Ask whether a trademark search was done in
   the launch markets before it goes into the listing, the launcher label and the store URL.
3. **Signing decision.** Release builds are currently signed with the project's **debug keystore**.
   Ask the owner to confirm the upload keystore exists, that its password is recorded, and that they
   accept that existing debug-signed installs cannot be updated after the switch. This cannot be
   changed after the first public upload.
4. **`versionName` / `versionCode` scheme.** Currently static (`1.0` / `1`). Confirm the scheme before
   uploading, because Play refuses a repeated version code.
5. **Which code fixes land before submission?** The `🔧` items in §1, §3, §4 and §11 are not
   cosmetic: two unused alarm permissions, a launcher label still reading `GPSReminder`, an opaque
   adaptive-icon foreground, and a coloured notification icon. Confirm they are scheduled, or get an
   explicit decision to ship without them and note the consequence.
6. **Which platforms are being submitted?** Android is verified on a physical device. iOS has no
   build on this machine (`K-014` in `tracking/KNOWN_ISSUES.md`) and no persisted transition queue
   (`K-018`). Do not answer iOS privacy or screenshot questions until that is resolved.
7. **Copy sign-off.** §2 is plain-language copy written for translation. Confirm the owner has read it
   aloud and accepts the claims: about 200 metres, about two minutes, offline storage, no account.
   Do not add marketing claims that the app does not support.
8. **Data safety accuracy.** §6 is accurate for the code as it stands: address search calls
   OpenStreetMap Nominatim, map tiles come from Google Maps or Apple Maps, and there is no analytics,
   advertising or crash reporting. If any SDK is added later, the answers must change before upload.
9. **Assets.** Screenshots, feature graphic and the 512 px icon are listed as ⬜ — they do not exist
   yet. Confirm who produces them; the current device captures are 1:2.21 and Play rejects anything
   taller than 2:1.
10. **Countries, pricing and testing track.** Confirm the launch countries, that the app is free, and
    that the first upload goes to an internal testing track before production.

Rules for filling anything in from this document:

- Never paste a field marked ⬜ as if it were final. Either get the value from the owner, or leave the
  field empty and report it as missing.
- Never paste a field marked 🔧 until the code change is in the build being uploaded. The listing and
  the build must agree: a launcher label of `PinPing` with a listing that says `GPSReminder`, or a
  version code the build does not carry, causes review friction.
- Keep the character counts. The copy in §2 was measured against the store limits; if you edit a
  sentence, re-check the limit.
- If a store question is not covered here, ask rather than guess. Legal answers that are plausible
  but wrong are worse than a delayed submission.

---

## 1. Identity and store metadata

| Field | Value | Where |
|---|---|---|
| App name (Play, 30 chars max) | ✅ `PinPing` | Play: Store listing → App name |
| App name (App Store, 30 chars max) | ✅ `PinPing` | App Store Connect → Name |
| Package / bundle id | ✅ `com.gpsreminder` | Already set. Changing it would orphan every existing install's data, so keep it. |
| Launcher label | ✅ `PinPing` since v1.8.0 (`strings.xml`, `app.json displayName`). The RN component name stays `GPSReminder` because `MainActivity.getMainComponentName()` registers it. |
| Primary category (Play) | ✅ Maps & Navigation | Play: Store settings |
| Primary category (App Store) | ✅ Navigation | App Store Connect |
| Secondary category | ⬜ Tools, or none | optional |
| Content type | ⬜ No ads, no in-app purchases, no accounts | Play: App content |
| Contact email | ⬜ `support@pinping.example` — replace with a mailbox you actually read | Play + App Store |
| Support URL | ⬜ a page with a contact address | required by both stores |
| Privacy policy URL | ⬜ host `§7` below at a stable URL | required by both stores |
| Marketing URL | ⬜ optional | |
| Default language | ✅ English | |
| Additional languages | ⬜ see §11 | |

---

## 2. Short copy (plain language, translation-friendly)

Rules used here: one idea per sentence, no idioms, no jargon, no wordplay, no contractions, no
numbers written as words. Every sentence can be machine-translated without losing the meaning.

### Short description — Google Play (80 characters max)

```
✅ Saved place alerts. PinPing tells you when you arrive.
```

### Subtitle — App Store (30 characters max)

```
✅ Reminders for places you go
```

### Promotional text — App Store (170 characters, editable without review)

```
✅ PinPing reminds you when you reach a place. Choose a location on the map, set one reminder, and
close the app. PinPing sends a notification after you arrive and stay for a moment.
```

### Keywords — App Store (100 characters, comma separated, no spaces)

```
✅ reminder,location,arrive,gps,alert,geofence,task,errand,place,map,notification,shopping
```

### Full description — Google Play and App Store (draft, ~1,200 characters)

```
PinPing reminds you when you reach a place.

Do you forget things when you arrive somewhere? Pick up the parcel. Buy milk on the way home.
Take the keys from the office. PinPing helps you remember at the right moment.

How it works
1. Choose a place on the map. You can search for an address, drop a pin, or use your current location.
2. Write a short reminder for that place.
3. Close the app. PinPing keeps the reminder in the background.
4. When you arrive and stay for about two minutes, PinPing sends a notification.

PinPing works without an account and without a subscription. Your reminders stay on your phone.

Good to know
• Each reminder covers a circle of about 200 metres around the place.
• PinPing waits about two minutes after you arrive. This avoids alerts when you only drive past.
• PinPing needs location permission. To work while the app is closed, it needs the "Allow all the
time" location option.
• PinPing needs notification permission to send the alert.
• You can save places that you visit often, and give them your own name.

Privacy
PinPing stores your reminders on your phone. Address search uses OpenStreetMap. See the privacy
policy for details.

Questions or problems
Write to support@pinping.example.
```

The same text works for both stores. Play allows 4,000 characters, App Store 4,000, so this is the
single source of truth. Keep it under 4,000 when translating.

### What's new — release notes (500 characters max)

```
✅ First release. Create reminders for places. PinPing sends a notification when you arrive and
stay for about two minutes. Saved places, search, and a map that shows your reminders.
```

### Screenshot headlines (3 to 5 words each, same font, no sentences)

```
✅ 1. Reminds you when you arrive
✅ 2. Pick a place
✅ 3. Search or save
✅ 4. See every reminder
✅ 5. Works with the app closed
✅ 6. You control permissions
```

---

## 3. Store visual assets

### Icon

| Field | Value |
|---|---|
| Master artwork | ✅ `store/icon/pinping-icon-1024.png` (1,024 px, flat 2D mascot, corners flattened to `#11182B`) |
| Play icon | ✅ `store/icon/pinping-play-icon-512.png` (512 × 512 PNG, no alpha) |
| App Store icon | ✅ regenerated from the master: `ios/GPSReminder/Images.xcassets/AppIcon.appiconset/` (all sizes, no alpha; iOS build still out of scope, `K-014`) |
| Launcher icon | ✅ installed from `gps_reminder_flat2d_react_native_icons`; `ic_launcher_foreground.png` is transparent outside the square, so the white edge is gone |

### Feature graphic — Google Play (required)

| Field | Value |
|---|---|
| Size | 1024 × 500 PNG or JPEG |
| Content | The mascot on the left, the words `PinPing` and one line: `Reminds you when you arrive`. No device frames, no text smaller than 40 px. |

### Screenshots — what exists, and what the stores need

Captured on the Nothing Phone 3a Pro (`A059P`, 1080 × 2392) and stored in **`store/screenshots/`**.
Provenance and the capture procedure are recorded in `store/screenshots/README.md`.

| # | File (`-play` is the uploadable crop) | Screen | Shows | Headline overlay (still to add) |
|---|---|---|---|---|
| 1 | `store/screenshots/01-home-play.png` | Home | Three active reminders, collapsed `Triggered` group, floating create button, tab icons | Reminds you when you arrive |
| 2 | `store/screenshots/02-map-play.png` | Map | Full-bleed map with pins, sheet with mode toggle, search field, focused card | See every reminder |
| 3 | `store/screenshots/03-detail-play.png` | Reminder detail | Title, status badge, address, map, arrival rule, Edit and Delete | One reminder, one place |
| 4 | `store/screenshots/04-create-play.png` | Edit reminder | Merged location block: map with pin, "Use my location", address search, notification toggles | Pick a place |
| 5 | `store/screenshots/05-settings-play.png` | Settings | Notification toggles, permission rows, diagnostics export | You control permissions |

Every screen also has a `-raw` file: the full 1080 × 2392 device capture, kept for re-cropping.
**Do not upload the `-raw` files** — 1:2.21 exceeds the Play limit.

The screenshots use **demo data**, not the user's reminders: the database was backed up, the titles
and addresses replaced with `…Springfield` values, the coordinates moved to Boise so the map renders
over a neutral city, then the original database was restored. No real address appears in them.

**Google Play (2 to 8 per type)**

| Type | Requirement | Status |
|---|---|---|
| Phone | ratio no taller than 2:1, min 320 px, max 3840 px | ✅ five crops at 1080 × 2160 (1:2.000) |
| 7-inch tablet | optional, 1024 × 600 min | ⬜ not captured |
| 10-inch tablet | optional, 1280 × 800 min | ⬜ not captured |

**App Store**

| Display | Required size | Status |
|---|---|---|
| 6.9-inch | 1320 × 2868 or 1290 × 2796 | ⬜ needs an iOS build first (`K-014`) |
| 6.5-inch | 1284 × 2778 or 1242 × 2688 | ⬜ same |
| 12.9-inch iPad | 2048 × 2732 | ⬜ only if iPad support is claimed |

Still missing before upload:

1. **Headline overlays** — one short line inside each frame, top area, same font, no caption
   underneath. The wording is in the last column of the table above.
2. **Notification frame** — the kit asks for the arrival notification over the lock screen, which
   needs a real arrival. Capture it on the next field test and add it as frame 6.
3. **Feature graphic** 1024 × 500 (§ above).
4. **Play icon** 512 × 512, exported from the 1024 master with no alpha.

How the `-play` crops were made, so they can be reproduced after any UI change:

```bash
adb exec-out screencap -p > store/screenshots/01-home-raw.png
sips -c 2160 1080 --cropOffset 116 0 \
  store/screenshots/01-home-raw.png --out store/screenshots/01-home-play.png
```

`-c 2160 1080` is height then width; `--cropOffset 116 0` drops the status bar above and leaves the
system navigation strip out at the bottom, keeping the app header, content and tab bar in frame at
exactly 2:1.

## 4. Versioning and build commands

| Field | Value |
|---|---|
| Current app version | ✅ `1.5.4` (`src/config/version.ts`, shown in Settings → About) |
| `versionName` | 🔧 still static `"1.0"` in `android/app/build.gradle`; the installer reports 1.0 while the app says 1.5.4. Derive it from `APP_VERSION`. |
| `versionCode` | 🔧 still `1`. Increment for every upload; Play rejects a repeated code. |
| Play upload format | AAB: `cd android && ./gradlew bundleRelease` → `android/app/build/outputs/bundle/release/app-release.aab` |
| Sideload APK | ✅ `./deploy-release.sh` (no `--diagnostics`) |
| Signing | 🔧 release currently uses `signingConfigs.debug`. A Play upload needs an upload key you control: create a keystore, move it out of the repo, and record the password in your password manager. Existing installs signed with the debug key can only be updated by a build signed with the same key — decide this before the first public release. |

---

## 5. Permissions and why (needed for both consoles)

| Permission | Why the app needs it | User-visible text |
|---|---|---|
| `ACCESS_FINE_LOCATION` | To know when the phone is inside a reminder's area | "PinPing uses your location to notice when you arrive at a place you saved." |
| `ACCESS_COARSE_LOCATION` | Fallback when precise location is refused | same as above |
| `ACCESS_BACKGROUND_LOCATION` | The alert must work with the app closed. Without it Android reports arrivals only while the app is open. | "Choose Allow all the time so PinPing can notice arrivals while the app is closed." |
| `POST_NOTIFICATIONS` | To show the arrival alert | "PinPing sends one notification when you arrive." |
| `INTERNET` | Map tiles and address search | "Used for the map and for address search only." |
| `VIBRATE` | Optional vibration with the alert | — |
| `SCHEDULE_EXACT_ALARM` | 🔧 declared but unused | **Remove** |
| `USE_EXACT_ALARM` | 🔧 declared but unused, and Play restricts it to alarm and calendar apps | **Remove** |

Removing the two alarm permissions is required for a smooth review: Play asks for a written
justification for exact alarms, and "reminders that fire when you arrive" does not qualify.

### Background location declaration (Play Console → App content → Sensitive permissions)

Suggested answer text:

```
PinPing is a reminder app that alerts the user when they arrive at a place they saved.
The background location permission is essential: the arrival must be detected while the app is
closed, which is the normal case because the user closes the app after saving a reminder.
Without background location, Android reports geofence transitions only while the app is in the
foreground, so the core function cannot work.
Location is used only to compare the phone position with the saved places. Nothing is uploaded.
```

The console also asks for a short screen-recorded video showing the permission prompt and the
feature working. Script: show Settings → Location → Allow all the time; show a saved place; drive or
walk into it; show the notification arriving with the app closed. 30 to 60 seconds, no voice needed.

---

## 6. Data safety and privacy labels

### Google Play → Data safety

| Question | Recommended answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** — location and app activity leave the device when the user searches for an address |
| Location → Approximate / precise location | Collected? **Yes**. Shared? **Yes** with a service provider for app functionality (address search). Processed ephemerally? **Yes**. Required? **Yes** for the app to work. |
| App activity → Other user-generated content (reminder titles and place names) | Collected? **No** (never leaves the device). |
| Personal info | **No** |
| Financial info, health, messages, photos, files, contacts, calendar | **No** |
| App info and performance (crash logs, diagnostics) | **No** — PinPing has no crash reporter and no analytics |
| Device or other IDs | **No** |
| Is all collected data encrypted in transit? | **Yes** (HTTPS to Nominatim and to the map tile service) |
| Can users request data deletion? | **Yes** — deleting a reminder, or uninstalling the app, removes the data. There is no server copy. |
| Do you have a privacy policy? | **Yes** (§7) |

Note for the reviewer: the map is Google Maps on Android through `react-native-maps`; map tiles are
fetched by Google. Address search uses OpenStreetMap Nominatim. Both are named in the policy.

### App Store → App Privacy

| Category | Answer |
|---|---|
| Data linked to the user | **None** |
| Data not linked to the user | **Location** (coarse and precise) — used for app functionality, not tracking |
| Tracking | **No** |
| Third-party SDKs that collect data | Google Maps SDK (map rendering); note it in the review notes |

---

## 7. Privacy policy (draft, technical — host this and paste the URL into both consoles)

```
PinPing — Privacy Policy
Last updated: <DATE>

1. Who we are
PinPing ("the app", "we") is a reminder application for Android and iOS. Contact:
support@pinping.example. Postal address: <LEGAL ENTITY AND ADDRESS>.

2. What the app does with your location
PinPing compares your device position with the places you saved, to notice when you arrive at a
saved place. To do this while the app is closed, the app uses the background location permission
provided by the operating system.

3. What stays on your device
Reminder titles, descriptions, saved places, place names, notification settings and the diagnostics
log are stored in a local database inside the app's private storage. They are not uploaded to us.
We operate no server and no user account system. Deleting a reminder, clearing the app data, or
uninstalling the app removes this data permanently. We cannot recover it.

4. What leaves your device
a) Address search. When you search for an address, or when the app converts a coordinate into a
   readable address, the search text or the coordinate is sent over HTTPS to the OpenStreetMap
   Nominatim service (nominatim.openstreetmap.org), operated by the OpenStreetMap Foundation.
   That request contains the text you typed or the coordinate you selected, and your IP address as
   part of normal HTTP traffic. See the OpenStreetMap Foundation privacy policy and usage policy.
b) Map tiles. The map is rendered by the Google Maps SDK for Android, or by Apple Maps on iOS.
   Those SDKs request map data from their providers, which receive your IP address and the map area
   you are viewing. See the Google and Apple privacy policies.
c) Nothing else. The app has no analytics, no advertising, no crash reporting and no tracking SDK.

5. Permissions and what they are used for
Location (precise and approximate): to compare your position with saved places.
Background location: to do the same while the app is closed. Used only for saved places.
Notifications: to show the arrival alert.
Internet: to load map tiles and to run address search.
Vibration: optional feedback with the alert.

6. Notifications
Notifications are created locally by your device. They are not sent through a push service, and no
notification content is transmitted to us.

7. Diagnostics log
The app keeps a local log of geofence and status events so a problem can be investigated. The log is
stored on the device, is limited in size, and leaves the device only if you choose Settings →
Diagnostics → Export logs. Nothing is transmitted automatically.

8. Children
The app is not directed at children under 13 and does not knowingly process their data.

9. Security
Data is stored in the app's private storage area, protected by the operating system sandbox.
Network requests use HTTPS. No method of storage is completely secure, but we hold no copy of your
data.

10. Your rights
Because we do not hold your data, access, correction, portability and erasure are performed on your
device: edit or delete reminders inside the app, or uninstall the app. For questions write to
support@pinping.example.

11. Changes
We will update this policy when the app changes. The date at the top is the current version.

12. Contact
support@pinping.example
<LEGAL ENTITY>, <ADDRESS>, <COUNTRY>
```

⬜ Fill before publishing: legal entity name, postal address, country, date, and confirm the
mailbox exists. Both stores reject a policy that has no entity and no working contact.

---

## 8. Terms of service (draft, short)

```
PinPing — Terms of Use
Last updated: <DATE>

1. The app
PinPing is a reminder tool. It shows a notification when your device detects that you arrived at a
place you saved and stayed there for a short time.

2. No guarantee of delivery
Arrival detection depends on the device, the operating system, the location provider and the
battery settings chosen by the user. Notifications can be delayed, or can fail to arrive, notably
when location permission is limited to "While using the app", when battery optimisation restricts
the app, or when the device is indoors with poor reception. PinPing is a convenience tool and must
not be used where a missed reminder could cause harm, loss or danger.

3. Your responsibilities
You are responsible for the places and reminders you create, for the permissions you grant, and for
keeping a backup of anything you cannot afford to lose. The app stores data only on the device.

4. Licence
We grant you a personal, non-exclusive, non-transferable licence to use the app on devices you own
or control, under the terms of the store you downloaded it from.

5. Third-party services
Address search uses OpenStreetMap Nominatim; maps use Google Maps or Apple Maps. Their terms apply
to those parts of the experience.

6. Limitation of liability
To the extent permitted by law, we are not liable for indirect or consequential loss, or for loss of
data, arising from use of the app. Nothing in these terms limits rights you have under mandatory
consumer law in your country.

7. Changes and contact
We may update these terms with the app. Contact: support@pinping.example.
```

---

## 9. Content rating (IARC questionnaire, both stores)

| Question | Answer |
|---|---|
| Violence, blood, sexual content, nudity, profanity, drugs, gambling | No |
| Horror or fear elements | No |
| User-generated content shared with others | No — reminders stay on the device |
| Users can interact or communicate | No |
| Shares location with other users | No |
| Purchases | No |
| Ads | No |
| Unrestricted web access | No — the app loads map tiles and address search only |
| Expected rating | Everyone / 3+ |

Target audience: 18+ is not required; the app is general purpose. Declare **not designed for
children** to avoid the Families policy requirements.

---

## 10. Localization notes

The description in §2 is written so each sentence stands alone. When translating:

1. Keep the numbered steps as steps. Do not merge them.
2. Keep `PinPing`, `OpenStreetMap` and the permission names untranslated.
3. Translate "Allow all the time" using the exact wording Android uses in that language; it is a
   system label and users must be able to find it.
4. Do not translate the metric radius into feet, or the other way round; use the unit the locale
   uses and keep the value identical (200 m ≈ 220 yd, but for the listing keep "about 200 metres"
   as a single string and localise the unit only).
5. Strings that must stay identical across languages: app name, package name, support email.

Strings to hand to a translator (one per line, no context needed):

```
✅ PinPing reminds you when you reach a place.
✅ Choose a place on the map.
✅ Write a short reminder for that place.
✅ Close the app.
✅ When you arrive and stay for about two minutes, PinPing sends a notification.
✅ Each reminder covers a circle of about 200 metres around the place.
✅ PinPing works without an account and without a subscription.
✅ Your reminders stay on your phone.
✅ You can save places that you visit often, and give them your own name.
✅ Choose Allow all the time so PinPing can notice arrivals while the app is closed.
```

---

## 11. Pre-publish checklist

Code changes

- [x] ✅ Launcher label `PinPing` (v1.8.0); the store listing name is `PinPing` as well
- [ ] 🔧 Remove `SCHEDULE_EXACT_ALARM` and `USE_EXACT_ALARM` from `AndroidManifest.xml`
- [ ] 🔧 Derive `versionName`/`versionCode` from `src/config/version.ts`, increment the code per upload
- [ ] 🔧 Create a real upload keystore; stop signing release with `signingConfigs.debug`
- [x] ✅ Re-cut `ic_launcher_foreground.png` so the exterior is transparent (flat 2D icon set installed)
- [ ] 🔧 Add a monochrome notification small icon; `ArrivalNotifier` currently uses the coloured app icon, which Android renders as a white blob
- [ ] ⬜ iOS parity (`K-018`) before any iOS submission; the iOS build cannot be produced on this machine (`K-014`)

Assets

- [x] ✅ 512 × 512 Play icon, no alpha (`store/icon/pinping-play-icon-512.png`)
- [ ] ⬜ 1024 × 500 feature graphic
- [x] ✅ Five phone screenshots captured, `store/screenshots/*-play.png` (1080 × 2160)
- [ ] ⬜ Headline overlays added to those five frames
- [ ] ⬜ Arrival-notification frame captured on a field test
- [ ] ⬜ App Store 6.9-inch screenshots, only when an iOS build exists

Store console

- [ ] ⬜ Privacy policy hosted at a public URL (§7, entity filled in)
- [ ] ⬜ Support URL live
- [ ] ⬜ Data safety form answered from §6
- [ ] ⬜ Background location declaration text and video (§5)
- [ ] ⬜ Content rating questionnaire from §9
- [ ] ⬜ Countries and pricing chosen
- [ ] ⬜ Internal testing track first: upload the AAB, install through the Play link, then promote

Text

- [ ] ⬜ Replace every `*@pinping.example` address with a real mailbox
- [ ] ⬜ Read §2 and §7 aloud once for tone and for translation quality
- [ ] ⬜ Decide whether "PinPing" needs a trademark search in your main markets before launch
