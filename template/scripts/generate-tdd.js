#!/usr/bin/env node

/**
 * TDD Generation Script
 * 
 * Uses Claude API (Opus 4.5) to generate a Technical Design Document
 * based on the PRD, assets, and concept mockup.
 * 
 * Usage:
 *   node generate-tdd.js
 * 
 * Requires:
 *   - config.json with anthropic.api_key and game settings
 *   - docs/prd.md (run generate-prd.js first)
 *   - public/{game_name}/concept.jpg
 *   - public/assets/{game_name}/assets.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

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

// Paths
const prdPath = path.join(projectRoot, 'docs', 'prd.md');
const conceptPath = path.join(projectRoot, 'public', game.name, 'concept.jpg');
const assetsJsonPath = path.join(projectRoot, 'public', 'assets', game.name, 'assets.json');
const previewPath = path.join(projectRoot, 'public', 'assets', game.name, 'Preview.jpg');
const outputPath = path.join(projectRoot, 'docs', 'tdd.md');

// Check required files
const missingFiles = [];
if (!fs.existsSync(prdPath)) missingFiles.push(prdPath + ' (run generate-prd.js first)');
if (!fs.existsSync(conceptPath)) missingFiles.push(conceptPath);
if (!fs.existsSync(assetsJsonPath)) missingFiles.push(assetsJsonPath);

if (missingFiles.length > 0) {
  console.error('Error: Missing required files:');
  missingFiles.forEach(f => console.error('  - ' + f));
  process.exit(1);
}

// Read files
const prdContent = fs.readFileSync(prdPath, 'utf-8');
const conceptImage = fs.readFileSync(conceptPath).toString('base64');
const assetsJson = fs.readFileSync(assetsJsonPath, 'utf-8');

// Load Three.js skills for context
const skillsDir = path.join(projectRoot, '.claude', 'skills');
let skillsContext = '';
if (fs.existsSync(skillsDir)) {
  const skillFolders = fs.readdirSync(skillsDir);
  for (const folder of skillFolders) {
    const skillPath = path.join(skillsDir, folder, 'SKILL.md');
    if (fs.existsSync(skillPath)) {
      const content = fs.readFileSync(skillPath, 'utf-8');
      // Include more skill content for TDD
      skillsContext += `\n\n### ${folder}\n${content}`;
    }
  }
}

// Build prompt
const prompt = `Based on the following PRD, create a comprehensive Technical Design Document (TDD) that will ensure we can implement this game with minimal problems and maximum speed.

## PRD (Product Requirements Document):
${prdContent}

## Available Assets (assets.json):
\`\`\`json
${assetsJson}
\`\`\`

## Three.js Skills Reference:
${skillsContext.substring(0, 30000)}

---

Create a Technical Design Document with the following sections. Include COMPLETE, RUNNABLE code examples (not pseudocode):

## 1. Overview
- Technical stack summary table
- Reference materials list

## 2. Architecture Overview
- High-level module structure diagram (ASCII art)
- Game state flow diagram

## 3. Core Engine Systems
Include full implementation code for:
- Renderer setup with letterboxing
- Scene setup with fog and background
- RTS/appropriate Camera system class
- Lighting system setup
- Asset loading system with LoadingManager, GLTF loading, fallback primitives
- Asset manifest listing core assets to load

## 4. Entity Component System (ECS)
Include full code for:
- Core Entity class
- All component classes (Transform, Health, Movement, Combat, Collision, Selectable, etc.)
- Unit and building stats configuration objects
- Entity Factory with creation methods

## 5. Game Systems
Include full implementation code for each:
- Entity Manager (add, remove, query)
- Selection System (click, box select, visual feedback)
- Command System (move, attack, context-sensitive commands)
- Movement System (steering, separation, turn rate)
- Combat System (melee, ranged, projectiles, damage application)
- Economy/Resource System (gathering, dropoff, training queues)
- AI System (state machine, economy, military, raids)

## 6. Visual Effects System
Include code for:
- Effects Manager class
- Screen shake implementation
- Time dilation
- Floating text
- Particle effects (sparks, debris)
- Death sequences (unit collapse, building destruction)

## 7. UI System
Include complete:
- HTML structure
- Full CSS styles
- HUD elements
- Menu screens (main, pause, game over)
- Build palette if applicable
- Mobile touch controls

## 8. Main Game Loop
Include full implementation:
- Game State enum
- Complete Game class with all methods
- Animation loop
- Win/lose condition checking
- HUD updates

## 9. Implementation Phases
Ordered list with:
- Phase name and priority (Critical/Important/Polish)
- What to implement
- Dependencies

## 10. Performance Considerations
- Rendering optimizations
- Game logic optimizations
- Memory management tips

## 11. Testing Checklist
- All success criteria as checkboxes

## 12. Appendix
- Color palette reference table
- Animation timing reference table
- Unit stats reference table
- Building stats reference table

All code should use Three.js r160 APIs and follow best practices.`;

console.log('Generating TDD with Claude API (Opus 4.5)...');
console.log('Game:', game.name);
console.log('This may take a minute due to the comprehensive output...');

// Claude API request
const requestBody = JSON.stringify({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 64000,
  messages: [{
    role: 'user',
    content: [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: conceptImage
        }
      },
      {
        type: 'text',
        text: prompt
      }
    ]
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
      let tddContent = '';
      
      for (const block of content) {
        if (block.type === 'text') {
          tddContent += block.text;
        }
      }
      
      if (!tddContent) {
        console.error('No content in response');
        process.exit(1);
      }
      
      // Save TDD
      fs.writeFileSync(outputPath, tddContent);
      
      console.log('TDD generated successfully!');
      console.log('Output:', outputPath);
      console.log('Length:', tddContent.length, 'characters');
      
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
