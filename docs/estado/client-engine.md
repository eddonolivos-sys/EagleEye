---
modulo: client-engine
capa: cliente
estado: en-progreso
interfaz: createCamera, createResultBus, createStats, createThrottle, createRenderer, createHud, faceResultToDetectionPayload, inference.worker
dependencias: protocol-contract, @mediapipe/tasks-vision
archivos_clave: apps/client/public/main.js, apps/client/public/lib/, apps/client/public/lib/inference.worker.js
verificado_por: apps/client/test/ (13 tests; mapping validado contra el contrato), node --check, curl del dev server (headers COOP/COEP + assets)
---

# client-engine

Motor de inferencia en el navegador. **Slice vertical (build step 2) implementado:** cámara (`getUserMedia`) → `ImageBitmap` transferible (rVFC) → **Web Worker con MediaPipe Face Landmarker** (GPU/WebGL con fallback a CPU/WASM) → `ResultBus` → overlay en canvas + HUD de FPS/latencia. Emite el payload del **contrato** (mapeo `face → DetectionResult` validado contra el esquema) coalescado a 15 Hz; el backend aún no existe, así que solo se cuenta lo "enviable".

**Verificado:** lógica pura (stats, throttle, mapping, bus) con tests; mapeo validado contra el JSON Schema real; sintaxis de todo el JS de navegador; el dev server sirve app + assets con cabeceras COOP/COEP. **Pendiente:** medición de FPS reales en hardware con cámara (es el objetivo del slice: retirar el riesgo de rendimiento). Self-hosting de modelos vía `pnpm --filter @eagleeye/client run vendor` (ADR-0003).
