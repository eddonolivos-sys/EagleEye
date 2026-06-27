# ADR-0007 — Calibración: cimientos correctos + endurecido por componente, escala incremental

- **Estado:** Aceptado
- **Fecha:** 2026-06-27
- **Capa:** seguridad / despliegue / proceso

## Contexto

"Endurecido y escalable de producción desde v1" tiene dos lecturas: (a) operar un clúster multinodo con pruebas de carga/penetración masivas desde el día uno, o (b) tomar bien las decisiones **irreversibles** y que cada componente nazca seguro, difiriendo la operación de escala hasta que haya carga real. El despliegue objetivo es un mini PC para 1–20 clientes.

## Decisión

Lectura (b). Se distingue:

- **Lo arquitectónicamente irreversible — entra desde el inicio:** frontera de auth ([ADR-0004](0004-wss-auth-cliente-publico-dpop.md)), aislamiento por tenant, modelo de datos de consentimiento, contrato versionado, higiene de cadena de suministro.
- **Lo operativamente pesado — se construye junto a su componente:** prueba DPoP completa, piso de plausibilidad, presupuestos agregados, defensa volumétrica pre-auth, borrado estructural, observabilidad completa.

**No** se opera clúster, broker externo ni scrubber cloud para cero usuarios; son costuras documentadas.

## Alternativas descartadas

- **Plataforma de producción completa ya** — programa de varios meses operando infraestructura para usuarios inexistentes; los propios expertos marcaron el stack de 3 capas como sobredimensionado sin carga real.

## Consecuencias y trade-offs

- Robusto y entregable: lo caro de retrofitear se hace bien ahora; lo caro de operar se difiere.
- Requiere disciplina para que las costuras (escala/broker) no se "salten" antes de necesitarse.
