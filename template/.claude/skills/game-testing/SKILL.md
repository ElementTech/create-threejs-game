---
name: game-testing
description: Test and iterate on Three.js games using Playwright browser automation. Use when you need to play the game, take screenshots, simulate input, or verify game behavior programmatically.
---

# Game Testing with Playwright

Automate game testing to iterate like a human would: play, observe, fix, repeat.

## When to Use This Skill

- Verify the game loads without errors
- Test player movement and controls
- Check UI elements render correctly
- Validate game mechanics work
- Take screenshots for visual debugging
- Create a feedback loop for iterative development

## Quick Start

### Install Playwright

```bash
npm install -D playwright
npx playwright install chromium
```

### Basic Test Pattern

```javascript
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

async function testGame() {
  // 1. Start local server
  const server = await startServer('./public', 3000);
  
  // 2. Launch browser
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // 3. Navigate to game
  await page.goto('http://localhost:3000');
  
  // 4. Wait for Three.js to initialize
  await page.waitForFunction(() => {
    return window.THREE !== undefined && document.querySelector('canvas');
  }, { timeout: 10000 });
  
  // 5. Take screenshot
  await page.screenshot({ path: 'screenshot.png' });
  
  // 6. Check for errors
  const errors = await page.evaluate(() => window.__gameErrors || []);
  console.log('Errors:', errors);
  
  // 7. Cleanup
  await browser.close();
  server.close();
}

// Simple static file server
function startServer(dir, port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const filePath = path.join(dir, req.url === '/' ? 'index.html' : req.url);
      const ext = path.extname(filePath);
      const contentType = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gltf': 'model/gltf+json',
        '.glb': 'model/gltf-binary',
      }[ext] || 'application/octet-stream';
      
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
        }
      });
    });
    server.listen(port, () => resolve(server));
  });
}

testGame();
```

## Core Patterns

### Taking Screenshots

```javascript
// Full page screenshot
await page.screenshot({ path: 'full.png', fullPage: true });

// Just the canvas (game viewport)
const canvas = await page.$('canvas');
await canvas.screenshot({ path: 'game.png' });

// Screenshot with timestamp
const timestamp = Date.now();
await page.screenshot({ path: `screenshots/game-${timestamp}.png` });
```

### Simulating Keyboard Input

```javascript
// Press and release a key
await page.keyboard.press('Space');
await page.keyboard.press('Escape');

// Hold a key (for movement)
await page.keyboard.down('KeyW');
await page.waitForTimeout(1000); // Hold for 1 second
await page.keyboard.up('KeyW');

// Multiple keys for diagonal movement
await page.keyboard.down('KeyW');
await page.keyboard.down('KeyD');
await page.waitForTimeout(500);
await page.keyboard.up('KeyW');
await page.keyboard.up('KeyD');

// Arrow keys
await page.keyboard.press('ArrowUp');
await page.keyboard.press('ArrowLeft');

// Type text (for name input, etc.)
await page.keyboard.type('PlayerOne');
```

### Simulating Mouse Input

```javascript
// Click at specific coordinates
await page.mouse.click(400, 300);

// Click on canvas center
const canvas = await page.$('canvas');
const box = await canvas.boundingBox();
await page.mouse.click(
  box.x + box.width / 2,
  box.y + box.height / 2
);

// Mouse movement (for camera control)
await page.mouse.move(400, 300);
await page.mouse.down();
await page.mouse.move(500, 300); // Drag right
await page.mouse.up();

// Right-click (context menu, commands)
await page.mouse.click(400, 300, { button: 'right' });

// Scroll (zoom)
await page.mouse.wheel(0, -100); // Zoom in
await page.mouse.wheel(0, 100);  // Zoom out
```

### Reading Game State

```javascript
// Check if game loaded successfully
const gameLoaded = await page.evaluate(() => {
  return window.game !== undefined && window.game.scene !== undefined;
});

// Get player position
const playerPos = await page.evaluate(() => {
  if (window.game && window.game.player) {
    const pos = window.game.player.position;
    return { x: pos.x, y: pos.y, z: pos.z };
  }
  return null;
});

// Get game score/state
const gameState = await page.evaluate(() => {
  return {
    score: window.game?.score || 0,
    health: window.game?.player?.health || 0,
    gameOver: window.game?.isGameOver || false,
    isPaused: window.game?.isPaused || false
  };
});

// Count entities in scene
const entityCount = await page.evaluate(() => {
  if (window.game && window.game.scene) {
    return window.game.scene.children.length;
  }
  return 0;
});

// Get camera info
const cameraInfo = await page.evaluate(() => {
  if (window.game && window.game.camera) {
    const cam = window.game.camera;
    return {
      position: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
      fov: cam.fov,
      zoom: cam.zoom
    };
  }
  return null;
});
```

### Checking for Errors

```javascript
// Collect console errors
const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') {
    errors.push(msg.text());
  }
});

page.on('pageerror', err => {
  errors.push(err.message);
});

// After testing
await page.goto('http://localhost:3000');
await page.waitForTimeout(3000);

if (errors.length > 0) {
  console.log('Game errors:', errors);
} else {
  console.log('No errors detected');
}
```

### Measuring Performance

```javascript
// Get FPS from game (if exposed)
const fps = await page.evaluate(() => {
  return window.game?.fps || window.fps || null;
});

// Use Performance API
const perfMetrics = await page.evaluate(() => {
  const entries = performance.getEntriesByType('navigation');
  return {
    loadTime: entries[0]?.loadEventEnd - entries[0]?.startTime,
    domReady: entries[0]?.domContentLoadedEventEnd - entries[0]?.startTime
  };
});

// Memory usage (if available)
const memory = await page.evaluate(() => {
  if (performance.memory) {
    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize
    };
  }
  return null;
});
```

## Testing Workflow

### Iterative Testing Loop

```javascript
async function iterativeTest() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Collect errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));
  
  // Load game
  await page.goto('http://localhost:3000');
  
  // Wait for load
  try {
    await page.waitForFunction(() => {
      return document.querySelector('canvas') && window.game;
    }, { timeout: 10000 });
  } catch (e) {
    await page.screenshot({ path: 'error-loading.png' });
    console.log('Game failed to load. Screenshot saved.');
    await browser.close();
    return { success: false, errors, screenshot: 'error-loading.png' };
  }
  
  // Take initial screenshot
  await page.screenshot({ path: 'initial.png' });
  
  // Simulate gameplay
  console.log('Testing movement...');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyW');
  await page.screenshot({ path: 'after-move.png' });
  
  // Get final state
  const state = await page.evaluate(() => ({
    playerPos: window.game?.player?.position,
    score: window.game?.score,
    entities: window.game?.scene?.children?.length
  }));
  
  await browser.close();
  
  return {
    success: errors.length === 0,
    errors,
    state,
    screenshots: ['initial.png', 'after-move.png']
  };
}
```

### Complete Test Suite

```javascript
async function runGameTests() {
  const results = {
    load: false,
    render: false,
    movement: false,
    input: false,
    errors: []
  };
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('pageerror', err => results.errors.push(err.message));
  
  try {
    // TEST 1: Game loads
    await page.goto('http://localhost:3000');
    await page.waitForSelector('canvas', { timeout: 5000 });
    results.load = true;
    console.log('✓ Game loads');
    
    // TEST 2: Three.js renders
    const hasRenderer = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return canvas && canvas.width > 0 && canvas.height > 0;
    });
    results.render = hasRenderer;
    console.log(hasRenderer ? '✓ Canvas renders' : '✗ Canvas not rendering');
    
    // TEST 3: Movement works
    const posBefore = await page.evaluate(() => 
      window.game?.player?.position?.clone?.() || null
    );
    
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyW');
    
    const posAfter = await page.evaluate(() =>
      window.game?.player?.position?.clone?.() || null
    );
    
    if (posBefore && posAfter) {
      const moved = posBefore.x !== posAfter.x || 
                    posBefore.y !== posAfter.y || 
                    posBefore.z !== posAfter.z;
      results.movement = moved;
      console.log(moved ? '✓ Movement works' : '✗ Movement not working');
    }
    
    // TEST 4: Input responds
    const inputWorks = await page.evaluate(() => {
      return typeof window.game?.handleInput === 'function' ||
             document.onkeydown !== null;
    });
    results.input = inputWorks;
    console.log(inputWorks ? '✓ Input handlers exist' : '✗ No input handlers');
    
  } catch (e) {
    results.errors.push(e.message);
  }
  
  await page.screenshot({ path: 'test-results.png' });
  await browser.close();
  
  // Summary
  const passed = Object.values(results).filter(v => v === true).length;
  const total = 4;
  console.log(`\nResults: ${passed}/${total} tests passed`);
  if (results.errors.length > 0) {
    console.log('Errors:', results.errors);
  }
  
  return results;
}
```

## Tips

### Waiting for Game Ready

```javascript
// Wait for specific game state
await page.waitForFunction(() => {
  return window.game && 
         window.game.isLoaded === true &&
         window.game.scene.children.length > 0;
}, { timeout: 15000 });
```

### Debugging with Visible Browser

```javascript
// Launch with head (visible) for debugging
const browser = await chromium.launch({ 
  headless: false,
  slowMo: 100 // Slow down actions to observe
});
```

### Saving Test Artifacts

```javascript
const fs = require('fs');

// Create screenshots directory
if (!fs.existsSync('test-output')) {
  fs.mkdirSync('test-output');
}

// Save screenshot with context
await page.screenshot({ 
  path: `test-output/${testName}-${Date.now()}.png` 
});

// Save game state as JSON
const state = await page.evaluate(() => window.game?.getState?.() || {});
fs.writeFileSync('test-output/state.json', JSON.stringify(state, null, 2));
```

### Testing Different Screen Sizes

```javascript
// Mobile viewport
await page.setViewportSize({ width: 375, height: 667 });
await page.screenshot({ path: 'mobile.png' });

// Desktop viewport
await page.setViewportSize({ width: 1920, height: 1080 });
await page.screenshot({ path: 'desktop.png' });
```

## See Also

- `threejs-fundamentals` - Scene setup and rendering
- `threejs-interaction` - Input handling patterns
- `game-web` - Browser game optimization
