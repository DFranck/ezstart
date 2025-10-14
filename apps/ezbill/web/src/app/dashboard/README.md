# Dashboard - Version Switcher

## 🎯 Overview

Le dashboard EZBill dispose de **2 versions** que tu peux basculer en un clic :

- **NEW** (Défaut) : DashboardTabs + GroupedSection avec accordéons
- **OLD** : DashboardSection avec liste plate

## 📁 Architecture des fichiers

```
dashboard/
├── page.tsx           # Router principal avec bouton switch
├── page-old.tsx       # Ancienne version (DashboardSection)
├── page-new.tsx       # Nouvelle version (DashboardTabs + GroupedSection)
└── README.md          # Ce fichier
```

## 🚀 Comment utiliser

1. **Lancer l'app** :
   ```bash
   pnpm dev:billing
   ```

2. **Ouvrir le dashboard** :
   ```
   http://localhost:5025/dashboard
   ```

3. **Switcher entre les versions** :
   - Clique sur le bouton flottant en haut à droite
   - **"Switch to OLD"** → Ancienne version (liste plate)
   - **"Switch to NEW"** → Nouvelle version (tabs + accordéons)

## 🆚 Comparaison des versions

### OLD Version (DashboardSection)

**Avantages :**
- ✅ Simple et directe
- ✅ Tout visible d'un coup

**Inconvénients :**
- ❌ Liste plate de 50+ items = scroll infini
- ❌ Difficile de trouver un élément spécifique
- ❌ Une seule section visible (Clients)

**Use case :** Petites listes (< 10 items)

### NEW Version (DashboardTabs + GroupedSection)

**Avantages :**
- ✅ Organisation par onglets (Clients, Companies, Payment Methods)
- ✅ Grouping avec accordéons (par lettre, par type)
- ✅ Liste compacte et navigable
- ✅ Facile de trouver un élément
- ✅ Badges avec compteurs
- ✅ Empty states gérés automatiquement

**Inconvénients :**
- ❌ Plus de code initial

**Use case :** Grosses listes (> 10 items), données variées

## 🔧 Composants utilisés

### Nouvelle version :

- **DashboardTabs** : Système d'onglets avec actions
- **GroupedSection** : Accordéons intelligents avec grouping
- **Fonctions de grouping** :
  - `groupByFirstLetter()` - Pour Clients/Companies (A, B, C...)
  - `groupByField()` - Pour Payment Methods (par type)
  - `groupByDate()` - Pour Documents (par mois)
  - `groupByStatus()` - Pour Documents (par statut)

### Ancienne version :

- **DashboardSection** : Section simple avec liste plate

## 📝 Prochaines étapes

1. Tester les deux versions avec des données réelles
2. Choisir la version préférée
3. Supprimer l'autre version (ou garder le switch pour d'autres pages)

## 🎨 Personnalisation

Pour changer la version par défaut, modifie [page.tsx](./page.tsx:18) :

```tsx
const [useNewVersion, setUseNewVersion] = useState(true) // true = NEW, false = OLD
```
