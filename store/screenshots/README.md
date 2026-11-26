# Store screenshots

Captured from the Nothing Phone 3a Pro (`A059P`, 1080 × 2392) with **demo data**, not the user's
real reminders. Addresses read `…Springfield` and the map shows Boise, a neutral city; the database
was restored to the real data immediately after capture.

| File | Screen | Notes |
|---|---|---|
| `01-home-raw.png` / `-play.png` | Home | Three active reminders, collapsed `Triggered` group, floating create button |
| `02-map-raw.png` / `-play.png` | Map | Full-bleed map, sheet with mode toggle, search and cards |
| `03-detail-raw.png` / `-play.png` | Reminder detail | Status, address, map, notification rule |
| `04-create-raw.png` / `-play.png` | Edit reminder | Merged location block: map with pin, "Use my location", address search |
| `05-settings-raw.png` / `-play.png` | Settings | Notification toggles, permissions, diagnostics |

`-raw` is the full 1080 × 2392 device capture. `-play` is cropped to **1080 × 2160** (ratio 1:2.000,
the tallest Google Play accepts) by keeping the status bar, the app content and the tab bar and
dropping the system navigation strip:

```bash
sips -c 2160 1080 --cropOffset 116 0 01-home-raw.png --out 01-home-play.png
```

## Still to do before uploading

1. **Headline overlay.** The publishing kit (`docs/STORE_PUBLISHING_KIT.md` §3) specifies one short
   line per frame, inside the frame, no caption underneath. These files have no text overlay yet.
2. **Feature graphic** (1024 × 500) is not made.
3. **512 × 512 Play icon** is not exported from the 1024 master.
4. **Notification screenshot** — frame 5 in the kit wants the arrival notification over the lock
   screen. That needs a real arrival, so capture it on the next field test.
5. **App Store sizes** (6.9-inch 1320 × 2868 or 1290 × 2796) once an iOS build exists.

Do not upload the `-raw` files: they are taller than Play allows. Use the `-play` crops.
