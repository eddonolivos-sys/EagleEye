// Orquestador del slice vertical del cliente.
// cámara -> (rVFC) ImageBitmap transferible -> Worker[MediaPipe] -> ResultBus ->
//   { Renderer (overlay), Stats/HUD, NetworkEmitter (coalesce 15Hz, sin backend aún) }
//
// Tres relojes desacoplados: inferencia (single-in-flight, drop-while-busy),
// render (al recibir resultado) y emisión de red (coalescada a 15 Hz).

import { createCamera } from './lib/camera.js';
import { createResultBus } from './lib/resultBus.js';
import { createStats } from './lib/stats.js';
import { createThrottle } from './lib/throttle.js';
import { createRenderer } from './lib/renderer.js';
import { createHud } from './lib/hud.js';
import { faceResultToDetectionPayload } from './lib/mapping.js';

const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));
const video = /** @type {HTMLVideoElement} */ ($('video'));
const canvas = /** @type {HTMLCanvasElement} */ ($('overlay'));

const hud = createHud({
  fps: $('fps'), frameMs: $('frameMs'), latency: $('latency'), backend: $('backend'),
  faces: $('faces'), sent: $('sent'), coi: $('coi'), status: $('status'),
});
const camera = createCamera(video);
const bus = createResultBus();
const stats = createStats({ window: 60 });
const emitThrottle = createThrottle(15);
const renderer = createRenderer(canvas);

/** @type {Worker | null} */ let worker = null;
let busy = false;
let frameId = 0;
let lastResultAt = 0;
let backend = '—';
let sentCount = 0;
let coi = self.crossOriginIsolated === true;
let source = { width: 640, height: 480, mirrored: true };

// --- Consumidor del bus: render + stats + emisión coalescada ---
bus.subscribe(({ result, inferMs }) => {
  renderer.drawFaces(result.faceLandmarks, { mirror: source.mirrored });

  const now = performance.now();
  if (lastResultAt) stats.record(now - lastResultAt, inferMs);
  lastResultAt = now;

  // Construye el payload del CONTRATO y lo coalesce a 15 Hz. El backend aún no
  // existe (build step 4+): aquí solo contamos lo que "se enviaría".
  const payload = faceResultToDetectionPayload(result, {
    sourceWidth: source.width, sourceHeight: source.height, mirrored: source.mirrored,
    detector: 'mediapipe.face_landmarker', modelVersion: '0.10.35',
  });
  if (emitThrottle.push(payload, now)) sentCount++;

  const g = stats.get();
  hud.update({
    fps: g.fps, frameMs: g.frameMs, latencyMs: g.latencyMs,
    backend, faces: result.faceLandmarks.length, sent: sentCount, coi,
  });
});

function startWorker() {
  worker = new Worker(new URL('./lib/inference.worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => {
    const m = e.data;
    if (m.type === 'ready') {
      backend = m.backend; coi = m.coi;
      hud.status('modelo listo en ' + backend + ' — detectando…');
      loop();
    } else if (m.type === 'result') {
      busy = false; backend = m.backend;
      bus.publish({ result: m.result, inferMs: m.inferMs });
    } else if (m.type === 'error') {
      busy = false;
      hud.status('error en worker: ' + m.error);
      console.error('[worker]', m.error);
    }
  };
  worker.postMessage({ type: 'init' });
}

// Captura por frame de video; single-in-flight (drop-while-busy = backpressure).
const supportsRVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
function loop() {
  const tick = async () => {
    if (!busy && worker && video.readyState >= 2) {
      busy = true;
      try {
        const bitmap = await createImageBitmap(video);
        worker.postMessage({ type: 'frame', bitmap, ts: performance.now(), frameId: ++frameId }, [bitmap]);
      } catch (err) {
        busy = false;
      }
    }
    if (supportsRVFC) video.requestVideoFrameCallback(tick);
    else requestAnimationFrame(tick);
  };
  if (supportsRVFC) video.requestVideoFrameCallback(tick);
  else requestAnimationFrame(tick);
}

async function populateDevices() {
  const sel = /** @type {HTMLSelectElement} */ ($('device'));
  try {
    const devices = await camera.listDevices();
    const current = sel.value;
    sel.innerHTML = '';
    devices.forEach((d, i) => {
      const o = document.createElement('option');
      o.value = d.deviceId;
      o.textContent = d.label || 'cámara ' + (i + 1);
      sel.appendChild(o);
    });
    if (current) sel.value = current;
  } catch { /* labels vacíos hasta conceder permiso */ }
}

$('start').addEventListener('click', async () => {
  try {
    hud.status('pidiendo permiso de cámara…');
    const sel = /** @type {HTMLSelectElement} */ ($('device'));
    const info = await camera.start({ deviceId: sel.value || undefined, width: 640, height: 480 });
    source = { width: info.width, height: info.height, mirrored: true };
    renderer.resize(info.width, info.height);
    await populateDevices(); // ahora con etiquetas reales
    hud.status('cámara ' + info.width + '×' + info.height + ' — cargando modelo…');
    if (!worker) startWorker();
    else loop();
  } catch (err) {
    hud.status('error de cámara: ' + (err && err.message ? err.message : err));
    console.error(err);
  }
});

// Estado inicial
hud.status('listo — pulsa «Iniciar cámara»');
hud.update({ fps: 0, frameMs: 0, latencyMs: 0, backend: '—', faces: 0, sent: 0, coi });
populateDevices();
