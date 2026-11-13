# GPS Reminder — Single-Developer Agent Kit

This package is the implementation handoff for rebuilding GPS Reminder from a clean React Native CLI project.

## Read these first

1. `AGENT_START_HERE.md` — mandatory working rules and first task.
2. `docs/DEVELOPMENT_PLAN.md` — phased roadmap, gates, and scope control.
3. `docs/TECH_STACK_AND_COMPATIBILITY.md` — selected baseline and dependency policy.
4. `docs/UI_UX_SPECIFICATION.md` — concrete visual system and screen behavior.
5. `tracking/INTERACTION_REGISTRY.md` — required accessibility/test identifiers.
6. `reference/spec.md` — original product specification supplied by the user.
7. `reference/glass_layered_multi_screen_concept.png` — visual reference supplied by the user.

## Project priorities

- One primary agent/developer owns implementation and integration.
- At most **one** subagent may be active, and it may only research or inspect documentation/files. It must not implement code, edit files, or run parallel coding tasks.
- Build UI and navigation first using deterministic mock data.
- Keep the core reminder experience offline-first.
- Do not implement geofencing, background location, live search, ads, or purchases during the initial UI milestones.
- Production radius is fixed at 200m; users do not select a radius.
- Trigger only after valid speed remains strictly below 2 mph for 120 consecutive seconds inside the geofence. A vehicle stopped for two minutes inside intentionally qualifies.
- Do not claim geofencing works based on simulator-only testing.
- Keep an interaction registry current as screens and controls are implemented. Maestro tests are deliberately deferred until the UI is stable.

## Important product distinction

The concept image is a visual direction, not a pixel-perfect specification. The written UI specification in this kit is authoritative where the image is ambiguous. The original product specification is preserved for traceability. Where it conflicts with the confirmed decisions in `docs/FINAL_PRODUCT_DECISIONS.md`, `docs/ARRIVAL_DETECTION_AND_GEOFENCING.md`, or `docs/DEVELOPER_MODE.md`, those newer documents are authoritative.
