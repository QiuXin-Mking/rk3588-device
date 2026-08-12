# Mango Camera Channels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the realtime data page and camera page show Mango wrist monocular channels while preserving Banana hand stereo channels.

**Architecture:** Add one product-aware camera-channel mapping helper in the existing data screen module and use its output in both `RealtimeScreen` and `CameraScreen`. Keep existing backend camera keys and API contracts unchanged.

**Tech Stack:** React 19, TypeScript, Vitest, React Testing Library, Vite

## Global Constraints

- Banana channels remain: 头部双目、头部四目、左手双目、右手双目.
- Mango channels become: 头部双目、头部四目、左腕部单目、右腕部单目.
- Mango wrist state keys remain compatible with `ego_w_left`, `ego_w_l`, `wrist_left`, `jhh2_left`, `ego_w_right`, `ego_w_r`, `wrist_right`, and `jhh2_right`.
- Do not modify backend APIs, capture services, or device discovery.

---

### Task 1: Product-aware camera channels

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/features/data/DataScreens.tsx`
- Test: `frontend/src/features/data/RealtimeScreen.test.tsx`
- Create: `frontend/src/features/data/CameraScreen.test.tsx`

**Interfaces:**
- Consumes: `SelectableProduct`, `RecordStatus`, existing `cameraIsOnline(record, keys)`.
- Produces: `CameraScreen({ record, product, back })` and identical channel labels/status mapping across realtime and camera pages.

- [ ] **Step 1: Write failing realtime tests**

Add assertions to the Mango test:

```tsx
for (const channel of ['头部双目', '头部四目', '左腕部单目', '右腕部单目']) {
  expect(screen.getByText(channel)).toBeInTheDocument()
}
expect(screen.queryByText('左手双目')).not.toBeInTheDocument()
expect(screen.queryByText('右手双目')).not.toBeInTheDocument()
```

Add a status test using `record.cameras.ego_w_left` and `record.cameras.ego_w_right`, then assert the two wrist channel containers display `在线`.

- [ ] **Step 2: Run realtime tests and verify RED**

Run: `pnpm test -- frontend/src/features/data/RealtimeScreen.test.tsx`

Expected: FAIL because Mango still renders `左手双目` and `右手双目`.

- [ ] **Step 3: Write a failing camera-page test**

Render:

```tsx
render(<CameraScreen record={FALLBACK_RECORD} product="Mango" back={vi.fn()} />)
```

Assert `左腕部单目` and `右腕部单目` are present and hand stereo labels are absent.

- [ ] **Step 4: Run camera-page test and verify RED**

Run: `pnpm test -- frontend/src/features/data/CameraScreen.test.tsx`

Expected: FAIL because `CameraScreen` does not accept `product` and still uses hand stereo labels.

- [ ] **Step 5: Implement the minimal product mapping**

In `DataScreens.tsx`, derive the last two channels from `product`:

```tsx
const sideChannels = product === 'Mango'
  ? [
      { label: '左腕部单目', online: leftWristUsb },
      { label: '右腕部单目', online: rightWristUsb },
    ]
  : [
      { label: '左手双目', online: leftUsb || leftWireless },
      { label: '右手双目', online: rightUsb || rightWireless },
    ]
```

Use the same labels and camera-key state calculation in `CameraScreen`. Pass `product={product ?? 'Banana'}` from the `camera` case in `App.tsx`.

- [ ] **Step 6: Run focused and full verification**

Run:

```bash
pnpm test -- frontend/src/features/data/RealtimeScreen.test.tsx frontend/src/features/data/CameraScreen.test.tsx
pnpm test
pnpm build
git diff --check
```

Expected: all tests pass, Vite production build succeeds, and diff check is clean.

- [ ] **Step 7: Browser verification**

At `http://127.0.0.1:5173/`, select Mango and verify both the data page and camera page show wrist monocular labels. Switch to Banana and verify the two hand stereo labels remain.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/App.tsx frontend/src/features/data/DataScreens.tsx frontend/src/features/data/RealtimeScreen.test.tsx frontend/src/features/data/CameraScreen.test.tsx docs/superpowers/plans/2026-08-12-mango-camera-channels.md
git commit -m "fix(ui): map Mango wrist camera channels"
```
