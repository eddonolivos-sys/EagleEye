# EagleEye

Motor reutilizable de **visión por computadora en el navegador** con **inferencia 100 % local** (MediaPipe), más un **hub de integraciones / relay** endurecido. No es una app final: es el cimiento compartido para proyectos de pose-en-el-tiempo, avatares/RA y accesibilidad/gestos.

> **Frontera de privacidad:** los píxeles de la cámara **nunca** salen del dispositivo. Solo cruzan **datos derivados** (landmarks/eventos) por un canal autenticado (WSS + DPoP).

## Cómo encaja todo

```
TIER 1 — CLIENTE (navegador)                    │ FRONTERA = privacidad
  cámara → Worker[MediaPipe cara/manos/cuerpo]   │ (solo JSON derivado;
    → ResultBus → overlay canvas + HUD FPS       │  NUNCA píxeles)
    → emisor red (coalesce ~15Hz) ───────────────┼──► WSS + DPoP
                                                 │
TIER 2 — HUB DE INTEGRACIONES + RELAY (1 proceso Node+TS, mini PC Debian)
  edge gateway (auth + validación + presupuestos/tenant + aislamiento)
    → ingest (consent + plausibilidad + persistir+outbox en 1 txn)
    → pub/sub en memoria ──► proyectores CQRS → dashboards
                        └──► relay fan-out → otros clientes
  control-plane · PostgreSQL · Caddy (TLS) · observabilidad + auditoría
```

## Estado de implementación

El roadmap por fases vive aquí (intención humana). El **estado real** de cada módulo lo verifican los tests, el typecheck y `docs/estado/`, no esta prosa.

- [x] **0 — Andamiaje + docs + higiene de dependencias**
- [x] **1 — Contrato del protocolo** (JSON Schema 2020-12 + validadores + typedefs + tests)
- [ ] **2 — Slice vertical del cliente** (cámara → MediaPipe → overlay → HUD FPS)
- [ ] **3 — Capa de red del cliente** (coalesce/backpressure)
- [ ] **4 — Control-plane + auth de cliente público (DPoP)**
- [ ] **5 — Edge gateway endurecido**
- [ ] **6 — Ingest → persist → outbox**
- [ ] **7 — Relay fan-out**
- [ ] **8 — Proyectores CQRS + dashboards**
- [ ] **9 — Observabilidad + auditoría**
- [ ] **10 — Banco de carga hostil**

## Cómo correr (dev)

Requisitos: **Node ≥ 20** (probado en 24) y **pnpm** (gestionado por Corepack — ver [ADR-0008](docs/decisiones/0008-pnpm-seguridad.md)).

```bash
corepack enable                # usa la versión de pnpm fijada en package.json (packageManager)
pnpm install                   # instala; scripts de dependencias bloqueados por defecto
pnpm test                      # tests del contrato (node:test)
pnpm run typecheck             # tsc --checkJs (contrato verificado por máquina)
pnpm run docs:build            # genera docs/index.html desde el Markdown
```

> **Seguridad de cadena de suministro (pnpm):** `node_modules` estricto (sin dependencias fantasma), scripts de postinstalación bloqueados (`onlyBuiltDependencies: []`), cooldown de versiones (`minimumReleaseAge`) y verificación de integridad del store. En CI: `pnpm install --frozen-lockfile`.

### Probar el slice del cliente

```bash
pnpm --filter @eagleeye/client run vendor     # una vez: descarga MediaPipe (~36MB, SHA verificado)
pnpm --filter @eagleeye/client run dev        # escritorio -> http://localhost:5173
```

Abre `http://localhost:5173`, pulsa «Iniciar cámara» y elige **Frontal/Trasera**.

**Desde el móvil** (otro dispositivo de la LAN) la cámara exige **contexto seguro**: `http://IP` NO sirve (`navigator.mediaDevices` queda `undefined`). Usa HTTPS:

```bash
pnpm --filter @eagleeye/client run dev:https  # imprime https://<IP-de-LAN>:5173
```

Abre esa URL `https://…` en el móvil, acepta una vez el aviso de certificado autofirmado y concede permiso de cámara. En producción el contexto seguro lo da Caddy con auto-TLS. Ver [ADR-0009](docs/decisiones/0009-dev-https-movil-contexto-seguro.md).

### Desplegar (Docker: HTTPS + redirección automática)

Un único contenedor (Caddy + cliente estático) con **redirección automática `http→https`** y contexto seguro para la cámara:

```bash
docker compose -f docker/docker-compose.yml up --build
```

El contenedor escucha en los **puertos 80 y 443** (NO en `5173`, que es el server de dev). Abre **`http://localhost`** (sin puerto) o **`http://<IP-de-LAN>`**: Caddy redirige **automáticamente** a `https://…`. En LAN sin dominio, acepta una vez el aviso de certificado (CA interna de Caddy); con un dominio público, Caddy emite Let's Encrypt y desaparece el aviso. Cuando llegue el backend, este Compose gana servicios `app` (Node) y `db` (Postgres) sin meter todo en una sola imagen. Ver [ADR-0010](docs/decisiones/0010-docker-contenedor-unico-cliente.md).

#### El contenedor no responde — diagnóstico

```bash
docker compose -f docker/docker-compose.yml ps      # ¿Status = Up? (si está Exited/ausente, no arrancó)
docker logs eagleeye-client                          # errores de Caddy
```

Causa más común: **los puertos 80/443 ya están en uso** (en Windows, `http.sys`/IIS reservan el 80). El síntoma es un error al levantar: `Bind for 0.0.0.0:80 failed: port is already allocated`. Solución — usa puertos altos y abre el `https` **directamente**:

```bash
HTTP_PORT=8080 HTTPS_PORT=8443 docker compose -f docker/docker-compose.yml up --build
# luego abre directamente:  https://localhost:8443
```

(En modo puerto-alto la redirección automática desde el puerto HTTP no aplica; ve directo a la URL `https://…:8443`.) Si accedes desde otro dispositivo de la LAN, asegúrate de que el firewall del host permite ese puerto.

## Documentación

- **Diseño maestro:** [`docs/superpowers/specs/2026-06-27-eagleeye-plataforma-design.md`](docs/superpowers/specs/2026-06-27-eagleeye-plataforma-design.md)
- **Visión general de arquitectura:** [`docs/arquitectura/vision-general.md`](docs/arquitectura/vision-general.md)
- **Decisiones (ADRs):** [`docs/decisiones/`](docs/decisiones/)
- **Glosario:** [`docs/glosario.md`](docs/glosario.md)
- **Estado por módulo:** [`docs/estado/`](docs/estado/)

## Estructura

```
packages/protocol/   Contrato: JSON Schema (fuente única) + validadores + typedefs
apps/client/         Motor de inferencia en navegador            (build step 2+)
apps/server/         Hub de integraciones + relay                (build step 4+)
tools/docs-gen/      Generador del sitio HTML desde Markdown
docs/                Markdown (fuente única) + ADRs + estado + specs
```
