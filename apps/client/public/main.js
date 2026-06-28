// Orquestador del slice vertical del cliente.
// cámara -> (rVFC) ImageBitmap transferible -> Worker[MediaPipe] -> ResultBus ->
//   { Renderer (overlay), Stats/HUD, NetworkEmitter (coalesce 15Hz, sin backend aún) }
//
// Tres relojes desacoplados: inferencia (single-in-flight, drop-while-busy),
// render (al recibir resultado) y emisión de red (coalescada a 15 Hz).

import { createCamera, describeGetUserMediaError, shouldMirror } from './lib/camera.js';
import { createResultBus } from './lib/resultBus.js';
import { createStats } from './lib/stats.js';
import { createThrottle } from './lib/throttle.js';
import { createRenderer } from './lib/renderer.js';
import { createHud } from './lib/hud.js';
import { faceResultToDetectionPayload } from './lib/mapping.js';
import { analyzeFace } from './lib/analysis.js';

const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));
const video = /** @type {HTMLVideoElement} */ ($('video'));
const canvas = /** @type {HTMLCanvasElement} */ ($('overlay'));
const facingSel = /** @type {HTMLSelectElement} */ ($('facing'));
const deviceSel = /** @type {HTMLSelectElement} */ ($('device'));
const camSwitch = $('camswitch'); // contenedor del selector opcional (oculto si hay 1 cámara)

const hud = createHud({
  fps: $('fps'), frameMs: $('frameMs'), latency: $('latency'), backend: $('backend'),
  faces: $('faces'), sent: $('sent'), coi: $('coi'), status: $('status'),
  yaw: $('yaw'), pitch: $('pitch'), roll: $('roll'),
  smile: $('smile'), mouthOpen: $('mouthOpen'), brow: $('brow'), blinkL: $('blinkL'), blinkR: $('blinkR'),
});
const camera = createCamera(video);
const bus = createResultBus();
const stats = createStats({ window: 60 });
const emitThrottle = createThrottle(15);
const renderer = createRenderer(canvas);

/** @type {Worker | null} */ let worker = null;
let busy = false;
let started = false;
let looping = false;
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

  const payload = faceResultToDetectionPayload(result, {
    sourceWidth: source.width, sourceHeight: source.height, mirrored: source.mirrored,
    detector: 'mediapipe.face_landmarker', modelVersion: '0.10.35',
  });
  if (emitThrottle.push(payload, now)) sentCount++;

  // Analisis (expresiones + pose de cabeza) sobre la deteccion del contrato.
  const det = payload.detections[0];
  if (det) hud.updateAnalysis(analyzeFace(det));

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

// Captura por frame; single-in-flight (drop-while-busy = backpressure).
const supportsRVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
function loop() {
  if (looping) return; // un solo bucle aunque reiniciemos la cámara
  looping = true;
  const tick = async () => {
    if (!busy && worker && video.readyState >= 2) {
      busy = true;
      try {
        const bitmap = await createImageBitmap(video);
        worker.postMessage({ type: 'frame', bitmap, ts: performance.now(), frameId: ++frameId }, [bitmap]);
      } catch {
        busy = false;
      }
    }
    if (supportsRVFC) video.requestVideoFrameCallback(tick);
    else requestAnimationFrame(tick);
  };
  if (supportsRVFC) video.requestVideoFrameCallback(tick);
  else requestAnimationFrame(tick);
}

// Tras conceder permiso, muestra el selector SOLO si hay mas de una camara; si no,
// lo deja oculto (flujo de un toque, ADR-0012).
async function updateCameraSwitch() {
  try {
    const devices = await camera.listDevices();
    if (devices.length <= 1) {
      camSwitch.hidden = true;
      return;
    }
    const cur = deviceSel.value;
    deviceSel.innerHTML = '';
    const auto = document.createElement('option');
    auto.value = '';
    auto.textContent = 'Cámara automática';
    deviceSel.appendChild(auto);
    devices.forEach((d, i) => {
      const o = document.createElement('option');
      o.value = d.deviceId;
      o.textContent = d.label || 'cámara ' + (i + 1);
      deviceSel.appendChild(o);
    });
    deviceSel.value = [...deviceSel.options].some((o) => o.value === cur) ? cur : '';
    camSwitch.hidden = false;
  } catch {
    camSwitch.hidden = true;
  }
}

// Por defecto pide la camara PREDETERMINADA (sin opts): la peticion mas simple
// posible. Solo pasa opts cuando el usuario usa el selector opcional (ADR-0012).
/** @param {{ deviceId?: string, facingMode?: 'user'|'environment' }} [opts] */
async function startCamera(opts = {}) {
  try {
    hud.status('pidiendo permiso de cámara…');
    const info = await camera.start(opts);
    started = true;
    const mirrored = shouldMirror(info.facingMode); // espejo derivado del track (ADR-0012)
    source = { width: info.width, height: info.height, mirrored };
    video.style.transform = mirrored ? 'scaleX(-1)' : 'none';
    renderer.resize(info.width, info.height);
    await updateCameraSwitch(); // revela el selector solo si hay >1 cámara
    hud.status('cámara ' + info.width + '×' + info.height + ' — cargando modelo…');
    if (!worker) startWorker();
    else loop();
  } catch (err) {
    hud.status('error de cámara: ' + describeGetUserMediaError(/** @type {any} */ (err)));
    console.error(err);
  }
}

$('start').addEventListener('click', () => startCamera());
// El selector opcional (visible solo con >1 cámara) reinicia el stream con la elección.
facingSel.addEventListener('change', () => {
  if (started) startCamera({ facingMode: /** @type {'user'|'environment'} */ (facingSel.value) });
});
deviceSel.addEventListener('change', () => {
  if (started) startCamera(deviceSel.value ? { deviceId: deviceSel.value } : {});
});

// Estado inicial
hud.status('listo — pulsa «Iniciar cámara»');
hud.update({ fps: 0, frameMs: 0, latencyMs: 0, backend: '—', faces: 0, sent: 0, coi });
