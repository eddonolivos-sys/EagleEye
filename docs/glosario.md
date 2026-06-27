# Glosario

Términos del dominio, para un lector inteligente pero no experto.

- **Landmark** — punto de referencia que el modelo localiza (p. ej. la punta de la nariz, un nudillo). EagleEye los expresa **normalizados `[0,1]`** respecto al frame fuente, así son independientes de la resolución.
- **Inferencia** — ejecutar el modelo de ML sobre un frame para obtener los landmarks. Aquí ocurre **en el navegador del cliente**, nunca en el servidor.
- **MediaPipe (tasks-vision)** — la librería de Google que provee los modelos de cara/manos/cuerpo optimizados para navegador.
- **Blendshapes** — coeficientes `[0,1]` que describen expresiones faciales (p. ej. "ceja izquierda arriba"); útiles para avatares/RA.
- **WebGL / WASM / WebGPU** — "motores" sobre los que corre la inferencia. WebGL usa la GPU (rápido); WASM corre en CPU (fallback, más lento); WebGPU es el futuro. Se elige el mejor disponible.
- **COOP / COEP** — cabeceras HTTP que habilitan *cross-origin isolation*, requisito para usar hilos en WASM (`SharedArrayBuffer`).
- **Contexto seguro** — requisito del navegador (HTTPS o `localhost`) para que `getUserMedia` (la cámara) funcione.
- **Frame budget / throttling** — limitar cuántos frames por segundo se procesan/envían para no saturar CPU, GPU ni la red.
- **FPS vs latencia** — FPS = frames por segundo (fluidez); latencia = retardo entre capturar y ver el resultado. Se optimizan por separado.
- **Coalescing** — fusionar varios frames en "el último estado" antes de enviar, para no inundar la red (el cliente emite a ~15 Hz, no a la tasa de inferencia).
- **Backpressure** — mecanismo para frenar al productor cuando el consumidor no da abasto (se descartan frames obsoletos en vez de encolarlos).
- **Datos derivados** — los landmarks/eventos resultantes de la inferencia. Es lo único que cruza la red; **no son píxeles**, pero sí **datos biométricos derivados** (ver privacidad).
- **DPoP (RFC 9449)** — token "atado al remitente": un token robado no sirve sin la clave privada del cliente. Cierra el robo/replay de tokens en clientes de navegador.
- **Cliente público** — un cliente (como un navegador) que **no puede** guardar un secreto. Por eso la auth usa una sesión de primera parte + DPoP, no un API key embebido.
- **Tenant / room (subject)** — espacio aislado de un cliente/sesión: `tenant.<id>.room.<id>`. Derivado del token en el servidor; nunca confiado del mensaje.
- **Outbox** — patrón donde persistir el dato y registrar "hay que publicarlo" ocurren en **una sola transacción**, evitando perder o duplicar eventos.
- **CQRS** — separar la ruta de **escritura** (ingest) de la de **lectura** (dashboards), cada una optimizada por su lado.
- **Trust-tag / plausibilidad** — el servidor marca cada dato con un nivel de confianza tras chequeos baratos (sin "teletransporte" de articulaciones), porque "válido según el esquema" ≠ "honesto".
- **Crypto-shred** — borrar la clave de cifrado de un sujeto para destruir, de golpe, **todas** sus copias (incluidas proyecciones/rollups). Soporta el derecho al borrado.
- **GDPR Art. 9 / BIPA** — marcos legales sobre datos biométricos/categoría especial. Los landmarks faciales almacenados se tratan como tales por defecto.
- **ADR** — *Architecture Decision Record*: nota fechada y solo-añadir que registra una decisión, sus alternativas y sus trade-offs. Ver [`docs/decisiones/`](decisiones/).
