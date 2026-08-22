/**
 * Static file server for the built app. No dependencies — Railway (or anything
 * else with a Node runtime) can run this directly after `npm run build`.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, join, normalize, sep } from 'node:path';

const ROOT = fileURLToPath(new URL('./dist/', import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

async function send(res, path, status = 200) {
  const body = await readFile(path);
  const type = TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream';
  // Hashed asset filenames are safe to cache hard; index.html must not be.
  const cache = path.includes(`${sep}assets${sep}`)
    ? 'public, max-age=31536000, immutable'
    : 'no-cache';
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': cache });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const rel = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
    const path = join(ROOT, rel || 'index.html');

    // Never serve anything outside dist/.
    if (!path.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    try {
      await send(res, path);
    } catch {
      // Unknown path: hand back the app shell so client-side routing still works.
      await send(res, join(ROOT, 'index.html'), 200);
    }
  } catch (error) {
    console.error(error);
    res.writeHead(500).end('Internal Server Error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Habit Wheel listening on http://0.0.0.0:${PORT}`);
});
