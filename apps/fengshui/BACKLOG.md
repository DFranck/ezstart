# Backlog — FengShui

**Status :** `maintained` | **Derniere mise a jour :** 2026-03-29

## Objectif

Application web Feng Shui : analyse Bagua avec upload de plan, orientation boussole, etoiles volantes annuelles, generation PDF et systeme premium/donation.

---

## Audit — Resume

### Etat actuel

L'app fonctionne end-to-end : upload plan, orientation boussole (drag), analyse 9 secteurs (roue/grille), PDF 2 pages, systeme premium (EZPay), donation (EZPay), i18n 3 langues (fr/en/es), dark mode, responsive. Le code est globalement propre mais comporte du dead code, des strings hardcodees, et des fonctionnalites stub/placeholder.

---

## Phase 1 — Nettoyage & dette technique

**Status :** `planned`

### 1.1 Dead code & fichiers obsoletes

- [ ] Supprimer `src/lib/fengshui-data.ts` — jamais importe, remplace par le systeme messages/base.json + stars.json
- [ ] Supprimer `src/components/BaguaSectorCard.tsx` — jamais importe (utilise autrefois, remplace par `BaguaOrientationsGrid` + `pdf-capture-containers`)
- [ ] Supprimer `src/config/bagua.2025.fr.stars.json` — donnees 2025 obsoletes, remplace par `messages/*/stars.json`
- [ ] Supprimer `src/config/bagua.fr.base.json` — idem, remplace par `messages/*/base.json`
- [ ] Supprimer `src/data/etoiles-volantes-2026.json` — jamais importe, donnees brutes de reference non utilisees par le code
- [ ] Supprimer `handleDirectPDFDownload` dans `AnalysisStep.tsx` (l70-103) — dead code, fonction stub jamais appelee
- [ ] Supprimer `InfoSection` dans `BaguaOrientationsGrid.tsx` (l388-418) — composant declare mais jamais utilise dans le JSX
- [ ] Supprimer bloc de controles commentes dans `CardinalPointsStep-v2.tsx` (l170-210) — 40 lignes de boutons de rotation commentes

### 1.2 Strings hardcodees (non i18n)

- [ ] `pdf-preview.tsx` l46 : `"PDF genere avec succes !"` — hardcode en francais
- [ ] `pdf-preview.tsx` l48 : `"L'apercu n'est pas disponible sur mobile..."` — hardcode en francais
- [ ] `pdf-preview.tsx` l76 : `"Preview en cours de chargement..."` — hardcode en francais
- [ ] `BaguaOrientationsGrid.tsx` l346 : `"Element : "` — hardcode en francais dans le contenu premium
- [ ] `BaguaPreviewModal.tsx` l109 : `"Analyse Feng Shui Bagua"` — titre modal hardcode
- [ ] `AuthCallbackPage` : `"Authentication successful!"`, `"Go Back"` — hardcode en anglais
- [ ] `client-layout.tsx` l45 : `"Made with ... serenity"` — footer hardcode en anglais

### 1.3 `as any` et types faibles

- [ ] `loadBaguaConfig.ts` l60 : `{} as any` pour `orientations` — utiliser un builder pattern ou `Partial<>`
- [ ] `AnalysisStep.tsx` l50, l54 : `{} as any` pour `sectorRefs` — typer proprement avec un `useMemo` ou factory

### 1.4 Hardcoded year "2026"

- [ ] `page.tsx` l36 : `sessionStorage.getItem('lunar-popup-2026-seen')` — le key devrait etre dynamique avec l'annee courante
- [ ] `layout.tsx` : metadata hardcoded "2026" dans titre et description SEO — devrait etre dynamique ou facile a updater

---

## Phase 2 — Bugs & ameliorations UX

**Status :** `planned`

### 2.1 PDF generation

- [ ] **PDF mobile** : le `handleDirectPDFDownload` est un stub (genere un PDF vide avec juste du texte). Le flow mobile reel passe par `BaguaPreviewModal` mais montre un message "apercu non dispo sur mobile" — ameliorer l'experience
- [ ] **PDF lent** : `pdf-generator.ts` attend 3 secondes (`setTimeout(resolve, 3000)`) avant de commencer la capture — optimiser avec un check de readiness au lieu d'un delai fixe
- [ ] **PDF dark mode** : le PDF force `#ffffff` comme background, ce qui est correct, mais `isDarkMode` est passe dans `PdfCaptureContainers` et affecte les couleurs de texte secondaire (`#a0a0a0` vs `#6b7280`). Le PDF devrait toujours etre en mode clair quel que soit le theme
- [ ] **PDF scrollbar hack** : `pdf-generator.ts` injecte un style global pour cacher les scrollbars pendant la generation — fragile, peut causer des effets de bord

### 2.2 Compass interaction

- [ ] **Pas de feedback visuel de l'angle** : l'utilisateur ne voit pas le degre actuel de rotation pendant le drag — afficher le bearing en temps reel
- [ ] **Reset rotation** : `resetRotation()` existe dans `CardinalWheel` mais n'est pas expose dans l'UI — ajouter un bouton reset
- [ ] **Precision** : drag seul = rotation libre, mais pas de boutons de precision fine (les boutons 1/10/45 degres sont commentes) — proposer au moins un mode "snap to 45"

### 2.3 Upload

- [ ] **PDF upload** : accepte les PDF mais utilise `/api/pdf-preview` comme preview (route qui n'existe pas dans cette app web-only) — desactiver le PDF upload ou implementer un vrai rendu
- [ ] **Crop UX** : le crop avec sliders width/height en pixels est technique et pas intuitif — simplifier avec des presets (A4, carre, libre)

### 2.4 Analyse

- [ ] **Config loading error** : si `loadBaguaConfigFromMessages` throw, l'UI reste bloquee (pas de cfg = boutons disabled, pas de contenu). Pas de message d'erreur visible pour l'utilisateur
- [ ] **Stepper cast** : `AnalyzePage` l101-108 fait un `as unknown as Array<...>` pour les steps — corriger le typage

---

## Phase 3 — Features manquantes

**Status :** `planned`

### 3.1 Save / Load analyse

- [ ] **Persistance locale** : sauvegarder l'analyse en cours dans localStorage (plan + bearing + preferences) pour ne pas perdre le travail si on recharge la page
- [ ] **Export/Import JSON** : permettre d'exporter la config d'analyse et de la reimporter

### 3.2 Historique des analyses

- [ ] **Historique local** : stocker les analyses precedentes (miniature plan + date + bearing) dans localStorage
- [ ] **Historique cloud** (premium) : si authentifie, sauvegarder cote serveur via une future API

### 3.3 Multiple floor plans

- [ ] **Multi-etages** : permettre d'uploader plusieurs plans (RDC, etage 1, etc.) et de faire l'analyse sur chacun avec le meme bearing
- [ ] **Comparaison** : afficher les analyses cote a cote

### 3.4 Room-by-room recommendations

- [ ] **Zones specifiques** : permettre de marquer des pieces sur le plan (chambre, cuisine, bureau...) et donner des recommandations specifiques par piece en croisant avec le secteur Bagua
- [ ] **Piece active** : highlight le secteur quand on clique sur une piece

### 3.5 Interior design suggestions

- [ ] **Suggestions visuelles** : proposer des images/mood boards par secteur (couleurs, materiaux, objets recommandes)
- [ ] **Integration IA** (premium) : generation d'images via ai-sdk pour visualiser les recommandations dans le contexte du plan

### 3.6 Share analysis

- [ ] **Lien de partage** : generer un lien unique (encode base64 ou short URL) contenant la config d'analyse
- [ ] **Social sharing** : boutons de partage avec meta image (OG) generee

### 3.7 Descriptions detaillees des elements

- [ ] **Page educative** : ajouter une section/page expliquant les 5 elements, leurs cycles (productif, destructeur, affaiblissant) avec des visuels interactifs
- [ ] **Tooltips enrichis** : dans l'analyse, chaque element/cycle devrait avoir un tooltip explicatif

### 3.8 Ameliorations PDF

- [ ] **PDF premium enrichi** : inclure les remedes des etoiles volantes, les cycles des 5 elements, les recommandations par piece
- [ ] **PDF branding** : ajouter logo, couleurs de marque, watermark pour la version gratuite
- [ ] **PDF multi-pages** : une page par secteur avec details complets (actuellement 2 pages condensees)

---

## Phase 4 — Qualite & performance

**Status :** `planned`

### 4.2 Performance

- [ ] `page.tsx` (homepage) fait 564 lignes — extraire les sections en composants (HeroSection, BenefitsSection, ComparisonTable, CTASection, LunarPopup)
- [ ] `pdf-capture-containers.tsx` fait 489 lignes avec beaucoup de duplication de rendering de cards entre wheel mode et grid mode — factoriser
- [ ] `PlanUploader.tsx` fait 543 lignes — extraire le CropEditor en composant separe
- [ ] Bundle : `html2canvas` et `@react-pdf/renderer` sont dans les deps mais `pdf-generator.ts` utilise `dom-to-image` + `jspdf` — verifier si `html2canvas` et `@react-pdf/renderer` sont encore utilises, sinon les supprimer

### 4.3 Accessibilite

- [ ] Compass wheel : pas de controle clavier pour la rotation (uniquement mouse/touch drag)
- [ ] BaguaWheel SVG : les labels de secteur utilisent `fill="black"` hardcode — ne s'adapte pas au dark mode
- [ ] Contraste des couleurs sur les pastilles de la boussole en mode sombre

### 4.4 SEO

- [ ] Les metadata dans `layout.tsx` sont hardcodees en francais — utiliser les messages i18n pour le titre/description selon la locale
- [ ] `robots.ts` et `sitemap.ts` a verifier pour la couverture des routes localisees

---

## Notes

- **Stack** : Next.js 15, next-intl, Zustand (unused?), react-easy-crop, dom-to-image + jsPDF, EZPay/EZAuth SDKs
- **Pages** : `/` (landing), `/analyze` (stepper 3 etapes), `/donate` (+ success/cancel), `/auth/callback`
- **Premium** : etoiles volantes verrouillees derriere un paywall (oneshot 4.99, monthly 2.99, yearly 19.99) — verifie via `usePremium` qui query EZPay
- **Donnees Bagua** : separees en base (permanente) + stars (annuelle) dans les messages i18n, combinees au runtime par `loadBaguaConfigFromMessages`
- **3 langues** : fr, en, es — messages de taille similaire (~394 lignes chacun)
- **Pas d'API propre** : app web-only, utilise EZAuth API + EZPay API via SDKs
