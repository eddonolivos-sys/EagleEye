# EagleEye — Diseño de plataforma (v1)

- **Estado:** Aprobado para implementación incremental
- **Fecha:** 2026-06-27
- **Tipo:** Documento de diseño (spec maestra)
- **Origen:** Brainstorming asistido + análisis adversarial multi-experto (2 workflows: crítica de alcance/YAGNI y endurecimiento con red-team)

> Este documento es la **fuente de verdad del diseño**. Las decisiones puntuales viven, además, como ADRs fechados en [`docs/decisiones/`](../../decisiones/). El estado de cada módulo vive en el front-matter de su `.md` en [`docs/estado/`](../../estado/) y se verifica en CI; este documento **no** lleva el estado de implementación al día.

---

## 1. Qué es EagleEye

Un **motor reutilizable de visión por computadora de dos capas**, no una aplicación final. Es el cimiento compartido sobre el que se construirán tres familias de proyectos, **ninguna incluida aquí**:

1. **Movimiento / pose en el tiempo** (fitness, postura, rehabilitación, deporte).
2. **Avatares / expresión facial / RA**.
3. **Accesibilidad / control por gestos o mirada**.

El principio rector es: **núcleo pequeño y rápido + costuras (interfaces) bien definidas**. Todo lo que no sea "capturar → detectar → normalizar → publicar → (opcional) transmitir" es una costura que se implementa cuando un caso de uso real lo exige, no antes.

### Objetivo afinado

> "Ver landmarks de cara/cuerpo/manos en tiempo real en el navegador, con inferencia 100 % local; enviar **solo datos derivados** (nunca píxeles) a un backend que valida, persiste de forma segura, alimenta dashboards y retransmite eventos a otros clientes; con los **cimientos correctos e irreversibles** desde el día uno y escala incremental."

---

## 2. Alcance y límites realistas

- El rendimiento del cliente depende del hardware del dispositivo (CPU/GPU). Se hace **medible** con un HUD de FPS/latencia, no solo se documenta.
- Navegadores sin WebGPU usan el delegado WebGL; sin WebGL utilizable, se cae a WASM (CPU, más lento).
- Los **píxeles de la cámara nunca salen del dispositivo cliente**. Solo cruzan datos derivados (landmarks/eventos).
- El backend de v1 corre como **un solo proceso** y está dimensionado para **1–20 clientes simultáneos**. La alta concurrencia es una meta *futura*: los cimientos la soportan, pero no operamos clúster/broker/CDN en v1.
- Los landmarks de cara/cuerpo son **datos biométricos derivados** con implicaciones legales (GDPR Art. 9 / BIPA). Se tratan como categoría especial por defecto.

---

## 3. Arquitectura de dos capas

```
TIER 1 — CLIENTE (navegador, en dispositivos con cámara)        │ FRONTERA = privacidad
  getUserMedia ─(requestVideoFrameCallback)─► main thread        │ (cruza SOLO JSON
     │  ImageBitmap transferible (zero-copy)                     │  derivado; NUNCA
     ▼                                                           │  píxeles)
  Web Worker: MediaPipe tasks-vision                             │
     (Face 478+blendshapes · Hands 21/mano · Pose 33)            │
     backend de inferencia: WebGL → fallback WASM                │
     │  DetectionResult (normalizado, [0..1], timestamped)       │
     ▼                                                           │
  ResultBus (pub/sub interno)                                    │
     ├─► Renderer (overlay canvas / OffscreenCanvas)             │
     ├─► PerfHUD (FPS, latencia, delegado activo)                │
     └─► NetworkEmitter (coalesce ~15 Hz, latest-wins) ──────────┼──► WSS + DPoP
                                                                 │
TIER 2 — HUB DE INTEGRACIONES + RELAY (mini PC Debian, 1 proceso Node+TS)
  Edge gateway (WSS)
     auth de cliente público (sesión 1ª parte → token DPoP)
     validación de esquema · presupuestos agregados por tenant
     aislamiento de sujeto: tenant.<tid>.room.<rid>
        │
        ▼
  Ingest: consent autoritativo → piso de plausibilidad → trust-tag
          → (persistir + outbox) en UNA transacción
        │
        ▼
  Pub/sub EN MEMORIA (costura: NATS/Redis al escalar horizontal)
        ├─► Proyectores CQRS → read models + rollups → Dashboards
        └─► Relay fan-out → otros clientes (subject autorizado)
  Control-plane: tenants · consent versionado · tokens · claves (KMS)
  Transversal: observabilidad ligera (OTel) · auditoría a prueba de manipulación
  Almacén: PostgreSQL (outbox · RLS · crypto-shred por sujeto)
  Edge/TLS: Caddy (auto-HTTPS → contexto seguro para getUserMedia)
```

### La frontera de datos (= frontera de privacidad)

Cruza únicamente **JSON derivado ligero**: landmarks normalizados `[0,1]` del frame fuente, blendshapes, transforms, eventos, más procedencia (versión de modelo, delegado, versión de esquema) y metadatos de consentimiento. **Cero píxeles, jamás.** Reconciliación honesta de la promesa de privacidad: *el video crudo nunca abandona el dispositivo; los datos derivados que decidas transmitir viajan por un canal autenticado y cifrado (WSS + DPoP).*

---

## 4. El contrato del protocolo (el eje)

Es la pieza de la que **todo lo demás depende**, por eso se congela primero (build step 1).

- **Única fuente de verdad:** JSON Schema 2020-12 por cada `(tipo, versión)`. De ahí se **generan** los typedefs JSDoc del cliente *y* los validadores del servidor. CI falla ante *drift*.
- **Transporte:** WebSocket sobre TLS 1.3 (WSS), tras una abstracción `Channel` (deja la puerta a WebTransport en v2 sin cambiar el envelope). Codificación JSON en v1 (CBOR/MessagePack como costura).
- **Envelope** (inspirado en CloudEvents, congelado dentro de un major): `{ ev, type, tenant, sessionId, source, seq, ts, sv, dropped?, trace?, consent, purpose, retention, data }`.
- **Payload de detección (`sv=1`):** unión etiquetada por modalidad — `pose | hands | face` (enum abierto) — con **un solo esquema para los tres dominios**: `landmarks[{x,y,z,score?}]` normalizados, `world?`, `handedness?`, `blendshapes?`, `transform?`, `mirrored`, `sourceWidth/Height`, `kf` (keyframe vs delta).
- **Versionado:** aditivo dentro de un `sv`; cambio rompedor de payload sube `sv`; cambio estructural del envelope sube `ev`. El hub negocia el máximo soportado en el handshake.
- **Throttling/coalescing:** el cliente emite a cadencia negociada (por defecto **15 Hz**, último-por-modalidad, **nunca por frame de inferencia**), `≤64 KB`/frame, `additionalProperties:false`, arrays acotados, coords en `[0,1]`.
- **Backpressure:** tres fronteras — (a) cliente vía `bufferedAmount` (cae a keyframe-only + menor cadencia, cuenta en `dropped`); (b) ingest con token-bucket + 429/backoff; (c) envío por socket descarta frames obsoletos para consumidores lentos. El hub emite `ctrl.backpressure {level, targetHz?}`.
- **Idempotencia/orden:** clave `(tenant, client, session, seq)`; orden garantizado **por sesión**, no global; los huecos de `seq` en el stream de detección son **esperados**. El canal de control es at-least-once con dedupe.
- **Identidad de sesión:** el **servidor** acuña `sessionId` ligado a conexión+token; rechaza IDs que no acuñó. Ventana de frescura de `ts` (anti-replay).

---

## 5. Seguridad — "endurecido por componente"

El red-team forzó un replanteamiento estructural: **un navegador es un cliente *público* y "válido según el esquema" ≠ "honesto".** El servidor trata a todo cliente como potencialmente hostil.

### 5.1 Lo arquitectónicamente irreversible (entra desde el inicio)

Retrofitear esto después es la reescritura cara que queremos evitar:

- **Frontera de auth de cliente público:** el navegador autentica una **sesión de primera parte** (OIDC/cookie); un backend confidencial (no el navegador) obtiene **tokens DPoP** (RFC 9449) cortos y con alcance. **Nunca** un API key/secreto en el JS del navegador.
- **Aislamiento por tenant autoritativo:** `tenant_id` y `room_id` derivados **solo del token**; cada subject es `tenant.<tid>.room.<rid>`; autorización de suscripción contra un store de membresía en *cada* subscribe; RLS de PostgreSQL como red de seguridad (predicado de tenant como primera columna del índice).
- **Modelo de datos de consentimiento:** consent versionado por propósito; el envelope solo lleva *claims* advisory; el servidor **re-deriva** propósito y retención efectivos del registro de consentimiento persistido y **rechaza** (no coacciona) lo que exceda.
- **Contrato versionado** (sección 4) y **higiene de cadena de suministro** desde el primer commit (lockfile pineado, `npm ci --ignore-scripts`, assets MediaPipe self-hosted, SBOM).

### 5.2 Lo operativamente pesado (a medida que aterriza cada componente del build)

- Prueba de posesión **DPoP** completa + canal push de revocación (SLA ≤30 s).
- **Piso de plausibilidad** biométrica en ingest (límites de velocidad/jerk, sin teletransporte de articulaciones, auto-consistencia de blendshapes/handedness) + **trust-tag** en cada registro/mensaje que se propaga a las proyecciones; los consumidores clínicos pueden rechazar datos no atestiguados.
- **Presupuestos agregados por tenant** (msg/seg, bytes/seg, escrituras/seg, egress) que **suman entre todas las conexiones** del tenant.
- **Defensa volumétrica pre-auth** en el edge (límites de conexión por IP, timeouts de handshake anti-Slowloris, ban tras N JWT inválidos).
- **Borrado estructural:** crypto-shred por clave de sujeto que destruye todas las derivadas (incluidas proyecciones/rollups); evento de erasure en el bus que los proyectores idempotentes deben consumir.
- **Minimización biométrica:** almacenar solo los eventos/agregados que cada dominio necesita (no la malla de 478 puntos por frame); cara efímera por defecto; tratar lo almacenado como GDPR Art. 9.
- **Cabeceras** CSP / COOP / COEP (esta última también habilita SharedArrayBuffer para WASM con hilos), HSTS, Permissions-Policy `camera=self`.
- **Auditoría** estructurada a prueba de manipulación (sin payloads crudos, sin valores de token) y **observabilidad** OTel cuyas métricas de rechazo/rate-limit alimentan la señal de intrusión.

> El conjunto completo de 21 controles vive en el ADR de seguridad. La calibración elegida ("cimientos correctos + endurecido por componente, escala incremental") significa que **5.1 entra ya** y **5.2 se construye junto a su componente**, no todo el día uno.

---

## 6. Descomposición (10 sub-proyectos)

Cada uno tendrá su ciclo spec → plan → implementación.

| Sub-proyecto | Responsabilidad |
|---|---|
| `client-engine` | Motor de inferencia local: pipeline en worker, abstracción de backend (WebGL/WASM), `ResultBus`, overlay, HUD, carga perezosa de modelos por dominio; emite **solo** JSON derivado minimizado. |
| `protocol-contract` | Esquema único agnóstico de lenguaje (JSON Schema 2020-12); genera typedefs del cliente y validadores del servidor; CI de drift. **El eje.** |
| `control-plane-auth` | Tenants, sesiones (IDs acuñados por servidor), consent versionado, emisión `/token` DPoP con rate-limit, verificación estricta de JWT, denylist de `jti`, canal push de revocación, ciclo de vida de claves. |
| `edge-gateway` | Terminación WSS stateless + defensa volumétrica pre-auth, Origin allowlist (defensa en profundidad), pipeline ordenado por admisión (tamaño+presupuesto → validación), authz por mensaje, presupuestos agregados por tenant, backpressure. |
| `ingest-persist-outbox` | Admisión → re-check de consent → piso de plausibilidad → trust-tag → persistir eventos + outbox en una transacción; idempotencia con TTL/eviction; cifrado de sobre por sujeto; minimización. |
| `relay-fanout` | Fan-out pub/sub por subject autorizado; secuenciación de relay por una sola autoridad; topes de suscriptores/egress por tenant; drop-stale (last-value-wins) para overlay en vivo. |
| `projection-read-models` | Consumidores idempotentes que construyen read models + rollups con trust-level; consumen eventos de erasure para purgar/repartir; guardas de read-path (statement_timeout, granularidad forzada). |
| `privacy-consent-erasure` | Gate de consentimiento + re-check en vivo; automatización de retención/crypto-shred; propagación de erasure; tenants marcados → efímero forzado; herramienta mínima DSAR/erasure; manejo Art. 9. |
| `observability-security-baseline` | OTel (trazas/métricas/logs), auditoría coalescida a prueba de manipulación, métricas de intrusión por tenant, higiene de cadena de suministro, cabeceras de seguridad, config de defensa de edge. |
| `docs-pipeline` | Markdown con front-matter como fuente única → sitio HTML interactivo generado; ADRs fechados por capa; verificador CI de enlaces+símbolos; consumible por agentes. |

---

## 7. Stack técnico (dimensionado al mini PC Debian, 1–20 clientes)

| Capa | Elección v1 | Crece a |
|---|---|---|
| Inferencia cliente | `@mediapipe/tasks-vision` pineado, assets self-hosted; delegado WebGL → fallback WASM/SIMD (WebGPU como costura) | — |
| Tooling cliente | Vanilla JS + typedefs JSDoc generados, `tsc --checkJs`; Web Worker + OffscreenCanvas + `requestVideoFrameCallback` + ImageBitmap transferible | — |
| Protocolo/transporte | WSS multiplexado tras abstracción `Channel`; JSON; JSON Schema 2020-12 con semver + negociación | WebTransport (v2), CBOR/MessagePack |
| Auth cliente | Cliente público: sesión 1ª parte → `/token` emite JWT DPoP corto y con alcance | atestación de dispositivo (clínico) |
| Runtime backend | **Node.js + TypeScript, un proceso** | varios nodos → Go+NATS / Elixir |
| Pub/sub | **En memoria (in-process)** | Redis/NATS al escalar horizontal |
| Almacén | **PostgreSQL** (outbox · RLS · particionado temporal · cifrado de sobre por sujeto) | ClickHouse cuando haya firehose real |
| Edge/TLS | **Caddy** (auto-ACME, WSS passthrough) + límites por IP/timeouts de handshake | scrubber L3/4 cloud si hay DDoS real |
| Observabilidad | logs estructurados + métricas ligeras (OTLP) | Grafana LGTM completo |
| Docs | Markdown + front-matter → HTML generado; ADRs; verificador CI | generador zero-config si se quiere |

---

## 8. Despliegue

- **Host:** mini PC Intel (8 GB RAM, GPU integrada, Debian) como servidor backend siempre encendido. **La inferencia NO ocurre aquí** — corre en los dispositivos cliente; la iGPU débil no está en la ruta de inferencia.
- **Requisito no negociable:** contexto seguro (**HTTPS**) para `getUserMedia` y WSS. Caddy resuelve el TLS automáticamente.
- **Dev:** Docker Compose como arnés local (backend + Postgres + observabilidad); el cliente se sirve estático sobre HTTPS/localhost.
- **Presupuesto de 8 GB:** un proceso Node + Postgres ligero + Caddy entran cómodos para 1–20 clientes. Kubernetes y broker externo están **explícitamente diferidos**.

---

## 9. Orden de construcción (retira lo más arriesgado/irreversible primero)

0. **Andamiaje + pipeline de docs + higiene de cadena de suministro** (lockfile pineado, `--ignore-scripts`, SBOM, assets self-hosted) — para que todo lo que siga nazca endurecido.
1. **Congelar el contrato del protocolo** (JSON Schema + typedefs generados + validadores + CI de drift). *El eje.*
2. **Slice vertical del cliente** (worker → 1 landmarker → overlay → HUD). Prueba WebGL-vs-WASM, COOP/COEP y el presupuesto de FPS **en hardware real** antes de tocar el backend.
3. **Capa de red del cliente** (coalesce 15 Hz, backpressure, emisión de coords normalizadas + procedencia según contrato).
4. **Control-plane + auth de cliente público** (la contradicción de auth es la mayor palanca: arreglarla antes de aceptar datos).
5. **Edge gateway + handshake endurecido** (defensa volumétrica pre-auth, pipeline ordenado por admisión, subjects derivados por servidor, presupuestos agregados).
6. **Ingest → persist → outbox** en una transacción (Postgres + RLS, idempotencia, consent re-check, piso de plausibilidad, cifrado por sujeto, minimización).
7. **Relay fan-out** (gateways suscriben a subjects autorizados, secuenciación por una autoridad, topes; tests CI de fuga cross-tenant/cross-room/relay).
8. **Proyectores CQRS** (read models + rollups con trust-level; consumo de erasure; guardas de read-path; dashboards).
9. **Observabilidad + auditoría** completas; métricas de intrusión.
10. **Banco de carga hostil** (cliente sintético modulable que valida coalescing, presupuestos, topes de fan-out y límites pre-auth bajo carga no cooperativa).

---

## 10. Riesgos residuales (vigilar)

- **Inyección biométrica fabricada pero válida:** el piso de plausibilidad la encarece, no la elimina; requiere atestación de dispositivo para dominios clínicos.
- **Datos ya retransmitidos no se pueden recuperar** al revocar consentimiento; mitigado porque los pares solo tienen overlay efímero, sin persistencia.
- **Re-identificación** de series temporales de landmarks faciales: minimización + pseudonimización reducen, no anulan; tratar como Art. 9 + revisión legal por dominio.
- **Compromiso de cadena de suministro de MediaPipe:** pin + integridad + SBOM reducen, no eliminan; necesita monitoreo y rollback rápido de assets.
- **Madurez operativa de un equipo greenfield:** gateways + Postgres + KMS + DPoP + revocación push es mucha superficie; mitigar con servicios gestionados al inicio y tests de política IaC.
- **Corrección del borrado a través de rollups:** restar la contribución de un sujeto a agregados es frágil; necesita lineage explícito y test de verificación de erasure.

---

## 11. Decisiones registradas (índice de ADRs)

Ver [`docs/decisiones/`](../../decisiones/). Semillas iniciales:

- **ADR-0001** — Cliente vanilla JS + backend Node/TypeScript.
- **ADR-0002** — Arquitectura de dos capas y frontera de privacidad (píxeles nunca salen).
- **ADR-0003** — MediaPipe tasks-vision como motor de inferencia v1.
- **ADR-0004** — WSS + auth de cliente público con tokens DPoP.
- **ADR-0005** — PostgreSQL + outbox, un proceso, pub/sub en memoria (escala incremental).
- **ADR-0006** — Documentación: Markdown como fuente única → HTML generado; sin HTML a mano.
- **ADR-0007** — Calibración: cimientos correctos + endurecido por componente; sin clúster para cero usuarios.
```
