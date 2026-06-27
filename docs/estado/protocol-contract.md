---
modulo: protocol-contract
capa: contrato
estado: completado
interfaz: validateEnvelope, validateDetectionPayload, SUPPORTED
dependencias: ajv
archivos_clave: packages/protocol/schemas/envelope.schema.json, packages/protocol/schemas/detection.v1.schema.json, packages/protocol/src/validate.js
verificado_por: packages/protocol/test/validate.test.js (13 tests), tsc --checkJs
---

# protocol-contract

El **eje** del sistema. Define el contrato cliente↔hub como **JSON Schema 2020-12** (fuente única) y expone validadores con resultado uniforme `{ valid, errors }`, usados tanto en el cliente como en el servidor.

- **Envelope (`ev=1`):** sobre común versionado (tipo, tenant, sesión, seq, ts, sv, consent/purpose/retention como claims advisory, data).
- **Payload de detección (`sv=1`):** un esquema para los tres dominios (pose/manos/cara), coordenadas normalizadas `[0,1]`, sin píxeles.

Versionado: aditivo dentro de `sv`; rompedor sube `sv`; estructural sube `ev`. Capacidades anunciadas en `SUPPORTED`.
