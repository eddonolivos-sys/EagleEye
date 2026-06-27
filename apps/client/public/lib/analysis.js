// Modulo de analisis: convierte una deteccion del CONTRATO (blendshapes + matriz
// de transformacion) en senales con significado (expresiones + pose de cabeza).
// Es el primer consumidor "de dominio" del ResultBus y opera sobre los datos
// derivados, igual que lo haria un consumidor downstream (avatares/accesibilidad).
// Logica pura -> testeada (test/analysis.test.js).

/**
 * @param {Array<{name:string, score:number}>} [blendshapes]
 * @returns {{ smile:number, mouthOpen:number, blinkLeft:number, blinkRight:number, browRaise:number }}
 */
export function analyzeBlendshapes(blendshapes = []) {
  /** @type {Record<string, number>} */
  const m = {};
  for (const b of blendshapes) m[b.name] = b.score;
  const g = (/** @type {string} */ k) => m[k] ?? 0;
  const avg = (/** @type {number[]} */ xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

  return {
    smile: avg([g('mouthSmileLeft'), g('mouthSmileRight')]),
    mouthOpen: g('jawOpen'),
    blinkLeft: g('eyeBlinkLeft'),
    blinkRight: g('eyeBlinkRight'),
    browRaise: Math.max(g('browInnerUp'), g('browOuterUpLeft'), g('browOuterUpRight')),
  };
}

/**
 * Extrae angulos de Euler (radianes) de una matriz de rotacion 3x3 anidada.
 * Convencion estandar (R = Rz·Ry·Rx); x=pitch, y=yaw, z=roll.
 * @param {number[][]} R
 * @returns {{ x:number, y:number, z:number }}
 */
export function eulerFromRotationMatrix(R) {
  const sy = Math.hypot(R[0][0], R[1][0]);
  if (sy > 1e-6) {
    return {
      x: Math.atan2(R[2][1], R[2][2]),
      y: Math.atan2(-R[2][0], sy),
      z: Math.atan2(R[1][0], R[0][0]),
    };
  }
  // Bloqueo de cardan (gimbal lock).
  return { x: Math.atan2(-R[1][2], R[1][1]), y: Math.atan2(-R[2][0], sy), z: 0 };
}

/**
 * Pose de cabeza (grados) desde la matriz 4x4 de MediaPipe.
 * Por defecto column-major (como `Matrix4.fromArray` de three.js, el consumo
 * habitual de MediaPipe). Si los ejes salen invertidos en tu equipo, es un ajuste
 * de signo/columnMajor de una linea.
 * @param {number[]} transform  16 numeros
 * @param {{ columnMajor?: boolean }} [opts]
 * @returns {{ yaw:number, pitch:number, roll:number } | null}
 */
export function headPoseFromMatrix(transform, { columnMajor = true } = {}) {
  if (!transform || transform.length < 16) return null;
  const at = columnMajor ? (/** @type {number} */ r, /** @type {number} */ c) => transform[c * 4 + r] : (/** @type {number} */ r, /** @type {number} */ c) => transform[r * 4 + c];
  const R = [
    [at(0, 0), at(0, 1), at(0, 2)],
    [at(1, 0), at(1, 1), at(1, 2)],
    [at(2, 0), at(2, 1), at(2, 2)],
  ];
  const e = eulerFromRotationMatrix(R);
  const deg = (/** @type {number} */ r) => (r * 180) / Math.PI;
  return { pitch: deg(e.x), yaw: deg(e.y), roll: deg(e.z) };
}

/**
 * Orquesta el analisis de una deteccion del contrato (kind='face').
 * @param {{ blendshapes?: Array<{name:string,score:number}>, transform?: number[] }} detection
 * @returns {{ expressions?: ReturnType<typeof analyzeBlendshapes>, headPose?: ReturnType<typeof headPoseFromMatrix> } | null}
 */
export function analyzeFace(detection) {
  if (!detection) return null;
  /** @type {{ expressions?: any, headPose?: any }} */
  const out = {};
  if (detection.blendshapes) out.expressions = analyzeBlendshapes(detection.blendshapes);
  if (detection.transform) out.headPose = headPoseFromMatrix(detection.transform);
  return out;
}
