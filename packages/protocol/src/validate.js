// Validadores del contrato EagleEye.
//
// Los esquemas JSON son la UNICA fuente de verdad (packages/protocol/schemas).
// Aqui solo se compilan y se exponen funciones de validacion con un resultado
// uniforme { valid, errors }. El mismo esquema valida en cliente y servidor.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Ajv2020 } from 'ajv/dist/2020.js';

const here = dirname(fileURLToPath(import.meta.url));
const schemasDir = join(here, '..', 'schemas');

/** @param {string} name @returns {object} */
function loadSchema(name) {
  return JSON.parse(readFileSync(join(schemasDir, name), 'utf8'));
}

const ajv = new Ajv2020({ allErrors: true, strict: true });

const envelopeValidator = ajv.compile(loadSchema('envelope.schema.json'));

/**
 * Validadores de payload de deteccion, indexados por version de esquema (sv).
 * @type {Record<number, import('ajv').ValidateFunction>}
 */
const detectionValidators = {
  1: ajv.compile(loadSchema('detection.v1.schema.json')),
};

/** Capacidades que el hub/cliente anuncian en el handshake. */
export const SUPPORTED = Object.freeze({
  ev: 1,
  detectionSv: Object.freeze([1]),
});

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string[]} errors  Lista legible; vacia si valid === true.
 */

/** @param {import('ajv').ErrorObject} e @returns {string} */
function formatError(e) {
  const path = e.instancePath || '(root)';
  const extra =
    e.keyword === 'required' && e.params && 'missingProperty' in e.params
      ? ` '${e.params.missingProperty}'`
      : '';
  return `${path} ${e.message}${extra}`.trim();
}

/**
 * @param {import('ajv').ValidateFunction} fn
 * @param {unknown} obj
 * @returns {ValidationResult}
 */
function toResult(fn, obj) {
  const valid = fn(obj);
  return {
    valid: Boolean(valid),
    errors: valid ? [] : (fn.errors ?? []).map(formatError),
  };
}

/**
 * Valida la estructura del sobre (no su `data`, que se valida por (type, sv)).
 * @param {unknown} obj
 * @returns {ValidationResult}
 */
export function validateEnvelope(obj) {
  return toResult(envelopeValidator, obj);
}

/**
 * Valida un payload de deteccion contra el esquema de la version indicada.
 * @param {unknown} obj
 * @param {number} [sv=1]
 * @returns {ValidationResult}
 */
export function validateDetectionPayload(obj, sv = 1) {
  const fn = detectionValidators[sv];
  if (!fn) {
    return {
      valid: false,
      errors: [`unsupported detection payload schema version (sv=${sv})`],
    };
  }
  return toResult(fn, obj);
}
