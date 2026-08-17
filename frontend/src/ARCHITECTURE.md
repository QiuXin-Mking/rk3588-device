# Frontend architecture

The application ships two products from one repository:

- `device`: the fixed 1920×1080 RK3588 terminal experience.
- `mobile`: the responsive H5 experience.

They share domain data, API clients, query state, navigation identifiers,
formatters, i18n, and design tokens. They do not share page composition or
navigation chrome when the usage context differs.

## Directory responsibilities

```text
app/          application composition, providers, routes, platform selection
features/     vertical business slices; models/hooks are shared, views may be platform-specific
platforms/    device and mobile shells plus platform-only primitives
services/     typed communication with the RK3588 Node service
shared/       dependency-light utilities, hooks, i18n, and reusable UI primitives
styles/       Tailwind entry, design tokens, and temporary legacy styles
```

## Import rules

1. `shared` must not import from `features` or `platforms`.
2. `services` must not import React or presentation components.
3. Platform views may import feature models/hooks, never the other platform's views.
4. Shared feature models must live beside the feature, not inside a screen file.
5. New UI uses Tailwind utilities and shared variants. Add handwritten CSS only
   for canvas, charts, video surfaces, or browser behavior that utilities cannot
   express clearly.
6. Device and mobile production builds select their platform explicitly with
   `build:device` and `build:mobile`. Screen dimensions are QA targets, not
   runtime product detection.

## Quality gate

Run `pnpm check`, `pnpm build:device`, and `pnpm build:mobile` before deployment.
Device changes require a 1920×1080 visual pass; mobile changes require narrow,
wide-phone, tablet, and landscape overflow checks.
