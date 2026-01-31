#!/usr/bin/env node

/**
 * Combine Preview Images
 * 
 * Scans a directory for subdirectories containing Preview.jpg/png files
 * and combines them into a single grid image.
 * 
 * Usage: node combine-previews.js <source-dir> <output-path>
 */

const fs = require('fs');
const path = require('path');

// We'll use sharp for image processing - it's fast and handles this well
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Error: sharp module not found.');
  console.error('Install it with: npm install sharp');
  process.exit(1);
}

/**
 * Find preview image in a directory
 */
function findPreview(dir) {
  const previewNames = ['Preview.jpg', 'Preview.png', 'preview.jpg', 'preview.png', 
                        'Preview.jpeg', 'preview.jpeg'];
  for (const name of previewNames) {
    const previewPath = path.join(dir, name);
    if (fs.existsSync(previewPath)) {
      return previewPath;
    }
  }
  return null;
}

/**
 * Recursively find all preview images in subdirectories (any depth)
 */
function findPreviews(sourceDir, basePath = sourceDir) {
  const previews = [];
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  
  // Check if this directory has a preview (skip the root)
  if (sourceDir !== basePath) {
    const preview = findPreview(sourceDir);
    if (preview) {
      const relativePath = path.relative(basePath, sourceDir);
      previews.push({
        path: preview,
        name: relativePath
      });
    }
  }
  
  // Recursively check subdirectories
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue; // Skip hidden dirs
    
    const subdirPath = path.join(sourceDir, entry.name);
    const subPreviews = findPreviews(subdirPath, basePath);
    previews.push(...subPreviews);
  }
  
  return previews;
}

/**
 * Calculate grid dimensions for N images
 */
function calculateGrid(count) {
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  return { cols, rows };
}

/**
 * Combine images into a grid
 * Default cell size is 960x540 (16:9 aspect ratio, half of 1080p)
 * This works well for most asset pack previews
 */
async function combineImages(previews, outputPath, options = {}) {
  const {
    cellWidth = 960,
    cellHeight = 540,
    padding = 15,
    backgroundColor = { r: 30, g: 30, b: 30, alpha: 1 }
  } = options;
  
  if (previews.length === 0) {
    console.log('No preview images found.');
    return null;
  }
  
  if (previews.length === 1) {
    // Just copy the single preview
    fs.copyFileSync(previews[0].path, outputPath);
    console.log(`Copied single preview: ${previews[0].name}`);
    return outputPath;
  }
  
  const { cols, rows } = calculateGrid(previews.length);
  const totalWidth = cols * cellWidth + (cols + 1) * padding;
  const totalHeight = rows * cellHeight + (rows + 1) * padding;
  
  console.log(`Creating ${cols}x${rows} grid (${totalWidth}x${totalHeight}px) for ${previews.length} previews...`);
  
  // Prepare each image
  const composites = [];
  
  for (let i = 0; i < previews.length; i++) {
    const preview = previews[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    
    const x = padding + col * (cellWidth + padding);
    const y = padding + row * (cellHeight + padding);
    
    try {
      // Resize image to fit cell while maintaining aspect ratio
      const resized = await sharp(preview.path)
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
      
      console.log(`  [${i + 1}/${previews.length}] ${preview.name}`);
    } catch (err) {
      console.error(`  Failed to process ${preview.name}: ${err.message}`);
    }
  }
  
  // Create the combined image
  const combined = sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 4,
      background: backgroundColor
    }
  });
  
  await combined
    .composite(composites)
    .jpeg({ quality: 90 })
    .toFile(outputPath);
  
  console.log(`\nCombined preview saved to: ${outputPath}`);
  return outputPath;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node combine-previews.js <source-dir> <output-path>');
    console.log('');
    console.log('Scans source-dir for subdirectories with Preview.jpg/png');
    console.log('and combines them into a single grid image.');
    process.exit(1);
  }
  
  const sourceDir = args[0];
  const outputPath = args[1];
  
  if (!fs.existsSync(sourceDir)) {
    console.error(`Error: Source directory not found: ${sourceDir}`);
    process.exit(1);
  }
  
  const previews = findPreviews(sourceDir);
  
  if (previews.length === 0) {
    console.log('No subdirectories with preview images found.');
    console.log('Looking for: Preview.jpg, Preview.png, preview.jpg, preview.png');
    process.exit(0);
  }
  
  console.log(`Found ${previews.length} preview images:\n`);
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  await combineImages(previews, outputPath);
}

// Export for use as module
module.exports = { findPreview, findPreviews, combineImages, calculateGrid };

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
