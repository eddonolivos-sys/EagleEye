# Estado por módulo

Cada módulo del sistema tiene aquí un `.md` con **front-matter estructurado**. Es la **fuente única** del estado y de la "ficha" de cada módulo; `tools/docs-gen` la consume para generar la tabla de estado del sitio `docs/index.html`.

## Convención de front-matter

```
---
modulo: <id-kebab>
capa: cliente | contrato | backend | datos | seguridad | despliegue | docs
estado: completado | en-progreso | pendiente
interfaz: <símbolos/métodos públicos, separados por coma>
dependencias: <de qué depende>
archivos_clave: <rutas separadas por coma>
verificado_por: <tests / typecheck / CI que respaldan el estado>
---
```

Debajo del front-matter va la descripción funcional en prosa.

> **Regla anti-deriva:** el `estado` aquí es la *intención declarada*; la verdad mecánica del "qué funciona" la dan `verificado_por` (tests, `tsc --checkJs`, CI). Si divergen, manda lo verificado.
