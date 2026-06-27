// Worker de inferencia: carga MediaPipe FaceLandmarker y corre detectForVideo
// fuera del hilo de UI. Recibe ImageBitmaps transferibles y devuelve un resultado
// plano (clonable). Intenta GPU (WebGL) y cae a CPU (WASM) si falla.

import { FilesetResolver, FaceLandmarker } from '/vendor/tasks-vision/vision_bundle.mjs';

/** @type {any} */
let landmarker = null;
let backend = 'unknown';
let lastTs = 0;

async function init() {
  const fileset = await FilesetResolver.forVisionTasks('/vendor/tasks-vision/wasm');
  const common = {
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
  };
  const model = '/vendor/models/face_landmarker.task';
  try {
    landmarker = await FaceLandmarker.createFromOptions(fileset, {
      ...common,
      baseOptions: { modelAssetPath: model, delegate: 'GPU' },
    });
    backend = 'GPU (WebGL)';
  } catch {
    landmarker = await FaceLandmarker.createFromOptions(fileset, {
      ...common,
      baseOptions: { modelAssetPath: model, delegate: 'CPU' },
    });
    backend = 'CPU (WASM)';
  }
  postMessage({ type: 'ready', backend, coi: self.crossOriginIsolated === true });
}

/** Aplana el FaceLandmarkerResult a objetos planos (transferibles por clon). */
function extract(/** @type {any} */ result) {
  return {
    faceLandmarks: (result.faceLandmarks || []).map((/** @type {any[]} */ lm) =>
      lm.map((p) => ({ x: p.x, y: p.y, z: p.z })),
    ),
    faceBlendshapes: (result.faceBlendshapes || []).map((/** @type {any} */ b) => ({
      categories: (b.categories || []).map((/** @type {any} */ c) => ({
        categoryName: c.categoryName,
        score: c.score,
      })),
    })),
    facialTransformationMatrixes: (result.facialTransformationMatrixes || []).map((/** @type {any} */ m) => ({
      data: Array.from(m.data || []),
    })),
  };
}

self.onmessage = async (e) => {
  const msg = e.data;

  if (msg.type === 'init') {
    try {
      await init();
    } catch (err) {
      postMessage({ type: 'error', error: String((err && err.message) || err) });
    }
    return;
  }

  if (msg.type === 'frame') {
    const bitmap = msg.bitmap;
    if (!landmarker) {
      bitmap.close && bitmap.close();
      return;
    }
    let ts = Math.round(msg.ts);
    if (ts <= lastTs) ts = lastTs + 1; // detectForVideo exige ts monotonico
    lastTs = ts;

    const t0 = performance.now();
    let result;
    try {
      result = landmarker.detectForVideo(bitmap, ts);
    } catch (err) {
      bitmap.close && bitmap.close();
      postMessage({ type: 'error', error: String((err && err.message) || err) });
      return;
    }
    const inferMs = performance.now() - t0;
    const out = extract(result);
    bitmap.close && bitmap.close();
    postMessage({ type: 'result', frameId: msg.frameId, backend, inferMs, result: out });
  }
};
