import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createResultBus } from '../public/lib/resultBus.js';

test('delivers published messages to subscribers', () => {
  const bus = createResultBus();
  const seen = [];
  bus.subscribe((m) => seen.push(m));
  bus.publish(1);
  bus.publish(2);
  assert.deepEqual(seen, [1, 2]);
});

test('unsubscribe stops delivery', () => {
  const bus = createResultBus();
  const seen = [];
  const off = bus.subscribe((m) => seen.push(m));
  bus.publish('a');
  off();
  bus.publish('b');
  assert.deepEqual(seen, ['a']);
});

test('a throwing subscriber does not break delivery to others and is reported', () => {
  const errs = [];
  const bus = createResultBus({ onError: (e) => errs.push(e) });
  const seen = [];
  bus.subscribe(() => { throw new Error('boom'); });
  bus.subscribe((m) => seen.push(m));
  bus.publish('x');
  assert.deepEqual(seen, ['x']);
  assert.equal(errs.length, 1);
});
