---
modulo: docs-pipeline
capa: docs
estado: en-progreso
interfaz: parseFrontmatter, npm run docs:build
dependencias: (ninguna; solo Node stdlib)
archivos_clave: tools/docs-gen/src/frontmatter.js, tools/docs-gen/build.js
verificado_por: tools/docs-gen/test/frontmatter.test.js
---

# docs-pipeline

Genera `docs/index.html` (resumen interactivo navegable) a partir del Markdown que es fuente única: lee el front-matter de `docs/estado/` y la lista de `docs/decisiones/`. Nunca se escribe HTML a mano, así que no deriva. Ver [ADR-0006](../decisiones/0006-docs-markdown-fuente-unica-html-generado.md).
