# ADR-0005 — PostgreSQL + outbox, un proceso, pub/sub en memoria

- **Estado:** Aceptado
- **Fecha:** 2026-06-27
- **Capa:** datos / backend / despliegue

## Contexto

El backend debe persistir de forma segura, alimentar dashboards y retransmitir, en un mini PC (8 GB RAM, Debian) para 1–20 clientes, con cimientos correctos pero **sin operar un clúster para cero usuarios** (calibración elegida).

## Decisión

- **Almacén:** **PostgreSQL** con patrón **outbox** (persistir evento + fila de outbox en una transacción), RLS con `tenant_id` como primera columna del índice, particionado temporal y cifrado de sobre por sujeto (crypto-shred).
- **Pub/sub:** **en memoria, en el proceso**. Sin broker externo en v1.
- **Lectura:** proyecciones denormalizadas en el mismo Postgres (separación CQRS estructural desde v1; ClickHouse como costura).

## Alternativas descartadas

- **Kafka/Redpanda + ClickHouse + Postgres (3 capas) ya** — mejor rendimiento de firehose, pero cuatro almacenes que operar con cero tenants y borrado por sujeto mucho más difícil en columnar (riesgo GDPR). Sobredimensionado.
- **NATS/Redis desde v1** — innecesario a esta escala; entra al escalar horizontalmente.

## Consecuencias y trade-offs

- Un almacén ACID resuelve outbox, RLS, consent/auditoría y crypto-shred de forma simple; cabe en 8 GB.
- El pub/sub en memoria implica un solo nodo; multi-nodo requiere reintroducir un broker (costura documentada).
