# EzBilling – Post-core Roadmap

Ce document liste les fonctionnalités, améliorations et axes de travail à prévoir **après le socle core API**.

---

## 1. UI / Frontend

- [ ] Création d’un Dashboard Next.js (liste/filtres CRUD : clients, factures, devis, reçus)
- [ ] Pages de création/édition pour chaque entité
- [ ] Listing, recherche, pagination, tri
- [ ] Gestion des statuts & actions rapides (marquer comme payée, restaurer, etc.)

---

## 2. Documentation & API UX

- [ ] Documentation Swagger / OpenAPI générée
- [ ] Exemples d’appels d’API (curl, Postman, frontend)
- [ ] README usage + Quickstart

---

## 3. Sécurité & Authentification

- [ ] Ajout d’un système d’authentification (JWT / session)
- [ ] Gestion des utilisateurs (admin, utilisateurs simples)
- [ ] Permissions/Scopes (accès en lecture/écriture, ownership des documents)

---

## 4. Exports & Intégrations

- [ ] Génération de PDF pour factures/devis/reçus
- [ ] Export CSV (clients, factures, etc.)
- [ ] Préparer connecteurs pour intégration (Xero, Quickbooks, autres API)

---

## 5. Emailing & Notifications

- [ ] Envoi automatique d’emails (envoi de facture, rappel d’échéance, notification paiement)
- [ ] Templates d’email personnalisables

---

## 6. Business Logic Avancée

- [ ] Support multi-organisations (multi-tenant)
- [ ] Templates de conditions de paiement (réutilisables)
- [ ] Gestion des remises, acomptes, avoirs
- [ ] Support multilingue (UI & documents)

---

## 7. Monitoring & Qualité

- [ ] Ajout d’un monitoring applicatif (logs, alertes)
- [ ] CI/CD avancée (lint, coverage, build preview)
- [ ] Ajout de tests end-to-end (Cypress/Playwright)

---

## 8. Performance & Scalabilité

- [ ] Indexation MongoDB sur les champs critiques (clientId, documentNumber, status)
- [ ] Stress tests & analyse des performances
- [ ] Préparer la montée en charge (caching, cluster, etc.)

---

## 9. Support & Feedback

- [ ] Système de feedback utilisateurs (issues, suggestions)
- [ ] FAQ / Helpcenter interne

---

## **Prochaine Release :**

> Pr
