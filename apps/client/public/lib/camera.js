// CameraManager: acceso a camara via getUserMedia, listado de dispositivos y
// control de resolucion + camara frontal/trasera (facingMode). Glue de navegador.
//
// La logica de constraints y la comprobacion de disponibilidad son puras y estan
// testeadas (test/camera-constraints.test.js).

/**
 * Construye el objeto `video` de constraints.
 * - Con deviceId explicito: usa ese dispositivo (precede a facingMode).
 * - Sin deviceId: usa facingMode ('user' = frontal, 'environment' = trasera) como
 *   IDEAL (no exact) para no fallar en equipos con una sola camara.
 * @param {{ deviceId?: string, facingMode?: 'user'|'environment', width?: number, height?: number }} [opts]
 */
export function buildVideoConstraints({ deviceId, facingMode = 'user', width = 640, height = 480 } = {}) {
  const base = { width: { ideal: width }, height: { ideal: height } };
  if (deviceId) return { ...base, deviceId: { exact: deviceId } };
  return { ...base, facingMode: { ideal: facingMode } };
}

/**
 * Verifica que la API de captura este disponible y, si no, lanza un error
 * ACCIONABLE. La causa habitual de que falte es un contexto no seguro (en movil,
 * abrir por http://IP en vez de HTTPS/localhost).
 * @param {{ mediaDevices?: { getUserMedia?: unknown } }} [nav]
 */
export function assertGetUserMedia(nav = globalThis.navigator) {
  const ok = nav && nav.mediaDevices && typeof nav.mediaDevices.getUserMedia === 'function';
  if (ok) return;
  const insecure = typeof globalThis.isSecureContext === 'boolean' && globalThis.isSecureContext === false;
  throw new Error(
    'La camara no esta disponible (navigator.mediaDevices indefinido). ' +
      'Causa habitual: contexto NO seguro. En movil abre la app por HTTPS o localhost, ' +
      'nunca por http://IP. Ejecuta `pnpm --filter @eagleeye/client run dev:https` y abre la URL https:// que imprime.' +
      (insecure ? ' [isSecureContext=false]' : ''),
  );
}

/**
 * @param {HTMLVideoElement} video
 */
export function createCamera(video) {
  /** @type {MediaStream | null} */
  let stream = null;

  return {
    async listDevices() {
      if (!globalThis.navigator?.mediaDevices?.enumerateDevices) return [];
      const all = await navigator.mediaDevices.enumerateDevices();
      return all.filter((d) => d.kind === 'videoinput');
    },

    /**
     * @param {{ deviceId?: string, facingMode?: 'user'|'environment', width?: number, height?: number }} [opts]
     * @returns {Promise<{ width: number, height: number, label: string }>}
     */
    async start(opts = {}) {
      assertGetUserMedia();
      this.stop();
      const constraints = buildVideoConstraints(opts);
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: constraints });
      video.srcObject = stream;
      await video.play();
      const track = stream.getVideoTracks()[0];
      const s = track.getSettings();
      return {
        width: s.width ?? video.videoWidth,
        height: s.height ?? video.videoHeight,
        label: track.label || 'camara',
      };
    },

    stop() {
      if (stream) {
        for (const t of stream.getTracks()) t.stop();
        stream = null;
      }
    },
  };
}
