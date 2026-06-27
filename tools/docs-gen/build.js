// Genera docs/index.html: un resumen interactivo (estado por modulo + ADRs +
// enlaces) a partir del Markdown que es fuente unica. Nunca se edita el HTML a
// mano -> no deriva. Ver ADR-0006.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const docsDir = join(repoRoot, 'docs');

const { parseFrontmatter } = await import('./src/frontmatter.js');

/** @param {string} s */
const esc = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/** @param {string} dir @returns {string[]} ficheros .md ordenados */
function markdownFiles(dir) {
  try {
    return readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
  } catch {
    return [];
  }
}

// --- Estado por modulo ---
const estadoDir = join(docsDir, 'estado');
const modules = markdownFiles(estadoDir)
  .filter((f) => f.toLowerCase() !== 'readme.md')
  .map((f) => {
    const { data } = parseFrontmatter(readFileSync(join(estadoDir, f), 'utf8'));
    return { file: f, ...data };
  })
  .filter((m) => m.modulo);

const estadoOrden = { completado: 0, 'en-progreso': 1, pendiente: 2 };
modules.sort(
  (a, b) => (estadoOrden[a.estado] ?? 9) - (estadoOrden[b.estado] ?? 9) || String(a.modulo).localeCompare(String(b.modulo)),
);

// --- ADRs ---
const decisionesDir = join(docsDir, 'decisiones');
const adrs = markdownFiles(decisionesDir)
  .filter((f) => f !== '0000-plantilla.md' && f.toLowerCase() !== 'readme.md')
  .map((f) => {
    const text = readFileSync(join(decisionesDir, f), 'utf8');
    const titleLine = text.split('\n').find((l) => l.startsWith('# ')) ?? f;
    const estadoLine = text.split('\n').find((l) => l.includes('**Estado:**')) ?? '';
    return { file: f, title: titleLine.replace(/^#\s*/, ''), estado: estadoLine.replace(/.*\*\*Estado:\*\*/, '').trim() };
  });

const moduleRows = modules
  .map(
    (m) => `
      <tr>
        <td><a href="estado/${esc(m.file)}"><code>${esc(m.modulo)}</code></a></td>
        <td>${esc(m.capa ?? '')}</td>
        <td><span class="badge estado-${esc(m.estado ?? '')}">${esc(m.estado ?? '')}</span></td>
        <td>${esc(m.interfaz ?? '')}</td>
        <td class="muted">${esc(m.verificado_por ?? '')}</td>
      </tr>`,
  )
  .join('');

const adrRows = adrs
  .map(
    (a) => `<li><a href="decisiones/${esc(a.file)}">${esc(a.title)}</a> <span class="muted">— ${esc(a.estado)}</span></li>`,
  )
  .join('\n');

const generadoNota = 'Generado por tools/docs-gen desde el Markdown fuente. No editar a mano.';

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>EagleEye — resumen del proyecto</title>
<style>
  :root { color-scheme: light dark; --fg:#1a1a1a; --muted:#6b7280; --bg:#ffffff; --card:#f6f7f9; --border:#e5e7eb; --accent:#2563eb;
          --ok:#16a34a; --wip:#d97706; --todo:#9ca3af; }
  @media (prefers-color-scheme: dark){ :root{ --fg:#e5e7eb; --muted:#9ca3af; --bg:#0b0d10; --card:#15181d; --border:#262b33; --accent:#60a5fa; } }
  * { box-sizing:border-box; }
  body { margin:0; font:15px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif; color:var(--fg); background:var(--bg); }
  main { max-width:980px; margin:0 auto; padding:2rem 1.25rem 4rem; }
  h1 { margin:0 0 .25rem; font-size:1.8rem; } h2 { margin-top:2.2rem; border-bottom:1px solid var(--border); padding-bottom:.3rem; }
  p.lead { color:var(--muted); margin-top:0; }
  pre { background:var(--card); border:1px solid var(--border); border-radius:8px; padding:1rem; overflow:auto; font-size:13px; }
  table { width:100%; border-collapse:collapse; margin:.5rem 0; font-size:14px; }
  th,td { text-align:left; padding:.5rem .6rem; border-bottom:1px solid var(--border); vertical-align:top; }
  th { color:var(--muted); font-weight:600; }
  code { background:var(--card); padding:.1rem .35rem; border-radius:4px; }
  a { color:var(--accent); text-decoration:none; } a:hover { text-decoration:underline; }
  .muted { color:var(--muted); }
  .badge { display:inline-block; padding:.1rem .5rem; border-radius:999px; font-size:12px; font-weight:600; color:#fff; }
  .estado-completado { background:var(--ok); } .estado-en-progreso { background:var(--wip); } .estado-pendiente { background:var(--todo); }
  ul.links { columns:2; } ul.links li { margin:.2rem 0; }
  footer { margin-top:3rem; color:var(--muted); font-size:12px; }
</style>
</head>
<body>
<main>
  <h1>EagleEye</h1>
  <p class="lead">Motor de visión por computadora en navegador (inferencia 100&nbsp;% local) + hub de integraciones/relay. Resumen interactivo del proyecto.</p>

  <h2>Flujo del sistema</h2>
  <pre>cámara ─► Worker[MediaPipe] ─► ResultBus ─► overlay + HUD
                                       └─► emisor (coalesce ~15Hz) ─► WSS+DPoP ─►
   HUB: gateway(auth+validación+aislamiento) ─► ingest(consent+persistir+outbox)
        ─► pub/sub ─► proyectores→dashboards / relay→otros clientes</pre>

  <h2>Estado por módulo</h2>
  <table>
    <thead><tr><th>Módulo</th><th>Capa</th><th>Estado</th><th>Interfaz</th><th>Verificado por</th></tr></thead>
    <tbody>${moduleRows || '<tr><td colspan="5" class="muted">Sin módulos.</td></tr>'}</tbody>
  </table>

  <h2>Decisiones (ADRs)</h2>
  <ul>
${adrRows || '<li class="muted">Sin ADRs.</li>'}
  </ul>

  <h2>Documentación</h2>
  <ul class="links">
    <li><a href="superpowers/specs/2026-06-27-eagleeye-plataforma-design.md">Diseño maestro (spec)</a></li>
    <li><a href="arquitectura/vision-general.md">Visión general de arquitectura</a></li>
    <li><a href="glosario.md">Glosario</a></li>
    <li><a href="estado/">Fichas de estado por módulo</a></li>
    <li><a href="decisiones/">Registro de decisiones</a></li>
  </ul>

  <footer>${esc(generadoNota)}</footer>
</main>
</body>
</html>
`;

const outPath = join(docsDir, 'index.html');
writeFileSync(outPath, html, 'utf8');
console.log(`docs-gen: escrito ${outPath} (${modules.length} módulos, ${adrs.length} ADRs)`);
