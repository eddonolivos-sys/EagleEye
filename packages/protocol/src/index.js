// Punto de entrada del paquete de contrato EagleEye.
// Re-exporta los validadores y las capacidades soportadas.
// Los typedefs (solo-tipos, sin runtime) viven en ./types.js y se consumen via
// JSDoc: /** @type {import('@eagleeye/protocol/types').Envelope} */

export { validateEnvelope, validateDetectionPayload, SUPPORTED } from './validate.js';
