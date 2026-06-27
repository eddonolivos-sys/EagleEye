import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseFrontmatter } from '../src/frontmatter.js';

test('parses a front-matter block into data and leaves the body', () => {
  const text = ['---', 'modulo: protocol-contract', 'estado: completado', '---', '', '# Título', 'cuerpo'].join('\n');
  const { data, body } = parseFrontmatter(text);
  assert.equal(data.modulo, 'protocol-contract');
  assert.equal(data.estado, 'completado');
  assert.ok(body.includes('# Título'));
  assert.ok(!body.includes('modulo:'));
});

test('returns empty data and the full text when there is no front-matter', () => {
  const text = '# Solo cuerpo\nsin front-matter';
  const { data, body } = parseFrontmatter(text);
  assert.deepEqual(data, {});
  assert.equal(body, text);
});

test('trims whitespace around keys and values', () => {
  const text = ['---', '  capa :   docs  ', '---', 'x'].join('\n');
  const { data } = parseFrontmatter(text);
  assert.equal(data.capa, 'docs');
});

test('keeps colons that appear in the value (splits on the first only)', () => {
  const text = ['---', 'url: https://eagleeye.local/x', '---', 'y'].join('\n');
  const { data } = parseFrontmatter(text);
  assert.equal(data.url, 'https://eagleeye.local/x');
});

test('ignores a leading blank line before the front-matter fence', () => {
  const text = ['', '---', 'estado: pendiente', '---', 'z'].join('\n');
  const { data } = parseFrontmatter(text);
  assert.equal(data.estado, 'pendiente');
});
