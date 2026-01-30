#!/usr/bin/env node

/**
 * Full Pipeline Orchestration Script
 * 
 * Runs the complete game generation pipeline:
 * 1. Generate assets.json (if needed)
 * 2. Generate concept mockup
 * 3. Generate PRD
 * 4. Generate TDD
 * 5. Generate execution plan
 * 
 * Usage:
 *   node pipeline.js [--skip-mockup] [--skip-to=step]
 * 
 * Options:
 *   --skip-mockup     Skip mockup generation (use existing concept.jpg)
 *   --skip-to=step    Skip to a specific step (assets, mockup, prd, tdd, plan)
 *   --plan-name=name  Use specific plan name instead of random
 * 
 * Requires:
 *   - config.json with API keys and game settings
 *   - Assets in public/assets/{game_name}/
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);
const skipMockup = args.includes('--skip-mockup');
const skipToArg = args.find(a => a.startsWith('--skip-to='));
const skipTo = skipToArg ? skipToArg.split('=')[1] : null;
const planNameArg = args.find(a => a.startsWith('--plan-name='));
const planName = planNameArg ? planNameArg.split('=')[1] : null;

// Script directory
const scriptDir = __dirname;
const projectRoot = path.join(scriptDir, '..');
const configPath = path.join(scriptDir, 'config.json');

// Check config
if (!fs.existsSync(configPath)) {
  console.error('Error: config.json not found');
  console.error('Copy config.example.json to config.json and configure it');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const gameName = config.game?.name;

if (!gameName) {
  console.error('Error: game.name not set in config.json');
  process.exit(1);
}

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║           THREE.JS GAME GENERATION PIPELINE                   ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log('');
console.log('Game:', gameName);
console.log('Description:', config.game?.description?.substring(0, 60) + '...');
console.log('');

// Steps
const steps = ['assets', 'mockup', 'prd', 'tdd', 'plan'];
const stepIndex = skipTo ? steps.indexOf(skipTo) : 0;

if (skipTo && stepIndex === -1) {
  console.error('Invalid --skip-to value. Options:', steps.join(', '));
  process.exit(1);
}

// Run a script and wait for completion
function runScript(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Running: ${scriptName} ${args.join(' ')}`);
    console.log('─'.repeat(60) + '\n');
    
    const child = spawn('node', [path.join(scriptDir, scriptName), ...args], {
      cwd: projectRoot,
      stdio: 'inherit'
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${scriptName} exited with code ${code}`));
      }
    });
    
    child.on('error', reject);
  });
}

// Check if file exists
function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    console.log(`✓ ${description}: ${path.basename(filePath)}`);
    return true;
  } else {
    console.log(`✗ ${description}: NOT FOUND`);
    return false;
  }
}

// Main pipeline
async function runPipeline() {
  try {
    const assetsDir = path.join(projectRoot, 'public', 'assets', gameName);
    
    // Step 1: Check/Generate assets.json
    if (stepIndex <= 0) {
      console.log('\n📦 STEP 1: Asset Index');
      console.log('─'.repeat(40));
      
      const assetsJsonPath = path.join(assetsDir, 'assets.json');
      const previewPath = path.join(assetsDir, 'Preview.jpg');
      
      // Check for assets directory
      if (!fs.existsSync(assetsDir)) {
        console.error(`\nError: Assets directory not found: ${assetsDir}`);
        console.error('Please add your assets first.');
        process.exit(1);
      }
      
      // Check for preview image
      if (!checkFile(previewPath, 'Preview image')) {
        // Try alternative names
        const altNames = ['preview.jpg', 'Preview.png', 'preview.png', 'preview.jpeg'];
        let found = false;
        for (const alt of altNames) {
          const altPath = path.join(assetsDir, alt);
          if (fs.existsSync(altPath)) {
            console.log(`  Found alternative: ${alt}, renaming to Preview.jpg`);
            fs.renameSync(altPath, previewPath);
            found = true;
            break;
          }
        }
        if (!found) {
          console.error('\nWarning: No preview image found. Mockup generation may fail.');
        }
      }
      
      // Generate assets.json if needed
      if (!fs.existsSync(assetsJsonPath)) {
        await runScript('generate-assets-json.js', [gameName]);
      } else {
        console.log(`✓ assets.json already exists`);
      }
    }
    
    // Step 2: Generate mockup
    if (stepIndex <= 1 && !skipMockup) {
      console.log('\n🎨 STEP 2: Concept Mockup');
      console.log('─'.repeat(40));
      
      const conceptPath = path.join(projectRoot, 'public', gameName, 'concept.jpg');
      
      if (fs.existsSync(conceptPath)) {
        console.log('✓ concept.jpg already exists');
        console.log('  Use --skip-mockup to keep it, or delete to regenerate');
      }
      
      await runScript('generate-mockup.js');
    } else if (skipMockup) {
      console.log('\n🎨 STEP 2: Concept Mockup (SKIPPED)');
    }
    
    // Step 3: Generate PRD
    if (stepIndex <= 2) {
      console.log('\n📋 STEP 3: Product Requirements Document');
      console.log('─'.repeat(40));
      
      await runScript('generate-prd.js');
    }
    
    // Step 4: Generate TDD
    if (stepIndex <= 3) {
      console.log('\n🔧 STEP 4: Technical Design Document');
      console.log('─'.repeat(40));
      
      await runScript('generate-tdd.js');
    }
    
    // Step 5: Generate Plan
    if (stepIndex <= 4) {
      console.log('\n📝 STEP 5: Execution Plan');
      console.log('─'.repeat(40));
      
      const planArgs = planName ? [planName] : [];
      await runScript('generate-plan.js', planArgs);
    }
    
    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('✅ PIPELINE COMPLETE');
    console.log('═'.repeat(60));
    console.log('');
    console.log('Generated files:');
    checkFile(path.join(assetsDir, 'assets.json'), '  assets.json');
    checkFile(path.join(projectRoot, 'public', gameName, 'concept.jpg'), '  concept.jpg');
    checkFile(path.join(projectRoot, 'docs', 'prd.md'), '  prd.md');
    checkFile(path.join(projectRoot, 'docs', 'tdd.md'), '  tdd.md');
    
    // Find the plan file
    const plansDir = path.join(projectRoot, 'plans');
    if (fs.existsSync(plansDir)) {
      const plans = fs.readdirSync(plansDir).filter(f => f.endsWith('.md'));
      if (plans.length > 0) {
        const latestPlan = plans[plans.length - 1];
        console.log(`  plan: ${latestPlan}`);
        console.log('');
        console.log('Next step - run in Claude Code:');
        console.log(`  Please proceed with implementing the game based on the plan in plans/${latestPlan}`);
      }
    }
    
  } catch (err) {
    console.error('\n❌ Pipeline failed:', err.message);
    process.exit(1);
  }
}

runPipeline();
