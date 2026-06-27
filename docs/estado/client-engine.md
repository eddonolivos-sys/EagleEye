---
modulo: client-engine
capa: cliente
estado: en-progreso
interfaz: createCamera, buildVideoConstraints, assertGetUserMedia, createResultBus, createStats, createThrottle, createRenderer, createHud, faceResultToDetectionPayload, inference.worker
dependencias: protocol-contract, @mediapipe/tasks-vision, selfsigned (dev)
archivos_clave: apps/client/public/main.js, apps/client/public/lib/, apps/client/scripts/serve.js, apps/client/scripts/cert.js
verificado_por: apps/client/test/ (19 tests; mapping validado contra el contrato), node --check, curl del dev server (http y https con SAN de LAN, headers COOP/COEP)
---

# client-engine

Motor de inferencia en el navegador. **Slice vertical (build step 2) implementado:** cámara (`getUserMedia`) → `ImageBitmap` transferible (rVFC) → **Web Worker con MediaPipe Face Landmarker** (GPU/WebGL con fallback a CPU/WASM) → `ResultBus` → overlay en canvas + HUD de FPS/latencia. Emite el payload del **contrato** (mapeo `face → DetectionResult` validado contra el esquema) coalescado a 15 Hz; el backend aún no existe, así que solo se cuenta lo "enviable".

**Verificado:** lógica pura (stats, throttle, mapping, bus) con tests; mapeo validado contra el JSON Schema real; sintaxis de todo el JS de navegador; el dev server sirve app + assets con cabeceras COOP/COEP. **Pendiente:** medición de FPS reales en hardware con cámara (es el objetivo del slice: retirar el riesgo de rendimiento). Self-hosting de modelos vía `pnpm --filter @eagleeye/client run vendor` (ADR-0003).

Soporta **cámara frontal/trasera** (`facingMode`) y **prueba en móvil por HTTPS** con certificado autofirmado (`dev:https`), por el requisito de contexto seguro de `getUserMedia` ([ADR-0009](../decisiones/0009-dev-https-movil-contexto-seguro.md)). Si falta la API, `assertGetUserMedia` lanza un error accionable.
