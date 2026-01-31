#!/usr/bin/env node

/**
 * Manual gameplay runner (Playwright)
 *
 * Starts a local static server for `public/` and opens the game in a visible
 * Chromium window for manual play. Optionally records video.
 *
 * Usage:
 *   node scripts/play-game.js
 *   node scripts/play-game.js --record
 *   node scripts/play-game.js --url=http://127.0.0.1:8080/
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {
    url: null,
    outDir: null,
    record: false,
    trace: false,
    slowMoMs: 0
  };

  for (const arg of argv) {
    if (arg.startsWith('--url=')) args.url = arg.split('=').slice(1).join('=');
    else if (arg.startsWith('--out-dir=')) args.outDir = arg.split('=').slice(1).join('=');
    else if (arg === '--record') args.record = true;
    else if (arg === '--trace') args.trace = true;
    else if (arg.startsWith('--slowmo=')) args.slowMoMs = Number(arg.split('=').slice(1).join('='));
    else if (arg === '--help' || arg === '-h') args.help = true;
  }

  return args;
}

function printHelp() {
  console.log(`
Play Game (Playwright)

Usage:
  node scripts/play-game.js [options]

Options:
  --url=URL          Open an existing URL instead of starting a server
  --out-dir=DIR      Output directory (default: artifacts/game-testing)
  --record           Record gameplay video to artifacts (saved on close)
  --trace            Record a Playwright trace (saved on close)
  --slowmo=MS        Slow down Playwright actions (useful for debugging)
`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'text/javascript; charset=utf-8';
    case '.mjs': return 'text/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.svg': return 'image/svg+xml; charset=utf-8';
    case '.gltf': return 'model/gltf+json';
    case '.glb': return 'model/gltf-binary';
    case '.bin': return 'application/octet-stream';
    case '.mp3': return 'audio/mpeg';
    case '.wav': return 'audio/wav';
    case '.ogg': return 'audio/ogg';
    default: return 'application/octet-stream';
  }
}

function createStaticServer(publicDirAbs) {
  return http.createServer((req, res) => {
    try {
      const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
      let relativePath = decodeURIComponent(requestUrl.pathname || '/');
      relativePath = relativePath.replace(/^\/+/, '');
      if (relativePath === '') relativePath = 'index.html';

      // Prevent path traversal
      const resolved = path.resolve(publicDirAbs, relativePath);
      if (!resolved.startsWith(publicDirAbs + path.sep) && resolved !== path.join(publicDirAbs, 'index.html')) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }

      if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }

      const buf = fs.readFileSync(resolved);
      res.statusCode = 200;
      res.setHeader('Content-Type', contentTypeFor(resolved));
      res.setHeader('Cache-Control', 'no-cache');
      res.end(buf);
    } catch (err) {
      res.statusCode = 500;
      res.end(err instanceof Error ? err.message : 'Internal Server Error');
    }
  });
}

function closeServer(server) {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  let playwright;
  try {
    playwright = require('playwright');
  } catch (err) {
    console.error('Error: Playwright is not installed.');
    console.error('Run: npm install');
    console.error('');
    console.error('Details:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const scriptDir = __dirname;
  const projectRoot = path.join(scriptDir, '..');
  const publicDir = path.join(projectRoot, 'public');
  const indexHtmlPath = path.join(publicDir, 'index.html');

  const outDir = args.outDir ? path.resolve(process.cwd(), args.outDir) : path.join(projectRoot, 'artifacts', 'game-testing');
  const videosDir = path.join(outDir, 'videos');
  const tracesDir = path.join(outDir, 'traces');
  ensureDir(outDir);
  ensureDir(videosDir);
  ensureDir(tracesDir);

  let server = null;
  let serverUrl = args.url;

  if (!serverUrl) {
    if (!fs.existsSync(indexHtmlPath)) {
      console.error('Error: public/index.html not found.');
      console.error('Create it first, then re-run: node scripts/play-game.js');
      process.exit(1);
    }

    server = createStaticServer(path.resolve(publicDir));
    await new Promise((resolve, reject) => {
      server.listen(0, '127.0.0.1', () => resolve());
      server.on('error', reject);
    });

    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : null;
    if (!port) {
      console.error('Error: failed to start server on an available port.');
      process.exit(1);
    }

    serverUrl = `http://127.0.0.1:${port}/`;
  }

  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const tracePath = path.join(tracesDir, `trace-${runId}.zip`);

  const { chromium } = playwright;
  const browser = await chromium.launch({
    headless: false,
    slowMo: args.slowMoMs || 0,
    args: [
      '--enable-webgl'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: args.record ? { dir: videosDir, size: { width: 1280, height: 720 } } : undefined
  });

  if (args.trace) {
    await context.tracing.start({ screenshots: true, snapshots: true });
  }

  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('[console.error]', msg.text());
    }
  });
  page.on('pageerror', (err) => {
    console.error('[pageerror]', err instanceof Error ? err.message : String(err));
  });

  console.log('🎮 Play game');
  console.log('URL:', serverUrl);
  if (args.record) console.log('Recording video to:', videosDir);
  if (args.trace) console.log('Recording trace to:', tracePath);
  console.log('Close the browser window to stop.\n');

  await page.goto(serverUrl, { waitUntil: 'load', timeout: 30_000 });

  await new Promise((resolve) => {
    browser.on('disconnected', resolve);
  });

  if (args.trace) {
    await context.tracing.stop({ path: tracePath }).catch(() => {});
  }

  // Video is saved when the page/context closes (best-effort info message)
  if (args.record) {
    console.log('Video saved to:', videosDir);
  }

  await context.close().catch(() => {});
  await browser.close().catch(() => {});
  if (server) await closeServer(server).catch(() => {});
}

main().catch((err) => {
  console.error('Fatal error:', err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});

