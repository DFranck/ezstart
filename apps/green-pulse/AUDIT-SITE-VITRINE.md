# Étape 1 — Audit du site vitrine GreenPulse : site vs deck (dernière version) vs brief AEF

## Context
L'analyse du site (hors `/chat`, `/admin`) est conservée et comparée à **deux sources** :
1. **Deck dernière version** (`GreenPulse.AI X CMA-CGM.pdf`) — périmètre retenu : slides cover, « What is GreenPulse », user case, why now, package options, services/valeurs *dé-brandés* (export-readiness, certification, extraction/gap-closing, portfolio risk intelligence), traction (MVP/ICED), stack, parcours « Day 1 », équipe. **Exclus** : nomenclature CMA CGM, slide partenariat/250 K$/structure du deal, « POC / special offer ».
2. **Brief AEF** (forum économique Vietnam) — vocabulaire solutions/problèmes, priorités P1-P4, design, architecture de page.

Lecture seule : aucune modification de code à cette étape. Fichiers site concernés : `apps/green-pulse/web/src/messages/{en,fr,vi}/{home,careers,earthday,common}.json`, `app/[locale]/(home)/{hero,features,competitive,partnership}-section.tsx`, `layout.tsx` (meta/JSON-LD), `schemas.ts`, `sitemap.ts`.

---

## 0. Ce qui a changé dans le deck (vs la version précédente) — impacte l'audit

| Sujet | Ancienne version | **Dernière version** | Effet sur l'audit |
|---|---|---|---|
| Boucle GP.A | Discuss → Diagnose → **Verify, score & certify** → Outcome | **Assess & identify goals → Build strategy & capacity → Structure & auto-populate data → Analyze results, adapt & close gaps → Repeat** ; cœur « *Assess · Guide · Adapt* », « Continuous improvement / Data-driven decisions » | Mon point « manque l'étape Verify/Certify » est **caduc** : certification, reporting, NDAChain, scoring = **outils externes « plug in as needed »** (ISO, ESG SaaS, NDAChain, KPI SaaS) |
| Accroche | « *A Business Strategy tool…* » | « *From assessment to impact. Guiding, connecting, adapting for sustainable and inclusive growth.* » | GP.A = guide + connecteur + adaptateur, plus « strategy tool » |
| Chiffres user case | +20 % export, **+30 %** énergie, +40 % lignes | **+10 %** export, **+15 %** énergie, +40 % lignes (« objectifs estimés ») | L'écart avec le site (« reduce costs by 30 % », 20-40 % dans les cas) **s'aggrave** |
| Intitulé « problème » | « soon non-compliant » | « **missing data** » | Le problème client = données manquantes, pas seulement non-conformité |
| Production | « Production cost reduction » | « Sustainable production : cost control & efficiency, **product-level carbon reduction** » | Ajoute l'angle carbone produit |
| Why now | « 4 forces on Vietnamese **SMEs** », « ESG cascade », ~150 *companies*, BIDV cité | « 4 forces on **Vietnamese economy** », « **Reporting** cascade », ~150 *facilities*, SBV seul | Cadrage économie (pas que PME) ; vocabulaire « reporting » |
| Packages | 3 cartes égales ; « 900 000 PME » | **White-label + License** en offre principale (branding, interface, features sur mesure, **data ownership, platform license**) ; Direct subscription et Ecosystem = « other options » ; cibles : banques, **grandes entreprises**, fonds, cabinets | Le site met l'abonnement direct en avant → **hiérarchie inversée** ; « 900K » retiré du deck |
| Traction | « Official launch in May » | « Official launch: May 2026 (**Free version only**) » ; add-on *portfolio risk intelligence* = **après POC, optionnel** | Le site ne doit pas vendre risk-intelligence comme disponible |
| Phrase clé | — | « *Growth and sustainability are not an oxymoron anymore* » | Tagline utilisable (sémantique seulement) |
| Constantes | « Doesn't sell green, sells sustainable **solutions** », « more than SaaS/AI/consulting, one business partner 24/7 », capacity-building, NDAChain-compatible, Day-1 journey, équipe, ICED | inchangées | — |

**Sémantique & positionnement GP.A (deck dernier état)** : *guide / connecteur / agent* ; **capacity building** (teams, SME) ; **solutions** (pas « vert ») ; **sustainable & inclusive growth** ; **plug-in as needed** (orchestre des outils tiers, ne les remplace pas) ; données structurées/pré-remplies ; amélioration continue ; Vietnam d'abord, ASEAN ensuite ; export-ready + financement vert.

---

## 1. Tensions Deck ↔ Brief AEF (à arbitrer avant toute réécriture)

| # | Sujet | Deck | Brief AEF | Recommandation |
|---|---|---|---|---|
| T1 | Axe de croissance | « **sustainable & inclusive** growth » | « **low-carbon** growth » (le brief note lui-même que ça ne remplace pas *sustainable*) | **✅ TRANCHÉ (fondateur) : *low-carbon growth* l'emporte pour le hero.** Garder *sustainable & inclusive* en second niveau (dimension sociale/économique) |
| T2 | Hero | « Access to sustainable growth. Faster. Smarter. » / « Unlock growth. Build resilience. Powered by Human & AI. » | « Accelerating Low-Carbon Growth Through Trusted Data, AI and Practical Solutions. » | **✅ Hero = proposition AEF** (« Accelerating Low-Carbon Growth Through Trusted Data, AI and Practical Solutions »). Le deck (« Faster. Smarter. », « Unlock growth. Build resilience. ») peut servir de sous-titre/CTA. Conséquence : le deck lui-même (cover) n'est plus aligné sur le site → à signaler |
| T3 | Étapes de méthode | Assess → Build strategy & capacity → Structure data → Analyze & adapt | Assess → Design → Implement → Measure → Scale | Utiliser la boucle du deck (source produit) ; mapper les mots du brief (Measure, Scale) dans les libellés |
| T4 | Nature de l'offre | agent GP.A + 3 voies de distribution (white-label / direct / écosystème) | 4 familles de solutions (Climate & MRV, AI & Data, Capacity building, Circular economy) | Deux axes distincts : **quoi** (capacités) vs **comment** (packages). Ne pas les fusionner |
| T5 | Capacités citées par le brief non présentes dans deck **ni** dans le site : MRV, Climate Action Plans, EPR, GEI, circular economy by design, industrial decarbonisation, biodiversité | — | P1/P2 | **✅ LEVÉ (fondateur : « tout » est commercialisé)** → publiables comme services. Garder : outils de suivi MRV ≠ vérification indépendante ; définir GEI avant de l'afficher ; ne pas citer « dacha » |
| T6 | Greenwashing / « trusted data » | absent du deck (étape « verify » supprimée) | P1 (différenciation) | **Déjà présent sur le site** (hero « NO greenwashing », Vietstock). À garder, **sans promettre de vérification** : deck = plug-in NDAChain/ISO |
| T7 | Visuel | feuille = logo, photos de feuillages, badges | « supprimer la petite feuille, repenser tags/badges, moins de codes verts génériques » | Arbitrer : feuille du **logo** (marque) ≠ feuille **décorative** |

---

## 2. Matrice site / deck / AEF → verdict

Légende : **M** = manque · **C** = contradictoire · **R** = à reformuler · **OK** = aligné.

### 2.1 Positionnement & sémantique
| Thème | Site actuel | Deck | AEF | Verdict |
|---|---|---|---|---|
| Promesse | « AI-Powered **ESG Compliance** for SE Asian SMEs » (hero, meta, JSON-LD, `schemas.ts`) | « sustainable & inclusive growth », « solutions », « guide/connect/adapt » | « Solution provider », « low-carbon growth » | **C** (3 sources contre « ESG compliance ») → **R** |
| Identité | « One sustainable agent for 1 million businesses » | « first AI-powered capacity-building platform in ASEAN » | « Business capacity building » | **M** baseline *capacity-building* ; **C** « 1 million » |
| Ton | vente de produit/plans (« Get Started Free », « Our Offers ») | « more than SaaS/AI/consulting — business partner 24/7 » | « partenaire de solutions plutôt que vendeur d'outils » | **R** |
| IA | « Conversational AI ESG assistant » | « GP.A Agent », fine-tuning, intégration plug-and-play | « Agentic AI = automatisation réelle, pas chatbot » | **R** : décrire ce que l'agent fait (extraction, pré-remplissage, plan d'action) ; vérifier réalité produit |
| Anti-greenwashing | présent | non repris | P1 | **OK** (conserver) |

### 2.2 Problèmes / marché (section « Challenges We Address » du brief)
| Thème | Site | Deck | AEF | Verdict |
|---|---|---|---|---|
| Risques | climat/météo seule (`challenge`) | 4 risques : géopolitique, prix énergie, climat, demande consommateur | greenwashing, données fragmentées, réglementation, accès techno, compétences, financement, résistance, pilote→déploiement | **M** : site ne couvre que 3 problèmes (`problem` : ressources, financement, export) |
| Données | non traité | « missing data », extraction/structuration | « données fragmentées/mauvaise qualité » | **M** (problème central des 2 sources) |
| Réglementation | CSRD seul, « by 2025 » | CBAM & CSRD (immédiat), reporting cascade HNX (29/06/2026, ~150 sites), crédit vert SBV, ETS 2029 | difficulté d'application (EPR) | **M** CBAM/HNX/SBV/2029 ; **C** dates périmées (« 2025 », careers « ETS 50 % by 2025 ») |
| Financement | « Financing Barriers » + Green loans | green loan eligibility scoring + gaps + roadmap + timeline | « green finance readiness, investor-grade data » | **R** : reprendre « readiness » (scoring/gaps/roadmap) |
| Chiffre « 98 % PME sans accès ESG » | présent, non sourcé | absent | absent | **C** (retiré des 2 sources) → à sourcer ou supprimer |

### 2.3 Services & capacités
| Capacité | Site | Deck | AEF | Verdict |
|---|---|---|---|---|
| Boucle méthode | 3 étapes (Discuss & upload / GPA works / Strategy & KPIs) | 4 étapes + « repeat & improve » | Assess→…→Scale | **R** (adopter la boucle deck) |
| Scope 1-2-3, carbone produit | « carbon footprint » | Scope 1-2-3 ready, product-level carbon | carbon footprint assessment | **M** |
| Export-readiness (avant expédition) | cas Agribusiness seulement | service clé | « export readiness » (capacity building) | **M** comme service |
| Accompagnement certification (Vietnam Green Label/VECC-MONRE, ISO) | « ISO » dans Golden | oui, *sans remplacer l'autorité* | — | **M** ; **C** Golden « replaces ESG manager » |
| Extraction data & gap-closing | cas Agribusiness | oui | data quality, tracking, reporting | **M** en service ; feature « extraction » OK dans `transformation` |
| Plug-in d'outils externes (ISO, ESG SaaS, NDAChain, KPI SaaS) | « One-click sync ERP/CRM » | architecture « plug in as needed » | **Drop-in solutions** (P1) | **C/R** : site vante sync ERP/CRM ; deck/AEF = couche modulaire à la demande → vérifier ce qui est réel |
| Climate Action Plans, MRV, EPR, GEI, décarbonation industrielle, économie circulaire | absent | absent | P1/P2 | **M mais hors offre prouvée** (cf. T5) |
| Capacity building (équipes, peer learning) | absent (hors careers) | « capacity building for teams », module Learn | P1 | **M** |
| Portfolio risk intelligence (scores readiness, churn/risque UE, sectoriel, EUDR) | absent | add-on optionnel **post-POC** | « climate-risk data for investors » | **M** ; ne pas présenter comme disponible |

### 2.4 Cibles & packages
| Thème | Site | Deck | Verdict |
|---|---|---|---|
| Offre principale | Abonnement direct (Self-Awareness / Premium / **Golden**) | **White-label + License** ; direct + écosystème = options | **C** hiérarchie |
| Noms de plans | Golden ; Earth Day promet « Pro » | Awareness / Premium / **PRO** | **C** |
| Statut | Premium/Golden « Coming soon » | MVP live, **free only** (mai 2026) | OK ; Earth Day « Pro au lancement » à reformuler |
| White-label | branding + workflow prêt | branding, interface, features sur mesure, **data ownership, licence** | **M** |
| Écosystème | « API solutions » sans section | licence API + routage partenaires ; SaaS, agrégateurs régionaux | **M** |
| Cibles | PME SE Asie ; banques/fonds/accélérateurs | banques, **grandes entreprises**, fonds, **cabinets** ; entreprises ASEAN + PME | **M** grandes entreprises, cabinets ; **C** « 1 million » vs deck sans chiffre |

### 2.5 Résultats chiffrés & preuves
| Thème | Site | Deck | AEF | Verdict |
|---|---|---|---|---|
| Gain énergie | « Reduce costs by **30 %** », 20-35 %, 25-40 % | **+15 %** énergie (estimé, à valider) | « résultats vérifiables » | **C** (site 2× le deck, présenté comme acquis) |
| Export | — | **+10 %** | — | **M** |
| Lignes éligibles export | — | +40 % | — | **M** |
| Due diligence « -40 % temps » | présent | absent | — | **C** non sourcé |
| Partenaires | « Current pilots: leading banks, impact funds… », « 5 beta partners », « $500M+ AUM » | **ICED signé juin 2026**, POC pas lancé | « références clients à confronter » | **C** surdéclaration ; **M** ICED nommé + équipe |
| Cas d'usage | clinique, restaurant, manufacturing, agro | fabricant vietnamien (chaussures/semelles) export UE/US | riz bas carbone (WDP), décarbonation, EPR, capacity building (*pistes éditoriales, pas des références GPA*) | **R** : recentrer sur export ; clinique/restaurant hors cible |

### 2.6 Produit, techno, parcours
| Thème | Site | Deck | Verdict |
|---|---|---|---|
| Parcours Day-1 (présenter business → objectif [croissance, certif., KYC/AML, financement] → jalons avec cadrans → outil modulaire → progrès cumulatif) | absent ; KYC/AML jamais cité | oui | **M** |
| Modules Assess/Plan/Act/Comply/Learn, export Excel/Word, chat voix/photo en vietnamien | partiel | oui | **M/R** |
| Souveraineté / données | FAQ : plan gratuit → OpenAI/Anthropic (US) | « Sovereign. Modular. » | **C** |
| Stack (fine-tuning, intégration, NDAChain-compatible, gap-to-strategy) | absent | oui | **M** (section « Technology », à rendre concret — brief : workflows/cas d'usage plutôt que concepts) |
| Référentiels | GRI/SFDR/CSRD/ISSB/SDG | CBAM, CSRD, GRI, ESG, Scope 1-2-3, ISO, labels VN, EUDR | **R** : SFDR concerne surtout la finance → à confirmer ; ajouter CBAM |

### 2.7 Design / UX (brief AEF §5) — constat sur le code
- **Feuille décorative** : aucune icône feuille trouvée dans le TSX/JSON (grep `leaf|🌱`) hors emails Earth Day (🌱) → à localiser visuellement (logo, hero, images `public/images`). ⚠️ La feuille du **logo** est la marque (cf. T7).
- **Badges/tags** : `<Badge>` dans `hero-section.tsx:80` (heroFeatures) et `features-section.tsx:242` (tags des cas d'usage) ; **icônes emoji** (⏰💰🌍🏭🍽️🌾🎓💼🏦⚙️) dans `problem`, `useCases`, `credibility` → cohérent avec le diagnostic « trop standardisé ».
- **Catalogue abstrait** : `packages` et `credibility` décrivent sans montrer méthode/livrable/résultat ; pas de workflow d'IA illustré.
- Contrainte projet : composants `@ezstart/ui` uniquement, `<Badge>` obligatoire pour les pills (rule ui.md §5) → repenser = adapter variants, pas du HTML custom.

### 2.8 Hors home
- **Careers** : « 70 % MVP », « Page updated Dec 8 2024 », ETS « by 2025 », info personnelle datée (grossesse), email `aseradni@nexora-venture.com` ≠ `partnerships@greenpulse.ai` → **C/R**.
- **Earth Day** : « no signup required » vs login requis ; « GRI, SFDR, CSRD-**compliant** reports » (deck : *aligned*) ; « Pro » inexistant → **C**.
- **SEO** : meta/JSON-LD « ESG compliance » ; sitemap = `/` + `/chat` seulement ; AEF veut keywords low-carbon / decarbonisation / green finance / EPR Vietnam par page → **R** (sans promettre EPR/MRV non livrés).
- Clés probablement mortes (`home.value.*`, `home.example.*`, `home.subtitle`, `cta.joinWaitlist`) à confirmer. `common.appName` = « Green-pulse ».

---

## 3. Synthèse hiérarchisée (P1 → P3 d'après le brief, recoupé deck)

**P1 — contradictions bloquantes (publier sans les corriger = incohérence avec le deck)**
1. Cadrage « ESG compliance » → solutions/capacity building/croissance (3 sources convergent).
2. Chiffres (30 % → 15 %, qualifiés « estimés ») ; claims partenaires/pilotes/AUM ; « replaces ESG manager » ; « compliant » → « aligned ».
3. Hiérarchie des offres : White-label + License d'abord ; plans Awareness/Premium/PRO ; Golden à renommer.
4. Section « Challenges We Address » : risques deck (4) + problèmes AEF (données, réglementation, financement, accès techno, compétences) + forces datées (CBAM/CSRD, HNX, SBV, 2029).
5. Boucle GP.A = version deck (Assess→Build→Structure→Analyze→Repeat) ; plug-in externes.

**P2** — services (export-readiness, certification sans substitution, extraction/gap-closing, capacity building), parcours Day-1, section techno concrète, ICED + équipe + MVP free, cas d'usage export, vocabulaire (low-carbon, trusted data, drop-in, technology access, green finance readiness, export readiness) intégré avec parcimonie, design (badges/emoji/feuille).

**P3 / veille** — cas riz bas carbone / EPR / capacity building = pistes éditoriales, pas des références GPA. MRV, Climate Action Plans, EPR, GEI, décarbonation, économie circulaire : publiables (confirmé commercialisés) ; *portfolio risk intelligence* reste add-on post-POC (deck) → ne pas le présenter comme disponible.

## 4. Arbitrages fondateur (28/10/2026)
1. **Hero = low-carbon growth** (proposition AEF) ; *sustainable & inclusive* en second niveau. Impact : `hero.*`, `challenge`, meta/JSON-LD/`schemas.ts`, FR/VI ; le deck (cover) n'est plus aligné.
2. **Capacités du brief (MRV, Climate Action Plans, EPR, GEI…) : toutes commercialisées** → publiables ; garder les nuances MRV/GEI ci-dessus.
3. **Intégrations ERP/CRM et modèle local : réels** → B9/B10 ne sont plus des sur-promesses ; reformuler « one-click sync » en « drop-in / plug-in as needed » ; clarifier le plan gratuit (OpenAI/Anthropic) vs « sovereign ».
4. **Site B2B-first : offre principale = White-label + License** ; abonnement direct et écosystème en options.
5. *Ouvert* : à quel élément exact se réfère la « petite feuille décorative » (logo vs décor) ?

## Livrable & vérification
Audit enregistré ici (doc seul ; aucun commit/push sans demande). L'étape 2 (réécriture EN/FR/VI + SEO + design) sera planifiée via worktree + boucle dev → auditor → hacker (CLAUDE.md).
