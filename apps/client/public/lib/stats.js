// Estadisticas de rendimiento: media movil de tiempo de frame y latencia -> FPS.
// Pura (sin DOM): hace MEDIBLE el limite "el rendimiento depende del hardware".

/**
 * @param {{ window?: number }} [opts]
 */
export function createStats({ window = 30 } = {}) {
  /** @type {number[]} */ const frames = [];
  /** @type {number[]} */ const lats = [];

  /** @param {number[]} a */
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

  return {
    /**
     * @param {number} frameMs   ms entre frames procesados
     * @param {number} [latencyMs] ms entre captura y resultado
     */
    record(frameMs, latencyMs = 0) {
      frames.push(frameMs);
      if (frames.length > window) frames.shift();
      lats.push(latencyMs);
      if (lats.length > window) lats.shift();
    },
    get() {
      const frameMs = avg(frames);
      return { frameMs, fps: frameMs > 0 ? 1000 / frameMs : 0, latencyMs: avg(lats) };
    },
  };
}
