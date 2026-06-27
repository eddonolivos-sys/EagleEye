// Parser minimo de front-matter `key: value` (sin dependencia de YAML).
// Suficiente para las fichas de docs/estado/*.md (pares planos clave:valor).

/**
 * Extrae el bloque de front-matter delimitado por `---` al inicio del texto.
 * @param {string} text
 * @returns {{ data: Record<string, string>, body: string }}
 */
export function parseFrontmatter(text) {
  const normalized = text.replace(/^﻿/, '');
  const lines = normalized.split('\n');

  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;

  if (lines[i] === undefined || lines[i].trim() !== '---') {
    return { data: {}, body: text };
  }

  const start = i + 1;
  let end = -1;
  for (let j = start; j < lines.length; j++) {
    if (lines[j].trim() === '---') {
      end = j;
      break;
    }
  }
  if (end === -1) {
    return { data: {}, body: text };
  }

  /** @type {Record<string, string>} */
  const data = {};
  for (let j = start; j < end; j++) {
    const line = lines[j];
    if (line.trim() === '') continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) data[key] = value;
  }

  const body = lines.slice(end + 1).join('\n').replace(/^\n+/, '');
  return { data, body };
}
