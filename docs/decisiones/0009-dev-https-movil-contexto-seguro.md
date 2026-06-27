# ADR-0009 — HTTPS en dev (certificado autofirmado) para probar en móvil

- **Estado:** Aceptado
- **Fecha:** 2026-06-27
- **Capa:** cliente / despliegue / seguridad

## Contexto

`navigator.mediaDevices` (y `getUserMedia`) solo existen en **contexto seguro**: HTTPS, o los orígenes locales `localhost`/`127.0.0.1`. El escritorio funcionaba al abrir `http://localhost:5173`. Un **móvil** es otro dispositivo: alcanza el dev server por la **IP de LAN sobre HTTP** (`http://192.168.x.x:5173`), que **no** es contexto seguro → `navigator.mediaDevices` es `undefined` → error `Cannot read properties of undefined (reading 'getUserMedia')`. Es la "trampa del contexto seguro" anticipada (spec §10, [ADR-0002](0002-dos-capas-frontera-privacidad.md)).

## Decisión

- El dev server (`scripts/serve.js`) gana un modo **HTTPS** (`pnpm --filter @eagleeye/client run dev:https`) que genera un **certificado autofirmado** (`scripts/cert.js`, vía `selfsigned`) cuyo **SAN incluye `localhost`, `127.0.0.1` y las IPs IPv4 de LAN** detectadas. Así el móvil abre `https://<IP-LAN>:PORT`, acepta el aviso una vez, y obtiene contexto seguro.
- `camera.js` añade `assertGetUserMedia()`: si la API falta, lanza un **error accionable** que explica la causa (contexto no seguro) y el remedio (`dev:https`), en vez del críptico "undefined".
- Se añade selección **frontal/trasera** (`facingMode: 'user' | 'environment'`, como `ideal`), y el espejado (selfie) se aplica solo a la cámara frontal.

## Alternativas descartadas

- **Flag del navegador** (`treat-insecure-origin-as-secure`) — por dispositivo, no portable, no aplica a iOS/Safari.
- **Túnel (ngrok/cloudflared)** — añade servicio externo y hace pasar la página por un tercero; choca con el carácter local.
- **mkcert (CA local de confianza)** — sin aviso de certificado, pero exige instalar mkcert y su CA raíz en el móvil. Mejor como mejora opcional documentada, no requisito.

## Consecuencias y trade-offs

- El móvil puede probar la cámara en la LAN; el certificado autofirmado muestra un aviso que se acepta una vez.
- **Solo para desarrollo.** Producción usa Caddy con auto-TLS ([ADR-0005](0005-postgres-outbox-un-proceso.md)); este certificado nunca se usa en producción y `.certs/` está en `.gitignore`.
- Nueva devDependency (`selfsigned`, pura JS, sin scripts de instalación).
