// CameraManager: acceso a camara via getUserMedia, listado de dispositivos y
// control basico de resolucion. Glue de navegador (verificado al ejecutar).

/**
 * @param {HTMLVideoElement} video
 */
export function createCamera(video) {
  /** @type {MediaStream | null} */
  let stream = null;

  return {
    async listDevices() {
      const all = await navigator.mediaDevices.enumerateDevices();
      return all.filter((d) => d.kind === 'videoinput');
    },

    /**
     * @param {{ deviceId?: string, width?: number, height?: number }} [opts]
     * @returns {Promise<{ width: number, height: number, label: string }>}
     */
    async start({ deviceId, width = 640, height = 480 } = {}) {
      this.stop();
      const video_ = {
        width: { ideal: width },
        height: { ideal: height },
        ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' }),
      };
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: video_ });
      video.srcObject = stream;
      await video.play();
      const track = stream.getVideoTracks()[0];
      const s = track.getSettings();
      return {
        width: s.width ?? video.videoWidth,
        height: s.height ?? video.videoHeight,
        label: track.label || 'cámara',
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
