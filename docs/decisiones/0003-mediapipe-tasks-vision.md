# ADR-0003 — MediaPipe tasks-vision como motor de inferencia v1

- **Estado:** Aceptado
- **Fecha:** 2026-06-27
- **Capa:** cliente

## Contexto

Se necesita detección de cara/manos/cuerpo en tiempo real en el navegador, fácil de renderizar y rápida de poner en marcha para validar el riesgo de rendimiento.

## Decisión

Usar **`@mediapipe/tasks-vision`** (Face Landmarker con blendshapes, Hand Landmarker, Pose Landmarker), con delegado **WebGL** y fallback **WASM/SIMD**, tras una abstracción de backend de inferencia (WebGPU reservado como costura). Assets (WASM + `.task`) **self-hosted y pineados** (no CDN), por privacidad y cadena de suministro.

## Alternativas descartadas

- **YOLO (ONNX Runtime Web / TF.js)** — detección genérica de objetos extensible, pero mucho más pre/post-procesado, más lento al primer render y alto riesgo de atascarse en plomería antes de probar la tesis. MediaPipe ya cubre cara+manos+cuerpo en un paquete. (Costura: un segundo detector entra detrás de la interfaz `Detector` cuando un caso real lo exija.)

## Consecuencias y trade-offs

- Camino más rápido a un demo funcionando y a medir FPS en hardware real (build step 2).
- Se adopta el ciclo de vida de modelos de Google; sin detección de objetos en v1.
- La abstracción de backend mantiene WebGPU como cambio futuro sin churn.
