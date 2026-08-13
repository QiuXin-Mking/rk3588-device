# Four-Channel Capture Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver four correctly routed live previews for the Mango task-capture page: head stereo, head four-camera, left wrist monocular, and right wrist monocular.

**Architecture:** Extend `unified_capture` from one globally contested preview slot to channel-addressed preview requests while preserving its legacy command. Add a testable Node preview-control module that maps semantic HTTP channels, manages a marked temporary capture session, and safely promotes or deletes it. Render four product-aware preview cards in React and deploy both repositories to RK3588 for real hardware verification.

**Tech Stack:** C++20, Unix domain sockets, V4L2 MJPEG, Node.js CommonJS, React 19, TypeScript, Vitest, React Testing Library, systemd, RK3588

## Global Constraints

- External paths are exactly `head-stereo`, `head-four`, `wrist-left`, and `wrist-right`.
- Internal capture names are exactly `jhh02`, `jhh04`, `wrist_left`, and `wrist_right`.
- Preserve legacy `preview:<absolute-path>` behavior.
- New protocol is `preview:<channel>:<absolute-path>` and rejects unknown channels or non-absolute paths.
- Preview cleanup may delete only one direct `CAPTURE_DATA_DIR/session_NNN` child containing `.device-ui-preview`.
- A promoted session keeps all data and loses only its `.device-ui-preview` marker.
- Existing untracked `unified_capture/app/commands/` belongs to the user and must not be staged or modified.
- Do not change capture resolution, frame rate, recording formats, or physical device mapping.

---

### Task 1: Channel-addressed unified_capture preview protocol

**Files:**
- Modify: `/Users/qiuxin/code/qiuxin_aliyun_back/嵌入式项目/02-github/unified_capture/app/socket_server.h`
- Modify: `/Users/qiuxin/code/qiuxin_aliyun_back/嵌入式项目/02-github/unified_capture/app/socket_server.cpp`
- Modify: `/Users/qiuxin/code/qiuxin_aliyun_back/嵌入式项目/02-github/unified_capture/tests/test_socket_command.cpp`

**Interfaces:**
- Produces: `SocketCommand { kind, preview_channel, preview_path }`.
- Legacy preview has empty `preview_channel`; addressed preview has one allowed channel.

- [ ] **Step 1: Write failing parser tests**

Add exact assertions:

```cpp
SocketCommand addressed = parse_socket_command(
    "preview:wrist_left:/tmp/wrist-left.jpg\n");
assert(addressed.kind == SocketCommandKind::preview);
assert(addressed.preview_channel == "wrist_left");
assert(addressed.preview_path == "/tmp/wrist-left.jpg");

assert(parse_socket_command("preview:unknown:/tmp/x.jpg").kind ==
       SocketCommandKind::unknown);
assert(parse_socket_command("preview:jhh02:relative.jpg").kind ==
       SocketCommandKind::unknown);
```

Cover all four allowed channels and verify legacy `preview:/tmp/p.jpg` remains valid with an empty channel.

- [ ] **Step 2: Verify RED**

Run in unified_capture:

```bash
make test_socket_command
```

Expected: compilation fails because `preview_channel` does not exist.

- [ ] **Step 3: Implement minimal parser support**

Add `std::string preview_channel` to `SocketCommand`. Parse the first colon after `preview:` as a channel only when the prefix before it is one of the four allowed values; otherwise accept the whole suffix only as a legacy absolute path. Reject empty and relative paths.

- [ ] **Step 4: Verify GREEN**

Run: `make test_socket_command`

Expected: PASS.

- [ ] **Step 5: Commit unified_capture protocol**

```bash
git add app/socket_server.h app/socket_server.cpp tests/test_socket_command.cpp
git commit -m "feat(preview): address capture previews by channel"
```

Do not stage `app/commands/`.

---

### Task 2: Isolate preview requests by capture channel

**Files:**
- Modify: `/Users/qiuxin/code/qiuxin_aliyun_back/嵌入式项目/02-github/unified_capture/hardware/video/capture_control.h`
- Modify: `/Users/qiuxin/code/qiuxin_aliyun_back/嵌入式项目/02-github/unified_capture/hardware/video/video_frame_processor.h`
- Modify: `/Users/qiuxin/code/qiuxin_aliyun_back/嵌入式项目/02-github/unified_capture/app/session_runner.h`
- Modify: `/Users/qiuxin/code/qiuxin_aliyun_back/嵌入式项目/02-github/unified_capture/app/session_runner.cpp`
- Modify: `/Users/qiuxin/code/qiuxin_aliyun_back/嵌入式项目/02-github/unified_capture/app/runtime.cpp`
- Test: `/Users/qiuxin/code/qiuxin_aliyun_back/嵌入式项目/02-github/unified_capture/tests/test_video_capture_control.cpp`

**Interfaces:**
- Consumes: `SocketCommand.preview_channel`, `SocketCommand.preview_path`.
- Produces: `request_preview(channel, path)` and `take_preview(camera_name, path)`.

- [ ] **Step 1: Write failing channel-isolation tests**

```cpp
control.request_preview("jhh02", "/tmp/head.jpg");
control.request_preview("wrist_left", "/tmp/left.jpg");
std::string path;
assert(!control.take_preview("jhh04", path));
assert(control.take_preview("wrist_left", path));
assert(path == "/tmp/left.jpg");
assert(control.take_preview("jhh02", path));
assert(path == "/tmp/head.jpg");
```

Also verify two requests for different channels do not overwrite each other and legacy empty-channel requests are still claimable by the first video processor.

- [ ] **Step 2: Verify RED**

Run: `make test_video_capture_control`

Expected: compilation fails because channel-aware overloads do not exist.

- [ ] **Step 3: Implement channel request storage**

Use a mutex-protected `std::unordered_map<std::string, std::string>` for addressed requests plus the existing legacy slot. `take_preview(camera_name, path)` checks the exact camera key first, then the legacy slot.

Change `VideoFrameProcessor::export_preview_if_requested` to call:

```cpp
control_->take_preview(options_.camera_name, preview_path)
```

Pass `&control_` to both `jhh04` and `jhh02` processors in `SixCamSensor`; preview availability must not depend on H.265 output.

- [ ] **Step 4: Propagate channel through runtime**

Change `SessionRunner::request_preview` and runtime handler to pass both fields:

```cpp
sessions.request_preview(command.preview_channel, command.preview_path);
```

- [ ] **Step 5: Verify focused and full unified_capture tests**

Run:

```bash
make test_socket_command test_video_capture_control
make test
git diff --check
```

Expected: all tests pass and the diff is clean.

- [ ] **Step 6: Commit unified_capture routing**

```bash
git add hardware/video/capture_control.h hardware/video/video_frame_processor.h \
  hardware/video/sixcam_sensor.h app/session_runner.h app/session_runner.cpp \
  app/runtime.cpp tests/test_video_capture_control.cpp
git commit -m "feat(preview): isolate four camera preview requests"
```

---

### Task 3: Testable device-ui preview session controller

**Files:**
- Create: `preview-control.cjs`
- Create: `tests/preview-control.test.cjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `CHANNELS`, `listSessions(root)`, `resolveNewPreviewSession(before, after, root)`, `isMarkedPreviewSession(dir, root)`, `createPreviewController(deps)`.
- Controller methods: `start()`, `stop()`, `promote()`, `requestFrame(externalChannel)`.

- [ ] **Step 1: Add a Node test command and failing tests**

Add:

```json
"test:server": "node --test tests/*.test.cjs"
```

Tests use `node:test`, a temporary root from `fs.mkdtempSync`, and injected fake `captureCtl`. Cover:

- semantic channel mapping to all four internal names and unique files;
- exactly one new `session_NNN` is accepted and marked;
- zero or multiple new sessions fail;
- path traversal and symlink escape fail;
- stop deletes only a valid marked direct child;
- missing marker refuses deletion;
- promote removes marker and keeps the session directory.

- [ ] **Step 2: Verify RED**

Run: `pnpm run test:server`

Expected: FAIL because `preview-control.cjs` does not exist.

- [ ] **Step 3: Implement pure safety helpers and controller**

`CHANNELS` is exactly:

```js
{
  'head-stereo': { capture: 'jhh02', file: 'camera_preview_jhh02.jpg' },
  'head-four': { capture: 'jhh04', file: 'camera_preview_jhh04.jpg' },
  'wrist-left': { capture: 'wrist_left', file: 'camera_preview_wrist_left.jpg' },
  'wrist-right': { capture: 'wrist_right', file: 'camera_preview_wrist_right.jpg' },
}
```

Inject filesystem, `captureCtl`, polling/wait, and root paths so no test touches real `/data/capture` or `/tmp`.

- [ ] **Step 4: Verify GREEN**

Run: `pnpm run test:server`

Expected: all Node tests pass.

- [ ] **Step 5: Commit controller**

```bash
git add preview-control.cjs tests/preview-control.test.cjs package.json pnpm-lock.yaml
git commit -m "feat(preview): manage temporary capture sessions safely"
```

---

### Task 4: Integrate four HTTP preview endpoints and lifecycle

**Files:**
- Modify: `server.cjs`
- Modify: `preview-control.cjs`
- Test: `tests/preview-control.test.cjs`

**Interfaces:**
- Consumes: controller from Task 3.
- Produces: four GET routes and unified_capture-aware live start/stop/promote behavior.

- [ ] **Step 1: Write failing integration-level controller tests**

Verify `requestFrame('head-stereo')` unlinks the old channel file, sends:

```text
preview:jhh02:/tmp/camera_preview_jhh02.jpg
```

and waits for a newly created non-empty file. Verify an unknown external channel fails without calling `captureCtl`.

- [ ] **Step 2: Verify RED**

Run: `pnpm run test:server`

Expected: request-frame assertions fail before implementation.

- [ ] **Step 3: Wire server lifecycle**

For unified_capture only:

- `apiLiveStart` calls controller `start()` and sets `_stereoPreview` only after the marked temporary session exists.
- `apiLiveStop` calls controller `stop()` and clears `_stereoPreview` after capture stops.
- `apiRecordToggle` promotes when a preview session is active; otherwise keeps existing start/stop behavior.
- `getRecordStatus` reports `previewing=true, recording=false` while controller owns a temporary session; after promote it reports recording.
- unified_capture file scanning skips directories containing `.device-ui-preview`.

- [ ] **Step 4: Add four HTTP routes**

Route `/api/camera/preview/<semantic-channel>` through one handler. It requires previewing or recording, asks the controller for the matching frame, and returns JPEG/no-store or 503.

Keep `/api/camera/preview` unchanged for legacy backends.

- [ ] **Step 5: Verify server tests**

Run: `pnpm run test:server`

Expected: all tests pass.

- [ ] **Step 6: Commit server integration**

```bash
git add server.cjs preview-control.cjs tests/preview-control.test.cjs
git commit -m "feat(preview): expose four capture preview endpoints"
```

---

### Task 5: Render four Mango task-capture previews

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/features/data/DataScreens.tsx`
- Modify: `frontend/src/styles/device.css`
- Create: `frontend/src/features/data/CaptureScreen.test.tsx`

**Interfaces:**
- Consumes: `product: SelectableProduct`, `record.cameras`, four HTTP routes.
- Produces: `CaptureScreen` product-aware 2×2 preview grid.

- [ ] **Step 1: Write failing React tests**

Render Mango with `previewing=true` and all four cameras online. Assert:

```tsx
for (const label of ['头部双目', '头部四目', '左腕部单目', '右腕部单目']) {
  expect(screen.getByAltText(`${label} 预览`)).toBeInTheDocument()
}
expect(screen.queryByText('FPV_L')).not.toBeInTheDocument()
expect(screen.queryByText('FPV_R')).not.toBeInTheDocument()
```

Assert the four image `src` values include the four distinct semantic routes.

- [ ] **Step 2: Verify RED**

Run: `pnpm test -- frontend/src/features/data/CaptureScreen.test.tsx`

Expected: FAIL because CaptureScreen still renders `FPV_L / FPV_R`.

- [ ] **Step 3: Implement product-aware cards**

Pass `product={product ?? 'Banana'}` from `App.tsx`. For Mango, render four cards in this order: head stereo, head four, left wrist, right wrist. Use `record.cameras.jhh02`, `jhh04`, `wrist_left`, and `wrist_right` for connectivity; append `?t=${previewStamp}` to each endpoint.

For Banana, retain the current legacy preview card behavior to avoid applying Mango wrist semantics to Banana.

- [ ] **Step 4: Update layout**

Use a 2×2 grid for Mango while preserving touch target sizes, labels, timer overlay, and the existing right-side task panel.

- [ ] **Step 5: Verify frontend and complete device-ui suite**

Run:

```bash
pnpm test
pnpm run test:server
pnpm build
git diff --check
```

Expected: all tests pass and build succeeds.

- [ ] **Step 6: Browser verification**

At `http://127.0.0.1:5173/`, select Mango, open task capture, and verify the four labels and four distinct image URLs. Switch to Banana and verify its legacy preview remains.

- [ ] **Step 7: Commit frontend**

```bash
git add frontend/src/App.tsx frontend/src/features/data/DataScreens.tsx \
  frontend/src/features/data/CaptureScreen.test.tsx frontend/src/styles/device.css \
  static/index.html static/assets docs/superpowers/specs/2026-08-12-four-channel-capture-preview-design.md \
  docs/superpowers/plans/2026-08-12-four-channel-capture-preview.md
git commit -m "feat(ui): show four Mango capture previews"
```

---

### Task 6: RK3588 deployment and hardware acceptance

**Files:**
- Deploy unified_capture binary/service from `/Users/qiuxin/code/qiuxin_aliyun_back/嵌入式项目/02-github/unified_capture`.
- Deploy device-ui from `/Users/qiuxin/code/qiuxin_aliyun_back/嵌入式项目/02-github/device-ui`.

**Interfaces:**
- Consumes: tested commits from Tasks 1–5.
- Produces: verified four-channel previews on `rk.local`.

- [ ] **Step 1: Inspect board state without mutation**

Confirm `product.conf`, `camera-map.conf`, service units, binary paths, output root, free space, current sessions, and four `status.cameras` entries. Stop if the board does not expose `jhh02`, `jhh04`, `wrist_left`, and `wrist_right`.

- [ ] **Step 2: Build for RK3588 using the repository's existing deployment path**

Use the current Makefile/deploy script rather than inventing a new toolchain. Verify the produced binary architecture is aarch64 before replacing the board binary.

- [ ] **Step 3: Deploy with recoverable backups**

Back up the board's current unified_capture binary and `/root/ui` server/frontend files with timestamped names. Sync only intended repository files, preserving runtime settings and unrelated board data.

- [ ] **Step 4: Restart services in dependency order**

Restart unified_capture, verify socket `status`, then restart device-ui and kiosk. Do not start a preview until both service health checks pass.

- [ ] **Step 5: Verify four HTTP JPEG endpoints**

Start live preview, request all four endpoints, and verify for each:

- HTTP 200;
- `Content-Type: image/jpeg`;
- non-empty JPEG with valid magic bytes;
- all four output files exist;
- hashes are not all identical.

- [ ] **Step 6: Verify lifecycle safety**

Stop preview and prove the one marked temporary session is deleted. Start again, promote to recording, stop recording, and prove the promoted session remains without `.device-ui-preview` and appears in `/api/files`.

- [ ] **Step 7: Verify on-device UI**

Confirm the RK screen shows four correctly named, non-crossed previews in a 2×2 grid and remains usable at the device's rotated 1920×1080 display geometry.

- [ ] **Step 8: Final regression checks**

Check `systemctl is-active` for both services, recent journals for errors, device-ui HTTP/API health, and that no unrelated session or configuration file was deleted.
