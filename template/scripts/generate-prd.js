#!/usr/bin/env node

/**
 * PRD Generation Script
 * 
 * Uses OpenAI API (GPT-4o) to generate a Product Requirements Document
 * based on the concept mockup, assets, and game description.
 * 
 * Usage:
 *   node generate-prd.js
 * 
 * Requires:
 *   - config.json with openai.api_key and game settings
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
const { openai, game } = config;

// Check config first, then env vars
const apiKey = (openai?.api_key && !openai.api_key.includes('YOUR_'))
  ? openai.api_key
  : process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('Error: OpenAI API key not found');
  console.error('Set OPENAI_API_KEY env var or configure scripts/config.json');
  process.exit(1);
}

// Paths
const assetsDir = path.join(projectRoot, 'public', 'assets', game.name);
// Find concept image (can be jpg or png)
const conceptDir = path.join(projectRoot, 'public', game.name);
const conceptPath = ['concept.jpg', 'concept.png', 'concept.jpeg']
  .map(f => path.join(conceptDir, f))
  .find(p => fs.existsSync(p));
const previewPath = path.join(assetsDir, 'Preview.jpg');
const assetsJsonPath = path.join(assetsDir, 'assets.json');
const outputPath = path.join(projectRoot, 'docs', 'prd.md');

// Check required files
const missingFiles = [];
if (!conceptPath) missingFiles.push(path.join(conceptDir, 'concept.jpg/png'));
if (!fs.existsSync(previewPath)) missingFiles.push(previewPath);
if (!fs.existsSync(assetsJsonPath)) missingFiles.push(assetsJsonPath);

if (missingFiles.length > 0) {
  console.error('Error: Missing required files:');
  missingFiles.forEach(f => console.error('  - ' + f));
  if (!conceptPath) {
    console.error('\nRun: node generate-mockup.js first');
  }
  process.exit(1);
}

// Determine mime type from extension
const conceptExt = path.extname(conceptPath).toLowerCase();
const conceptMimeType = conceptExt === '.png' ? 'image/png' : 'image/jpeg';

// Read files
const conceptImage = fs.readFileSync(conceptPath).toString('base64');
const previewImage = fs.readFileSync(previewPath).toString('base64');
const assetsJson = fs.readFileSync(assetsJsonPath, 'utf-8');

// Build prompt
const prompt = `You are creating a Product Requirements Document (PRD) for a Three.js browser game.

## Game Description:
${game.description}

## Visual References:
- The first image is a mockup showing how the game should look during gameplay
- The second image is a preview of the available 3D assets

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

console.log('Generating PRD with OpenAI API (GPT-5.2)...');
console.log('Game:', game.name);

// OpenAI API request
const requestBody = JSON.stringify({
  model: 'gpt-5.2',
  max_completion_tokens: 128000,
  messages: [{
    role: 'user',
    content: [
      {
        type: 'image_url',
        image_url: {
          url: `data:${conceptMimeType};base64,${conceptImage}`
        }
      },
      {
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${previewImage}`
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
  hostname: 'api.openai.com',
  port: 443,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
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
      
      // Extract text content from OpenAI response
      const prdContent = response.choices?.[0]?.message?.content || '';
      
      if (!prdContent) {
        console.error('No content in response');
        console.error('Response:', JSON.stringify(response, null, 2).substring(0, 1000));
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
