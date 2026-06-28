---
modulo: deploy
capa: despliegue
estado: en-progreso
interfaz: docker compose up -d (origen HTTP en ${PORT:-8080}); cloudflared ingress -> http://localhost:PORT
dependencias: Caddy, Docker, Cloudflare Tunnel (cloudflared, externo)
archivos_clave: docker/Dockerfile, docker/Caddyfile, docker/docker-compose.yml
verificado_por: docker build + run; curl http confirma 200 + cabeceras COOP/COEP + assets servidos
---

# deploy

Empaquetado de despliegue. **Cliente:** un único contenedor (multi-stage: Node auto-aloja MediaPipe → Caddy sirve estáticos por **HTTP**) detrás de **Cloudflare Tunnel**, que pone el **HTTPS público y el certificado de confianza** en el edge. El origen no gestiona certificados ni expone puertos a internet (solo el túnel saliente). Mantiene cabeceras COOP/COEP (Cloudflare las reenvía). Resuelve el contexto seguro de la cámara en cualquier dispositivo **sin avisos** ([ADR-0011](../decisiones/0011-despliegue-cloudflare-tunnel.md)).

Puerto del host configurable (`PORT`, por defecto 8080). `restart: unless-stopped` + daemon en arranque = persistente. Integración: añadir una **regla de ingress** en el cloudflared existente (subdominio → `http://localhost:PORT`), sin tocar los demás proyectos. El modo HTTPS local autofirmado (`dev:https`) queda como opción de desarrollo, no de producción.

**Pendiente:** confirmar el subdominio y el estilo de gestión del túnel (config.yml vs dashboard) del usuario; al llegar el backend (build step 4+), añadir servicios `app` (Node) y `db` (Postgres) al Compose.
