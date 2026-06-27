// Typedefs del contrato EagleEye (solo tipos, sin runtime).
// Espejan los esquemas JSON. La verdad la mandan los .json; estos typedefs dan
// autocompletado y chequeo con `tsc --checkJs`. En el futuro se generaran desde
// los esquemas (build step 1). Si divergen, manda el JSON Schema.

/**
 * @typedef {'ephemeral'|'persist'} Retention
 * @typedef {'pose'|'hands'|'face'} DetectionKind
 * @typedef {'left'|'right'} Handedness
 */

/**
 * Sobre comun a todos los mensajes (ev=1).
 * @typedef {Object} Envelope
 * @property {1} ev
 * @property {string} type           Tipo punteado, p.ej. 'detection.frame'.
 * @property {string} tenant
 * @property {string} sessionId
 * @property {string} source
 * @property {number} seq            Monotonico por sesion (huecos esperados).
 * @property {number} ts             Epoch ms del cliente.
 * @property {number} sv             Version de esquema del payload.
 * @property {string} consent        Claim advisory.
 * @property {string} purpose        Claim advisory.
 * @property {Retention} retention   Claim advisory.
 * @property {object} data           Payload especifico de (type, sv).
 * @property {number} [dropped]
 * @property {string} [trace]
 */

/**
 * @typedef {Object} Landmark
 * @property {number} x   Normalizado [0,1].
 * @property {number} y   Normalizado [0,1].
 * @property {number} z   Profundidad relativa (no acotada).
 * @property {number} [score]
 */

/**
 * @typedef {Object} WorldPoint
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */

/**
 * @typedef {Object} Blendshape
 * @property {string} name
 * @property {number} score  [0,1].
 */

/**
 * Una deteccion (una persona/instancia de una modalidad).
 * @typedef {Object} Detection
 * @property {DetectionKind} kind
 * @property {string} detector
 * @property {Landmark[]} landmarks
 * @property {boolean} mirrored
 * @property {number} sourceWidth
 * @property {number} sourceHeight
 * @property {string} [modelVersion]
 * @property {number} [instanceId]
 * @property {WorldPoint[]} [world]
 * @property {Handedness} [handedness]
 * @property {Blendshape[]} [blendshapes]
 * @property {number[]} [transform]   Matriz 4x4 row-major (16 numeros).
 */

/**
 * Payload de deteccion (sv=1): el `data` de un detection.frame.
 * @typedef {Object} DetectionPayload
 * @property {boolean} kf
 * @property {Detection[]} detections
 */

export {};
