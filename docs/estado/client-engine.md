---
modulo: client-engine
capa: cliente
estado: pendiente
interfaz: (por definir) CameraManager, Detector, ResultBus, Renderer, PerfHUD
dependencias: protocol-contract, @mediapipe/tasks-vision
archivos_clave: apps/client/
verificado_por: (pendiente)
---

# client-engine

Motor de inferencia en el navegador (build step 2). Captura cámara, corre MediaPipe en un Web Worker, publica `DetectionResult` normalizados en un `ResultBus`, los pinta en canvas y mide FPS/latencia. Emite **solo JSON derivado** según el contrato. **Aún no implementado** — el slice vertical es el próximo objetivo y retira el riesgo de rendimiento en hardware real.
