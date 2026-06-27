import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createStats } from '../public/lib/stats.js';

test('reports zeros before any sample', () => {
  const s = createStats({ window: 30 });
  const g = s.get();
  assert.equal(g.fps, 0);
  assert.equal(g.frameMs, 0);
  assert.equal(g.latencyMs, 0);
});

test('averages frame time and derives fps over the window', () => {
  const s = createStats({ window: 10 });
  for (let i = 0; i < 10; i++) s.record(20, 8); // 20ms/frame -> 50 fps
  const g = s.get();
  assert.equal(Math.round(g.frameMs), 20);
  assert.equal(Math.round(g.fps), 50);
  assert.equal(Math.round(g.latencyMs), 8);
});

test('only keeps the most recent `window` samples', () => {
  const s = createStats({ window: 3 });
  s.record(100, 0);
  s.record(10, 0);
  s.record(10, 0);
  s.record(10, 0); // pushes the 100ms sample out of the window
  assert.equal(Math.round(s.get().frameMs), 10);
});
