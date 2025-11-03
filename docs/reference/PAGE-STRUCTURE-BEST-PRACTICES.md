# 📄 Page Structure Best Practices - @ezstart

**Date:** 30 octobre 2025
**Status:** ✅ Standard officiel pour toutes les pages features

---

## 🎯 Pattern Standard: 3-Section Architecture

Toutes les pages features DOIVENT suivre cette structure:

```tsx
export default function FeaturePage() {
  return (
    <>
      {/* 1. Hero Section - Introduction */}
      <Section size="full" className="bg-gradient-to-b from-primary/5 to-background py-12">
        <Div layout="center">
          <Icon name="lucide:FeatureIcon" className="w-16 h-16 text-primary mb-4" />
          <H1>Feature Name</H1>
          <P size="lg" className="text-muted-foreground max-w-2xl">
            Brief description explaining what this feature does and who it's for.
          </P>
        </Div>
      </Section>

      {/* 2. Generator/Main Content Section */}
      <Section size="default">
        <div className="grid lg:grid-cols-2 gap-6">
          <Card variant="elevated">
            {/* Configuration/Form Panel */}
          </Card>
          <Card variant="elevated">
            {/* Preview/Results Panel */}
          </Card>
        </div>
      </Section>

      {/* 3. Info/Use Cases Section */}
      <Section size="narrow" className="bg-muted/50">
        <Div layout="center">
          <H3>Additional Information</H3>
          <P className="text-muted-foreground mb-6">
            Supporting information, features, or use cases
          </P>
          {/* Content Grid */}
        </Div>
      </Section>
    </>
  )
}
```

---

## 📐 Structure Sections Détaillée

### Section 1: Hero (OBLIGATOIRE)

**Objectif:** Accueillir l'utilisateur, expliquer la feature

```tsx
<Section size="full" className="bg-gradient-to-b from-primary/5 to-background py-12">
  <Div layout="center">
    {/* Icon */}
    <Icon
      name="lucide:IconName"
      className="w-16 h-16 text-primary mb-4"
    />

    {/* Title */}
    <H1>Feature Name Generator</H1>

    {/* Description */}
    <P size="lg" className="text-muted-foreground max-w-2xl">
      Clear description of what this tool does.
      Mention primary use cases and benefits.
    </P>
  </Div>
</Section>
```

**Propriétés:**
- `size="full"` - Toute la largeur
- `className="bg-gradient-to-b from-primary/5 to-background"` - Gradient subtil
- `py-12` - Padding vertical généreux
- `layout="center"` sur Div - Centre le contenu

**Icons recommandées:**
| Feature | Icon |
|---------|------|
| QR Code | `lucide:QrCode` |
| CV Generator | `lucide:FileText` |
| Business Card | `lucide:CreditCard` |
| Authentication | `lucide:Lock` |
| Billing | `lucide:Receipt` |
| Forms | `lucide:ClipboardList` |

---

### Section 2: Generator/Main Content (OBLIGATOIRE)

**Objectif:** Interface principale de la feature

```tsx
<Section size="default">
  <div className="grid lg:grid-cols-2 gap-6">
    {/* Configuration Panel (Left) */}
    <Card variant="elevated">
      <CardHeader>
        <H3>Configuration</H3>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form fields, inputs, controls */}
      </CardContent>
    </Card>

    {/* Preview/Results Panel (Right) */}
    <Card variant="elevated">
      <CardHeader>
        <H3>Preview & Download</H3>
      </CardHeader>
      <CardContent>
        {/* Live preview, results, download buttons */}
      </CardContent>
    </Card>
  </div>
</Section>
```

**Propriétés:**
- `size="default"` - Largeur standard (max-w-7xl)
- Grid 2 colonnes sur large screens
- Cards `variant="elevated"` pour profondeur
- `space-y-4` dans CardContent pour espacement

**Layout Patterns:**

#### Pattern A: Form + Preview (QR Code, Business Card)
```tsx
<div className="grid lg:grid-cols-2 gap-6">
  <Card>Configuration Form</Card>
  <Card>Live Preview</Card>
</div>
```

#### Pattern B: Stacked Cards (CV Generator avec AI)
```tsx
<div className="grid lg:grid-cols-2 gap-6">
  <div className="space-y-6">
    <Card>AI Configuration</Card>
    <Card>Manual Input</Card>
  </div>
  <Card className="lg:row-span-2">Preview</Card>
</div>
```

#### Pattern C: Single Wide (Authentication, Settings)
```tsx
<Card className="max-w-2xl mx-auto">
  <CardContent>Form</CardContent>
</Card>
```

---

### Section 3: Info/Features (RECOMMANDÉE)

**Objectif:** Éduquer, montrer use cases, features additionnelles

```tsx
<Section size="narrow" className="bg-muted/50">
  <Div layout="center">
    <H3>Section Title</H3>
    <P className="text-muted-foreground mb-6">
      Subtitle or description
    </P>

    <div className="grid md:grid-cols-3 gap-4">
      {/* Feature Cards */}
      <Card variant="outline">
        <CardContent className="text-center py-6 space-y-2">
          <Icon name="lucide:Icon" className="w-8 h-8 mx-auto text-primary" />
          <P weight="medium">Feature Title</P>
          <P size="sm" className="text-muted-foreground">
            Short description
          </P>
        </CardContent>
      </Card>
      {/* Repeat for 2-3 more features */}
    </div>
  </Div>
</Section>
```

**Propriétés:**
- `size="narrow"` - Largeur réduite (max-w-4xl)
- `className="bg-muted/50"` - Fond subtil différencié
- Grid 3 colonnes sur medium+ screens
- Cards `variant="outline"` pour légèreté

**Use Cases Exemples:**

**QR Code:**
```tsx
<div className="grid md:grid-cols-3 gap-4">
  <Card variant="outline">
    <CardContent className="text-center py-6 space-y-2">
      <Icon name="lucide:Briefcase" className="w-8 h-8 mx-auto text-primary" />
      <P weight="medium">Business Cards</P>
      <P size="sm" className="text-muted-foreground">
        Share contact details instantly
      </P>
    </CardContent>
  </Card>
  <Card variant="outline">
    <CardContent className="text-center py-6 space-y-2">
      <Icon name="lucide:Share2" className="w-8 h-8 mx-auto text-primary" />
      <P weight="medium">Marketing</P>
      <P size="sm" className="text-muted-foreground">
        Drive traffic to campaigns
      </P>
    </CardContent>
  </Card>
  <Card variant="outline">
    <CardContent className="text-center py-6 space-y-2">
      <Icon name="lucide:Ticket" className="w-8 h-8 mx-auto text-primary" />
      <P weight="medium">Event Tickets</P>
      <P size="sm" className="text-muted-foreground">
        Quick and secure entry
      </P>
    </CardContent>
  </Card>
</div>
```

**CV Generator:**
```tsx
<H3>Key Features</H3>
<div className="grid md:grid-cols-3 gap-4">
  <Card>AI-Powered</Card>
  <Card>Multiple Templates</Card>
  <Card>Export Options</Card>
</div>
```

---

## 🎨 Styling Guidelines

### Colors & Backgrounds

```tsx
// Hero Section
className="bg-gradient-to-b from-primary/5 to-background py-12"

// Main Section (default)
// Pas de className spécial, fond transparent

// Info Section
className="bg-muted/50"
```

### Spacing

```tsx
// Between sections (automatic via fragment)
<>
  <Section>...</Section>
  <Section>...</Section>  {/* Gap automatique */}
  <Section>...</Section>
</>

// Inside CardContent
<CardContent className="space-y-4">
  <div>Field 1</div>
  <div>Field 2</div>
</CardContent>

// Between form fields
<div className="space-y-2">
  <Label>Field</Label>
  <Input />
</div>
```

### Typography Hierarchy

```tsx
// Hero
<H1>Main Title</H1>                    // 3xl-6xl
<P size="lg">Subtitle/Description</P>  // lg

// Section Headers
<H3>Section Title</H3>                 // xl-2xl
<P className="text-muted-foreground">Subtitle</P>  // base

// Card Headers
<H3>Card Title</H3>                    // lg-xl

// Body Text
<P>Regular text</P>                    // base
<P size="sm">Helper text</P>          // sm
```

---

## 📋 Checklist de Conformité

Avant de considérer une page "complète", vérifier:

### Structure ✅
- [ ] 3 sections présentes (Hero, Main, Info)
- [ ] Fragment `<>...</>` utilisé pour wrapper
- [ ] Chaque Section a un `size` approprié
- [ ] Classes Tailwind correctes sur Sections

### Hero Section ✅
- [ ] Icon appropriée avec `w-16 h-16 text-primary`
- [ ] H1 avec nom de la feature
- [ ] Description P size="lg" claire (1-2 phrases)
- [ ] Div layout="center" pour centrage
- [ ] Gradient background `from-primary/5 to-background`

### Main Section ✅
- [ ] Grid lg:grid-cols-2 pour layout
- [ ] Cards variant="elevated" utilisées
- [ ] Configuration panel à gauche
- [ ] Preview/Results panel à droite
- [ ] CardHeaders avec H3
- [ ] space-y-4 dans CardContent

### Info Section ✅
- [ ] size="narrow" pour focus
- [ ] bg-muted/50 pour différenciation
- [ ] H3 + description
- [ ] Grid md:grid-cols-3 pour features/use cases
- [ ] Cards variant="outline" légères
- [ ] Icons w-8 h-8 text-primary
- [ ] Texte centré dans les cards

### Composants UI ✅
- [ ] AUCUN HTML natif (`<div>`, `<h1>`, etc.)
- [ ] Tous composants de `@ezstart/ui/components`
- [ ] Colors sémantiques (bg-primary, text-muted-foreground, etc.)
- [ ] Pas de colors hardcodées (`bg-gray-100`, etc.)

---

## 🚀 Templates par Type de Page

### Template 1: Simple Generator (QR Code, Image Converter)

```tsx
'use client'

import { Button, Card, CardContent, CardHeader, Div, H1, H3, Icon, Input, Label, P, Section } from '@ezstart/ui/components'
import { useState } from 'react'

export default function SimpleGeneratorPage() {
  const [config, setConfig] = useState({})

  return (
    <>
      {/* Hero */}
      <Section size="full" className="bg-gradient-to-b from-primary/5 to-background py-12">
        <Div layout="center">
          <Icon name="lucide:Zap" className="w-16 h-16 text-primary mb-4" />
          <H1>Feature Name</H1>
          <P size="lg" className="text-muted-foreground max-w-2xl">
            Description
          </P>
        </Div>
      </Section>

      {/* Generator */}
      <Section size="default">
        <div className="grid lg:grid-cols-2 gap-6">
          <Card variant="elevated">
            <CardHeader><H3>Configuration</H3></CardHeader>
            <CardContent className="space-y-4">
              {/* Form fields */}
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardHeader><H3>Preview</H3></CardHeader>
            <CardContent>
              {/* Preview */}
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* Use Cases */}
      <Section size="narrow" className="bg-muted/50">
        <Div layout="center">
          <H3>Use Cases</H3>
          <P className="text-muted-foreground mb-6">Description</P>
          <div className="grid md:grid-cols-3 gap-4">
            {/* 3 use case cards */}
          </div>
        </Div>
      </Section>
    </>
  )
}
```

### Template 2: AI-Powered Generator (CV, Cover Letter)

```tsx
'use client'

export default function AIGeneratorPage() {
  const [useAI, setUseAI] = useState(false)

  return (
    <>
      {/* Hero avec mention AI */}
      <Section size="full" className="bg-gradient-to-b from-primary/5 to-background py-12">
        <Div layout="center">
          <Icon name="lucide:Sparkles" className="w-16 h-16 text-primary mb-4" />
          <H1>AI-Powered Feature</H1>
          <P size="lg" className="text-muted-foreground max-w-2xl">
            Description with AI capabilities
          </P>
        </Div>
      </Section>

      {/* Generator avec AI toggle */}
      <Section size="default">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* AI Configuration Card */}
            <Card variant="elevated">
              <CardHeader><H3>AI Configuration</H3></CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <input type="checkbox" onChange={e => setUseAI(e.target.checked)} />
                  <Label>Use AI to optimize</Label>
                </div>
                {useAI && (
                  <div className="space-y-4 mt-4">
                    {/* AI-specific fields */}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manual Configuration Card */}
            <Card variant="elevated">
              <CardHeader><H3>Manual Input</H3></CardHeader>
              <CardContent>
                {/* Manual fields */}
              </CardContent>
            </Card>
          </div>

          {/* Preview spans both cards */}
          <Card variant="elevated" className="lg:row-span-2">
            <CardHeader><H3>Preview</H3></CardHeader>
            <CardContent>{/* Preview */}</CardContent>
          </Card>
        </div>
      </Section>

      {/* Features instead of Use Cases */}
      <Section size="narrow" className="bg-muted/50">
        <Div layout="center">
          <H3>Key Features</H3>
          <div className="grid md:grid-cols-3 gap-4">
            {/* 3 feature cards */}
          </div>
        </Div>
      </Section>
    </>
  )
}
```

### Template 3: Form-Based (Authentication, Settings, Billing)

```tsx
'use client'

export default function FormBasedPage() {
  return (
    <>
      {/* Hero */}
      <Section size="full" className="bg-gradient-to-b from-primary/5 to-background py-12">
        <Div layout="center">
          <Icon name="lucide:Settings" className="w-16 h-16 text-primary mb-4" />
          <H1>Feature Name</H1>
          <P size="lg" className="text-muted-foreground max-w-2xl">
            Description
          </P>
        </Div>
      </Section>

      {/* Form (single column) */}
      <Section size="default">
        <Card className="max-w-2xl mx-auto" variant="elevated">
          <CardHeader>
            <H3>Form Title</H3>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Form fields */}
          </CardContent>
        </Card>
      </Section>

      {/* Info/Help */}
      <Section size="narrow" className="bg-muted/50">
        <Div layout="center">
          <H3>Need Help?</H3>
          <P className="text-muted-foreground mb-6">Description</P>
          <div className="grid md:grid-cols-2 gap-4">
            {/* 2-3 help cards */}
          </div>
        </Div>
      </Section>
    </>
  )
}
```

---

## 📊 Comparaison: Avant vs Après

### Avant (1 Section) ❌
```tsx
<Section className="space-y-6">
  <Div>
    <H2>Feature Name</H2>
    <p>Description</p>
  </Div>
  <div className="grid">{/* Content */}</div>
</Section>
```

**Problèmes:**
- ❌ Pas de structure visuelle claire
- ❌ Manque de hiérarchie sémantique
- ❌ Difficile à différencier visuellement
- ❌ SEO moins optimal
- ❌ Accessibilité limitée
- ❌ Manque de professionnalisme

### Après (3 Sections) ✅
```tsx
<>
  <Section size="full">{/* Hero */}</Section>
  <Section size="default">{/* Main */}</Section>
  <Section size="narrow">{/* Info */}</Section>
</>
```

**Bénéfices:**
- ✅ Structure claire et professionnelle
- ✅ Hiérarchie sémantique HTML5
- ✅ Sections visuellement différenciées
- ✅ SEO optimisé (H1, sections, semantic HTML)
- ✅ Accessibilité améliorée (screen readers)
- ✅ Responsive design naturel
- ✅ Réutilisable et scalable

---

## 🎓 Exemples de Référence

### ✅ Implémentations Conformes

1. **QR Code Generator** - `apps/ezstart/web/.../(qr-code)/qr-code-page.tsx`
   - 3 sections parfaites
   - Hero avec icon QrCode
   - Use Cases: Business Cards, Marketing, Event Tickets

2. **CV Generator (À FAIRE)** - Sera refactoré
3. **Business Card (À FAIRE)** - Sera refactoré

### 📚 Documentation Associée

- [packages/ui/README.md](../packages/ui/README.md) - Composants UI
- [DEV-RULES.md](../DEV-RULES.md) - Règles de développement
- [CLAUDE.md](../CLAUDE.md) - Architecture UI section

---

## 🚨 Erreurs Communes à Éviter

### ❌ Erreur 1: Utiliser HTML natif
```tsx
// ❌ JAMAIS
<div className="bg-white">
  <h1>Title</h1>
  <button>Click</button>
</div>

// ✅ TOUJOURS
<Section>
  <H1>Title</H1>
  <Button>Click</Button>
</Section>
```

### ❌ Erreur 2: Hardcoder couleurs
```tsx
// ❌ JAMAIS
className="bg-gray-100 text-gray-900"

// ✅ TOUJOURS
className="bg-muted text-foreground"
```

### ❌ Erreur 3: Oublier le fragment
```tsx
// ❌ Erreur JSX
return (
  <Section>...</Section>
  <Section>...</Section>  // Erreur: Multiple root elements
)

// ✅ Correct
return (
  <>
    <Section>...</Section>
    <Section>...</Section>
  </>
)
```

### ❌ Erreur 4: Mauvais size sur Section
```tsx
// ❌ Hero avec size="default"
<Section size="default" className="bg-gradient...">

// ✅ Hero avec size="full"
<Section size="full" className="bg-gradient...">
```

---

## 🎯 Prochaines Étapes

### Features à Refactorer
1. ⏳ **CV Generator** - Passer de 1 à 3 sections
2. ⏳ **Business Card** - Passer de 1 à 3 sections

### Futures Features
- ❓ Image Converter
- ❓ PDF Generator
- ❓ Email Signature

**Toutes doivent suivre ce pattern dès le départ!**

---

## 📖 Conclusion

Ce pattern 3-section est maintenant le **standard officiel** pour toutes les pages features dans @ezstart.

**Avantages résumés:**
- ✅ Professionnalisme
- ✅ Cohérence UX
- ✅ SEO optimisé
- ✅ Accessibilité
- ✅ Maintenabilité
- ✅ Scalabilité

**Utilise ce doc comme référence pour toutes les futures pages!** 🚀
