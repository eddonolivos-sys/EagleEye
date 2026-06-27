# ADR-0006 — Documentación: Markdown fuente única → HTML generado

- **Estado:** Aceptado
- **Fecha:** 2026-06-27
- **Capa:** docs

## Contexto

Se quiere documentación exhaustiva y un **sitio HTML interactivo** que sirva de resumen navegable, con **estado por módulo**, consumible también por **otros agentes** para decisiones de integración. El mayor riesgo de cualquier doc exhaustiva es la **deriva**: que diga "hecho" cuando el código dice otra cosa.

## Decisión

- **El Markdown es la única fuente de verdad.** Cada módulo tiene un `.md` en `docs/estado/` con **front-matter estructurado** (estado, capa, interfaz, dependencias, archivos/símbolos clave, verificado_por).
- **El sitio `docs/index.html` se *genera*** desde ese Markdown (`tools/docs-gen`), nunca se escribe a mano → no puede desincronizarse.
- **ADRs** fechados, solo-añadir, organizados por capa.
- **CI** verifica enlaces y que los símbolos/archivos referenciados existan; los tests/typecheck son la verdad del "qué está hecho", no la prosa.

## Alternativas descartadas

- **Sitio HTML escrito a mano** — segundo producto a mantener; el artefacto que más deriva.
- **Solo Markdown sin sitio** — pierde el resumen interactivo que se pidió explícitamente.

## Consecuencias y trade-offs

- Se obtiene el sitio interactivo deseado con deriva mínima.
- Coste: un pequeño generador (`tools/docs-gen`) que mantener; a cambio, una sola fuente de verdad.
