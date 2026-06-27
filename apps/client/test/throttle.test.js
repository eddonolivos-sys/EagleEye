import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createThrottle } from '../public/lib/throttle.js';

test('emits the first item immediately', () => {
  const t = createThrottle(10); // intervalo 100ms
  const out = t.push('A', 0);
  assert.deepEqual(out, { item: 'A', dropped: 0 });
});

test('coalesces items within the interval and emits the latest when due', () => {
  const t = createThrottle(10); // 100ms
  assert.deepEqual(t.push('A', 0), { item: 'A', dropped: 0 });
  assert.equal(t.push('B', 40), null); // coalescido
  assert.equal(t.push('C', 90), null); // coalescido
  assert.deepEqual(t.push('D', 150), { item: 'D', dropped: 2 }); // emite el ultimo, reporta 2 descartados
});

test('resets the dropped counter after each emit', () => {
  const t = createThrottle(20); // 50ms
  t.push('A', 0);
  t.push('B', 10); // dropped 1
  assert.deepEqual(t.push('C', 60), { item: 'C', dropped: 1 });
  assert.deepEqual(t.push('D', 120), { item: 'D', dropped: 0 });
});
