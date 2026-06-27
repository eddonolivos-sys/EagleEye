---
modulo: deploy
capa: despliegue
estado: en-progreso
interfaz: docker compose up (cliente), redir 80->443, tls internal on_demand
dependencias: Caddy, Docker
archivos_clave: docker/Dockerfile, docker/Caddyfile, docker/docker-compose.yml
verificado_por: docker build + run (301 http->https y 200 https con COOP/COEP verificados via wget interno)
---

# deploy

Empaquetado de despliegue. **Cliente:** un único contenedor (multi-stage: Node auto-aloja MediaPipe → Caddy sirve estáticos) con **redirección automática 80→443**, HTTPS por CA interna `on_demand` (cubre cualquier IP/host de LAN) y cabeceras COOP/COEP. Resuelve el requisito de contexto seguro de la cámara ([ADR-0009](../decisiones/0009-dev-https-movil-contexto-seguro.md)) y la pregunta del contenedor único ([ADR-0010](../decisiones/0010-docker-contenedor-unico-cliente.md)).

**Pendiente:** al llegar el backend (build step 4+), el Compose gana `app` (Node) y `db` (Postgres) como servicios separados; en producción con dominio, Caddy emite Let's Encrypt (sin aviso). Kubernetes diferido.
