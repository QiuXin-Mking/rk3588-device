'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  CHANNELS,
  listSessions,
  resolveNewPreviewSession,
  isMarkedPreviewSession,
  createPreviewController,
} = require('../preview-control.cjs');

function temporaryRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'device-ui-preview-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function session(root, name) {
  const dir = path.join(root, name);
  fs.mkdirSync(dir);
  return dir;
}

function fakeController(root, captureCtl) {
  return createPreviewController({
    fs,
    captureCtl,
    captureRoot: root,
    previewRoot: path.join(root, 'frames'),
    waitFor: async predicate => predicate(),
  });
}

test('maps the four external channels to distinct capture channels and files', () => {
  assert.deepEqual(CHANNELS, {
    'head-stereo': { capture: 'jhh02', file: 'camera_preview_jhh02.jpg' },
    'head-four': { capture: 'jhh04', file: 'camera_preview_jhh04.jpg' },
    'wrist-left': { capture: 'wrist_left', file: 'camera_preview_wrist_left.jpg' },
    'wrist-right': { capture: 'wrist_right', file: 'camera_preview_wrist_right.jpg' },
  });
  assert.equal(new Set(Object.values(CHANNELS).map(channel => channel.capture)).size, 4);
  assert.equal(new Set(Object.values(CHANNELS).map(channel => channel.file)).size, 4);
});

test('accepts and marks exactly one newly created session', async t => {
  const root = temporaryRoot(t);
  session(root, 'session_001');
  let started = false;
  const controller = fakeController(root, async command => {
    if (command === 'start') {
      started = true;
      session(root, 'session_002');
      return { ok: true };
    }
    return { ok: true, running: started };
  });

  const result = await controller.start();

  assert.equal(result.ok, true);
  assert.equal(result.dir, path.join(root, 'session_002'));
  assert.equal(fs.existsSync(path.join(result.dir, '.device-ui-preview')), true);
});

test('rejects zero or multiple newly created sessions', async t => {
  const root = temporaryRoot(t);
  const before = listSessions(root);
  assert.throws(() => resolveNewPreviewSession(before, listSessions(root), root), /exactly one/i);

  session(root, 'session_001');
  session(root, 'session_002');
  assert.throws(() => resolveNewPreviewSession(before, listSessions(root), root), /exactly one/i);
});

test('rejects traversal and a session symlink escaping the capture root', t => {
  const root = temporaryRoot(t);
  const outside = temporaryRoot(t);
  const escapedDir = session(outside, 'session_900');
  const symlink = path.join(root, 'session_901');
  fs.symlinkSync(escapedDir, symlink, 'dir');

  assert.throws(
    () => resolveNewPreviewSession([], [path.join(root, '..', 'session_902')], root),
    /direct child/i,
  );
  assert.throws(() => resolveNewPreviewSession([], [symlink], root), /symlink|capture root/i);
  assert.equal(isMarkedPreviewSession(symlink, root), false);
});

test('stop deletes only the marked direct-child preview session', async t => {
  const root = temporaryRoot(t);
  const captureCtl = async command => {
    if (command === 'start') {
      session(root, 'session_001');
      return { ok: true };
    }
    return { ok: true, running: command === 'status' && !fs.existsSync(path.join(root, '.stopped')) };
  };
  const controller = fakeController(root, async command => {
    if (command === 'stop') {
      fs.writeFileSync(path.join(root, '.stopped'), '');
      return { ok: true };
    }
    return captureCtl(command);
  });
  const started = await controller.start();

  const result = await controller.stop();

  assert.equal(result.ok, true);
  assert.equal(fs.existsSync(started.dir), false);
  assert.equal(fs.existsSync(root), true);
});

test('stop refuses to delete a preview session whose marker is missing', async t => {
  const root = temporaryRoot(t);
  let running = false;
  const controller = fakeController(root, async command => {
    if (command === 'start') {
      running = true;
      session(root, 'session_001');
      return { ok: true };
    }
    if (command === 'stop') {
      running = false;
      return { ok: true };
    }
    return { ok: true, running };
  });
  const started = await controller.start();
  fs.unlinkSync(path.join(started.dir, '.device-ui-preview'));

  await assert.rejects(controller.stop(), /marked preview session/i);
  assert.equal(fs.existsSync(started.dir), true);
});

test('promote removes the marker and preserves the session directory', async t => {
  const root = temporaryRoot(t);
  let running = false;
  const controller = fakeController(root, async command => {
    if (command === 'start') {
      running = true;
      session(root, 'session_001');
      return { ok: true };
    }
    return { ok: true, running };
  });
  const started = await controller.start();

  const result = await controller.promote();

  assert.deepEqual(result, { ok: true, promoted: true });
  assert.equal(fs.existsSync(started.dir), true);
  assert.equal(fs.existsSync(path.join(started.dir, '.device-ui-preview')), false);
});

test('requestFrame replaces the stale channel file and sends the channel-addressed command', async t => {
  const root = temporaryRoot(t);
  const frames = path.join(root, 'frames');
  fs.mkdirSync(frames);
  const output = path.join(frames, 'camera_preview_jhh02.jpg');
  fs.writeFileSync(output, 'stale');
  const commands = [];
  const controller = createPreviewController({
    fs,
    captureRoot: root,
    previewRoot: frames,
    captureCtl: async command => {
      commands.push(command);
      assert.equal(fs.existsSync(output), false);
      fs.writeFileSync(output, 'fresh-frame');
      return { ok: true };
    },
    waitFor: async predicate => predicate(),
  });

  const frame = await controller.requestFrame('head-stereo');

  assert.equal(frame, output);
  assert.deepEqual(commands, [`preview:jhh02:${output}`]);
  assert.equal(fs.readFileSync(output, 'utf8'), 'fresh-frame');
});

test('requestFrame rejects an unknown external channel without contacting capture', async t => {
  const root = temporaryRoot(t);
  let calls = 0;
  const controller = fakeController(root, async () => {
    calls += 1;
    return { ok: true };
  });

  await assert.rejects(controller.requestFrame('../jhh02'), /unknown preview channel/i);
  assert.equal(calls, 0);
});
