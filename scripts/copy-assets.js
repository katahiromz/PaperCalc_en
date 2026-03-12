// scripts/copy-assets.js
// Copies non-JS assets (HTML, CSS, images) from src/ to dist/ after tsc build.

const fs = require('fs');
const path = require('path');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`Warning: source path not found, skipping: ${src}`);
    return;
  }
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(item => {
      copyRecursive(path.join(src, item), path.join(dest, item));
    });
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

const assets = ['index.html', 'main.css', 'manifest.json'];
assets.forEach(file => {
  copyRecursive(path.join('src', file), path.join('dist', file));
  console.log(`Copied: src/${file} -> dist/${file}`);
});

copyRecursive(path.join('src', 'img'), path.join('dist', 'img'));
console.log('Copied: src/img -> dist/img');
