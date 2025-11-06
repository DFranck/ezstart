# 📹 Landing Page Media Assets - Liste des Médias à Créer

## 🎯 EZBill Landing Page

### 📹 Vidéo Hero (Priorité Haute)
**Fichier:** `apps/ezbill/web/public/media/invoice-demo.mp4`
- **Durée:** 30 secondes
- **Résolution:** 1920x1080 (Full HD)
- **Taille cible:** < 5MB (compression H.264)
- **Contenu:**
  1. (0-5s) Dashboard overview
  2. (5-10s) Click "New Invoice" → Client selection avec autocomplete
  3. (10-20s) Add line items (produits/services) avec calcul automatique
  4. (20-25s) Preview invoice PDF
  5. (25-30s) Click "Send" → Success animation

### 🎬 GIFs Features (Priorité Haute)
**Dossier:** `apps/ezbill/web/public/media/features/`

1. **client-add.gif** (2MB max)
   - Ajouter un nouveau client
   - Formulaire avec validation en temps réel
   - Success message
   - 5-8 secondes

2. **invoice-create.gif** (2MB max)
   - Création rapide d'une facture
   - Ajout de 2-3 line items
   - Calcul automatique des totaux
   - 8-10 secondes

3. **pdf-preview.gif** (1.5MB max)
   - Cliquer sur "Preview"
   - PDF qui s'ouvre dans modal
   - Scroll pour montrer le contenu
   - Bouton "Download"
   - 5-7 secondes

### 📸 Screenshots (Priorité Moyenne)
**Dossier:** `apps/ezbill/web/public/media/screenshots/`

1. **dashboard.webp**
   - Vue dashboard avec stats
   - Liste des factures récentes
   - 1920x1080, WebP format, 80% quality

2. **editor.webp**
   - Invoice editor en action
   - Plusieurs line items visibles
   - Preview sidebar
   - 1920x1080, WebP format, 80% quality

---

## 🌱 GreenPulse Landing Page

### 📹 Vidéo Hero (Priorité Haute)
**Fichier:** `apps/green-pulse/web/public/media/ai-demo.mp4`
- **Durée:** 30 secondes
- **Résolution:** 1920x1080
- **Taille:** < 5MB
- **Contenu:**
  1. (0-5s) Input prompt: "Create employee onboarding form"
  2. (5-15s) AI génère les champs (animation typing effect)
  3. (15-25s) Formulaire complet s'affiche
  4. (25-30s) Preview et export React code

### 🎬 GIFs Features (Priorité Haute)
**Dossier:** `apps/green-pulse/web/public/media/features/`

1. **ai-generation.gif** (2MB max)
   - Taper prompt dans input
   - Loading animation
   - Formulaire qui apparaît progressivement
   - 8-10 secondes

2. **form-preview.gif** (2MB max)
   - Toggle entre Edit et Preview mode
   - Remplir un formulaire en live
   - Validation en temps réel
   - 6-8 secondes

3. **code-export.gif** (1.5MB max)
   - Click "Export"
   - Modal avec code React
   - Copy to clipboard animation
   - 5 secondes

### 📸 Screenshots (Priorité Moyenne)
**Dossier:** `apps/green-pulse/web/public/media/screenshots/`

1. **builder.webp**
   - Form builder interface
   - AI prompt input visible
   - Liste de champs générés
   - 1920x1080, WebP

2. **preview.webp**
   - Formulaire en mode preview
   - Multiple field types visible
   - Validation messages
   - 1920x1080, WebP

---

## 🎨 Spécifications Techniques

### Vidéos (MP4)
```
Codec: H.264
Resolution: 1920x1080
Frame Rate: 30fps
Bitrate: ~1.5 Mbps (pour ~5MB/30s)
Audio: None (silent, avec sous-titres visuels si besoin)
```

### GIFs
```
Tools suggérés: ScreenToGif, LICEcap, Kap (Mac)
Optimization: Gifsicle or ezgif.com
Resolution: 1280x720 ou 1920x1080
Colors: 256 colors max
Frame rate: 15-20 fps
```

### Screenshots (WebP)
```
Tool: Sharp, Squoosh, cwebp
Format: WebP
Quality: 80%
Resolution: 1920x1080
```

### Commandes de Conversion
```bash
# MP4 → WebM (alternative légère)
ffmpeg -i input.mp4 -c:v libvpx-vp9 -b:v 1M -c:a libopus output.webm

# PNG → WebP
cwebp -q 80 input.png -o output.webp

# GIF optimization
gifsicle -O3 --colors 256 input.gif -o output.gif
```

---

## 📁 Structure Finale des Dossiers

```
apps/
├── ezbill/
│   └── web/
│       └── public/
│           └── media/
│               ├── invoice-demo.mp4         # 5MB
│               ├── invoice-demo.webm        # 3MB (alternative)
│               ├── features/
│               │   ├── client-add.gif       # 2MB
│               │   ├── invoice-create.gif   # 2MB
│               │   └── pdf-preview.gif      # 1.5MB
│               └── screenshots/
│                   ├── dashboard.webp       # 200KB
│                   └── editor.webp          # 200KB
│
└── green-pulse/
    └── web/
        └── public/
            └── media/
                ├── ai-demo.mp4              # 5MB
                ├── ai-demo.webm             # 3MB
                ├── features/
                │   ├── ai-generation.gif    # 2MB
                │   ├── form-preview.gif     # 2MB
                │   └── code-export.gif      # 1.5MB
                └── screenshots/
                    ├── builder.webp         # 200KB
                    └── preview.webp         # 200KB
```

---

## ✅ Checklist de Création

### EZBill
- [ ] Enregistrer vidéo hero (invoice-demo.mp4)
- [ ] Créer GIF client-add.gif
- [ ] Créer GIF invoice-create.gif
- [ ] Créer GIF pdf-preview.gif
- [ ] Prendre screenshot dashboard.webp
- [ ] Prendre screenshot editor.webp

### GreenPulse
- [ ] Enregistrer vidéo hero (ai-demo.mp4)
- [ ] Créer GIF ai-generation.gif
- [ ] Créer GIF form-preview.gif
- [ ] Créer GIF code-export.gif
- [ ] Prendre screenshot builder.webp
- [ ] Prendre screenshot preview.webp

---

## 🔄 Remplacement des Placeholders

Une fois les médias créés, remplacer dans les fichiers:

### EZBill
Fichier: `apps/ezbill/web/src/app/[locale]/landing-v2/page.tsx`

```tsx
// Avant
<Div className="aspect-video bg-gradient-to-br from-ezbill-invoice/20">
  <Span>📹 Video Placeholder</Span>
</Div>

// Après
<video
  src="/media/invoice-demo.mp4"
  autoPlay
  loop
  muted
  playsInline
  className="w-full h-full object-cover"
/>
```

### GreenPulse
Similaire pour tous les placeholders.

---

## 💡 Tips pour l'Enregistrement

1. **Préparer le scénario** à l'avance (30s max)
2. **Nettoyer l'interface** (pas de data de test visible)
3. **Ralentir les actions** (les users doivent comprendre)
4. **Montrer le résultat final** (success state)
5. **Tester la taille finale** (compression si > 5MB)

---

**Note:** Les placeholders actuels sont temporaires et indiquent clairement où placer chaque média.
