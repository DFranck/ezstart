# E2E Tests — EZPay

**Derniere execution complete :** 2026-04-05
**Environnement :** Dev (localhost)
**Legende :** ✅ pass | ❌ fail | ⏳ a tester | ⚠️ partiel

---

## 1. Auth & SSO

| ID     | Test                               | Comment tester                                                 | Derniere date | Status |
| ------ | ---------------------------------- | -------------------------------------------------------------- | ------------- | ------ |
| AUTH-1 | Login SSO depuis EZPay             | Clic Connexion → redirect EZAuth → login → callback → connecte | 2026-04-05    | ✅     |
| AUTH-2 | Deconnexion                        | Clic Deconnexion → bouton Connexion reapparait                 | 2026-04-05    | ✅     |
| AUTH-3 | Session persistee apres refresh    | F5 → user toujours connecte                                    | 2026-04-05    | ✅     |
| AUTH-4 | Token passe aux composants pay-sdk | Ouvrir PurchaseButton → "Purchasing as username" visible       | 2026-04-05    | ✅     |
| AUTH-5 | Admin guard — acces admin          | /admin → dashboard affiche si admin                            | 2026-04-05    | ✅     |
| AUTH-6 | Admin guard — acces refuse         | /admin → "Acces administrateur requis" si non-admin            | 2026-04-05    | ✅     |

## 2. Pages statiques

| ID     | Test               | Comment tester                             | Derniere date | Status |
| ------ | ------------------ | ------------------------------------------ | ------------- | ------ |
| PAGE-1 | Home FR            | / → SDK docs, accents FR corrects          | 2026-04-05    | ✅     |
| PAGE-2 | Home EN            | /en → tous textes EN                       | 2026-04-05    | ✅     |
| PAGE-3 | /donate/success    | Page "Merci !", accents, bouton retour     | 2026-04-05    | ✅     |
| PAGE-4 | /donate/cancel     | Page "Paiement annule", Reessayer + Retour | 2026-04-05    | ✅     |
| PAGE-5 | /purchase/success  | "Achat finalise !"                         | 2026-04-05    | ✅     |
| PAGE-6 | /purchase/cancel   | Icone ShoppingBag, Reessayer               | 2026-04-05    | ✅     |
| PAGE-7 | /subscribe/success | "Abonnement actif !"                       | 2026-04-05    | ✅     |
| PAGE-8 | /subscribe/cancel  | Icone CreditCard, Reessayer                | 2026-04-05    | ✅     |
| PAGE-9 | 404                | URL inexistante → page 404 custom          | 2026-04-05    | ✅     |

## 3. Test Center

| ID   | Test            | Comment tester                                     | Derniere date | Status |
| ---- | --------------- | -------------------------------------------------- | ------------- | ------ |
| TC-1 | Acces /test     | Page Test Center avec provider banner              | 2026-04-05    | ✅     |
| TC-2 | Tabs navigation | Clic Tout/Dons/Achats/Abonnements → contenu change | 2026-04-05    | ✅     |
| TC-3 | Provider banner | "Stripe (Mode Test)" + carte 4242 info             | 2026-04-05    | ✅     |
| TC-4 | /test/donate    | 5 DonateButton + DonationWall + historique         | 2026-04-05    | ✅     |
| TC-5 | /test/purchase  | 2 PurchaseButton + historique                      | 2026-04-05    | ✅     |
| TC-6 | /test/subscribe | 4 SubscribeButton (1/3/6/12 mois) + historique     | 2026-04-05    | ✅     |

## 4. Donation Flow E2E

| ID    | Test                        | Comment tester                                      | Derniere date | Status |
| ----- | --------------------------- | --------------------------------------------------- | ------------- | ------ |
| DON-1 | Ouvrir DonateModal          | Clic Donate → modal s'ouvre                         | 2026-04-05    | ✅     |
| DON-2 | Montants predefinis         | €5/€10/€25/€50 visibles et cliquables               | 2026-04-05    | ✅     |
| DON-3 | Montant custom              | Saisir montant libre                                | 2026-04-05    | ✅     |
| DON-4 | Message optionnel           | Saisir un message                                   | 2026-04-05    | ✅     |
| DON-5 | Checkout Stripe             | Clic Donate → redirect Stripe → paiement carte 4242 | 2026-04-05    | ✅     |
| DON-6 | Webhook → completed         | Webhook recu [200] → payment status=completed en DB | 2026-04-05    | ✅     |
| DON-7 | Redirect success            | Apres paiement → /donate/success                    | 2026-04-05    | ✅     |
| DON-8 | DonationWall affiche le don | Don completed apparait dans le wall                 | 2026-04-05    | ✅     |

## 5. Purchase Flow E2E

| ID    | Test                        | Comment tester                           | Derniere date | Status |
| ----- | --------------------------- | ---------------------------------------- | ------------- | ------ |
| PUR-1 | Ouvrir PurchaseButton modal | Clic → modal avec nom produit + prix     | 2026-04-05    | ✅     |
| PUR-2 | "Purchasing as username"    | Username affiche dans le modal           | 2026-04-05    | ✅     |
| PUR-3 | Checkout Stripe             | Buy now → redirect Stripe → carte 4242   | 2026-04-05    | ✅     |
| PUR-4 | Webhook → completed         | Webhooks [200] → status=completed        | 2026-04-05    | ✅     |
| PUR-5 | Redirect success            | Apres paiement → /purchase/success       | 2026-04-05    | ✅     |
| PUR-6 | Historique affiche l'achat  | Purchase apparait dans l'historique user | 2026-04-05    | ✅     |

## 6. Subscription Flow E2E

| ID     | Test                                     | Comment tester                                                   | Derniere date | Status |
| ------ | ---------------------------------------- | ---------------------------------------------------------------- | ------------- | ------ |
| SUB-1  | Ouvrir SubscribeButton modal             | Clic → modal avec nom plan + prix/intervalle                     | 2026-04-05    | ✅     |
| SUB-2  | "Subscribing as username"                | Username affiche                                                 | 2026-04-05    | ✅     |
| SUB-3  | Monthly checkout                         | Subscribe → Stripe → €9.99/month                                 | 2026-04-05    | ✅     |
| SUB-4  | Yearly checkout                          | Subscribe → Stripe → €99.99/year                                 | 2026-04-05    | ✅     |
| SUB-5  | Webhooks subscription                    | checkout.session.completed + customer.subscription.created [200] | 2026-04-05    | ✅     |
| SUB-6  | DB subscription completed                | status=completed, subscriptionId Stripe stocke                   | 2026-04-05    | ✅     |
| SUB-7  | Redirect /subscribe/success              | "Abonnement actif !"                                             | 2026-04-05    | ✅     |
| SUB-8  | Cancel subscription — admin              | Bouton Annuler → ConfirmDialog → status=Annule                   | 2026-04-05    | ✅     |
| SUB-9  | Cancel subscription — user (Test Center) | Bouton Annuler dans la liste abos actifs                         | 2026-04-05    | ✅     |
| SUB-10 | Historique affiche les abos              | Subscriptions dans l'historique user                             | 2026-04-05    | ✅     |

## 7. Admin Dashboard

| ID    | Test                    | Comment tester                                        | Derniere date | Status |
| ----- | ----------------------- | ----------------------------------------------------- | ------------- | ------ |
| ADM-1 | Stats globales          | Revenu total tous types, nombre paiements, par type   | 2026-04-05    | ✅     |
| ADM-2 | Table paiements         | Tous les paiements de tous les users                  | 2026-04-05    | ✅     |
| ADM-3 | Filtre par type         | Dropdown → Don/Achat/Abonnement/Facture               | 2026-04-05    | ✅     |
| ADM-4 | Filtre par statut       | Dropdown → Termine/En attente/Echoue/Rembourse/Annule | 2026-04-05    | ✅     |
| ADM-5 | Recherche email         | Saisir email → resultats filtres                      | 2026-04-05    | ✅     |
| ADM-6 | Pagination              | Suivant/Precedent, "Affichage de X a Y sur Z"         | 2026-04-05    | ✅     |
| ADM-7 | Refund e2e              | Clic Rembourser → ConfirmDialog → status=Rembourse    | 2026-04-05    | ✅     |
| ADM-8 | Cancel subscription e2e | Clic Annuler → ConfirmDialog → status=Annule          | 2026-04-05    | ✅     |
| ADM-9 | ConfirmDialog — etats   | Confirm → Loading → Success (ou Error)                | 2026-04-05    | ✅     |

## 8. Verification Fixes (ISSUE-021 a 025)

| ID    | Test                                            | Comment tester                                                                                     | Derniere date | Status |
| ----- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------- | ------ |
| FIX-1 | DonateButton montants visibles (ISSUE-021)      | /test/donate → chaque bouton affiche son montant (❤️ €5, €10, €25, €50, €100)                      | 2026-04-05    | ✅     |
| FIX-2 | PaymentHistory render apres rebuild (ISSUE-022) | Restart dev server ou rebuild packages → DonationWall et historiques affichent les donnees         | 2026-04-05    | ✅     |
| FIX-3 | Token refresh auto sur 401 (ISSUE-023)          | Attendre expiration token (15min) → action API → token refresh silencieux → requete retry OK       | 2026-04-05    | ✅     |
| FIX-4 | Auth failure declenche logout (ISSUE-023)       | Invalider le refresh token → action API → 401 → callback onAuthFailure → redirect login            | 2026-04-05    | ✅     |
| FIX-5 | Success page texte recu Stripe (ISSUE-024)      | /donate/success → texte FR: "Un recu vous sera envoye par email via Stripe." / EN equivalent       | 2026-04-05    | ✅     |
| FIX-6 | Stripe receipt email envoye (ISSUE-024)         | Faire un don test → verifier dans Stripe dashboard que receipt_email est set sur le payment intent | —             | ⏳     |
| FIX-7 | Admin recherche server-side (ISSUE-025)         | /admin → saisir email partiel → verifier requete API avec param `search` dans le Network tab       | 2026-04-05    | ✅     |
| FIX-8 | Admin recherche debounce (ISSUE-025)            | /admin → taper rapidement → verifier qu'une seule requete part apres 400ms d'inactivite            | 2026-04-05    | ✅     |
| FIX-9 | Admin recherche email partiel (ISSUE-025)       | /admin → saisir "test@" → resultats filtres contenant "test@" dans l'email                         | 2026-04-05    | ✅     |

## 9. My Payments

| ID   | Test             | Comment tester                                                      | Derniere date | Status |
| ---- | ---------------- | ------------------------------------------------------------------- | ------------- | ------ |
| ME-1 | GET /payments/me | curl avec token → retourne seulement les paiements du user connecte | 2026-04-05    | ✅     |

## 10. API Security

| ID     | Test                    | Comment tester                                   | Derniere date | Status |
| ------ | ----------------------- | ------------------------------------------------ | ------------- | ------ |
| SEC-1  | 401 sans token          | curl /purchases, /subscriptions, /payments → 401 | 2026-04-04    | ✅     |
| SEC-2  | 200 routes publiques    | curl /donations, /donations/stats → 200          | 2026-04-04    | ✅     |
| SEC-3  | Ownership purchases     | User normal voit seulement SES achats            | 2026-04-04    | ✅     |
| SEC-4  | Ownership subscriptions | User normal voit seulement SES abos              | 2026-04-04    | ✅     |
| SEC-5  | Admin voit tout         | Admin (appRoles.ezpay) voit tous les paiements   | 2026-04-05    | ✅     |
| SEC-6  | Refund admin only       | Non-admin → 403 sur refund                       | 2026-04-04    | ✅     |
| SEC-7  | Stripe key guard        | sk_live en dev → throw Error                     | 2026-04-04    | ✅     |
| SEC-8  | Webhook signature       | Sans signature → 400, fausse signature → 400     | 2026-04-04    | ✅     |
| SEC-9  | CORS                    | Origins validees, credentials true               | 2026-04-04    | ✅     |
| SEC-10 | Rate limiting           | Headers RateLimit-\* presents                    | 2026-04-04    | ✅     |

## 11. Webhooks

| ID   | Test                          | Comment tester                                         | Derniere date | Status |
| ---- | ----------------------------- | ------------------------------------------------------ | ------------- | ------ |
| WH-1 | checkout.session.completed    | Code review — paymentIntentId stocke, status→completed | 2026-04-04    | ✅     |
| WH-2 | checkout.session.expired      | Code review — status→cancelled                         | 2026-04-04    | ✅     |
| WH-3 | charge.refunded               | Code review — lookup via paymentIntentId               | 2026-04-04    | ✅     |
| WH-4 | customer.subscription.updated | Code review — mapping 8 statuts Stripe                 | 2026-04-04    | ✅     |
| WH-5 | customer.subscription.deleted | Code review — status→cancelled                         | 2026-04-04    | ✅     |
| WH-6 | invoice.payment_failed        | Code review — guard subscriptionId, status→failed      | 2026-04-04    | ✅     |

---

## Resume

| Section       | Total  | ✅     | ⏳    | ⚠️    |
| ------------- | ------ | ------ | ----- | ----- |
| Auth & SSO    | 6      | 6      | 0     | 0     |
| Pages         | 9      | 9      | 0     | 0     |
| Test Center   | 6      | 6      | 0     | 0     |
| Donations     | 8      | 8      | 0     | 0     |
| Purchases     | 6      | 6      | 0     | 0     |
| Subscriptions | 10     | 10     | 0     | 0     |
| Admin         | 9      | 9      | 0     | 0     |
| Verif. Fixes  | 9      | 8      | 1     | 0     |
| My Payments   | 1      | 1      | 0     | 0     |
| Security      | 10     | 10     | 0     | 0     |
| Webhooks      | 6      | 6      | 0     | 0     |
| **TOTAL**     | **80** | **79** | **1** | **0** |

---

## Issues trouvees

### ISSUE-021 — DonateButton tous identiques dans le Test Center `low` `ux`

- **Test:** TC-4
- **Description:** Les 5 DonateButton dans /test/donate affichent tous "❤️ Donate" sans differenciation. Devraient afficher les montants predefinis (€5, €10, €25, €50, €100).
- **Fix:** Chaque DonateModal utilise un custom trigger prop affichant le montant (❤️ €5, €10, etc.)
- **Fichier:** `apps/ezpay/web/src/app/[locale]/test/donate/page.tsx`
- **Status:** fixed

### ISSUE-022 — DonationWall/Historique vide malgre donnees en DB `high` `bug`

- **Tests:** DON-8, PUR-6, SUB-10
- **Description:** Les hooks useDonations/usePurchases/useSubscriptions ne retournent pas de donnees dans le Test Center, bien que l'API retourne les donnees correctement en curl. Le fix du PayClient (unwrap data→payments) a ete committe mais le package pay-sdk n'est pas rebuilde par le hot-reload Next.js.
- **Fix:** Le code etait deja correct (fetchList normalise: `result.data || result.payments || []`). Le probleme etait un cache hot-reload/build qui ne refletait pas les changements du pay-sdk. Resolution: rebuild des packages ou restart du dev server.
- **Status:** fixed (resolved — build cache)

### ISSUE-023 — Token expire ne declenche pas de redirect/alert `medium` `ux`

- **Description:** Quand le JWT access token expire (15min), l'app reste visuellement connectee mais les appels API echouent silencieusement (0 resultats, pas d'erreur affichee). Devrait soit auto-refresh via refresh token, soit afficher une alerte "Session expiree" et rediriger vers le login.
- **Fix:** Ajout d'un intercepteur `fetchWithAuth()` dans PayClient qui detecte les 401, tente un token refresh via auth-sdk, puis retry la requete. Ajout de callbacks `onTokenRefresh` et `onAuthFailure` dans PayProvider, cables dans les providers EZPay et EZStart via `createAuthClient` + `refreshTokens`.
- **Fichiers:** `packages/pay-sdk/src/client.ts`, `types.ts`, `provider.tsx`, providers EZPay/EZStart
- **Status:** fixed

### ISSUE-024 — "Vous recevrez un email de confirmation" trompeur `low` `ux`

- **Description:** La page /donate/success affiche "Vous recevrez un email de confirmation sous peu" mais EZPay n'envoie aucun email. C'est Stripe qui envoie un receipt si configure. Si le receipt Stripe n'est pas active, le texte est trompeur.
- **Fix:** Ajout de `receipt_email` dans le `payment_intent_data` de la checkout session Stripe (mode payment uniquement, pas subscription). Mise a jour des textes i18n FR: "Un recu vous sera envoye par email via Stripe." / EN: "A receipt will be sent to your email via Stripe."
- **Fichiers:** `packages/pay-sdk/src/providers/stripe.ts`, `apps/ezpay/web/src/messages/{fr,en}/payment.json`
- **Status:** fixed

### ISSUE-025 — Recherche email admin cote client seulement `low` `perf`

- **Description:** Le champ "Rechercher par email" dans l'admin dashboard filtre cote client (DataTable filterColumn). Pour 41 paiements c'est OK mais ne scale pas. Devrait etre server-side avec un query param.
- **Fix:** Ajout du param `search` au schema Zod du endpoint GET /payments avec filtre MongoDB `$regex` case-insensitive sur `customerEmail`. Ajout d'un Input debounce (400ms) dans la page admin, suppression du `filterColumn` client-side du DataTable.
- **Fichiers:** `apps/ezpay/api/src/routes/payments/list.ts`, `apps/ezpay/web/src/app/[locale]/admin/page.tsx`
- **Status:** fixed
