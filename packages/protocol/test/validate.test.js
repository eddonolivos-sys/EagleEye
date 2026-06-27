import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateEnvelope,
  validateDetectionPayload,
  SUPPORTED,
} from '../src/validate.js';

/** A minimal, well-formed envelope carrying a (separately validated) detection frame. */
function validEnvelope(overrides = {}) {
  return {
    ev: 1,
    type: 'detection.frame',
    tenant: 't_abc',
    sessionId: 's_123',
    source: 'cam-laptop-01',
    seq: 0,
    ts: 1_750_000_000_000,
    sv: 1,
    consent: 'consent_ref_1',
    purpose: 'pose-over-time',
    retention: 'ephemeral',
    data: {},
    ...overrides,
  };
}

/** A minimal, well-formed sv=1 detection payload (the envelope `data` for detection.frame). */
function validDetection(overrides = {}) {
  return {
    kf: true,
    detections: [
      {
        kind: 'pose',
        detector: 'mediapipe.pose_landmarker',
        landmarks: [
          { x: 0.5, y: 0.5, z: -0.1 },
          { x: 0.4, y: 0.6, z: 0.0, score: 0.9 },
        ],
        mirrored: true,
        sourceWidth: 640,
        sourceHeight: 480,
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

test('accepts a well-formed envelope', () => {
  const r = validateEnvelope(validEnvelope());
  assert.equal(r.valid, true, JSON.stringify(r.errors));
});

test('rejects an envelope missing a required field (tenant)', () => {
  const { tenant, ...withoutTenant } = validEnvelope();
  const r = validateEnvelope(withoutTenant);
  assert.equal(r.valid, false);
  assert.ok(r.errors.join(' ').includes('tenant'), r.errors.join(' '));
});

test('rejects unknown top-level properties on the envelope', () => {
  const r = validateEnvelope(validEnvelope({ foo: 'bar' }));
  assert.equal(r.valid, false);
});

test('rejects an unsupported envelope major (ev=2)', () => {
  const r = validateEnvelope(validEnvelope({ ev: 2 }));
  assert.equal(r.valid, false);
});

test('rejects an invalid retention enum value', () => {
  const r = validateEnvelope(validEnvelope({ retention: 'forever' }));
  assert.equal(r.valid, false);
});

test('rejects a negative sequence number', () => {
  const r = validateEnvelope(validEnvelope({ seq: -1 }));
  assert.equal(r.valid, false);
});

// ---------------------------------------------------------------------------
// Detection payload (sv=1)
// ---------------------------------------------------------------------------

test('accepts a well-formed sv=1 detection payload', () => {
  const r = validateDetectionPayload(validDetection(), 1);
  assert.equal(r.valid, true, JSON.stringify(r.errors));
});

test('rejects a landmark with a normalized coordinate outside [0,1]', () => {
  const bad = validDetection();
  bad.detections[0].landmarks[0].x = 1.5;
  const r = validateDetectionPayload(bad, 1);
  assert.equal(r.valid, false);
});

test('rejects an unknown detection kind in v1', () => {
  const bad = validDetection();
  bad.detections[0].kind = 'objects';
  const r = validateDetectionPayload(bad, 1);
  assert.equal(r.valid, false);
});

test('rejects a detection payload missing the keyframe flag', () => {
  const { kf, ...withoutKf } = validDetection();
  const r = validateDetectionPayload(withoutKf, 1);
  assert.equal(r.valid, false);
});

test('rejects unknown properties inside a detection item', () => {
  const bad = validDetection();
  /** @type {Record<string, unknown>} */ (bad.detections[0]).leak = 'pixels?';
  const r = validateDetectionPayload(bad, 1);
  assert.equal(r.valid, false);
});

test('reports an unsupported payload schema version instead of throwing', () => {
  const r = validateDetectionPayload(validDetection(), 99);
  assert.equal(r.valid, false);
  assert.ok(r.errors.join(' ').toLowerCase().includes('unsupported'), r.errors.join(' '));
});

// ---------------------------------------------------------------------------
// Capability advertisement
// ---------------------------------------------------------------------------

test('advertises the supported envelope major and payload versions', () => {
  assert.equal(SUPPORTED.ev, 1);
  assert.deepEqual(SUPPORTED.detectionSv, [1]);
});
