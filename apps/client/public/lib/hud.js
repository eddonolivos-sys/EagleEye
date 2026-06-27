// HUD: vuelca metricas de rendimiento y de analisis al DOM. Hace MEDIBLE el
// limite "el rendimiento depende del hardware" y muestra las senales derivadas.

/**
 * @param {Record<string, HTMLElement>} els
 */
export function createHud(els) {
  const pct = (/** @type {number} */ n) => (n * 100).toFixed(0) + '%';
  return {
    /**
     * @param {{ fps:number, frameMs:number, latencyMs:number, backend:string, faces:number, sent:number, coi:boolean }} m
     */
    update(m) {
      els.fps.textContent = m.fps.toFixed(0);
      els.frameMs.textContent = m.frameMs.toFixed(1);
      els.latency.textContent = m.latencyMs.toFixed(0);
      els.backend.textContent = m.backend;
      els.faces.textContent = String(m.faces);
      els.sent.textContent = String(m.sent);
      els.coi.textContent = m.coi ? 'sí' : 'no';
    },
    /**
     * @param {{ headPose?: {yaw:number,pitch:number,roll:number}|null, expressions?: {smile:number,mouthOpen:number,blinkLeft:number,blinkRight:number,browRaise:number} } | null} a
     */
    updateAnalysis(a) {
      if (!a) return;
      if (a.headPose) {
        els.yaw.textContent = a.headPose.yaw.toFixed(0);
        els.pitch.textContent = a.headPose.pitch.toFixed(0);
        els.roll.textContent = a.headPose.roll.toFixed(0);
      }
      if (a.expressions) {
        els.smile.textContent = pct(a.expressions.smile);
        els.mouthOpen.textContent = pct(a.expressions.mouthOpen);
        els.brow.textContent = pct(a.expressions.browRaise);
        els.blinkL.textContent = pct(a.expressions.blinkLeft);
        els.blinkR.textContent = pct(a.expressions.blinkRight);
      }
    },
    /** @param {string} text */
    status(text) {
      els.status.textContent = text;
    },
  };
}
