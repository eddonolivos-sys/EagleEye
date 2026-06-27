// Coalescing "ultimo gana" a una cadencia fija (Hz). Pura.
// El cliente NO envia a la tasa de inferencia: coalesce a ~15 Hz y cuenta los
// frames descartados (campo `dropped` del contrato). Ver protocolo, seccion 4.

/**
 * @param {number} hz  emisiones por segundo deseadas
 */
export function createThrottle(hz) {
  const interval = 1000 / hz;
  let lastEmit = -Infinity;
  let dropped = 0;

  return {
    /**
     * @param {unknown} item  el item mas reciente
     * @param {number} now    marca temporal en ms (monotonica)
     * @returns {{ item: unknown, dropped: number } | null}  el item a emitir, o null si se coalesce
     */
    push(item, now) {
      if (now - lastEmit >= interval) {
        const out = { item, dropped };
        lastEmit = now;
        dropped = 0;
        return out;
      }
      dropped += 1;
      return null;
    },
  };
}
