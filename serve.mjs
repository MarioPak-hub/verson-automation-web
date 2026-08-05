// Servidor estático mínimo para VERSON Automation.
// Uso: node serve.mjs   (sirve esta misma carpeta en http://localhost:PORT)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml':  'application/xml; charset=utf-8',
  '.txt':  'text/plain; charset=utf-8',
  '.glb':  'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.wasm': 'application/wasm',
  '.png':  'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};

createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

    // Drop ".html" from the address bar: /foo.html -> 301 /foo, /index.html -> 301 /
    if (urlPath.endsWith('.html')) {
      const clean = urlPath === '/index.html' ? '/' : urlPath.slice(0, -('.html'.length));
      const qs = (req.url.split('?')[1] || '');
      res.writeHead(301, { Location: clean + (qs ? '?' + qs : '') });
      return res.end();
    }

    if (urlPath === '/' || urlPath.endsWith('/')) urlPath += 'index.html';
    let filePath = normalize(join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
    let info;
    try {
      info = await stat(filePath);
    } catch {
      // Rutas sin extensión (ej. /nosotros) -> intenta con .html
      filePath = join(ROOT, urlPath + '.html');
      info = await stat(filePath);
    }
    if (info.isDirectory()) { res.writeHead(404); return res.end('Not found'); }
    const data = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=2592000',
    });
    res.end(data);
  } catch {
    try {
      const notFound = await readFile(join(ROOT, '404.html'));
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(notFound);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  }
}).listen(PORT, () => console.log(`VERSON Automation preview en http://localhost:${PORT}`));
