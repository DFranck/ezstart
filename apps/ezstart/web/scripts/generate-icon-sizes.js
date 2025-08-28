import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
const sourceIcon = path.join(iconsDir, 'icon-512x512.png');

// Tailles requises pour la PWA
const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384];

async function generateIcons() {
  try {
    // Vérifier si sharp est installé
    let sharp;
    try {
      sharp = (await import('sharp')).default;
    } catch (e) {
      console.log('⚠️  Sharp non installé, installation...');
      const { execSync } = await import('child_process');
      execSync('pnpm add sharp', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
      sharp = (await import('sharp')).default;
    }

    // Vérifier que l'image source existe
    if (!fs.existsSync(sourceIcon)) {
      throw new Error(`Image source non trouvée: ${sourceIcon}`);
    }

    console.log(`📦 Génération des icônes à partir de ${sourceIcon}`);

    // Générer chaque taille
    for (const size of sizes) {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      
      await sharp(sourceIcon)
        .resize(size, size, {
          kernel: sharp.kernel.lanczos3,
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ quality: 100 })
        .toFile(outputPath);

      console.log(`✅ Généré: icon-${size}x${size}.png`);
    }

    console.log('🎉 Toutes les icônes PWA ont été générées avec succès !');
    
    // Vérifier que toutes les icônes existent maintenant
    const allSizes = [...sizes, 512];
    const missing = allSizes.filter(size => 
      !fs.existsSync(path.join(iconsDir, `icon-${size}x${size}.png`))
    );
    
    if (missing.length === 0) {
      console.log('✅ Toutes les icônes requises sont maintenant présentes');
      console.log('🚀 Votre PWA devrait maintenant être installable !');
    } else {
      console.log(`⚠️  Icônes manquantes: ${missing.map(s => `${s}x${s}`).join(', ')}`);
    }

  } catch (error) {
    console.error('❌ Erreur lors de la génération des icônes:', error.message);
    process.exit(1);
  }
}

generateIcons();