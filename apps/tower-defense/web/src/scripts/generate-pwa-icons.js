import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512]
const outputDir = path.join(process.cwd(), 'public', 'icons')

// Créer le dossier de sortie s'il n'existe pas
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Créer une icône SVG simple
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="64" fill="url(#grad)"/>
  <circle cx="256" cy="200" r="60" fill="white" opacity="0.9"/>
  <rect x="200" y="280" width="112" height="20" rx="10" fill="white" opacity="0.9"/>
  <rect x="220" y="320" width="72" height="20" rx="10" fill="white" opacity="0.9"/>
  <rect x="240" y="360" width="32" height="20" rx="10" fill="white" opacity="0.9"/>
  <text x="256" y="450" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="48" font-weight="bold">TD</text>
</svg>
`

async function generateIcons() {
  try {
    console.log('🔄 Génération des icônes PWA...')
    
    // Créer un buffer SVG
    const svgBuffer = Buffer.from(svgIcon, 'utf-8')
    
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`)
      
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath)
      
      console.log(`✅ Icône ${size}x${size} générée`)
    }
    
    console.log('🎉 Toutes les icônes PWA ont été générées avec succès!')
  } catch (error) {
    console.error('❌ Erreur lors de la génération des icônes:', error)
    process.exit(1)
  }
}

generateIcons()