// Mapea el resultado de MediaPipe FaceLandmarker -> payload de deteccion del
// CONTRATO (sv=1). Esta es la frontera que alimenta el protocolo: pura y testeada
// contra el esquema real. Las coordenadas ya vienen normalizadas [0,1]; se
// recortan por seguridad (un landmark puede caer ligeramente fuera del frame).

/** @param {number} n */
const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * @param {any} result  FaceLandmarkerResult de @mediapipe/tasks-vision
 * @param {{ sourceWidth:number, sourceHeight:number, mirrored:boolean, detector:string, modelVersion?:string }} meta
 * @returns {import('@eagleeye/protocol/types').DetectionPayload}
 */
export function faceResultToDetectionPayload(result, meta) {
  const { sourceWidth, sourceHeight, mirrored, detector, modelVersion } = meta;
  const faces = result?.faceLandmarks ?? [];
  const blends = result?.faceBlendshapes ?? [];
  const transforms = result?.facialTransformationMatrixes ?? [];

  const detections = faces.map((/** @type {any[]} */ landmarks, /** @type {number} */ i) => {
    /** @type {Record<string, any>} */
    const det = {
      kind: 'face',
      detector,
      instanceId: i,
      landmarks: landmarks.map((p) => ({ x: clamp01(p.x), y: clamp01(p.y), z: p.z })),
      mirrored: Boolean(mirrored),
      sourceWidth,
      sourceHeight,
    };
    if (modelVersion) det.modelVersion = modelVersion;

    const cats = blends[i]?.categories;
    if (cats && cats.length) {
      det.blendshapes = cats.map((/** @type {any} */ c) => ({ name: c.categoryName, score: c.score }));
    }
    const tm = transforms[i]?.data;
    if (tm && tm.length === 16) det.transform = Array.from(tm);

    return det;
  });

  return { kf: true, detections };
}
