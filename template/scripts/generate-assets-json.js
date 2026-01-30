#!/usr/bin/env node

/**
 * Asset Index Generator
 * 
 * Generates an assets.json file that indexes all assets in a game's asset folder.
 * 
 * Usage:
 *   node generate-assets-json.js <game_name>
 * 
 * Example:
 *   node generate-assets-json.js medieval
 * 
 * This will scan public/assets/medieval/ and create public/assets/medieval/assets.json
 */

const fs = require('fs');
const path = require('path');

// Get game name from command line argument
const gameName = process.argv[2];

if (!gameName) {
  console.error('Usage: node generate-assets-json.js <game_name>');
  console.error('Example: node generate-assets-json.js medieval');
  process.exit(1);
}

// Paths
const scriptDir = __dirname;
const projectRoot = path.join(scriptDir, '..');
const assetsDir = path.join(projectRoot, 'public', 'assets', gameName);
const outputPath = path.join(assetsDir, 'assets.json');

// Check if assets directory exists
if (!fs.existsSync(assetsDir)) {
  console.error(`Error: Assets directory not found: ${assetsDir}`);
  console.error(`Please create the directory and add your assets first.`);
  process.exit(1);
}

// File extensions to index
const SUPPORTED_EXTENSIONS = {
  '3d': ['.gltf', '.glb', '.obj', '.fbx'],
  'images': ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
  'audio': ['.mp3', '.wav', '.ogg'],
  'other': ['.json', '.txt']
};

// Get category from extension
function getCategory(ext) {
  ext = ext.toLowerCase();
  
  if (SUPPORTED_EXTENSIONS['3d'].includes(ext)) {
    return ext === '.gltf' || ext === '.glb' ? 'glTF' : '3D';
  }
  if (SUPPORTED_EXTENSIONS.images.includes(ext)) {
    return 'PNG'; // Keep as PNG for consistency with existing format
  }
  if (SUPPORTED_EXTENSIONS.audio.includes(ext)) {
    return 'Audio';
  }
  return 'Other';
}

// Recursively scan directory for assets
function scanDirectory(dir, relativeTo) {
  const assets = [];
  
  if (!fs.existsSync(dir)) {
    return assets;
  }
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      // Recursively scan subdirectories
      assets.push(...scanDirectory(fullPath, relativeTo));
    } else if (item.isFile()) {
      const ext = path.extname(item.name).toLowerCase();
      
      // Skip if not a supported extension or is the output file itself
      if (item.name === 'assets.json') continue;
      
      const allExtensions = [
        ...SUPPORTED_EXTENSIONS['3d'],
        ...SUPPORTED_EXTENSIONS.images,
        ...SUPPORTED_EXTENSIONS.audio
      ];
      
      if (!allExtensions.includes(ext)) continue;
      
      const relativePath = path.relative(relativeTo, fullPath);
      const category = getCategory(ext);
      
      assets.push({
        name: item.name,
        path: `public/assets/${gameName}/${relativePath.replace(/\\/g, '/')}`,
        relativePath: relativePath.replace(/\\/g, '/'),
        category: category,
        extension: ext,
        focusGlTF: ext === '.gltf' || ext === '.glb'
      });
    }
  }
  
  return assets;
}

// Main execution
console.log(`Scanning assets in: ${assetsDir}`);

const assets = scanDirectory(assetsDir, assetsDir);

// Sort assets by name
assets.sort((a, b) => a.name.localeCompare(b.name));

// Count by category
const categoryCounts = {};
for (const asset of assets) {
  categoryCounts[asset.category] = (categoryCounts[asset.category] || 0) + 1;
}

// Count glTF assets
const glTFCount = assets.filter(a => a.focusGlTF).length;

// Build output
const output = {
  metadata: {
    generatedAt: new Date().toISOString(),
    root: `public/assets/${gameName}`,
    totalAssets: assets.length,
    glTFAssetCount: glTFCount,
    categories: categoryCounts
  },
  assets: assets
};

// Write output
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`\nGenerated: ${outputPath}`);
console.log(`\nSummary:`);
console.log(`  Total assets: ${assets.length}`);
console.log(`  glTF/GLB models: ${glTFCount}`);
console.log(`  Categories:`, categoryCounts);
