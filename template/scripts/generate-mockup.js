#!/usr/bin/env node

/**
 * Mockup Generation Script
 * 
 * Uses Google AI Studio (Gemini) to generate a game concept mockup
 * based on the asset preview and description.
 * 
 * Usage:
 *   node generate-mockup.js
 * 
 * Requires:
 *   - config.json with google_ai_studio.api_key and game settings
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
  console.error('Copy config.example.json to config.json and add your API keys');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const { google_ai_studio, game } = config;

// Check config first, then env vars
const apiKey = (google_ai_studio?.api_key && !google_ai_studio.api_key.includes('YOUR_'))
  ? google_ai_studio.api_key
  : process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY;

if (!apiKey) {
  console.error('Error: Google AI Studio API key not found');
  console.error('Set GOOGLE_API_KEY env var or configure scripts/config.json');
  process.exit(1);
}

// Use resolved key
google_ai_studio.api_key = apiKey;

// Paths
const assetsDir = path.join(projectRoot, 'public', 'assets', game.name);
const previewPath = path.join(assetsDir, 'Preview.jpg');
const assetsJsonPath = path.join(assetsDir, 'assets.json');
const outputDir = path.join(projectRoot, 'public', game.name);
const outputPath = path.join(outputDir, 'concept.jpg');

// Check required files
if (!fs.existsSync(previewPath)) {
  console.error(`Error: Preview image not found: ${previewPath}`);
  process.exit(1);
}

if (!fs.existsSync(assetsJsonPath)) {
  console.error(`Error: assets.json not found: ${assetsJsonPath}`);
  console.error('Run: node generate-assets-json.js ' + game.name);
  process.exit(1);
}

// Read files
const previewImage = fs.readFileSync(previewPath);
const previewBase64 = previewImage.toString('base64');
const assetsJson = JSON.parse(fs.readFileSync(assetsJsonPath, 'utf-8'));

// Build asset summary (just glTF names for brevity)
const assetNames = assetsJson.assets
  .filter(a => a.focusGlTF)
  .map(a => a.name.replace('.gltf', ''))
  .join(', ');

// Build prompt
const prompt = `You are a game concept artist. Based on the attached preview image showing available 3D assets and the following game description, create a detailed mockup image showing how this game would look during gameplay.

GAME DESCRIPTION:
${game.description}

AVAILABLE ASSETS (3D models):
${assetNames}

The mockup should show:
1. An actual gameplay scene (not a title screen)
2. Multiple game elements arranged naturally (buildings, units, terrain, resources)
3. Appropriate UI elements for this game type (health bars, resource counters, minimap, etc.)
4. The camera perspective that best suits this game type
5. The visual style matching the provided assets

Create a polished, professional game screenshot mockup that shows the core gameplay loop in action.`;

console.log('Generating mockup with Google AI Studio...');
console.log('Game:', game.name);
console.log('Description:', game.description);

// Gemini API request
const requestBody = JSON.stringify({
  contents: [{
    parts: [
      {
        text: prompt
      },
      {
        inline_data: {
          mime_type: 'image/jpeg',
          data: previewBase64
        }
      }
    ]
  }],
  generationConfig: {
    responseModalities: ['image', 'text'],
    responseMimeType: 'image/jpeg'
  }
});

const options = {
  hostname: 'generativelanguage.googleapis.com',
  port: 443,
  path: `/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${google_ai_studio.api_key}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestBody)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (response.error) {
        console.error('API Error:', response.error.message);
        process.exit(1);
      }
      
      // Find image in response
      const candidates = response.candidates || [];
      let imageData = null;
      
      for (const candidate of candidates) {
        const parts = candidate.content?.parts || [];
        for (const part of parts) {
          if (part.inline_data?.mime_type?.startsWith('image/')) {
            imageData = part.inline_data.data;
            break;
          }
        }
        if (imageData) break;
      }
      
      if (!imageData) {
        console.error('No image generated in response');
        console.error('Response:', JSON.stringify(response, null, 2));
        process.exit(1);
      }
      
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Save image
      const imageBuffer = Buffer.from(imageData, 'base64');
      fs.writeFileSync(outputPath, imageBuffer);
      
      console.log('\nMockup generated successfully!');
      console.log('Output:', outputPath);
      
    } catch (err) {
      console.error('Error parsing response:', err.message);
      console.error('Raw response:', data.substring(0, 500));
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
