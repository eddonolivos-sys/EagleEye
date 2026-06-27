// Certificado TLS autofirmado para el servidor de dev (solo desarrollo).
// Permite abrir la app por HTTPS desde un movil en la LAN -> contexto seguro ->
// navigator.mediaDevices disponible. El movil mostrara un aviso de certificado;
// se acepta una vez. Ver ADR-0009. NUNCA usar este certificado en produccion
// (produccion = Caddy con auto-TLS, ADR-0005).

import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { networkInterfaces } from 'node:os';
import selfsigned from 'selfsigned';

/** IPs IPv4 no internas de la maquina (para alcanzarla desde el movil). */
export function lanIPv4s() {
  /** @type {string[]} */
  const out = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const ni of list || []) {
      if (ni.family === 'IPv4' && !ni.internal) out.push(ni.address);
    }
  }
  return out;
}

/**
 * Garantiza un certificado que cubra localhost + las IPs dadas. Reusa el cacheado
 * si las cubre todas; si no, regenera.
 * @param {string} certDir
 * @param {string[]} ips
 * @returns {Promise<{ key: string, cert: string }>}
 */
export async function ensureDevCert(certDir, ips) {
  mkdirSync(certDir, { recursive: true });
  const keyPath = join(certDir, 'key.pem');
  const certPath = join(certDir, 'cert.pem');
  const metaPath = join(certDir, 'altnames.json');
  const want = ['localhost', '127.0.0.1', ...ips];

  if (existsSync(keyPath) && existsSync(certPath) && existsSync(metaPath)) {
    try {
      const had = JSON.parse(readFileSync(metaPath, 'utf8'));
      if (Array.isArray(had) && want.every((n) => had.includes(n))) {
        return { key: readFileSync(keyPath, 'utf8'), cert: readFileSync(certPath, 'utf8') };
      }
    } catch {
      /* regenerar */
    }
  }

  const altNames = [
    { type: 2, value: 'localhost' }, // type 2 = DNS
    { type: 7, ip: '127.0.0.1' }, // type 7 = IP
    ...ips.map((ip) => ({ type: 7, ip })),
  ];
  const pems = await selfsigned.generate([{ name: 'commonName', value: 'localhost' }], {
    days: 825, // limite que aceptan los navegadores
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [{ name: 'subjectAltName', altNames }],
  });
  writeFileSync(keyPath, pems.private);
  writeFileSync(certPath, pems.cert);
  writeFileSync(metaPath, JSON.stringify(want));
  return { key: pems.private, cert: pems.cert };
}
