#!/usr/bin/env node

/**
 * create-threejs-game CLI
 * 
 * Interactive CLI to scaffold a Three.js game project with AI-assisted
 * design documents and automation.
 * 
 * Usage:
 *   npx create-threejs-game
 *   npx create-threejs-game my-game
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync, spawn } = require('child_process');

// Sharp for image processing (optional, for combining previews)
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  // Sharp not available - preview combining will be skipped
}

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const c = (color, text) => `${colors[color]}${text}${colors.reset}`;

// Banner
function showBanner() {
  console.log('');
  console.log(c('cyan', '╔═══════════════════════════════════════════════════════════════╗'));
  console.log(c('cyan', '║') + c('bright', '           CREATE-THREEJS-GAME                              ') + c('cyan', '║'));
  console.log(c('cyan', '║') + '       AI-Assisted Three.js Game Scaffolding                 ' + c('cyan', '║'));
  console.log(c('cyan', '╚═══════════════════════════════════════════════════════════════╝'));
  console.log('');
}

// Readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisified question
function ask(question, defaultValue = '') {
  const prompt = defaultValue 
    ? `${question} ${c('dim', `(${defaultValue})`)}: `
    : `${question}: `;
  
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

// Promisified yes/no
async function confirm(question, defaultYes = true) {
  const hint = defaultYes ? 'Y/n' : 'y/N';
  const answer = await ask(`${question} [${hint}]`);
  
  if (!answer) return defaultYes;
  return answer.toLowerCase().startsWith('y');
}

// Copy directory recursively
function copyDir(src, dest, exclude = []) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    if (exclude.includes(entry.name)) continue;
    
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, exclude);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Find preview image in a directory
function findPreview(dir) {
  const previewNames = [
    'Preview.jpg', 'Preview.png', 'preview.jpg', 'preview.png', 
    'Preview.jpeg', 'preview.jpeg',
    'Content.jpg', 'Content.png', 'content.jpg', 'content.png',
    'Content.jpeg', 'content.jpeg'
  ];
  for (const name of previewNames) {
    const previewPath = path.join(dir, name);
    if (fs.existsSync(previewPath)) {
      return previewPath;
    }
  }
  return null;
}

// Recursively find all directories with preview images
function findPacksWithPreviews(dir, basePath = dir) {
  const packs = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  // Check if this directory has a preview
  const preview = findPreview(dir);
  if (preview && dir !== basePath) {
    // Use relative path from base as the name
    const relativePath = path.relative(basePath, dir);
    packs.push({
      name: relativePath,
      path: dir,
      preview: preview
    });
  }
  
  // Recursively check subdirectories
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue; // Skip hidden dirs
    
    const subdirPath = path.join(dir, entry.name);
    const subPacks = findPacksWithPreviews(subdirPath, basePath);
    packs.push(...subPacks);
  }
  
  return packs;
}

// Detect if directory is a multi-pack (has subdirs with previews)
function detectMultiPack(sourceDir) {
  const packsWithPreviews = findPacksWithPreviews(sourceDir, sourceDir);
  
  // Consider it a multi-pack if at least 2 directories have previews
  if (packsWithPreviews.length >= 2) {
    return packsWithPreviews;
  }
  
  return null;
}

// Combine preview images into a grid
async function combinePreviews(packs, outputPath) {
  if (!sharp) {
    console.log(c('yellow', '  ⚠ sharp not available - skipping preview combination'));
    return null;
  }
  
  // 16:9 aspect ratio cells work well for most asset pack previews
  const cellWidth = 960;
  const cellHeight = 540;
  const padding = 15;
  const backgroundColor = { r: 30, g: 30, b: 30, alpha: 1 };
  
  const cols = Math.ceil(Math.sqrt(packs.length));
  const rows = Math.ceil(packs.length / cols);
  const totalWidth = cols * cellWidth + (cols + 1) * padding;
  const totalHeight = rows * cellHeight + (rows + 1) * padding;
  
  console.log(c('dim', `  Creating ${cols}x${rows} combined preview...`));
  
  const composites = [];
  
  for (let i = 0; i < packs.length; i++) {
    const pack = packs[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    
    const x = padding + col * (cellWidth + padding);
    const y = padding + row * (cellHeight + padding);
    
    try {
      const resized = await sharp(pack.preview)
        .resize(cellWidth, cellHeight, {
          fit: 'contain',
          background: backgroundColor
        })
        .toBuffer();
      
      composites.push({
        input: resized,
        left: x,
        top: y
      });
    } catch (err) {
      console.log(c('yellow', `  ⚠ Failed to process ${pack.name}: ${err.message}`));
    }
  }
  
  if (composites.length === 0) return null;
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  await sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 4,
      background: backgroundColor
    }
  })
    .composite(composites)
    .jpeg({ quality: 90 })
    .toFile(outputPath);
  
  return outputPath;
}

// Run a script
function runScript(scriptPath, args = [], cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath, ...args], {
      cwd,
      stdio: 'inherit'
    });
    
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Script exited with code ${code}`));
    });
    
    child.on('error', reject);
  });
}

// Main CLI
async function main() {
  showBanner();
  
  // Get project name from args or prompt
  let projectName = process.argv[2];
  
  if (!projectName) {
    projectName = await ask(c('bright', 'Project name'), 'my-threejs-game');
  }
  
  // Sanitize project name
  projectName = projectName.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  
  const projectPath = path.join(process.cwd(), projectName);
  
  // Check if directory exists
  if (fs.existsSync(projectPath)) {
    const overwrite = await confirm(
      c('yellow', `Directory "${projectName}" already exists. Overwrite?`),
      false
    );
    if (!overwrite) {
      console.log(c('red', '\nAborted.'));
      rl.close();
      process.exit(1);
    }
    fs.rmSync(projectPath, { recursive: true });
  }
  
  console.log('');
  
  // Game name is same as project name (sanitized for folder)
  const gameName = projectName.replace(/-/g, '_');
  
  // Get game details
  console.log(c('bright', '📝 Game Details'));
  console.log(c('dim', '─'.repeat(50)));
  console.log(c('dim', 'Describe your game in 1-3 sentences. Be specific about:'));
  console.log(c('dim', '  - Game type (RTS, tower defense, puzzle, etc.)'));
  console.log(c('dim', '  - Setting/theme'));
  console.log(c('dim', '  - Core mechanics'));
  console.log('');
  
  const gameDescription = await ask(c('bright', 'Game description'));
  
  if (!gameDescription) {
    console.log(c('yellow', '\nWarning: No description provided. You can edit config.json later.'));
  }
  
  console.log('');
  
  // API Keys - check env vars first
  let googleApiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY || '';
  let anthropicApiKey = process.env.OPENAI_API_KEY || '';
  
  const hasGoogleEnv = googleApiKey && googleApiKey.length > 10;
  const hasAnthropicEnv = anthropicApiKey && anthropicApiKey.length > 10;
  
  if (hasGoogleEnv && hasAnthropicEnv) {
    console.log(c('bright', '🔑 API Keys'));
    console.log(c('dim', '─'.repeat(50)));
    console.log(c('green', '  ✓ ') + 'GOOGLE_API_KEY found in environment');
    console.log(c('green', '  ✓ ') + 'OPENAI_API_KEY found in environment');
    console.log('');
  } else {
    console.log(c('bright', '🔑 API Keys (optional - can configure later)'));
    console.log(c('dim', '─'.repeat(50)));
    
    if (hasGoogleEnv) {
      console.log(c('green', '  ✓ ') + 'GOOGLE_API_KEY found in environment');
    } else {
      console.log(c('dim', 'Google AI Studio enables automated mockup generation.'));
      googleApiKey = await ask('Google AI Studio API key');
    }
    
    if (hasAnthropicEnv) {
      console.log(c('green', '  ✓ ') + 'OPENAI_API_KEY found in environment');
    } else {
      console.log(c('dim', 'Anthropic enables automated PRD/TDD/plan generation.'));
      anthropicApiKey = await ask('Anthropic API key');
    }
    
    console.log('');
  }
  
  // Ask for assets location (required for automation)
  console.log(c('bright', '📁 3D Assets (Required)'));
  console.log(c('dim', '─'.repeat(50)));
  console.log(c('dim', 'The automation pipeline needs 3D assets to generate mockups and docs.'));
  console.log(c('dim', 'Download a GLTF asset pack from itch.io, Kenney.nl, etc. first.\n'));
  
  let assetsSourcePath = '';
  
  while (!assetsSourcePath) {
    let inputPath = await ask(c('bright', 'Path to assets folder'));
    
    if (!inputPath) {
      const skipAnyway = await confirm(
        c('yellow', 'Without assets, the automation pipeline cannot run. Skip anyway?'),
        false
      );
      if (skipAnyway) {
        console.log(c('yellow', '\n  ⚠ No assets provided. You\'ll need to add them manually before running the pipeline.\n'));
        break;
      }
      continue;
    }
    
    // Expand ~ to home directory
    if (inputPath.startsWith('~')) {
      inputPath = path.join(process.env.HOME || process.env.USERPROFILE, inputPath.slice(1));
    }
    
    // Resolve relative paths
    if (!path.isAbsolute(inputPath)) {
      inputPath = path.resolve(process.cwd(), inputPath);
    }
    
    // Validate path
    if (!fs.existsSync(inputPath)) {
      console.log(c('red', `  ✗ Path not found: ${inputPath}`));
      console.log(c('dim', '  Please check the path and try again.\n'));
      continue;
    }
    
    const stat = fs.statSync(inputPath);
    if (!stat.isDirectory()) {
      console.log(c('red', '  ✗ Path is not a directory.'));
      console.log(c('dim', '  Please provide a folder path.\n'));
      continue;
    }
    
    // Check if it has any gltf/glb files
    const hasModels = fs.readdirSync(inputPath, { recursive: true })
      .some(f => f.endsWith('.gltf') || f.endsWith('.glb'));
    
    if (!hasModels) {
      console.log(c('yellow', '  ⚠ No .gltf or .glb files found in this folder.'));
      const useAnyway = await confirm('Use this folder anyway?', false);
      if (!useAnyway) continue;
    }
    
    assetsSourcePath = inputPath;
    console.log(c('green', '  ✓ ') + 'Assets folder validated\n');
  }
  
  // Copy template
  console.log(c('bright', '📦 Creating project...'));
  console.log(c('dim', '─'.repeat(50)));
  
  // Find template directory
  const templateDir = path.join(__dirname, '..', 'template');
  const fallbackTemplateDir = path.join(__dirname, '..');
  
  const sourceDir = fs.existsSync(templateDir) ? templateDir : fallbackTemplateDir;
  
  // Files/folders to copy
  const itemsToCopy = ['.claude', '.codex', 'docs', 'plans', 'prompts', 'public', 'scripts', 'README.md'];
  
  fs.mkdirSync(projectPath, { recursive: true });
  
  for (const item of itemsToCopy) {
    const srcPath = path.join(sourceDir, item);
    const destPath = path.join(projectPath, item);
    
    if (fs.existsSync(srcPath)) {
      if (fs.statSync(srcPath).isDirectory()) {
        copyDir(srcPath, destPath, ['node_modules', '.git']);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
      console.log(c('green', '  ✓ ') + item);
    }
  }
  
  // Create config.json
  const config = {
    google_ai_studio: {
      api_key: googleApiKey || 'YOUR_GOOGLE_AI_STUDIO_API_KEY'
    },
    anthropic: {
      api_key: anthropicApiKey || 'YOUR_OPENAI_API_KEY'
    },
    game: {
      name: gameName,
      description: gameDescription || 'YOUR_GAME_DESCRIPTION'
    }
  };
  
  const configPath = path.join(projectPath, 'scripts', 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(c('green', '  ✓ ') + 'scripts/config.json');
  
  // Create assets directory
  const assetsDir = path.join(projectPath, 'public', 'assets', gameName);
  fs.mkdirSync(assetsDir, { recursive: true });
  
  // Copy assets if path was provided
  let isMultiPack = false;
  let multiPackInfo = null;
  
  if (assetsSourcePath) {
    // Check if this is a multi-pack directory
    multiPackInfo = detectMultiPack(assetsSourcePath);
    isMultiPack = multiPackInfo !== null;
    
    if (isMultiPack) {
      console.log(c('cyan', `  Detected multi-pack with ${multiPackInfo.length} asset packs:`));
      for (const pack of multiPackInfo) {
        console.log(c('dim', `    - ${pack.name}`));
      }
    }
    
    console.log(c('dim', '  Copying assets...'));
    copyDir(assetsSourcePath, assetsDir, ['node_modules', '.git', '.DS_Store']);
    
    // Count copied files
    const countFiles = (dir) => {
      let count = 0;
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory()) {
          count += countFiles(path.join(dir, item.name));
        } else {
          count++;
        }
      }
      return count;
    };
    const fileCount = countFiles(assetsDir);
    console.log(c('green', '  ✓ ') + `public/assets/${gameName}/ (${fileCount} files copied)`);
    
    // Combine previews if multi-pack
    if (isMultiPack && sharp) {
      try {
        const combinedPreviewPath = path.join(assetsDir, 'Preview.jpg');
        await combinePreviews(multiPackInfo, combinedPreviewPath);
        console.log(c('green', '  ✓ ') + 'Combined preview image generated');
      } catch (err) {
        console.log(c('yellow', `  ⚠ Could not combine previews: ${err.message}`));
      }
    }
  } else {
    fs.writeFileSync(path.join(assetsDir, '.gitkeep'), '');
    console.log(c('green', '  ✓ ') + `public/assets/${gameName}/`);
  }
  
  console.log('');
  console.log(c('green', `✅ Project created at: ${projectPath}`));
  console.log('');
  
  // Check if we can run automation
  const hasGoogleKey = googleApiKey && !googleApiKey.includes('YOUR_');
  const hasAnthropicKey = anthropicApiKey && !anthropicApiKey.includes('YOUR_');
  const hasDescription = gameDescription && gameDescription.length > 10;
  
  // Next steps
  console.log(c('bright', '📋 Next Steps'));
  console.log(c('dim', '─'.repeat(50)));
  console.log('');
  
  const steps = [];
  let stepNum = 1;
  
  // Check if assets were copied and if Preview exists
  const hasAssets = assetsSourcePath && fs.existsSync(assetsDir);
  const previewExists = hasAssets && (
    fs.existsSync(path.join(assetsDir, 'Preview.jpg')) ||
    fs.existsSync(path.join(assetsDir, 'Preview.png')) ||
    fs.existsSync(path.join(assetsDir, 'preview.jpg')) ||
    fs.existsSync(path.join(assetsDir, 'preview.png'))
  );
  
  // Step: Add assets (only if not already copied)
  if (!hasAssets) {
    steps.push({
      num: stepNum++,
      manual: true,
      text: `Add your 3D assets to ${c('cyan', `public/assets/${gameName}/`)}`,
      detail: 'Download a GLTF asset pack from itch.io, Kenney.nl, or similar'
    });
  }
  
  // Step: Add preview (only if not found)
  if (!previewExists) {
    steps.push({
      num: stepNum++,
      manual: true,
      text: `Ensure ${c('cyan', 'Preview.jpg')} exists in the assets folder`,
      detail: 'Most asset packs include one, or take a screenshot of your assets'
    });
  }
  
  // Step: API keys
  if (!hasGoogleKey || !hasAnthropicKey) {
    const missing = [];
    if (!hasGoogleKey) missing.push('Google AI Studio');
    if (!hasAnthropicKey) missing.push('Anthropic');
    
    steps.push({
      num: stepNum++,
      manual: true,
      text: `Add API keys to ${c('cyan', 'scripts/config.json')}`,
      detail: `Missing: ${missing.join(', ')}`
    });
  }
  
  // Step: Description
  if (!hasDescription) {
    steps.push({
      num: stepNum++,
      manual: true,
      text: `Add game description to ${c('cyan', 'scripts/config.json')}`,
      detail: 'Be specific about game type, setting, and mechanics'
    });
  }
  
  // Step: Run pipeline
  steps.push({
    num: stepNum++,
    manual: false,
    text: `Run ${c('cyan', 'node scripts/pipeline.js')}`,
    detail: 'Generates assets.json, mockup, PRD, TDD, and execution plan'
  });
  
  // Step: Implement
  steps.push({
    num: stepNum++,
    manual: false,
    text: 'Open in Claude Code/Cursor and follow the generated plan',
    detail: 'The plan will be in plans/ folder with implementation instructions'
  });
  
  // Print steps
  for (const step of steps) {
    const icon = step.manual ? c('yellow', '🖐️ ') : c('green', '🤖 ');
    const label = step.manual ? c('yellow', '[MANUAL]') : c('green', '[AUTO]');
    
    console.log(`${icon}${step.num}. ${step.text}`);
    console.log(`   ${label} ${c('dim', step.detail)}`);
    console.log('');
  }
  
  // Summary
  console.log(c('dim', '─'.repeat(50)));
  console.log('');
  console.log(c('bright', 'Quick commands:'));
  console.log(`  ${c('cyan', `cd ${projectName}`)}`);
  console.log(`  ${c('cyan', 'node scripts/pipeline.js')}  ${c('dim', '# After adding assets')}`);
  console.log('');
  
  // Offer to open directory
  const openDir = await confirm('Open project directory?', true);
  
  rl.close();
  
  if (openDir) {
    try {
      if (process.platform === 'darwin') {
        execSync(`open "${projectPath}"`);
      } else if (process.platform === 'win32') {
        execSync(`start "" "${projectPath}"`);
      } else {
        execSync(`xdg-open "${projectPath}"`);
      }
    } catch (e) {
      console.log(c('dim', `cd ${projectPath}`));
    }
  }
  
  console.log('');
  console.log(c('green', '🎮 Happy game building!'));
  console.log('');
}

// Run
main().catch((err) => {
  console.error(c('red', '\nError: ') + err.message);
  rl.close();
  process.exit(1);
});
