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

### Desplegar (Docker)

Un único contenedor (Caddy + cliente estático) que sirve **HTTPS** (contexto seguro para la cámara). **Cero configuración:**

```bash
docker compose -f docker/docker-compose.yml up --build
```

Abre **`https://localhost:5173`** (o `https://<IP-de-LAN>:5173` desde el móvil) y acepta una vez el aviso de certificado (CA interna de Caddy, autofirmado). Con un dominio público, Caddy emite Let's Encrypt y desaparece el aviso.

> Por defecto el contenedor usa **5173 (HTTPS)** y 5174 (HTTP) — puertos altos que evitan el conflicto típico de Windows con el 80. Si tienes el server de dev corriendo en 5173, **deténlo antes** (chocarían).

**Modo "producción"** (redirección automática `http→https` en puertos estándar) — en **PowerShell**:

```powershell
$env:HTTP_PORT=80; $env:HTTPS_PORT=443; docker compose -f docker/docker-compose.yml up --build
```

Así `http://<host>` redirige solo a `https://<host>` (requiere 80/443 libres). Cuando llegue el backend, este Compose gana servicios `app` (Node) y `db` (Postgres) sin meter todo en una sola imagen. Ver [ADR-0010](docs/decisiones/0010-docker-contenedor-unico-cliente.md).

#### El contenedor no responde — diagnóstico

```bash
docker compose -f docker/docker-compose.yml ps   # ¿Status = Up? (si está Exited/ausente, no arrancó)
docker logs eagleeye-client                       # errores de Caddy
```

Si ves `port is already allocated`, ese puerto está ocupado: cámbialo en PowerShell (`$env:HTTPS_PORT=5180; docker compose ... up`) y abre `https://localhost:5180`.

#### Funciona en localhost pero NO desde el móvil / otro equipo de la LAN

Esto es **reachability de red del host**, no del contenedor (el contenedor sirve HTTPS en todas las interfaces, `0.0.0.0`). Por orden:

1. **Usa la IP de LAN correcta.** En el host: `ipconfig` (Windows) → la IPv4 del adaptador conectado a tu red, tipo `192.168.x.x`. **NO** uses las virtuales (`172.x.x.x` de WSL/Hyper-V, ni `169.254.x.x`). Desde el móvil: `https://192.168.x.x:5173`.
2. **Abre el puerto en el Firewall de Windows** (causa #1; el loopback no se filtra pero la LAN sí). En **PowerShell como administrador**:
   ```powershell
   New-NetFirewallRule -DisplayName "EagleEye 5173" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
   ```
3. **Prueba desde el propio host** abriendo `https://192.168.x.x:5173` (su IP de LAN, no localhost). Si el host SÍ llega pero el móvil no → firewall o aislamiento de la red Wi-Fi.
4. **Misma red, sin aislamiento.** Móvil y host en la misma Wi-Fi (no "invitados"), sin VPN en el móvil, y sin *AP/client isolation* en el router.

> **Que el host llegue a su propia IP de LAN NO confirma que la LAN esté abierta:** ese tráfico es local y suele saltarse el filtro de entrada del firewall. El móvil es una conexión externa real → necesita la regla del paso 2.
>
> **La cámara NO funciona por http** (sin "s"): `http://IP` deja `navigator.mediaDevices` indefinido y el navegador nunca pide permiso. Una vez conectes por `https://IP:5173`, Android Chrome mostrará un aviso de certificado autofirmado → **Avanzado → Continuar (no seguro)** → ahí pide permiso de cámara. Para evitar el aviso por completo: certificado de confianza con *mkcert* instalando su CA en el móvil (opcional, más adelante).

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
