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
- [x] Génération automatique du numéro de facture
- [x] Champ `dueDate`
- [x] Statut dynamique (draft/sent/paid)
- [x] Tests d’intégration complets pour Invoice (après refacto)
- [] Paiement enrichi → paymentDate, paymentMethod
- [] Support partially_paid, overdue (statuts avancés)
- [ ] Lock post-paid (flag isLocked sur Invoice après paiement → ne plus permettre update)

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
- [x] Champ `validUntil` (date de validité)
- [x] Tests d’intégration
- [] API markAsSent + sentAt, sentByEmail

---

## 4. Receipts

- [x] Schéma Zod (`Receipt`)
- [x] Modèle Mongoose
- [x] Services CRUD (`create`, `get`, `update`, `softDelete`, `restore`, `hardDelete`)
- [x] Contrôleurs Express (CRUD + restore)
- [x] Routes Express
- [x] Assignation client à un reçu
- [x] Statuts (issued/refunded)
- [x] Tests d’intégration

---

## 5. Custom Line Items

- [x] Schéma Zod pour line item
- [x] Ajout/suppression de line item sur Invoice
- [x] Ajout/suppression de line item sur Quote
- [x] Ajout/suppression de line item sur Receipt (si pertinent)

---

## 6. Tax / VAT Support

- [x] Champ `taxRate` dans les schémas
- [x] Calcul automatique TVA / total TTC dans les services
- [x] Affichage TVA dans la réponse API

---

## 7. Multicurrency

- [x] Champ `currency` dans les schémas (`EUR` par défaut)
- [x] Sélection et gestion de la devise côté API
- [x] Stockage, validation et affichage multi-devises

---

## 8. Due Date, Invoice Number & Terms

- [x] Champ `dueDate` dans les schémas
- [x] Génération automatique du numéro de facture
- [x] Génération/validation des “terms” (conditions de paiement)
- [] Numérotation légale persistante (sans trous)

---

## 9. Tests & CI

- [x] Couverture Jest pour Clients (CRUD, restore, edge cases)
- [x] Couverture Jest complète pour Invoices (à corriger après refactorisation)
- [x] Couverture Jest pour Quotes / Receipts

---

## 10. Products / Services

- [] Schéma Zod (Product / Service)
- [] Modèle Mongoose
- [] Services CRUD (create, get, update, softDelete, restore, hardDelete)
- [] Contrôleurs Express (CRUD + restore)
- [] Routes Express
- [] Champs : name, description, unitPrice, unit, taxRate
- [] Archiver un produit
- [] Tests d’intégration

## 11. Sending / Notification

- [] API markAsSent sur Invoices et Quotes
- [] Champs sentAt, sentByEmail
- [] Envoi email avec lien PDF (SMTP simple ou Resend.io)

## 12. PDF Generation

- [] Génération PDF propre pour Invoice
- [] Génération PDF pour Quote
- [] Génération PDF pour Receipt

## 13. Reporting / Export

- [] API getInvoicesSummary par mois / année / client
- [] Export CSV /export/invoices
- [] Export CSV /export/receipts

## 14. Compliance & Archiving

- [] Numérotation factures conforme
- [] Lock post-paid (facture non modifiable après paid)
- [] Archivage sécurisé
