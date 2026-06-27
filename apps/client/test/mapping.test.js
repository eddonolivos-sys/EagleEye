import { test } from 'node:test';
import assert from 'node:assert/strict';

import { faceResultToDetectionPayload } from '../public/lib/mapping.js';
import { validateDetectionPayload } from '@eagleeye/protocol/validate';

const meta = {
  sourceWidth: 640,
  sourceHeight: 480,
  mirrored: true,
  detector: 'mediapipe.face_landmarker',
  modelVersion: '0.10.35',
};

function fakeResult() {
  return {
    faceLandmarks: [[
      { x: 0.5, y: 0.5, z: 0.1 },
      { x: 1.2, y: -0.1, z: 0.0 }, // fuera de rango: debe recortarse a [0,1]
    ]],
    faceBlendshapes: [{ categories: [{ categoryName: 'jawOpen', score: 0.3 }] }],
    facialTransformationMatrixes: [{ data: Array.from({ length: 16 }, (_, i) => i) }],
  };
}

test('maps a MediaPipe face result to a contract-valid detection payload', () => {
  const payload = faceResultToDetectionPayload(fakeResult(), meta);
  assert.equal(payload.kf, true);
  assert.equal(payload.detections.length, 1);
  const d = payload.detections[0];
  assert.equal(d.kind, 'face');
  assert.equal(d.mirrored, true);
  assert.equal(d.sourceWidth, 640);

  const r = validateDetectionPayload(payload, 1);
  assert.equal(r.valid, true, JSON.stringify(r.errors));
});

test('clamps out-of-range normalized coordinates into [0,1]', () => {
  const payload = faceResultToDetectionPayload(fakeResult(), meta);
  const lm = payload.detections[0].landmarks[1];
  assert.equal(lm.x, 1);
  assert.equal(lm.y, 0);
});

test('carries blendshapes and the transform matrix when present', () => {
  const d = faceResultToDetectionPayload(fakeResult(), meta).detections[0];
  assert.deepEqual(d.blendshapes, [{ name: 'jawOpen', score: 0.3 }]);
  assert.equal(d.transform.length, 16);
});

test('produces an empty, still-valid payload when no face is detected', () => {
  const empty = { faceLandmarks: [], faceBlendshapes: [], facialTransformationMatrixes: [] };
  const payload = faceResultToDetectionPayload(empty, meta);
  assert.equal(payload.detections.length, 0);
  assert.equal(validateDetectionPayload(payload, 1).valid, true);
});
