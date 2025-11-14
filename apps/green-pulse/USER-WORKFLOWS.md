# 🌿 GreenPulse.AI - User Workflows

**Last Updated:** November 2025
**Status:** MVP - Workflows designed, Implementation 30%

---

## 👥 User Personas

### 1. **Inspecteur ESG** (Primary User)
- Visite plusieurs entreprises par semaine
- Remplit formulaires répétitifs (compliance, audits)
- Besoin de rapidité et mobilité
- **Pain Points:** Formulaires papier, double saisie, erreurs de frappe

### 2. **Consultant ESG** (Primary User)
- Gère plusieurs clients simultanément
- Collecte données pour rapports carbone/ESG
- Besoin de collaboration en équipe
- **Pain Points:** Coordination difficile, données dispersées, Excel complexe

### 3. **Responsable RSE Entreprise** (Secondary User)
- Doit soumettre données régulièrement
- Peu de temps, peu d'expertise ESG
- Besoin de guidance simple
- **Pain Points:** Jargon technique incompréhensible, formulaires longs

---

## 📱 Workflow 1: Inspecteur visite une entreprise (Mode Chat IA)

### Contexte
**Paul**, inspecteur ESG, arrive chez **ABC Corp** pour un audit de conformité. Il a 30 minutes.

### Parcours utilisateur

```
1. 🚗 Dans la voiture (avant visite)
   ↓
   Paul ouvre GreenPulse sur mobile
   → Dashboard shows: "5 inspections en cours"

2. ➕ Création nouveau projet
   ↓
   Clique "Nouvelle inspection"
   → Sélectionne template: "Company Inspection Form"
   → Nom du projet: "ABC Corp - Nov 2025"

3. 🎤 Mode vocal activé (en marchant vers bureau)
   ↓
   Paul parle au téléphone:
   "Je suis chez ABC Corp, 123 rue de Paris,
    secteur manufacturier, environ 50 employés"

   → IA extrait automatiquement:
      ✅ company_name: "ABC Corp" (95% confidence)
      ✅ company_address: "123 rue de Paris" (90%)
      ✅ company_sector: "Manufacturier" (85%)
      ⚠️ employee_count: 50 (70% confidence - à confirmer)

4. 🏢 Dans le bureau (meeting avec client)
   ↓
   Paul continue en mode chat:
   "Contact: Marie Dupont, marie@abccorp.fr"
   "Date inspection: aujourd'hui"

   → Form se remplit en temps réel
   → Champs validés en vert
   → Champs incertains en orange

5. 📝 Pendant la visite
   ↓
   Paul ajoute des notes:
   "Équipements de sécurité conformes aux normes ISO"
   "3 non-conformités mineures détectées"

   → Notes ajoutées dans "inspection_notes"
   → IA suggère: "Souhaitez-vous marquer 'follow_up_required' ?"

6. ✅ Fin de visite (dans la voiture)
   ↓
   Paul révise le formulaire (2 min)
   → Corrige "employee_count: 50 → 48" (IA avait arrondi)
   → Valide compliance_status: "Conforme avec réserves"
   → Soumet le formulaire

7. 📤 Post-visite
   ↓
   → PDF généré automatiquement
   → Email envoyé au client
   → Synchronisé avec son équipe

   ⏱️ Temps total: 15 minutes (vs 45 min en papier)
```

### Points clés
- ✅ **Vocal hands-free** pendant déplacement
- ✅ **Auto-fill intelligent** avec confidence scores
- ✅ **Révision rapide** avant soumission
- ✅ **Export automatique** PDF + sync équipe

---

## 💼 Workflow 2: Consultant gère plusieurs clients (Mode Desktop)

### Contexte
**Sophie**, consultante ESG, prépare des rapports carbone pour 3 clients.

### Parcours utilisateur

```
1. 🖥️ Dashboard - Vue d'ensemble
   ↓
   Sophie se connecte à GreenPulse (desktop)
   → Voit 3 projets en cours:
      - "XYZ Industries - Bilan Carbone 2025" (60% complet)
      - "Tech Startup - Carbon Audit" (20% complet)
      - "Retail Chain - Waste Report" (5% complet)

2. 📊 Projet XYZ Industries (priorité haute)
   ↓
   Clique sur projet
   → Voit 2 formulaires:
      - "Carbon Emissions Report" (draft)
      - "Solar Grant Application" (completed)

3. 💬 Mode Chat pour compléter données manquantes
   ↓
   Sophie: "XYZ Industries a 120 employés,
           15 véhicules de fonction,
           consommation électrique: 45000 kWh/mois"

   → IA remplit automatiquement les champs
   → Suggère: "Voulez-vous aussi remplir 'waste_production' ?"

4. 📸 Upload de documents
   ↓
   Sophie upload facture électricité (PDF)
   → IA lit et extrait: "45,230 kWh" (valide les données chat)
   → Confidence 98% → champ validé automatiquement

5. 👥 Collaboration avec collègue
   ↓
   Sophie: "Il me manque les données de production de déchets"
   → Invite Jean (role: editor) au projet
   → Jean reçoit notification
   → Jean complète le champ manquant le lendemain

6. ✅ Validation finale & export
   ↓
   Tous les champs remplis (100%)
   → Sophie révise et submit
   → Export PDF + Excel pour client
   → Archivé dans projet "XYZ Industries"

   ⏱️ Temps total: 20 minutes (vs 2h en Excel manuel)
```

### Points clés
- ✅ **Multi-projet dashboard** avec statuts
- ✅ **Document upload** avec extraction IA
- ✅ **Collaboration temps réel** avec permissions
- ✅ **Export multi-format** (PDF, Excel, JSON)

---

## 🏢 Workflow 3: Responsable RSE d'entreprise (Mode guidé)

### Contexte
**Marc**, Responsable RSE chez PME, doit soumettre bilan carbone annuel. Peu d'expertise ESG.

### Parcours utilisateur

```
1. 📧 Invitation reçue
   ↓
   Marc reçoit email de son consultant:
   "Complétez ce formulaire pour votre bilan carbone"
   → Clique sur lien → Arrive sur GreenPulse
   → Formulaire pré-créé (read-only fields déjà remplis)

2. ❓ Mode "Guided" activé (pour débutants)
   ↓
   Interface affiche:
   "Répondez simplement aux questions, l'IA s'occupe du reste"

   Question 1: "Combien d'employés dans votre entreprise ?"
   Marc: "environ 30"
   → Champ "employee_count: 30" rempli

   Question 2: "Combien de véhicules de société ?"
   Marc: "On a 2 camionnettes et 1 voiture"
   → Champ "vehicle_count: 3" rempli

3. 🤔 Marc ne connaît pas les données
   ↓
   Question 3: "Consommation électrique mensuelle ?"
   Marc: "Je ne sais pas, il faut que je regarde les factures"

   → IA suggère: "Vous pouvez uploader une facture ou
                  demander à votre comptable de compléter ce champ"
   → Marc clique "Inviter comptable"
   → Comptable (viewer role) ajoute: 12,500 kWh/mois

4. ✅ Validation progressive
   ↓
   Barre de progression: 80% complet
   → 2 champs manquants marqués en rouge
   → IA: "Pour finaliser, j'ai besoin de la production de déchets"

   Marc: "On remplit 3 bennes de 200L par semaine"
   → IA calcule: 3 × 200L × 4 semaines ≈ 240 kg/mois
   → Marc valide: "Oui c'est ça"

5. 📤 Soumission
   ↓
   Marc clique "Terminer"
   → Formulaire envoyé au consultant
   → Marc reçoit confirmation email
   → Peut accéder en read-only au rapport final

   ⏱️ Temps total: 15 minutes (vs formulaire Excel incompréhensible)
```

### Points clés
- ✅ **Mode guidé** avec questions simples
- ✅ **IA calcule** à partir de descriptions naturelles
- ✅ **Delegation facile** aux collègues (comptable, etc.)
- ✅ **Progression visible** avec barre de complétion

---

## 🎯 Workflow 4: Formulaire vocal en déplacement (Mobile)

### Contexte
**Léa**, inspectrice, visite 5 sites par jour. Besoin de remplir vite entre 2 visites.

### Parcours utilisateur

```
1. 🚗 En voiture entre 2 sites
   ↓
   Léa (au volant): "Hey GreenPulse, nouvelle inspection"
   → App lance mode vocal
   → "Projet créé. De quelle entreprise s'agit-il ?"

2. 🎤 Conversation naturelle (hands-free)
   ↓
   Léa: "Delta Services, à Lyon,
         secteur transport et logistique,
         80 employés"

   GreenPulse (vocal): "Compris. Delta Services à Lyon,
                        80 employés, secteur logistique.
                        Quelle est la date de votre visite ?"

   Léa: "Aujourd'hui"

   GreenPulse: "Parfait. Avez-vous des notes à ajouter ?"

   Léa: "Oui, entrepôt très propre,
         installations modernes,
         certifié ISO 14001"

   → Notes enregistrées dans "inspection_notes"

3. 🅿️ Arrivée parking (5 min avant meeting)
   ↓
   Léa (ouvre app sur téléphone):
   → Form 70% complet (grâce au vocal)
   → Manque: contact_person, contact_email

   Léa (en mode texte rapide):
   "Contact: Thomas Martin, thomas@delta.fr"
   → Form 90% complet

4. 🏢 Après visite (dans ascenseur)
   ↓
   Léa (vocal): "Inspection terminée,
                 statut conforme,
                 pas de suivi nécessaire"

   GreenPulse: "Formulaire complet à 100%.
                Voulez-vous le soumettre maintenant ?"

   Léa: "Oui"

   → PDF envoyé par email au client
   → Synchronisé avec équipe

   ⏱️ Temps total: 8 minutes (dont 5 min en vocal mains-libres)
```

### Points clés
- ✅ **100% hands-free** pendant conduite
- ✅ **TTS (Text-to-Speech)** pour feedback vocal
- ✅ **Switch fluide** vocal ↔ texte
- ✅ **Sync temps réel** pour travail offline/online

---

## 📊 Comparaison Méthodes

| Tâche | Papier/Excel | GreenPulse Chat | GreenPulse Vocal |
|-------|--------------|-----------------|------------------|
| **Inspection standard** | 45 min | 15 min | 8 min |
| **Bilan carbone** | 2h | 20 min | - |
| **Taux d'erreur** | 15% | 3% | 5% |
| **Mobilité** | ❌ | ✅ | ✅✅ |
| **Collaboration** | ❌ | ✅ | ✅ |
| **Formation requise** | 2h | 10 min | 5 min |

---

## 🎨 UI Key Screens

### 1. Dashboard
```
┌─────────────────────────────────────────────────┐
│  GreenPulse           [+] Nouveau projet  [👤] │
├─────────────────────────────────────────────────┤
│  📊 Projets en cours (5)          🔍 [Search]   │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ ABC Corp - Nov 2025           60%  ⚠️      │ │
│  │ Company Inspection                        │ │
│  │ 👤 Vous · 🕐 Modifié il y a 2h            │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ XYZ Bilan Carbone            100% ✅       │ │
│  │ Carbon Emissions Report                   │ │
│  │ 👥 Sophie, Jean · 🕐 Complété hier        │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  📂 Projets archivés (12)                      │
└─────────────────────────────────────────────────┘
```

### 2. Form Filling (Split-screen Desktop)
```
┌──────────────────────┬──────────────────────┐
│  📝 Company Inspec.  │  💬 Chat IA          │
├──────────────────────┼──────────────────────┤
│                      │                      │
│ Company Name *       │ User:                │
│ [ABC Corp      ] ✅  │ "ABC Corp à Paris,   │
│                      │  secteur manu"       │
│ Address *            │                      │
│ [Paris         ] ⚠️  │ IA:                  │
│ ⚠️ Adresse           │ "Compris ! J'ai      │
│    incomplète        │  rempli le nom et    │
│                      │  le secteur.         │
│ Sector *             │  Pouvez-vous         │
│ [Manufacturier ] ✅  │  préciser            │
│                      │  l'adresse           │
│ Employees *          │  complète ?"         │
│ [50            ] ✅  │                      │
│                      │ [Envoyer... ]        │
│ [💬 Chat] [🎤 Vocal] │                      │
│ [📄 Upload doc]      │ 🎤 Parler            │
│                      │                      │
│ Progress: ████░ 60%  │                      │
│ [Sauvegarder] [▶️]   │                      │
└──────────────────────┴──────────────────────┘
```

### 3. Form Filling (Mobile)
```
┌─────────────────────────┐
│ ← ABC Corp Inspection   │
├─────────────────────────┤
│                         │
│ ████████░░ 80%          │
│                         │
│ 💬 Chat Mode            │
│ ┌─────────────────────┐ │
│ │ User:               │ │
│ │ Contact: Marie      │ │
│ │ Dupont,             │ │
│ │ marie@abc.fr        │ │
│ │                     │ │
│ │ IA:                 │ │
│ │ ✅ J'ai ajouté      │ │
│ │ Marie comme         │ │
│ │ contact. Autre      │ │
│ │ chose ?             │ │
│ └─────────────────────┘ │
│                         │
│ [___Type message____]   │
│ [Envoyer] 🎤            │
│                         │
│ [📝 Voir form] [✅ OK]  │
└─────────────────────────┘
```

### 4. Vocal Interface (Mobile)
```
┌─────────────────────────┐
│ 🎤 Mode Vocal           │
├─────────────────────────┤
│                         │
│        🔴               │
│    RECORDING            │
│                         │
│  "Delta Services,       │
│   à Lyon,               │
│   secteur logistique"   │
│                         │
│ ┌─────────────────────┐ │
│ │ ✅ Compris !        │ │
│ │ J'ai rempli :       │ │
│ │ • Nom entreprise    │ │
│ │ • Ville             │ │
│ │ • Secteur           │ │
│ │                     │ │
│ │ Quelle est la date  │ │
│ │ de visite ?         │ │
│ └─────────────────────┘ │
│                         │
│   [🎤 Parler]          │
│   [⏸️ Pause]           │
│   [📝 Passer texte]    │
└─────────────────────────┘
```

---

## 🔄 State Transitions

### Project States
```
draft → in_progress → review → completed → archived
  ↓         ↓          ↓
shared    shared    shared
```

### Form Instance States
```
empty (0%) → partial (1-99%) → complete (100%) → submitted
                ↓
           requires_review (low confidence fields)
```

---

## 🎯 Success Metrics

### Time Savings
- **Inspection:** 45 min → 15 min (67% faster)
- **Carbon Report:** 2h → 20 min (83% faster)
- **Onboarding:** 2h → 10 min (92% faster)

### Quality Improvements
- **Error Rate:** 15% → 3% (80% reduction)
- **Completion Rate:** 60% → 95% (58% increase)
- **User Satisfaction:** Target NPS > 50

### Adoption Metrics
- **Time to First Form:** < 5 minutes
- **Daily Active Users:** Target 100+ inspectors
- **Forms per User/Week:** Target 10+

---

## 🚧 Implementation Status

### Completed ✅
- Backend API (100%)
- Form extraction AI (100%)
- Multi-user/permissions (100%)
- Form templates (4 seed forms)

### In Progress ⏳
- Dashboard UI (30%)
- Chat interface (10%)
- Form renderer (20%)

### TODO 📋
- Vocal interface (0%)
- Mobile optimization (0%)
- Real-time collaboration (0%)
- Document upload (0%)

---

## 📚 Related Documentation

- [FORMS.md](./FORMS.md) - Technical implementation details
- [API README](./api/README.md) - Backend API documentation
- [Web README](./web/README.md) - Frontend documentation

---

**Questions or feedback?** Contact product team.
