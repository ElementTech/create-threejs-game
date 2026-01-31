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
const prompt = `You are creating a Product Requirements Document (PRD) for a Three.js browser game.

## Game Description:
${game.description}

## Visual References:
- concept.jpg: A mockup showing how the game should look during gameplay
- Preview.jpg: Preview of the available 3D assets

## Available Assets (assets.json):
\`\`\`json
${assetsJson}
\`\`\`

---

Analyze the game description and mockup, then create a comprehensive PRD. Include ONLY sections relevant to this specific game type. Do NOT assume features not implied by the description.

# ${game.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} - Product Requirements Document

## 1. Summary
- Brief description of the game and its genre
- Core gameplay loop
- Target platform (browser-based)
- Key assumptions and constraints for V1
- Session/match length

## 2. Technical Requirements
- Three.js version (r160 recommended)
- Delivery format (single HTML file preferred)
- Unit system (world units = meters)
- Required loaders (GLTFLoader)

## 3. Canvas & Viewport
- Internal resolution
- Aspect ratio handling
- Background style

## 4. Visual Style & Art Direction
- Overall look (based on mockup)
- Color palette with hex codes
- Mood/atmosphere
- Camera style appropriate for this game type
- Lighting mood

## 5. Game Elements
Based on the game description, define all relevant game objects:
- Player character/avatar (if applicable)
- Controllable entities and their properties
- Interactive objects
- Environmental elements
- Any NPCs or AI entities
Reference specific assets from assets.json by filename.

## 6. Core Mechanics
Define the primary gameplay systems this game needs:
- Movement/navigation system
- Primary interaction mechanics
- Progression/scoring system
- Any resource or economy systems (if applicable)
- Combat/conflict systems (if applicable)

## 7. World & Environment
- Map/level layout and dimensions
- Environmental features using available assets
- Fallback primitives if assets fail to load

## 8. Win/Lose Conditions
- Victory conditions
- Failure conditions
- Score/progress tracking
- Data persistence (localStorage)

## 9. Controls
- Complete input mapping for this game type
- Desktop controls
- Touch/mobile controls
- Keyboard shortcuts

## 10. Game States
- Menu state
- Playing state
- Paused state
- Game Over state

## 11. Game Feel & Juice
- Input feedback appropriate for this game
- Animation timing
- Visual/audio effects
- Celebrations and rewards

## 12. UX Requirements
- Controls visibility
- Onboarding/tutorial
- Accessibility considerations

## 13. Out of Scope (V1)
- Features explicitly NOT included

## 14. Success Criteria
- Checklist of testable requirements

Reference specific asset filenames from assets.json when describing game elements.`;

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
