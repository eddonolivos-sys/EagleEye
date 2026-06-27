# ADR-0001 — Cliente en vanilla JS, backend en Node + TypeScript

- **Estado:** Aceptado
- **Fecha:** 2026-06-27
- **Capa:** cliente / backend

## Contexto

El sistema debe ser comprensible (objetivo explícito: entender cada parte) y, a la vez, un cimiento mantenible que escale. El autor viene de JavaScript y desarrolla/despliega en un mini PC modesto.

## Decisión

- **Cliente:** vanilla JS + typedefs JSDoc verificados con `tsc --checkJs`. Sin framework: cero "magia", máxima comprensión; los tipos se recuperan vía JSDoc y se verifican por máquina.
- **Backend:** Node.js + TypeScript, **un solo proceso**.

## Alternativas descartadas

- **TypeScript en el cliente** — más fricción de build; JSDoc + `checkJs` da el 90 % del chequeo sin transpilar.
- **Elixir/Phoenix o Go en el backend** — capacidad de fan-out superior, pero cambio de paradigma/curva de aprendizaje innecesarios a escala 1–20 clientes. El contrato es agnóstico de lenguaje (ver [ADR-0005](0005-postgres-outbox-un-proceso.md)), así que reimplementar el relay en Go/Elixir más tarde no toca el cliente.

## Consecuencias y trade-offs

- Un solo lenguaje mental cliente↔servidor; el contrato JSON Schema genera validadores para ambos.
- Node tiene el menor throughput sostenido de los tres candidatos, pero sobra para el horizonte cercano. Si se escala horizontalmente, esta decisión se reabre (costura).
