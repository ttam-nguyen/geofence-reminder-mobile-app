\
# Developer build environment example

Set these variables in the shell for a Debug build only. Do not commit local `.env` files.

```bash
GPS_REMINDER_DEV_MODE=1 \
GPS_REMINDER_DEV_STATIONARY_SECONDS=10 \
GPS_REMINDER_DEV_GEOFENCE_RADIUS_METERS=100 \
GPS_REMINDER_DEV_SPEED_THRESHOLD_MPH=2 \
GPS_REMINDER_DEV_MAX_SAMPLE_GAP_SECONDS=15 \
GPS_REMINDER_DEV_MAX_HORIZONTAL_ACCURACY_METERS=50 \
npm run android
```

The same environment prefix can be used with `npm run ios`. See `docs/DEVELOPER_MODE.md` for the mandatory native build-time propagation and Release hard-disable requirements. These variable names form the proposed project interface; they are not automatically available to JS unless the implementation explicitly injects them at build time.
