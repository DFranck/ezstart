# EzBilling – Core Features Progress

## 1. Clients

- [x] Schéma Zod (`Client`)
- [x] Modèle Mongoose
- [x] Services CRUD (`create`, `get`, `update`, `softDelete`, `restore`, `hardDelete`)
- [x] Contrôleurs Express (CRUD + restore)
- [x] Routes Express
- [x] Tests d’intégration Jest

---

## 2. Invoices

- [x] Schéma Zod (`Invoice`)
- [x] Modèle Mongoose
- [x] Services CRUD (`create`, `get`, `update`, `softDelete`, `restore`, `hardDelete`)
- [x] Contrôleurs Express (CRUD + restore)
- [x] Routes Express
- [x] Assignation client à une facture (controller/service/route)
- [x] Ajout/suppression de line item (controller/service/route)
- [x] Marquer comme payée (controller/service/route)
- [ ] Génération automatique du numéro de facture
- [x] Champ `dueDate`
- [x] Statut dynamique (draft/sent/paid)
- [ ] Tests d’intégration complets pour Invoice (après refacto)

---

## 3. Quotes / Estimates

- [x] Schéma Zod (`Quote`)
- [x] Modèle Mongoose
- [x] Services CRUD (`create`, `get`, `update`, `softDelete`, `restore`, `hardDelete`)
- [x] Contrôleurs Express (CRUD + restore)
- [x] Routes Express
- [x] Assignation client à un devis (controller/service/route)
- [x] Ajout/suppression de line item (controller/service/route)
- [x] Statuts (draft/sent/accepted/rejected)
- [ ] Champ `validUntil` (date de validité)
- [ ] Tests d’intégration

---

## 4. Receipts

- [x] Schéma Zod (`Receipt`)
- [ ] Modèle Mongoose
- [ ] Services CRUD (`create`, `get`, `update`, `softDelete`, `restore`, `hardDelete`)
- [ ] Contrôleurs Express (CRUD + restore)
- [ ] Routes Express
- [ ] Assignation client à un reçu
- [ ] Statuts (issued/refunded)
- [ ] Tests d’intégration

---

## 5. Custom Line Items

- [x] Schéma Zod pour line item
- [x] Ajout/suppression de line item sur Invoice
- [ ] Ajout/suppression de line item sur Quote
- [ ] Ajout/suppression de line item sur Receipt (si pertinent)

---

## 6. Tax / VAT Support

- [x] Champ `taxRate` dans les schémas
- [ ] Calcul automatique TVA / total TTC dans les services
- [ ] Affichage TVA dans la réponse API

---

## 7. Multicurrency

- [x] Champ `currency` dans les schémas (`EUR` par défaut)
- [ ] Sélection et gestion de la devise côté API
- [ ] Stockage, validation et affichage multi-devises

---

## 8. Due Date, Invoice Number & Terms

- [x] Champ `dueDate` dans les schémas
- [ ] Génération automatique du numéro de facture
- [ ] Génération/validation des “terms” (conditions de paiement)

---

## 9. Tests & CI

- [x] Couverture Jest pour Clients (CRUD, restore, edge cases)
- [ ] Couverture Jest complète pour Invoices (à corriger après refactorisation)
- [ ] Couverture Jest pour Quotes / Receipts

---

## **Avancement global**

- **Clients** : **100% terminé**
- **Invoices** : **75% (presque tout le flow, reste finalisation/numérotation/tests)**
- **Quotes / Receipts** : **En cours, structure prête, logique à cloner/finaliser**
- **Transversal (taxes, devises, tests)** : **Schémas prêts, logique métier à finaliser**

---

> **Prochaine étape :**  
> Finaliser le flow Quotes & Receipts, boucler les tests sur Invoice,  
> puis implémenter les fonctionnalités business (numérotation, TVA, multidevise, terms).
