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
// Find concept image (can be jpg or png)
const conceptDir = path.join(projectRoot, 'public', game.name);
const conceptPath = ['concept.jpg', 'concept.png', 'concept.jpeg']
  .map(f => path.join(conceptDir, f))
  .find(p => fs.existsSync(p));
const assetsJsonPath = path.join(projectRoot, 'public', 'assets', game.name, 'assets.json');
const previewPath = path.join(projectRoot, 'public', 'assets', game.name, 'Preview.jpg');
const outputPath = path.join(projectRoot, 'docs', 'tdd.md');

// Check required files
const missingFiles = [];
if (!fs.existsSync(prdPath)) missingFiles.push(prdPath + ' (run generate-prd.js first)');
if (!conceptPath) missingFiles.push(path.join(conceptDir, 'concept.jpg/png'));
if (!fs.existsSync(assetsJsonPath)) missingFiles.push(assetsJsonPath);

if (missingFiles.length > 0) {
  console.error('Error: Missing required files:');
  missingFiles.forEach(f => console.error('  - ' + f));
  process.exit(1);
}

// Determine mime type from extension
const conceptExt = path.extname(conceptPath).toLowerCase();
const conceptMimeType = conceptExt === '.png' ? 'image/png' : 'image/jpeg';

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
const prompt = `You are creating a Technical Design Document (TDD) for implementing a Three.js game.

Analyze the PRD below and create a TDD that covers ONLY the systems and features specified in the PRD. Do NOT add systems not required by the PRD.

## PRD (Product Requirements Document):
${prdContent}

## Available Assets (assets.json):
\`\`\`json
${assetsJson}
\`\`\`

## Three.js Skills Reference:
${skillsContext.substring(0, 30000)}

---

Create a Technical Design Document with COMPLETE, RUNNABLE code examples (not pseudocode). Structure as follows:

## 1. Overview
- Technical stack summary
- Systems required based on PRD analysis

## 2. Architecture Overview
- High-level module structure (ASCII diagram)
- Game state flow diagram

## 3. Core Engine Systems
Full implementation code for:
- Renderer setup with letterboxing (from PRD viewport specs)
- Scene setup with background/fog
- Camera system appropriate for this game type
- Lighting system (from PRD visual style)
- Asset loading with LoadingManager, GLTF loading, fallback primitives
- Asset manifest (list assets needed based on PRD)

## 4. Game Object System
Based on the PRD's Game Elements section, implement:
- Base entity/object class
- Component classes ONLY for features in the PRD
- Configuration objects for game entities
- Factory methods for creating game objects

## 5. Game Systems
For EACH system mentioned in the PRD's Core Mechanics, include full code:
- Only implement systems the PRD specifies
- Each system should be a self-contained class/module
- Include all methods needed for that system

## 6. Visual Effects System
Based on PRD's Game Feel section:
- Effects Manager class
- Only effects specified in the PRD

## 7. UI System
From PRD's Game States and UX sections:
- HTML structure
- CSS styles
- HUD elements needed for this game
- Menu screens (main, pause, game over)
- Touch controls if PRD specifies mobile support

## 8. Main Game Loop
- Game State enum (from PRD's Game States)
- Complete Game class
- Animation loop
- Win/lose condition checking (from PRD)
- HUD updates

## 9. Implementation Phases
Ordered phases based on system dependencies:
- Phase name and priority (Critical/Important/Polish)
- What to implement
- Dependencies on prior phases

## 10. Performance Considerations
- Optimizations relevant to this game type

## 11. Testing Checklist
- All success criteria from PRD as checkboxes

## 12. Appendix
- Reference tables for values defined in PRD

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
          media_type: conceptMimeType,
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
