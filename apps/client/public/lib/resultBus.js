// Bus de resultados interno (pub/sub) del cliente. Pura.
// Desacopla la inferencia de sus consumidores (render, HUD, emisor de red),
// como describe la arquitectura del Tier 1.

/**
 * @param {{ onError?: (e: unknown) => void }} [opts]
 */
export function createResultBus({ onError = (e) => console.error('ResultBus subscriber error:', e) } = {}) {
  /** @type {Set<(msg: any) => void>} */
  const subs = new Set();

  return {
    /**
     * @param {(msg: any) => void} fn
     * @returns {() => void} cancelar suscripcion
     */
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    /** @param {any} msg */
    publish(msg) {
      for (const fn of subs) {
        try {
          fn(msg);
        } catch (e) {
          onError(e);
        }
      }
    },
  };
}
