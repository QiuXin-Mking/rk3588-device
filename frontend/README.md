# SensorHub terminal frontend

This frontend is designed for the fixed 5.5-inch, 1920×1080 landscape touchscreen
used by the RK3588 device. It is not treated as a desktop dashboard or a handheld
mobile page.

## Source layout

- `src/app`: application controller, navigation model, device shell and fallback state
- `src/features`: business screens grouped by home, data collection, records and profile
- `src/shared`: reusable formatting and touch-first UI primitives
- `src/services`: the existing device HTTP API boundary
- `src/styles`: physical-screen tokens, global rules and terminal layouts

## UI contract

- The document and page root never scroll.
- Each screen represents one primary task and fits the landscape viewport.
- Long records, networks and choice lists scroll only inside their own panels.
- Primary controls use device-sized touch regions instead of desktop-sized controls.
- Select-like inputs open large touch choice panels.
- The top and bottom chrome can be hidden together for an immersive workspace.
- Portrait is a compatibility mode; the product target is the fixed landscape panel.

## Commands

```bash
pnpm dev
pnpm build
```

The production build is emitted to `../static`, where the existing Node service
continues serving it without backend changes.
