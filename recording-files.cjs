'use strict';

const fs = require('node:fs');
const path = require('node:path');

const RECORDING_NAME = /^(?:recording|session)_[A-Za-z0-9][A-Za-z0-9._-]*$/;

function recordingError(message, code = 'invalid_name') {
  const error = new Error(message);
  error.code = code;
  return error;
}

function resolveRecordingDirectory(baseDir, name) {
  if (typeof name !== 'string' || !RECORDING_NAME.test(name) || name.includes('..')) {
    throw recordingError('invalid recording name');
  }
  const baseReal = fs.realpathSync(baseDir);
  const candidate = path.join(baseReal, name);
  let stat;
  try {
    stat = fs.lstatSync(candidate);
  } catch (error) {
    if (error && error.code === 'ENOENT') throw recordingError('recording not found', 'not_found');
    throw error;
  }
  if (stat.isSymbolicLink()) throw recordingError('recording symlink is not allowed');
  if (!stat.isDirectory()) throw recordingError('recording is not a directory');
  const targetReal = fs.realpathSync(candidate);
  if (path.dirname(targetReal) !== baseReal) throw recordingError('recording is outside data directory');
  return targetReal;
}

function deleteRecordingDirectory(baseDir, name) {
  const target = resolveRecordingDirectory(baseDir, name);
  fs.rmSync(target, { recursive: true, force: false });
}

module.exports = { deleteRecordingDirectory, resolveRecordingDirectory };
