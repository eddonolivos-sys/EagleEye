import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildVideoConstraints, assertGetUserMedia, describeGetUserMediaError, shouldMirror } from '../public/lib/camera.js';

test('uses the front camera (facingMode user) by default', () => {
  const c = buildVideoConstraints();
  assert.deepEqual(c.facingMode, { ideal: 'user' });
  assert.equal(c.deviceId, undefined);
  assert.deepEqual(c.width, { ideal: 640 });
});

test('honors an explicit facingMode (back camera on mobile)', () => {
  const c = buildVideoConstraints({ facingMode: 'environment' });
  assert.deepEqual(c.facingMode, { ideal: 'environment' });
  assert.equal(c.deviceId, undefined);
});

test('prefers an explicit deviceId over facingMode', () => {
  const c = buildVideoConstraints({ deviceId: 'cam-1', facingMode: 'user' });
  assert.deepEqual(c.deviceId, { exact: 'cam-1' });
  assert.equal(c.facingMode, undefined);
});

test('honors a custom resolution', () => {
  const c = buildVideoConstraints({ width: 1280, height: 720 });
  assert.deepEqual(c.width, { ideal: 1280 });
  assert.deepEqual(c.height, { ideal: 720 });
});

test('assertGetUserMedia throws an actionable error when mediaDevices is missing', () => {
  assert.throws(() => assertGetUserMedia({}), /seguro|HTTPS/i);
  assert.throws(() => assertGetUserMedia({ mediaDevices: {} }), /seguro|HTTPS/i);
});

test('assertGetUserMedia passes when getUserMedia is available', () => {
  assert.doesNotThrow(() => assertGetUserMedia({ mediaDevices: { getUserMedia() {} } }));
});

test('describeGetUserMediaError maps permission denial to an actionable hint', () => {
  const msg = describeGetUserMediaError({ name: 'NotAllowedError', message: 'Permission denied' });
  assert.match(msg, /permiso/i);
  assert.match(msg, /cámara|camara/i);
});

test('describeGetUserMediaError maps no-camera and busy errors', () => {
  assert.match(describeGetUserMediaError({ name: 'NotFoundError' }), /no se detect/i);
  assert.match(describeGetUserMediaError({ name: 'NotReadableError' }), /uso/i);
});

test('describeGetUserMediaError falls back to the raw message for unknown errors', () => {
  assert.equal(describeGetUserMediaError({ name: 'WeirdError', message: 'algo raro' }), 'algo raro');
});

test('shouldMirror espeja todo salvo la cámara trasera (environment)', () => {
  assert.equal(shouldMirror('user'), true);
  assert.equal(shouldMirror('environment'), false);
});

test('shouldMirror espeja por defecto cuando el facingMode es desconocido', () => {
  assert.equal(shouldMirror(undefined), true);
  assert.equal(shouldMirror(''), true);
  assert.equal(shouldMirror('left'), true);
});
