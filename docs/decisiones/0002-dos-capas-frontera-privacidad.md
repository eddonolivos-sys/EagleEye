# ADR-0002 — Arquitectura de dos capas y frontera de privacidad

- **Estado:** Aceptado
- **Fecha:** 2026-06-27
- **Capa:** cliente / backend / seguridad

## Contexto

La propuesta original mezclaba "100 % local, nada sale" con "múltiples clientes vía WebSocket", lo cual es contradictorio. A la vez se quiere persistir datos, alimentar dashboards y retransmitir eventos.

## Decisión

Dos capas separadas por una **frontera dura** que también es la **frontera de privacidad**:

- **Tier 1 (cliente):** captura + inferencia 100 % local. **Los píxeles nunca salen del dispositivo.**
- **Tier 2 (backend):** recibe **solo datos derivados** (landmarks/eventos) por WSS autenticado; valida, persiste, proyecta a dashboards y retransmite.

Enunciado honesto: *el video crudo nunca abandona el dispositivo; los datos derivados que decidas transmitir viajan por un canal autenticado y cifrado.*

## Alternativas descartadas

- **Offload de inferencia al servidor** — sacaría los frames del dispositivo, rompiendo la privacidad y exigiendo GPUs.
- **100 % local sin servidor** — no permite persistencia, dashboards ni multi-cliente, que sí se quieren.

## Consecuencias y trade-offs

- La promesa de privacidad es precisa y defendible.
- Los datos derivados **siguen siendo biométricos** (ver [ADR-0004](0004-wss-auth-cliente-publico-dpop.md) y la sección 5 de la spec): se tratan como GDPR Art. 9.
