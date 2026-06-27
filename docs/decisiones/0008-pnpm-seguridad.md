# ADR-0008 — Migración a pnpm por seguridad de cadena de suministro

- **Estado:** Aceptado
- **Fecha:** 2026-06-27
- **Capa:** despliegue / seguridad / tooling

## Contexto

npm es un vector real de ataques de cadena de suministro: versiones maliciosas publicadas y retiradas en horas, **dependencias fantasma** (código accede a paquetes que no declaró, gracias al `node_modules` plano) y ejecución de **scripts de postinstalación arbitrarios** por defecto. EagleEye procesa datos biométricos derivados; la cadena de suministro es superficie de ataque de primer orden (ver riesgo residual en la spec §10).

## Decisión

Migrar de npm a **pnpm**, gestionado por **Corepack** (versión fijada en `package.json` → `packageManager: pnpm@11.9.0`, reproducible y verificada). Ajustes de seguridad en `pnpm-workspace.yaml`:

- **`onlyBuiltDependencies: []`** — ninguna dependencia ejecuta scripts de ciclo de vida; allowlist explícita y vacía (en pnpm 10+ el bloqueo es el default, aquí se hace explícito).
- **`minimumReleaseAge: 4320`** — cooldown de 3 días: no se instala ninguna versión publicada hace menos de ese tiempo.
- **`verifyStoreIntegrity: true`** — verifica el hash del contenido del store en cada instalación.
- **`node_modules` estricto** (default de pnpm) — elimina las dependencias fantasma.
- **`pnpm-lock.yaml`** con verificación de políticas en cada `install`.

El lockfile se migró con `pnpm import` (preserva las versiones ya resueltas, sin re-resolver).

## Alternativas descartadas

- **Seguir con npm** — sin cooldown nativo, `node_modules` plano con dependencias fantasma y scripts habilitados por defecto.
- **Yarn** — mejor que npm, pero su `node_modules` (sin PnP) es menos estricto por defecto que el de pnpm, y el ecosistema de ajustes de seguridad de pnpm (cooldown, allowlist de builds) es más directo.

## Consecuencias y trade-offs

- Instalaciones reproducibles y verificadas; un paquete malicioso recién publicado no se instala hasta pasar el cooldown (ventana en la que normalmente se detecta y retira); las dependencias no ejecutan código en la instalación.
- **Trade-off:** el cooldown puede retrasar parches legítimos urgentes → usar `minimumReleaseAgeExclude` de forma puntual y documentada. Requiere `corepack enable` en cada entorno (incluido CI).
