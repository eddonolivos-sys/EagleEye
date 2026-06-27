# ADR-0010 — Contenedor único (Caddy) para el cliente; Compose cuando llegue el backend

- **Estado:** Aceptado
- **Fecha:** 2026-06-27
- **Capa:** despliegue

## Contexto

Se preguntó por qué no desplegar con **un único contenedor Docker** en lugar de una arquitectura más compleja, para simplificar despliegue y dependencias. A la vez se necesita **redirección automática a HTTPS** y garantizar el **contexto seguro** que exige la cámara.

## Decisión

- **Ahora (solo cliente):** **sí, un único contenedor.** `docker/Dockerfile` (multi-stage: Node auto-aloja MediaPipe → Caddy sirve los estáticos) + `docker/Caddyfile`. Caddy escucha en **:80 (redirige a :443)** y **:443 (HTTPS con CA interna `tls internal { on_demand }`)**, con cabeceras COOP/COEP. Un comando: `docker compose -f docker/docker-compose.yml up --build`.
- **Cuando llegue el backend (build step 4+):** **NO** meter Node + Postgres + Caddy en una sola imagen. Se evoluciona a **Docker Compose con pocos servicios** (`caddy` reverse-proxy + `app` Node + `db` Postgres). Sigue siendo "un comando" (`docker compose up`), pero cada pieza queda aislada.

## Alternativas descartadas

- **Todo-en-una-imagen (Caddy+Node+Postgres):** parece más simple pero es un anti-patrón: necesita un supervisor de procesos, acopla los ciclos de vida (un reinicio del app reinicia la DB), arriesga pérdida de datos si el volumen de Postgres comparte vida con el contenedor, e impide actualizar/escalar piezas por separado.
- **Sin contenedor (solo `node serve.js`):** válido en dev, pero no da redirección automática ni un empaquetado reproducible para el mini PC.

## Consecuencias y trade-offs

- Despliegue del cliente en un comando, con **redirección automática 80→443** y HTTPS (contexto seguro para la cámara) resueltos por Caddy.
- En LAN sin dominio, el certificado es de la CA interna de Caddy → **aviso del navegador una vez** (o instalar la CA de Caddy en los dispositivos). Con **dominio público**, cambiar `tls internal` por el dominio activa Let's Encrypt y desaparece el aviso. Es la misma realidad de contexto seguro de [ADR-0009](0009-dev-https-movil-contexto-seguro.md); producción = Caddy auto-TLS ([ADR-0005](0005-postgres-outbox-un-proceso.md)).
- "Simplicidad" se redefine como **un comando**, no **un proceso**: Compose con pocos servicios da la simplicidad sin el anti-patrón del todo-en-uno.
