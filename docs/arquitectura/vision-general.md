# Visión general de la arquitectura

EagleEye es un **motor de dos capas** separadas por una **frontera dura** que es, a la vez, la frontera de privacidad.

## Tier 1 — Cliente (navegador)

Motor de inferencia local, reutilizable y agnóstico de dominio:

1. **Captura** — `getUserMedia` + `requestVideoFrameCallback` en el hilo principal.
2. **Inferencia** — el frame viaja como `ImageBitmap` transferible (zero-copy) a un **Web Worker** que corre **MediaPipe tasks-vision** (cara/manos/cuerpo) tras una abstracción de backend (WebGL → fallback WASM).
3. **Distribución interna** — los resultados normalizados fluyen por un **`ResultBus`** (pub/sub) a:
   - **Renderer** — overlay de landmarks en `<canvas>` / OffscreenCanvas.
   - **PerfHUD** — FPS/latencia, delegado activo (hace medible el límite "depende del hardware").
   - **NetworkEmitter** — coalescing a ~15 Hz (último-por-modalidad), emite **solo JSON derivado**.

**Tres relojes desacoplados:** inferencia (limitada por el modelo, single-in-flight), render (rAF) y red (cadencia negociada). **Los píxeles nunca salen del dispositivo.**

## Frontera de datos

Cruza únicamente JSON derivado: landmarks normalizados `[0,1]`, blendshapes, transforms, eventos + procedencia y claims de consentimiento. Transporte: **WSS + token DPoP**. Ver el [contrato](../../packages/protocol/) y [ADR-0002](../decisiones/0002-dos-capas-frontera-privacidad.md).

## Tier 2 — Hub de integraciones + Relay (servidor)

Un proceso **Node + TypeScript** (en el mini PC Debian), stateless en su gateway:

1. **Edge gateway** — termina WSS, autentica (cliente público → DPoP), valida esquema, aplica presupuestos agregados por tenant y aísla por subject `tenant.<tid>.room.<rid>`.
2. **Ingest** — consent autoritativo → piso de plausibilidad → trust-tag → **persistir + outbox en una transacción**.
3. **Pub/sub en memoria** — alimenta:
   - **Proyectores CQRS** → read models / rollups → **dashboards**.
   - **Relay fan-out** → otros clientes suscritos al subject autorizado.
4. **Control-plane** — tenants, consent versionado, tokens, claves.

A escala 1–20 clientes corre en un proceso sin broker externo. NATS/Redis y clúster son **costuras documentadas**, no v1.

## Mapa de módulos

Ver [`docs/estado/`](../estado/) para el estado verificado de cada módulo y la sección 6 de la [spec maestra](../superpowers/specs/2026-06-27-eagleeye-plataforma-design.md) para la descomposición completa (10 sub-proyectos).
