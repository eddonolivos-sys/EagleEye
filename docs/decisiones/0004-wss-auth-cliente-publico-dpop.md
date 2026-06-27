# ADR-0004 — WSS + auth de cliente público con tokens DPoP

- **Estado:** Aceptado
- **Fecha:** 2026-06-27
- **Capa:** seguridad / backend

## Contexto

El red-team señaló dos verdades estructurales: **un navegador es un cliente *público*** (no puede guardar un secreto) y **"válido según el esquema" ≠ "honesto"**. Un sistema que ingiere datos biométricos derivados de clientes no confiables debe estar endurecido desde el diseño.

## Decisión

- **Transporte:** WebSocket sobre TLS 1.3 (WSS), tras una abstracción `Channel` (WebTransport como costura v2).
- **Auth:** el navegador autentica una **sesión de primera parte** (OIDC/cookie); un backend confidencial obtiene **tokens DPoP (RFC 9449)** cortos y con alcance para el cliente. **Nunca** un secreto/API key en el JS del navegador. Token en el subprotocolo WS (nunca en query string/cookie), jamás logueado.
- **Verificación estricta de JWT:** solo firma asimétrica, allowlist de `alg`, `aud`/`iss`/`exp` obligatorios, JWKS pineado, denylist de `jti`.

## Alternativas descartadas

- **Bearer token simple** — un token robado se reusa desde cualquier sitio durante su vida; insuficiente para datos biométricos.
- **mTLS con certificado de cliente** — binding más fuerte, pero aprovisionar certificados a navegadores anónimos es engorroso.

## Consecuencias y trade-offs

- Un token robado/filtrado es inútil sin la clave privada por conexión.
- Coste de implementación en cliente y edge; la atestación de dispositivo se añade luego para dominios clínicos.
