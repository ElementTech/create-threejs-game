#!/usr/bin/env node

/**
 * Game smoke test runner (Playwright)
 *
 * Starts a local static server for `public/`, opens `public/index.html`,
 * takes screenshots, and runs basic checks suitable for AI-driven iteration.
 *
 * Usage:
 *   node scripts/test-game.js
 *   node scripts/test-game.js --headed
 *   node scripts/test-game.js --url=http://127.0.0.1:8080/
 *
 * Output:
 *   - Screenshots: artifacts/game-testing/screenshots/
 *   - Results JSON: artifacts/game-testing/results.json
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {
    headed: false,
    url: null,
    timeoutMs: 30_000,
    expectDebugApi: false,
    outDir: null
  };

  for (const arg of argv) {
    if (arg === '--headed') args.headed = true;
    else if (arg.startsWith('--url=')) args.url = arg.split('=').slice(1).join('=');
    else if (arg.startsWith('--timeout=')) args.timeoutMs = Number(arg.split('=').slice(1).join('='));
    else if (arg === '--expect-debug') args.expectDebugApi = true;
    else if (arg.startsWith('--out-dir=')) args.outDir = arg.split('=').slice(1).join('=');
    else if (arg === '--help' || arg === '-h') args.help = true;
  }

  return args;
}

function printHelp() {
  console.log(`
Game Testing (Playwright)

Usage:
  node scripts/test-game.js [options]

Options:
  --headed           Run with a visible browser (debugging)
  --url=URL          Test an existing URL instead of starting a server
  --timeout=MS       Navigation timeout in milliseconds (default: 30000)
  --out-dir=DIR      Output directory (default: artifacts/game-testing)
  --expect-debug     Fail if window.__GAME__ debug API is missing
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
  const screenshotsDir = path.join(outDir, 'screenshots');
  ensureDir(screenshotsDir);

  const resultsPath = path.join(outDir, 'results.json');
  const screenshotSmokePath = path.join(screenshotsDir, 'smoke.png');
  const screenshotAfterInputPath = path.join(screenshotsDir, 'after-input.png');

  let server = null;
  let serverUrl = args.url;

  if (!serverUrl) {
    if (!fs.existsSync(indexHtmlPath)) {
      console.error('Error: public/index.html not found.');
      console.error('This template expects the game to live at public/index.html (single HTML file).');
      console.error('Create it first, then re-run: node scripts/test-game.js');
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

  const { chromium } = playwright;
  const browser = await chromium.launch({
    headless: !args.headed,
    args: [
      // Improve WebGL reliability in headless environments
      '--enable-webgl',
      '--use-gl=swiftshader'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const requestFailures = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err instanceof Error ? err.message : String(err));
  });
  page.on('requestfailed', (req) => {
    requestFailures.push({
      url: req.url(),
      method: req.method(),
      failure: req.failure() ? req.failure().errorText : 'unknown'
    });
  });

  const checks = [];
  const startedAt = new Date().toISOString();

  function pass(name, details) {
    checks.push({ name, status: 'pass', details: details || null });
  }
  function fail(name, details) {
    checks.push({ name, status: 'fail', details: details || null });
  }
  function skip(name, details) {
    checks.push({ name, status: 'skip', details: details || null });
  }

  try {
    console.log('🧪 Game smoke test');
    console.log('URL:', serverUrl);
    console.log('Output:', outDir);

    await page.goto(serverUrl, { waitUntil: 'load', timeout: args.timeoutMs });
    pass('Page loads');

    await page.waitForSelector('canvas', { timeout: 10_000 });
    pass('Canvas exists');

    // Give the game a moment to render its first frame(s)
    await page.waitForTimeout(750);

    await page.screenshot({ path: screenshotSmokePath, fullPage: true });
    pass('Screenshot (smoke)', screenshotSmokePath);

    // Check WebGL availability (best-effort)
    const webglInfo = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { ok: false, reason: 'No canvas element found' };
      const gl2 = canvas.getContext('webgl2');
      const gl = gl2 || canvas.getContext('webgl');
      return { ok: !!gl, context: gl2 ? 'webgl2' : (gl ? 'webgl' : null) };
    });

    if (webglInfo.ok) pass('WebGL context created', webglInfo.context);
    else fail('WebGL context created', webglInfo.reason);

    // Verify rAF is ticking (best-effort)
    await page.evaluate(() => {
      window.__PLAYWRIGHT_GAME_TEST__ = window.__PLAYWRIGHT_GAME_TEST__ || {};
      window.__PLAYWRIGHT_GAME_TEST__.rafCount = 0;
      const tick = () => {
        window.__PLAYWRIGHT_GAME_TEST__.rafCount += 1;
        window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
    });
    await page.waitForTimeout(500);
    const rafCount = await page.evaluate(() => window.__PLAYWRIGHT_GAME_TEST__?.rafCount ?? 0);
    if (rafCount > 0) pass('Animation frames ticking', rafCount);
    else fail('Animation frames ticking', rafCount);

    // Gather debug state (optional but recommended)
    const debugState = await page.evaluate(() => {
      function serializeVector3(v) {
        if (!v || typeof v !== 'object') return null;
        if (typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') return null;
        return { x: v.x, y: v.y, z: v.z };
      }

      const game =
        globalThis.__GAME__ ||
        globalThis.game ||
        globalThis.GAME ||
        globalThis.__game ||
        null;

      if (!game) {
        return { ok: false, reason: 'Missing global debug handle (expected window.__GAME__)' };
      }

      const state =
        (typeof game.getTestState === 'function' && game.getTestState()) ||
        (typeof game.getState === 'function' && game.getState()) ||
        game.state ||
        null;

      const player = game.player || state?.player || null;
      const playerPosition =
        serializeVector3(player?.position) ||
        serializeVector3(state?.playerPosition) ||
        serializeVector3(game.playerPosition) ||
        null;

      const camera = game.camera || null;
      const cameraPosition = serializeVector3(camera?.position) || null;

      const score = state?.score ?? game.score ?? null;
      const health = state?.health ?? game.health ?? null;

      return {
        ok: true,
        hasScene: !!game.scene,
        hasCamera: !!game.camera,
        hasRenderer: !!game.renderer,
        score,
        health,
        playerPosition,
        cameraPosition
      };
    });

    if (debugState.ok) pass('Debug API available (window.__GAME__)', debugState);
    else {
      if (args.expectDebugApi) fail('Debug API available (window.__GAME__)', debugState.reason);
      else skip('Debug API available (window.__GAME__)', debugState.reason);
    }

    // Basic movement test (requires debug API + playerPosition)
    if (debugState.ok && debugState.playerPosition) {
      const before = debugState.playerPosition;

      // Try both WASD and Arrow keys (common defaults)
      await page.keyboard.down('KeyW');
      await page.waitForTimeout(400);
      await page.keyboard.up('KeyW');
      await page.waitForTimeout(200);
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(200);

      const after = await page.evaluate(() => {
        function serializeVector3(v) {
          if (!v || typeof v !== 'object') return null;
          if (typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') return null;
          return { x: v.x, y: v.y, z: v.z };
        }
        const game = globalThis.__GAME__ || globalThis.game || globalThis.GAME || globalThis.__game || null;
        if (!game) return null;
        const state =
          (typeof game.getTestState === 'function' && game.getTestState()) ||
          (typeof game.getState === 'function' && game.getState()) ||
          game.state ||
          null;
        const player = game.player || state?.player || null;
        return serializeVector3(player?.position) || serializeVector3(state?.playerPosition) || serializeVector3(game.playerPosition) || null;
      });

      if (after) {
        const moved = Math.abs(after.x - before.x) + Math.abs(after.y - before.y) + Math.abs(after.z - before.z);
        if (moved > 1e-6) pass('Player moves with input', { before, after });
        else fail('Player moves with input', { before, after });
      } else {
        fail('Player moves with input', 'Could not read player position after input');
      }
    } else {
      skip('Player moves with input', 'Requires window.__GAME__ with a readable playerPosition');
    }

    await page.screenshot({ path: screenshotAfterInputPath, fullPage: true });
    pass('Screenshot (after input)', screenshotAfterInputPath);

    // Console/page errors (collected throughout)
    if (consoleErrors.length === 0) pass('No console.error');
    else fail('No console.error', consoleErrors);

    if (pageErrors.length === 0) pass('No page errors');
    else fail('No page errors', pageErrors);

    if (requestFailures.length === 0) pass('No failed network requests');
    else fail('No failed network requests', requestFailures.slice(0, 20));
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    if (server) await closeServer(server).catch(() => {});
  }

  const endedAt = new Date().toISOString();
  const passCount = checks.filter(c => c.status === 'pass').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  const skipCount = checks.filter(c => c.status === 'skip').length;

  const results = {
    startedAt,
    endedAt,
    url: serverUrl,
    screenshots: {
      smoke: screenshotSmokePath,
      afterInput: screenshotAfterInputPath
    },
    summary: { pass: passCount, fail: failCount, skip: skipCount },
    checks
  };

  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

  console.log('');
  console.log('Results:', resultsPath);
  console.log(`Summary: ${passCount} passed, ${failCount} failed, ${skipCount} skipped`);

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Fatal error:', err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});

