'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { deleteRecordingDirectory, resolveRecordingDirectory } = require('../recording-files.cjs');

function temporaryRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'device-ui-recordings-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('deletes only a recording/session direct-child directory', t => {
  const root = temporaryRoot(t);
  for (const name of ['recording_20260821_120000', 'session_001']) {
    const directory = path.join(root, name);
    fs.mkdirSync(directory);
    fs.writeFileSync(path.join(directory, 'data.bin'), 'capture');
    deleteRecordingDirectory(root, name);
    assert.equal(fs.existsSync(directory), false);
  }
  assert.equal(fs.existsSync(root), true);
});

test('rejects unrelated names, traversal, files, and missing recordings', t => {
  const root = temporaryRoot(t);
  fs.mkdirSync(path.join(root, 'settings_backup'));
  fs.writeFileSync(path.join(root, 'recording_file'), 'not a directory');

  assert.throws(() => resolveRecordingDirectory(root, 'settings_backup'), /invalid recording name/);
  assert.throws(() => resolveRecordingDirectory(root, '../recording_escape'), /invalid recording name/);
  assert.throws(() => resolveRecordingDirectory(root, 'recording_file'), /not a directory/);
  assert.throws(() => resolveRecordingDirectory(root, 'recording_missing'), /not found/);
  assert.equal(fs.existsSync(path.join(root, 'settings_backup')), true);
});

test('rejects a recording symlink escaping the data directory', t => {
  const root = temporaryRoot(t);
  const outside = temporaryRoot(t);
  const link = path.join(root, 'recording_escape');
  fs.symlinkSync(outside, link, 'dir');

  assert.throws(() => resolveRecordingDirectory(root, 'recording_escape'), /symlink/);
  assert.equal(fs.existsSync(outside), true);
});
