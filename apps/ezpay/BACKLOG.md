# Backlog — EZPay

**Status :** `maintained` | **Derniere mise a jour :** 2026-04-01

## Objectif

Payment System centralise pour le monorepo @ezstart (donations, achats, abonnements, factures via Stripe).

---

## Phase 1 — CRITICAL : Securite & Fiabilite

### 1.3 Auth manquant sur verify-payment `high` `security` — `done`

- [x] `POST /verify-payment/:sessionId` n'a aucune protection — permet a quiconque de verifier/completer un paiement arbitraire
- [x] Ajouter rate limiting specifique ou `optionalAuthMiddleware`

### 1.4 Webhook refund lookup incorrect `critical` `bug` — `done`

- [x] `charge.refunded` cherche par `charge.id` mais les payments sont stockes avec `session.id` (checkout session ID) — le refund ne sera JAMAIS trouve en DB
- [x] Solution : stocker `payment_intent` dans le Payment document lors du webhook `checkout.session.completed`, puis chercher par payment_intent dans `charge.refunded`

### 1.5 Stripe API version obsolete `high` `tech-debt` — `planned`

- [ ] `stripe.ts` utilise `apiVersion: '2023-10-16'` — plus de 2 ans de retard
- [ ] Mettre a jour vers la derniere version Stripe API et tester la compatibilite

---

## Phase 2 — Qualite de Code

### 2.3 Stats endpoint inefficace `medium` `performance` — `done`

- [x] `donations/stats.ts` charge TOUS les documents en memoire (`Payment.find(query)`) pour calculer total/count
- [x] Puis refait une 2e query pour les `recent` — 2 queries au lieu d'1 aggregation
- [x] Solution : utiliser `Payment.aggregate()` avec `$group` pour calculer total/count + `$facet` pour les recent

### 2.4 Fallback silencieux sur validation echouee `low` `bug` — `done`

- [x] `list.ts` (donations, purchases, subscriptions) : si `safeParse` echoue, fallback sur `req.query as Record<string, string>` au lieu de retourner une erreur de validation
- [x] Solution : retourner `sendValidationError()` quand la validation echoue, comme dans les routes create

### 2.5 `Record<string, any>` dans pay-sdk types `low` `code-quality` — `done`

- [x] `Payment.metadata` type est `Record<string, any>` — devrait etre un union type base sur `PaymentType`
- [x] Utiliser les interfaces specifiques deja definies (`DonationMetadata | PurchaseMetadata | SubscriptionMetadata | InvoiceMetadata`)

### 2.7 `as any` dans les tests `low` `code-quality` — `planned`

- [ ] 3 occurrences de `as any` dans Payment.test.ts (lignes 101, 131, 148) — utiliser les types corrects

---

## Phase 3 — UX Web

### 3.1 Web app quasi vide `high` `feature` — `planned`

- [ ] La web app n'a qu'une seule page (landing/documentation) — pas de vraie fonctionnalite
- [ ] Pas de page `/donate/success` ni `/donate/cancel` (alors que l'API redirige vers ces URLs)
- [ ] Pas de page de gestion des paiements
- [ ] Pages a creer :
  - [ ] `/donate/success` — page de succes apres paiement (avec verification via verify-payment)
  - [ ] `/donate/cancel` — page d'annulation
  - [ ] `/dashboard` — historique des paiements pour l'utilisateur connecte
  - [ ] `/donations` — mur de donations public

### 3.2 Pas de navigation ni header/footer `medium` `ux` — `planned`

- [ ] La landing page n'a aucune navigation (pas de header, pas de footer, pas de liens)
- [ ] Ajouter un layout avec navigation coherent avec le reste de l'ecosysteme

### 3.3 Landing page basique `low` `ux` — `planned`

- [ ] La page d'accueil est une page de documentation SDK — pas adaptee pour des utilisateurs finaux
- [ ] Devrait avoir une vraie landing page de presentation + CTA vers les demos
- [ ] Les code snippets ne sont pas dans des composants `<pre>/<code>` stylises

### 3.4 i18n incomplet `low` `i18n` — `planned`

- [ ] Les traductions FR manquent les accents (`recents` → `recents`, `Termine` → `Termine`, etc.)
- [ ] Les messages `common.json` et `layout.json` existent mais ne semblent pas utilises dans la page d'accueil (utilise `payment.json > home`)
- [ ] Verifier que les traductions `layout.json` sont utilisees dans le layout

---

## Phase 4 — API Robustesse

### 4.1 Pas d'endpoint refund `high` `feature` — `done`

- [x] `stripe.ts` a une fonction `refundPayment()` mais aucune route API ne l'expose
- [x] Creer `POST /payments/:paymentId/refund` avec auth admin
- [x] Mettre a jour le statut en DB apres refund reussi

### 4.2 Pas de GET /payments (liste) `high` `feature` — `done`

- [x] Seul `GET /payments/:paymentId` existe — pas moyen de lister tous les paiements
- [x] Ajouter `GET /payments` avec pagination, filtres (type, status, projectId, userId, dateRange)
- [x] Proteger avec authMiddleware (admin only ou user=own payments)

### 4.3 Purchase redirect URLs incorrectes `medium` `bug` — `done`

- [x] `purchases/create.ts` redirige vers `/donate/success` et `/donate/cancel` — devrait etre `/purchase/success` et `/purchase/cancel`
- [x] Meme probleme dans `subscriptions/create.ts` — redirige vers `/donate/success` au lieu de `/subscribe/success`

### 4.4 Subscriptions list manque filtre par projectId `low` `feature` — `planned`

- [ ] `GET /subscriptions` filtre uniquement par userId — pas par projectId
- [ ] Ajouter le filtre projectId comme dans donations et purchases

### 4.5 Donations list requiert auth mais est publique `medium` `bug` — `done`

- [x] `GET /donations` a `authMiddleware` mais sert a afficher le mur public de donations
- [x] Devrait utiliser `optionalAuthMiddleware` ou pas d'auth du tout (les donations publiques sont publiques)
- [x] Le pay-sdk `getDonations()` n'envoie pas de token d'auth — donc cet endpoint echoue toujours en production

### 4.6 Missing idempotency `low` `reliability` — `planned`

- [ ] Les routes create (donate, purchase, subscribe) ne gerent pas l'idempotence
- [ ] Si le client retry, un 2e payment record est cree en DB (le unique constraint sur paymentId empeche les doublons Stripe mais pas les doublons metier)
- [ ] Ajouter un header `Idempotency-Key` et verifier avant de creer

---

## Phase 5 — Features Manquantes

### 5.1 Payment history pour users `high` `feature` — `planned`

- [ ] Pas de vue "mes paiements" pour un utilisateur connecte
- [ ] Cote API : ajouter `GET /payments/me` (auth required, filtre par userId du token)
- [ ] Cote SDK : ajouter `getMyPayments()` dans PayClient
- [ ] Cote web : page `/dashboard` avec liste paginee

### 5.2 Integration EZBill (invoices) `medium` `feature` — `planned`

- [ ] Le model Payment supporte `type: 'invoice'` avec metadata invoiceId/invoiceNumber
- [ ] Mais aucune route API pour les invoices (pas de create, list, etc.)
- [ ] Creer les routes invoice et integrer avec l'API EZBill pour generer un paiement a partir d'une facture

### 5.3 Multi-currency support `medium` `feature` — `planned`

- [ ] Le champ `currency` existe dans le model mais tout est en USD par defaut
- [ ] Le DonationWall hardcode `$`
- [ ] Ajouter la gestion multi-devise : EUR, GBP, etc.
- [ ] Utiliser `Intl.NumberFormat` pour l'affichage des montants partout

### 5.4 Email receipts `medium` `feature` — `planned`

- [ ] Aucun email envoye apres un paiement reussi
- [ ] Stripe envoie des receipts natifs mais il faut l'activer (ou envoyer des emails custom)
- [ ] Option 1 : activer `receipt_email` dans Stripe checkout session
- [ ] Option 2 : envoyer un email custom via un service email (apres webhook `checkout.session.completed`)

### 5.5 Payment analytics dashboard `low` `feature` — `planned`

- [ ] Pas de dashboard admin pour voir les stats de paiement
- [ ] Ajouter une page admin avec :
  - [ ] Revenue total par periode
  - [ ] Nombre de paiements par type/status
  - [ ] Graphiques d'evolution
  - [ ] Top projets par revenue

### 5.6 Pas de composants SDK pour purchases/subscriptions `low` `feature` — `planned`

- [ ] Le pay-sdk a des composants uniquement pour donations (DonateButton, DonateModal, DonationWall)
- [ ] Manque : PurchaseButton, SubscriptionCard, PaymentHistory
- [ ] Les hooks n'existent que pour donations (useDonations) — manque usePurchases, useSubscriptions

---

## Phase 6 — Tech Debt & Cleanup

### 6.1 dist/ commite dans le repo `medium` `tech-debt` — `planned`

- [ ] `api/dist/` est versionne dans git — devrait etre dans `.gitignore`
- [ ] Supprimer du repo et ajouter a `.gitignore`

### 6.2 PayPal reference morte `low` `cleanup` — `done`

- [x] Le model Payment supporte `provider: 'paypal'` mais aucune integration PayPal n'existe
- [x] Documente dans le code : garde pour futur support

### 6.3 Legacy export dans Payment model `low` `cleanup` — `done`

- [x] `export const Payment = { get: getPaymentModel }` est un wrapper inutile marque TODO
- [x] Verifie qu'aucun code ne l'utilise — supprime

### 6.4 Commented-out code dans DonateModal `low` `cleanup` — `planned`

- [ ] Lignes 149-151 : bloc de code commente (currency symbol prefix dans l'input)
- [ ] Supprimer ou reimplementer proprement

### 6.5 `dangerouslySetInnerHTML` pour CSS dans DonationWall `low` `code-quality` — `planned`

- [ ] Animation CSS injectee via `dangerouslySetInnerHTML` — risque XSS et mauvaise pratique
- [ ] Deplacer dans un fichier CSS ou utiliser Tailwind `animate-*` classes

### 6.6 useDonations missing deps dans useEffect `low` `bug` — `done`

- [x] `useDonations.ts` : le useEffect depend de `loadDonations` qui n'est pas dans le deps array
- [x] React strict mode peut causer des comportements inattendus
- [x] Solution : `loadDonations` wrappe dans `useCallback`, ajoute dans les deps du useEffect

---

## Notes

- La cle Stripe LIVE ne doit JAMAIS etre dans .env.local
- Le pay-sdk est le package partage, ezpay est l'app
- Le pay-sdk a deja une bonne base (client, provider, store, hooks, components, schemas) mais uniquement pour les donations
- L'API suit le pattern action-based routing correctement
- Sentry est integre pour le monitoring d'erreurs
- OpenAPI documentation est en place sur toutes les routes
- Rate limiting global est active (100 req/15min)
- La web app est quasi vide — fonctionnellement c'est juste une page de doc SDK
