import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  analyzeBlendshapes,
  eulerFromRotationMatrix,
  headPoseFromMatrix,
  analyzeFace,
} from '../public/lib/analysis.js';

// Helpers: matrices de rotacion 3x3 (anidadas) y su producto.
const Rx = (a) => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
const Ry = (b) => [[Math.cos(b), 0, Math.sin(b)], [0, 1, 0], [-Math.sin(b), 0, Math.cos(b)]];
const Rz = (c) => [[Math.cos(c), -Math.sin(c), 0], [Math.sin(c), Math.cos(c), 0], [0, 0, 1]];
const mul = (A, B) => A.map((row, i) => B[0].map((_, j) => row.reduce((s, _v, k) => s + A[i][k] * B[k][j], 0)));

test('analyzeBlendshapes derives smile/mouthOpen/blink/brow', () => {
  const e = analyzeBlendshapes([
    { name: 'mouthSmileLeft', score: 0.8 }, { name: 'mouthSmileRight', score: 0.6 },
    { name: 'jawOpen', score: 0.2 },
    { name: 'eyeBlinkLeft', score: 0.9 }, { name: 'eyeBlinkRight', score: 0.1 },
    { name: 'browInnerUp', score: 0.4 },
  ]);
  assert.ok(Math.abs(e.smile - 0.7) < 1e-9);
  assert.equal(e.mouthOpen, 0.2);
  assert.equal(e.blinkLeft, 0.9);
  assert.equal(e.blinkRight, 0.1);
  assert.equal(e.browRaise, 0.4);
});

test('analyzeBlendshapes returns zeros for empty input', () => {
  const e = analyzeBlendshapes([]);
  assert.equal(e.smile, 0);
  assert.equal(e.mouthOpen, 0);
  assert.equal(e.blinkLeft, 0);
  assert.equal(e.browRaise, 0);
});

test('eulerFromRotationMatrix recovers the composed angles (R = Rz·Ry·Rx)', () => {
  const a = 0.1, b = 0.2, c = 0.3;
  const R = mul(mul(Rz(c), Ry(b)), Rx(a));
  const e = eulerFromRotationMatrix(R);
  assert.ok(Math.abs(e.x - a) < 1e-6, 'pitch');
  assert.ok(Math.abs(e.y - b) < 1e-6, 'yaw');
  assert.ok(Math.abs(e.z - c) < 1e-6, 'roll');
});

test('eulerFromRotationMatrix(identity) is zero', () => {
  const e = eulerFromRotationMatrix([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
  assert.ok(Math.abs(e.x) < 1e-9 && Math.abs(e.y) < 1e-9 && Math.abs(e.z) < 1e-9);
});

test('headPoseFromMatrix reads a column-major 4x4 and returns degrees', () => {
  const b = 0.2;
  const R = Ry(b);
  const m = [
    R[0][0], R[1][0], R[2][0], 0,
    R[0][1], R[1][1], R[2][1], 0,
    R[0][2], R[1][2], R[2][2], 0,
    0, 0, 0, 1,
  ];
  const hp = headPoseFromMatrix(m, { columnMajor: true });
  assert.ok(Math.abs(hp.yaw - (b * 180) / Math.PI) < 1e-4);
  assert.ok(Math.abs(hp.pitch) < 1e-4 && Math.abs(hp.roll) < 1e-4);
});

test('analyzeFace combines expressions and head pose from a contract detection', () => {
  const detection = {
    kind: 'face', detector: 'x', landmarks: [{ x: 0.5, y: 0.5, z: 0 }],
    mirrored: false, sourceWidth: 1, sourceHeight: 1,
    blendshapes: [{ name: 'jawOpen', score: 0.5 }],
    transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  };
  const a = analyzeFace(detection);
  assert.equal(a.expressions.mouthOpen, 0.5);
  assert.ok(a.headPose && Math.abs(a.headPose.yaw) < 1e-6);
});
