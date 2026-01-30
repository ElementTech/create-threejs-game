#!/usr/bin/env node

/**
 * Execution Plan Generation Script
 * 
 * Uses Claude API (Opus 4.5) to generate an implementation plan
 * based on the PRD and TDD.
 * 
 * Usage:
 *   node generate-plan.js [plan-name]
 * 
 * Example:
 *   node generate-plan.js initial-implementation
 * 
 * Requires:
 *   - config.json with anthropic.api_key and game settings
 *   - docs/prd.md
 *   - docs/tdd.md
 *   - public/assets/{game_name}/assets.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Generate random plan name if not provided
function generatePlanName() {
  const adjectives = ['swift', 'bold', 'bright', 'calm', 'dark', 'eager', 'fair', 'grand', 'keen', 'light', 'mossy', 'noble', 'proud', 'quick', 'rare', 'sage', 'true', 'vast', 'warm', 'wise'];
  const nouns = ['dawn', 'dusk', 'flame', 'frost', 'glade', 'grove', 'haven', 'isle', 'lake', 'marsh', 'oak', 'peak', 'pine', 'ridge', 'shore', 'stone', 'tide', 'vale', 'wind', 'wood'];
  const names = ['ada', 'blake', 'chen', 'darwin', 'euler', 'feynman', 'gauss', 'hopper', 'ito', 'jung', 'knuth', 'lovelace', 'maxwell', 'newton', 'oracle', 'pascal', 'quine', 'riemann', 'shannon', 'turing'];
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const name = names[Math.floor(Math.random() * names.length)];
  
  return `${adj}-${noun}-${name}`;
}

// Load config
const scriptDir = __dirname;
const projectRoot = path.join(scriptDir, '..');
const configPath = path.join(scriptDir, 'config.json');

if (!fs.existsSync(configPath)) {
  console.error('Error: config.json not found');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const { anthropic, game } = config;

// Check config first, then env vars
const apiKey = (anthropic?.api_key && !anthropic.api_key.includes('YOUR_'))
  ? anthropic.api_key
  : process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.error('Error: Anthropic API key not found');
  console.error('Set ANTHROPIC_API_KEY env var or configure scripts/config.json');
  process.exit(1);
}

// Use resolved key
anthropic.api_key = apiKey;

// Plan name from args or generate
const planName = process.argv[2] || generatePlanName();

// Paths
const prdPath = path.join(projectRoot, 'docs', 'prd.md');
const tddPath = path.join(projectRoot, 'docs', 'tdd.md');
const assetsJsonPath = path.join(projectRoot, 'public', 'assets', game.name, 'assets.json');
const plansDir = path.join(projectRoot, 'plans');
const outputPath = path.join(plansDir, `${planName}.md`);

// Check required files
const missingFiles = [];
if (!fs.existsSync(prdPath)) missingFiles.push(prdPath + ' (run generate-prd.js first)');
if (!fs.existsSync(tddPath)) missingFiles.push(tddPath + ' (run generate-tdd.js first)');
if (!fs.existsSync(assetsJsonPath)) missingFiles.push(assetsJsonPath);

if (missingFiles.length > 0) {
  console.error('Error: Missing required files:');
  missingFiles.forEach(f => console.error('  - ' + f));
  process.exit(1);
}

// Read files
const prdContent = fs.readFileSync(prdPath, 'utf-8');
const tddContent = fs.readFileSync(tddPath, 'utf-8');
const assetsJson = fs.readFileSync(assetsJsonPath, 'utf-8');

// Build prompt
const prompt = `Implement the game defined in the PRD below, adhering to the technical design in the TDD.

## PRD (Product Requirements Document):
${prdContent}

## TDD (Technical Design Document):
${tddContent.substring(0, 80000)}

## Available Assets (assets.json):
\`\`\`json
${assetsJson}
\`\`\`

---

Create a concise execution plan for implementing this game. The plan should be actionable and reference specific sections from the TDD.

# ${game.name.charAt(0).toUpperCase() + game.name.slice(1)} - Implementation Plan

## Overview
- Target file: \`public/index.html\` (single HTML file with inline CSS/JS)
- Key references to PRD and TDD sections
- Asset path format: \`assets/${game.name}/glTF/<FILENAME>.gltf\`

## Implementation Phases

### Phase 1: Core Engine (Critical)
What to implement from TDD:
- HTML structure with import map for Three.js r160
- Renderer with letterboxing
- Camera system
- Lighting setup
- Ground plane

### Phase 2: Asset Loading (Critical)
- GLTFLoader setup
- Core asset manifest
- Fallback primitives

### Phase 3: ECS Architecture (Critical)
- Entity class
- All component classes
- Entity Manager
- Entity Factory

### Phase 4: Selection System (Critical)
- Click selection
- Box selection
- Visual feedback (rings, animations)

### Phase 5: Command System (Critical)
- Move commands
- Attack commands
- Context-sensitive commands

### Phase 6: Movement System (Critical)
- Unit movement
- Collision/separation
- Turn rate smoothing

### Phase 7: Combat System (Critical)
- Melee attacks
- Ranged attacks (if applicable)
- Damage and death

### Phase 8: Economy System (Important)
- Resource gathering (if applicable)
- Building placement (if applicable)
- Unit training (if applicable)

### Phase 9: AI System (Important)
- State machine
- Economy behavior
- Combat behavior

### Phase 10: UI & Game States (Important)
- Menu screen
- HUD elements
- Pause screen
- Game over screen

### Phase 11: Effects (Polish)
- Screen shake
- Time dilation
- Particles
- Death sequences

### Phase 12: Mobile/Polish (Polish)
- Touch controls
- Onboarding tooltips
- Final polish

## Map Setup
- Initial entity positions
- Resource placement
- Obstacle placement

## Verification Checklist
From PRD Success Criteria:
- [ ] Game loads without errors
- [ ] (Include all success criteria)

## Estimated Code Size
~3000-4000 lines of JavaScript

## Next Step
To implement, use this prompt with Claude Code:
\`\`\`
Please proceed with implementing the game based on the plan in plans/${planName}.md
Use the Three.js skills for reference.
\`\`\`
`;

console.log('Generating execution plan with Claude API...');
console.log('Game:', game.name);
console.log('Plan name:', planName);

// Claude API request
const requestBody = JSON.stringify({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 8000,
  messages: [{
    role: 'user',
    content: prompt
  }]
});

const options = {
  hostname: 'api.anthropic.com',
  port: 443,
  path: '/v1/messages',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': anthropic.api_key,
    'anthropic-version': '2023-06-01'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
    process.stdout.write('.');
  });
  
  res.on('end', () => {
    console.log('\n');
    
    try {
      const response = JSON.parse(data);
      
      if (response.error) {
        console.error('API Error:', response.error.message);
        process.exit(1);
      }
      
      // Extract text content
      const content = response.content || [];
      let planContent = '';
      
      for (const block of content) {
        if (block.type === 'text') {
          planContent += block.text;
        }
      }
      
      if (!planContent) {
        console.error('No content in response');
        process.exit(1);
      }
      
      // Ensure plans directory exists
      if (!fs.existsSync(plansDir)) {
        fs.mkdirSync(plansDir, { recursive: true });
      }
      
      // Save plan
      fs.writeFileSync(outputPath, planContent);
      
      console.log('Execution plan generated successfully!');
      console.log('Output:', outputPath);
      console.log('');
      console.log('Next step - run in Claude Code:');
      console.log(`  Please proceed with implementing the game based on the plan in plans/${planName}.md`);
      
    } catch (err) {
      console.error('Error parsing response:', err.message);
      console.error('Raw response:', data.substring(0, 1000));
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err.message);
  process.exit(1);
});

req.write(requestBody);
req.end();
