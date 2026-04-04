# 🤖 Gemini AI Setup for GreenPulse

GreenPulse utilise maintenant **Google Gemini** (gratuit) au lieu d'OpenAI.

## ✅ Pourquoi Gemini ?

- ✅ **100% Gratuit** - Pas de carte bancaire nécessaire
- ✅ **60 requêtes/minute** - Largement suffisant pour débuter
- ✅ **Multimodal** - Texte + Images
- ✅ **Performant** - Excellent pour l'analyse ESG et images d'équipements

## 🔑 Obtenir une Clé API Gemini (2 minutes)

### Étape 1: Créer une clé

1. Aller sur https://aistudio.google.com/apikey
2. Se connecter avec ton compte Google
3. Cliquer sur **"Create API Key"**
4. Sélectionner un projet (ou en créer un nouveau)
5. Copier la clé générée (commence par `AIza...`)

### Étape 2: Configurer GreenPulse

1. Créer un fichier `.env.local` dans `apps/green-pulse/api/`
2. Ajouter ta clé :

```env
GEMINI_API_KEY=AIzaSy...ta-clé-ici...
MONGO_URL=mongodb://localhost:27017/greenpulse
```

3. C'est tout ! 🎉

## 🚀 Lancer GreenPulse

```bash
# Depuis la racine du monorepo
pnpm dev:gp

# Ou juste l'API
cd apps/green-pulse/api
pnpm dev
```

## 📊 Fonctionnalités Supportées

| Fonctionnalité     | Status          | Modèle Gemini                  |
| ------------------ | --------------- | ------------------------------ |
| Chat ESG           | ✅ Fonctionne   | gemini-1.5-flash               |
| Extraction JSON    | ✅ Fonctionne   | gemini-1.5-flash               |
| Analyse Images     | ✅ Fonctionne   | gemini-1.5-flash               |
| Validation Données | ✅ Fonctionne   | gemini-1.5-flash               |
| Audio → Texte      | ⚠️ Non supporté | Utiliser Whisper ou AssemblyAI |

## ⚠️ Note sur l'Audio

Gemini ne supporte pas encore la transcription audio. Pour cette fonctionnalité :

**Option A: Whisper (OpenAI)** - Payant

```env
OPENAI_API_KEY=sk-...
```

**Option B: AssemblyAI** - Gratuit (3h/mois)
https://www.assemblyai.com/

**Option C: Désactiver** - Commenter le code dans `upload.ts`

## 🧪 Tester l'API

```bash
# Chat simple
curl -X POST http://localhost:6160/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is ESG reporting?", "extract_esg": false}'

# Extraction ESG
curl -X POST http://localhost:6160/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "My company Acme Ltd in Singapore uses 1000 kWh electricity per month", "extract_esg": true}'

# Analyse image
curl -X POST http://localhost:6160/api/upload/image \
  -F "image=@/path/to/meter-photo.jpg"
```

## 📝 Limites Gratuites Gemini

- **Requêtes** : 60/minute (largement suffisant)
- **Tokens** : 1M/jour (énorme)
- **Pas de carte bancaire** nécessaire
- **Pas d'expiration** (gratuit à vie)

## 🆘 Problèmes Courants

### Erreur: "API key not found"

→ Vérifier que `GEMINI_API_KEY` est bien dans `.env.local`

### Erreur: "Invalid API key"

→ Clé mal copiée. Doit commencer par `AIza`

### Erreur: "Quota exceeded"

→ 60 req/min dépassées. Attendre 1 minute.

## 🔗 Liens Utiles

- Gemini API Key: https://aistudio.google.com/apikey
- Documentation: https://ai.google.dev/docs
- Pricing: https://ai.google.dev/pricing (gratuit !)
