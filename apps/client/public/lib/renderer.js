// Renderer: dibuja los landmarks sobre un canvas que se superpone al video.
// Maneja el espejo (selfie) en las coordenadas, no en el canvas, para que el
// canvas y el video (espejado por CSS) queden alineados.

/**
 * @param {HTMLCanvasElement} canvas
 */
export function createRenderer(canvas) {
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));

  return {
    /** @param {number} w @param {number} h */
    resize(w, h) {
      canvas.width = w;
      canvas.height = h;
    },

    /**
     * @param {Array<Array<{x:number,y:number,z:number}>>} faces
     * @param {{ mirror?: boolean }} [opts]
     */
    drawFaces(faces, { mirror = true } = {}) {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#39ff14';
      for (const lm of faces) {
        for (const p of lm) {
          const x = (mirror ? 1 - p.x : p.x) * w;
          const y = p.y * h;
          ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
        }
      }
    },
  };
}
