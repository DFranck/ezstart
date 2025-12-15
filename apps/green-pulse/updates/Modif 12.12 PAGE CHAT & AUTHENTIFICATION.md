PAGE CHAT & AUTHENTIFICATION
Pour: Franck via Claude Code
Section: Modifications Chat Interface & Login

🎯 SECTION 7: PAGE D'AUTHENTIFICATION (LOGIN)
Modification 1: Branding GreenPulse
Élément: Texte "Sign in to access green-pulse"
Action: Remplacer "green-pulse" par "GreenPulse.AI" en vert (couleur brand: #4CAF50 ou équivalent)
Modification 2: Bouton Google OAuth
Action: Ajouter la couleur officielle du logo Google au bouton

Utiliser les couleurs officielles Google (bleu, rouge, jaune, vert du logo)
Ou au minimum: icône Google en couleur (pas monochrome noir)

Modification 3: Titre "EZAuth"
Problème: Taille de police trop grande, crée confusion avec le nom du produit
Action: Réduire la taille de la police du titre "EZAuth"

Passer de la taille actuelle à environ 70-80% de la taille actuelle
Ou remplacer complètement par "Sign in to GreenPulse" si possible
Objectif: éviter que l'utilisateur pense que "EZAuth" est le nom de l'application

Modification 4: Métadonnées Open Graph (partage de liens)
Problème visible dans screenshot WhatsApp:

Logo apparaît mal ou pas du tout
Description tronquée/illisible

Action: Corriger les balises Open Graph dans le <head> de la page
Métadonnées requises:
html<!-- À implémenter dans <head> -->

<meta property="og:title" content="GreenPulse.AI - Your ESG Compliance Assistant" />
<meta property="og:description" content="Get your own sustainable Agent to develop your business. Enterprise-grade compliance tools made accessible for everyone. Start free today." /><meta property="og:image" content="https://www.ai-greenpulse.com/og-image.png" />
<meta property="og:url" content="https://www.ai-greenpulse.com/chat" />
<meta property="og:type" content="website" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="GPA, your own green expert Agent" />
<meta name="twitter:description" content="Get your own sustainable Agent to develop your business." />
<meta name="twitter:image" content="https://www.ai-greenpulse.com/og-image.png" />
Image Open Graph à créer:

Dimensions: 1200x630px (format standard)
Contenu: Logo GreenPulse + tagline "Your New Green Agent"
Fond: vert clair avec logo centré
Fichier: /public/og-image.png

🎯 SECTION 8: INTERFACE CHAT (après connexion)
Modification 1: Séparateur visuel
Localisation: Sous la ligne "My plan: Self-awareness..."
Action: Ajouter une ligne fine séparatrice horizontale

Couleur: gris clair (#E0E0E0 ou équivalent)
Épaisseur: 1px
Largeur: 100% de la largeur du container
Margin: 0.5rem en haut et en bas

Modification 2: Section "Upgrade"
Élément 1: Supprimer l'icône/logo devant "Upgrade to get access to premium features:"
Élément 2: Aligner le titre avec les icônes en dessous

Le texte "Upgrade to get access to premium features:" doit avoir le même alignement horizontal que les icônes des features listées en dessous
Vérifier l'indentation et le padding pour assurer l'alignement parfait

Modification 3: Modèles IA grisés
Action: Supprimer le badge/label "Coming soon" devant les modèles d'IA qui sont actuellement désactivés/grisés

Garder juste le nom du modèle en gris
État visuel grisé suffit à indiquer l'indisponibilité
Pas besoin de texte "Coming soon" redondant

📊 RÉCAPITULATIF DES MODIFICATIONS PAGE CHAT
Authentification:

"green-pulse" → "GreenPulse.AI" en vert
Logo Google OAuth en couleur
Réduire taille police "EZAuth"
Corriger métadonnées Open Graph (logo + description)
Créer image og-image.png (1200x630px)

Interface Chat:

Ligne séparatrice sous "My plan: Self-awareness..."
Supprimer icône devant "Upgrade to get access..."
Aligner titre "Upgrade" avec icônes dessous
Supprimer "Coming soon" des modèles IA grisés

🎯 PRIORITÉ DE CES MODIFICATIONS
HAUTE PRIORITÉ:

Métadonnées Open Graph (branding essentiel)
Branding "GreenPulse.AI" en vert sur page login
Réduction taille "EZAuth"

MOYENNE PRIORITÉ: 4. Logo Google en couleur 5. Ligne séparatrice dans chat 6. Suppression "Coming soon" 7. Alignement titre "Upgrade"

FIN DE L'AJOUT AU BRIEF
