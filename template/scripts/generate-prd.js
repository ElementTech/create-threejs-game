#!/usr/bin/env node

/**
 * PRD Generation Script
 * 
 * Uses Claude API (Opus 4.5) to generate a Product Requirements Document
 * based on the concept mockup, assets, and game description.
 * 
 * Usage:
 *   node generate-prd.js
 * 
 * Requires:
 *   - config.json with anthropic.api_key and game settings
 *   - public/{game_name}/concept.jpg (run generate-mockup.js first)
 *   - public/assets/{game_name}/Preview.jpg
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
const assetsDir = path.join(projectRoot, 'public', 'assets', game.name);
const conceptPath = path.join(projectRoot, 'public', game.name, 'concept.jpg');
const previewPath = path.join(assetsDir, 'Preview.jpg');
const assetsJsonPath = path.join(assetsDir, 'assets.json');
const outputPath = path.join(projectRoot, 'docs', 'prd.md');

// Check required files
const missingFiles = [];
if (!fs.existsSync(conceptPath)) missingFiles.push(conceptPath);
if (!fs.existsSync(previewPath)) missingFiles.push(previewPath);
if (!fs.existsSync(assetsJsonPath)) missingFiles.push(assetsJsonPath);

if (missingFiles.length > 0) {
  console.error('Error: Missing required files:');
  missingFiles.forEach(f => console.error('  - ' + f));
  if (missingFiles.includes(conceptPath)) {
    console.error('\nRun: node generate-mockup.js first');
  }
  process.exit(1);
}

// Read files
const conceptImage = fs.readFileSync(conceptPath).toString('base64');
const previewImage = fs.readFileSync(previewPath).toString('base64');
const assetsJson = fs.readFileSync(assetsJsonPath, 'utf-8');

// Load Three.js skills for context
const skillsDir = path.join(projectRoot, '.claude', 'skills');
let skillsContext = '';
if (fs.existsSync(skillsDir)) {
  const skillFolders = fs.readdirSync(skillsDir);
  for (const folder of skillFolders.slice(0, 3)) { // Just first 3 for context length
    const skillPath = path.join(skillsDir, folder, 'SKILL.md');
    if (fs.existsSync(skillPath)) {
      const content = fs.readFileSync(skillPath, 'utf-8');
      skillsContext += `\n\n### ${folder}\n${content.substring(0, 2000)}...`;
    }
  }
}

// Build prompt
const prompt = `${game.description}

I have concept mockups that reflect how the game looks (attached as concept.jpg).
I have also added a preview of the assets that are available (attached as Preview.jpg).

Here is the assets.json index of all available assets:
\`\`\`json
${assetsJson}
\`\`\`

Create a comprehensive Game Design Document (PRD) with the following sections:

## 1. Summary
- Brief description of the game
- Target platform (browser-based)
- Key assumptions and constraints for V1
- Match length / session time

## 2. Technical Requirements
- Three.js version (r160 recommended)
- Delivery format (single HTML file preferred)
- Unit system (world units = meters)
- Required loaders (GLTFLoader)
- Valid materials and lights

## 3. Canvas & Viewport
- Internal resolution (e.g., 960×540)
- Aspect ratio handling (letterboxing if fixed)
- Background style

## 4. Visual Style & Art Direction
- Overall look description
- Color palette with hex codes and purposes
- Mood/atmosphere
- Camera style and defaults (pitch, yaw, zoom range)
- Lighting mood

## 5. Player Specifications
- Faction/player identity if applicable
- Unit types with appearance, size, role, and stats
- Starting setup (resources, units, position)
- Movement constraints

## 6. Physics & Movement
- Movement model (kinematic, physics-based)
- Gravity, speeds, collision approach
- Unit movement values table

## 7. Obstacles/Enemies
- Enemy types and behaviors
- Neutral obstacles using available assets
- Spawn timing and difficulty scaling

## 8. World & Environment
- Map layout and dimensions
- Resource/pickup nodes and their values
- Buildings/structures using available GLTF assets (reference specific asset names)
- Fallback primitives if assets fail to load

## 9. Collision & Scoring
- Collision shapes and approach
- Win/lose conditions
- Score system and point values
- High score storage (localStorage key)

## 10. Controls
- Complete input mapping table
- Desktop and touch/mobile controls
- Keyboard shortcuts

## 11. Game States
- Menu state (buttons, background)
- Playing state (active systems, UI shown)
- Paused state (trigger, display, frozen elements)
- Game Over state (display, stats, retry flow)

## 12. Game Feel & Juice (REQUIRED)
- Input response feedback (selection, commands)
- Animation timing table
- Screen effects (shake, flash, zoom, time dilation)
- Death sequences
- Milestone celebrations
- Idle life animations

## 13. UX Requirements
- Controls visibility
- Onboarding flow
- Readability considerations
- Forgiving mechanics

## 14. Out of Scope (V1)
- Features explicitly NOT included

## 15. Success Criteria
- Checklist of requirements the game must meet

Reference the assets.json for available models. Use specific asset names (e.g., "TownCenter_FirstAge_Level1.gltf") when specifying which assets to use for game elements.`;

console.log('Generating PRD with Claude API (Opus 4.5)...');
console.log('Game:', game.name);

// Claude API request
const requestBody = JSON.stringify({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 16000,
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
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: previewImage
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
      let prdContent = '';
      
      for (const block of content) {
        if (block.type === 'text') {
          prdContent += block.text;
        }
      }
      
      if (!prdContent) {
        console.error('No content in response');
        process.exit(1);
      }
      
      // Ensure docs directory exists
      const docsDir = path.join(projectRoot, 'docs');
      if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
      }
      
      // Save PRD
      fs.writeFileSync(outputPath, prdContent);
      
      console.log('PRD generated successfully!');
      console.log('Output:', outputPath);
      console.log('Length:', prdContent.length, 'characters');
      
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
