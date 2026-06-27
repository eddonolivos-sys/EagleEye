// HUD: vuelca metricas de rendimiento al DOM. Hace MEDIBLE el limite
// "el rendimiento depende del hardware".

/**
 * @param {Record<'fps'|'frameMs'|'latency'|'backend'|'faces'|'sent'|'coi'|'status', HTMLElement>} els
 */
export function createHud(els) {
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
    /** @param {string} text */
    status(text) {
      els.status.textContent = text;
    },
  };
}
