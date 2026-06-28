# ADR-0012 — Cámara predeterminada con la petición más simple y espejo automático

- **Estado:** Aceptado
- **Fecha:** 2026-06-27
- **Capa:** cliente

## Contexto

El motor necesita cámara: no hay (ni se quiere) un "modo sin cámara". El objetivo es que el cliente **solicite la cámara predeterminada de la forma más simple y robusta posible** en web y en Android.

El flujo previo (`camera.js` + `main.js`) pedía la cámara con `facingMode: {ideal}` + resolución `{ideal}` y exponía dos controles —selector frontal/trasera y dropdown de dispositivo— que el usuario debía tocar para que el espejo (selfie) saliera bien. Dos observaciones del código y del hardware:

1. El request **ya era robusto en cuanto a constraints**: al ser todo `ideal` (nunca `exact`, salvo `deviceId` explícito), `getUserMedia` no falla por `OverconstrainedError`. La complejidad del request **no** es el bloqueador en Android.
2. El bloqueador real de cámara en Android suele ser la **confianza del certificado** (Android Chrome niega `getUserMedia` sobre un certificado autofirmado aunque se pase la interstitial). Eso es ortogonal a esta decisión y queda como **costura** (ver más abajo).

Aun así, el flujo era más complejo de lo necesario y acoplaba el espejo a una elección manual. Se busca un flujo de un solo paso con el espejo correcto sin intervención.

## Decisión

**Enfoque A — cámara predeterminada de un toque + espejo derivado del track:**

- `camera.start()` pide por defecto `{ video: true, audio: false }` → la cámara predeterminada del navegador, **sin constraints**. Es la petición más simple posible y no puede fallar por constraints.
- El espejo se **deriva del track** vía `track.getSettings().facingMode`: `'user'` → espejo; `'environment'` → sin espejo; desconocido → espejo por defecto (asunción selfie, el caso común de webcam frontal). Función pura `shouldMirror(facingMode)`, testeada.
- UI de **un solo botón** «Iniciar cámara». El selector frontal/trasera y el dropdown de dispositivo se **ocultan por defecto** y solo se revelan, tras conceder permiso, si existe **más de una** cámara (`videoinput`); entonces actúan como "cambiar cámara" opcional.
- `buildVideoConstraints` se **conserva** únicamente para ese cambio opcional (cuando el usuario elige explícitamente otra cámara/`facingMode`).

## Alternativas descartadas

- **Enfoque B (mínimo absoluto)** — `{video:true}`, sin selectores, espejo fijo. Más simple, pero pierde el cambio a cámara trasera y el espejo correcto cuando la fuente es trasera.
- **Enfoque C (cambio mínimo)** — solo relajar el request a `{video:true}` dejando los selectores visibles. Menor diff, pero la UI no queda tan simple como pide el objetivo.
- **Modo sin cámara / fuente de muestra** — descartado: el motor necesita cámara; verificar sin hardware se aborda, si hace falta, como decisión aparte.

## Consecuencias y trade-offs

- **Ganamos:** la petición más robusta y predecible posible; UX de un solo paso; el espejo correcto sin que el usuario elija nada; menos superficie de UI.
- **Aceptamos:** perder la elección explícita frontal/trasera *por defecto* (mitigado por la derivación del espejo y por el "cambiar cámara" opcional cuando hay >1 cámara).
- **Costura futura (no la resuelve este ADR):** la **confianza del certificado en Android** sigue pendiente como decisión aparte. Para cámara en Android sin avisos hace falta un certificado de confianza real: vía Cloudflare en el edge (ADR-0011) o `mkcert` con su CA instalada en el dispositivo (complementa el `dev:https` de ADR-0009).

---

> Los ADR son **solo-añadir**: una decisión pasada no se edita; se *reemplaza* con un ADR nuevo y fechado que enlaza al anterior.
