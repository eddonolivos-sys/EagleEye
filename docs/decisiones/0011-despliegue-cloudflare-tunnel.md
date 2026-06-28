# ADR-0011 — Despliegue vía Cloudflare Tunnel (origen HTTP, TLS en el edge)

- **Estado:** Aceptado
- **Fecha:** 2026-06-27
- **Capa:** despliegue / seguridad

## Contexto

El sistema se despliega en una VPS con **cloudflared ya operativo** y vinculado a un dominio público (junto a otros proyectos). La cámara exige **HTTPS de confianza**; gestionar Let's Encrypt o certificados en el propio origen era fricción, y un certificado autofirmado **bloquea la cámara en Android**. Se quiere un único comando de despliegue, reproducible y persistente.

## Decisión

El **origen** (contenedor Caddy) sirve **solo HTTP** en un puerto configurable (`${PORT:-8080}`). **Cloudflare Tunnel** termina el **TLS público con certificado de confianza de Cloudflare** en el edge y enruta `https://<subdominio>.<dominio>` → `http://localhost:${PORT}` del origen. El origen **no gestiona certificados ni expone puertos a internet** (el túnel es saliente). Se mantienen las cabeceras **COOP/COEP** en el origen (Cloudflare las reenvía). Persistencia: `restart: unless-stopped` + daemon de Docker en arranque.

## Alternativas descartadas

- **TLS en el origen (Let's Encrypt/Caddy auto-HTTPS):** innecesario con el túnel y exigiría exponer 80/443 públicamente.
- **Autofirmado / mkcert:** bloquea la cámara en Android o exige instalar una CA en cada dispositivo.

## Consecuencias y trade-offs

- HTTPS de confianza en **cualquier dispositivo** → la cámara funciona en Android **sin avisos ni pasos por dispositivo**. Cero gestión de certificados. Mejor superficie de ataque (sin puertos públicos en el origen; solo el túnel saliente).
- **Trade-offs:** dependencia de Cloudflare; hay que **desactivar Rocket Loader / Auto Minify** de Cloudflare para ese hostname (romperían COEP); y configurar CF para no cachear/alterar de más el HTML.
- **Supersede** la parte de TLS-en-el-origen de [ADR-0009](0009-dev-https-movil-contexto-seguro.md) y [ADR-0010](0010-docker-contenedor-unico-cliente.md) **para producción**; el HTTPS local autofirmado (`dev:https`) queda como opción de desarrollo, no de despliegue.
