'use strict';

const defaultFs = require('node:fs');
const path = require('node:path');

const MARKER = '.device-ui-preview';
const SESSION_NAME = /^session_[0-9]{3,}$/;

const CHANNELS = Object.freeze({
  'head-stereo': Object.freeze({ capture: 'jhh02', file: 'camera_preview_jhh02.jpg' }),
  'head-four': Object.freeze({ capture: 'jhh04', file: 'camera_preview_jhh04.jpg' }),
  'wrist-left': Object.freeze({ capture: 'wrist_left', file: 'camera_preview_wrist_left.jpg' }),
  'wrist-right': Object.freeze({ capture: 'wrist_right', file: 'camera_preview_wrist_right.jpg' }),
});

function listSessionsWithFs(fs, root) {
  const absoluteRoot = path.resolve(root);
  let names;
  try { names = fs.readdirSync(absoluteRoot); } catch { return []; }
  return names
    .filter(name => SESSION_NAME.test(name))
    .map(name => path.join(absoluteRoot, name))
    .filter(dir => {
      try { return fs.statSync(dir).isDirectory(); } catch { return false; }
    })
    .sort();
}

function listSessions(root) {
  return listSessionsWithFs(defaultFs, root);
}

function validateSessionDir(fs, dir, root) {
  const absoluteRoot = path.resolve(root);
  const absoluteDir = path.resolve(dir);
  if (path.dirname(absoluteDir) !== absoluteRoot || !SESSION_NAME.test(path.basename(absoluteDir))) {
    throw new Error('preview session must be a named direct child of the capture root');
  }

  let realRoot;
  let realDir;
  try {
    realRoot = fs.realpathSync(absoluteRoot);
    if (fs.lstatSync(absoluteDir).isSymbolicLink()) throw new Error('symlink');
    realDir = fs.realpathSync(absoluteDir);
  } catch (error) {
    throw new Error(`preview session symlink or realpath validation failed: ${error.message}`);
  }
  if (path.dirname(realDir) !== realRoot || path.basename(realDir) !== path.basename(absoluteDir)) {
    throw new Error('preview session resolves outside the capture root');
  }
  return absoluteDir;
}

function resolveNewPreviewSessionWithFs(fs, before, after, root) {
  const previous = new Set(before.map(dir => path.resolve(dir)));
  const added = after.map(dir => path.resolve(dir)).filter(dir => !previous.has(dir));
  if (added.length !== 1) throw new Error('expected exactly one new capture session');
  return validateSessionDir(fs, added[0], root);
}

function resolveNewPreviewSession(before, after, root) {
  return resolveNewPreviewSessionWithFs(defaultFs, before, after, root);
}

function isMarkedPreviewSessionWithFs(fs, dir, root) {
  try {
    const validDir = validateSessionDir(fs, dir, root);
    return fs.statSync(path.join(validDir, MARKER)).isFile();
  } catch { return false; }
}

function isMarkedPreviewSession(dir, root) {
  return isMarkedPreviewSessionWithFs(defaultFs, dir, root);
}

function createPreviewController(deps) {
  const fs = deps.fs || defaultFs;
  const captureCtl = deps.captureCtl;
  const captureRoot = path.resolve(deps.captureRoot);
  const previewRoot = path.resolve(deps.previewRoot);
  const waitFor = deps.waitFor || (async predicate => predicate());
  let previewDir = null;

  async function waitForRunning(expected) {
    return waitFor(async () => {
      const status = await captureCtl('status');
      return !!(status && status.ok && status.running) === expected;
    });
  }

  return {
    async start() {
      const before = listSessionsWithFs(fs, captureRoot);
      const started = await captureCtl('start');
      if (!started || !started.ok) throw new Error(started && started.error || 'preview capture did not start');
      if (!await waitForRunning(true)) throw new Error('preview capture did not reach running state');
      const after = listSessionsWithFs(fs, captureRoot);
      const dir = resolveNewPreviewSessionWithFs(fs, before, after, captureRoot);
      fs.writeFileSync(path.join(dir, MARKER), '');
      previewDir = dir;
      return { ok: true, dir };
    },

    async stop() {
      const stopped = await captureCtl('stop');
      if (!stopped || !stopped.ok) throw new Error(stopped && stopped.error || 'preview capture did not stop');
      if (!await waitForRunning(false)) throw new Error('preview capture did not reach stopped state');
      const dir = previewDir;
      previewDir = null;
      if (!dir || !isMarkedPreviewSessionWithFs(fs, dir, captureRoot)) {
        throw new Error('refusing to delete anything except a valid marked preview session');
      }
      fs.rmSync(dir, { recursive: true });
      return { ok: true };
    },

    async promote() {
      const dir = previewDir;
      if (!dir || !isMarkedPreviewSessionWithFs(fs, dir, captureRoot)) {
        throw new Error('cannot promote an invalid or unmarked preview session');
      }
      fs.unlinkSync(path.join(dir, MARKER));
      previewDir = null;
      return { ok: true, promoted: true };
    },

    async requestFrame(externalChannel) {
      const channel = CHANNELS[externalChannel];
      if (!channel) throw new Error('unknown preview channel');
      fs.mkdirSync(previewRoot, { recursive: true });
      const output = path.join(previewRoot, channel.file);
      try { fs.unlinkSync(output); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      const requested = await captureCtl(`preview:${channel.capture}:${output}`);
      if (!requested || !requested.ok) throw new Error(requested && requested.error || 'preview request failed');
      const ready = await waitFor(() => {
        try { return fs.statSync(output).size > 0; } catch { return false; }
      });
      if (!ready) throw new Error('preview frame timed out');
      return output;
    },
  };
}

module.exports = {
  CHANNELS,
  listSessions,
  resolveNewPreviewSession,
  isMarkedPreviewSession,
  createPreviewController,
};
