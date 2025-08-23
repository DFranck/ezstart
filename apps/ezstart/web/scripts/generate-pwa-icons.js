// Script simple pour créer des icônes PWA de base
// Pour une vraie production, utilisez un outil comme PWA Asset Generator

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Créer le fichier browserconfig.xml pour Windows
const browserConfig = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square150x150logo src="/icons/icon-152x152.png"/>
      <TileColor>#000000</TileColor>
    </tile>
  </msapplication>
</browserconfig>`;

fs.writeFileSync(path.join(iconsDir, 'browserconfig.xml'), browserConfig);

// Créer un SVG simple pour safari-pinned-tab
const safariIcon = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32px" height="32px" viewBox="0 0 32 32">
<path fill="#000000" d="M16,2c7.732,0,14,6.268,14,14s-6.268,14-14,14S2,23.732,2,16S8.268,2,16,2z M16,8c-1.104,0-2,0.896-2,2v6h-6c-1.104,0-2,0.896-2,2s0.896,2,2,2h6v6c0,1.104,0.896,2,2,2s2-0.896,2-2v-6h6c1.104,0,2-0.896,2-2s-0.896-2-2-2h-6v-6C18,8.896,17.104,8,16,8z"/>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'safari-pinned-tab.svg'), safariIcon);

console.log('✅ PWA configuration files generated!');
console.log('⚠️  Note: For production, generate proper icon files for all sizes:');
console.log('   - icon-16x16.png');
console.log('   - icon-32x32.png'); 
console.log('   - icon-72x72.png');
console.log('   - icon-96x96.png');
console.log('   - icon-128x128.png');
console.log('   - icon-144x144.png');
console.log('   - icon-152x152.png');
console.log('   - icon-192x192.png');
console.log('   - icon-384x384.png');
console.log('   - icon-512x512.png');
console.log('   You can use tools like PWA Asset Generator or Favicon Generator.');