# Dashboard Entry Point

## 🧱 Composants de layout :

<LayoutWithAside />

TopHeader = onglets pour changer de vue (Clients, Invoices, Quotes, Receipts)

Aside = sélecteur client (liste filtrable + bouton + Add Client)

Main = affichage dynamique en fonction :

de la vue sélectionnée

et du client sélectionné (ou non)

## 📐 Vue globale – UX logiques par cas

🔹 Cas 1 : Vue = Clients && Aucun client sélectionné
Vue "dashboard global"

Afficher :

Total clients

Nombre de factures, devis, reçus au global

Graphiques type pie chart ou bar chart

Top 5 clients par chiffre d’affaires

Bouton + Add Client

👉 Comportement attendu : tu donnes une vue macro / santé de ton activité.

🔹 Cas 2 : Vue = Clients && Client sélectionné
Fiche client étendue

Afficher :

Infos du client (nom, email, téléphone…)

Nombre de factures, devis, reçus

Total TTC facturé, total payé, en attente

Graphiques : timeline de facturation / pie chart status factures

Actions rapides : Créer facture, Créer devis, Créer reçu

🔹 Cas 3 : Vue = Invoices && Aucun client sélectionné
Liste de toutes les factures (vue tableau)

Filtres : statut (draft/sent/paid), période, montant

Tri + recherche + pagination

Résumé en haut :

Total facturé ce mois

Montant payé / impayé

Bouton + New Invoice

🔹 Cas 4 : Vue = Invoices && Client sélectionné
Liste filtrée sur le client

Graphique : évolution des factures pour ce client

Statut : combien en attente, combien payées

Actions rapides : Nouvelle facture, Rappel, Envoyer toutes

🔹 Cas 5 : Vue = Quotes / Receipts
Même logique que Invoices :

Quand aucun client → vue globale

Quand client sélectionné → données filtrées

Résumé + listing + actions rapides

💡 Suggestions d'améliorations UX

1. Affichage intelligent dans le <Main>
   tsx
   Copy
   Edit
   if (!selectedClient) {
   // render global dashboard or list
   } else {
   // render client-specific view
   }
2. TopHeader dynamique
   Tabs : Clients, Invoices, Quotes, Receipts

Chaque clic met à jour la vue (useDashboardView)

Option : icône / badge dans le tab (ex: ⚠️ pour factures en retard)

3. Aside UX
   Liste verticale scrollable des clients

Click = sélectionne le client et réactualise la vue

Bouton + Add Client sticky en bas

Recherche client en live

4. Mobile UX
   Burger TopHeader = toggle aside

Lorsque aside ouvert → le <Main> est désactivé

Affichage simplifié (chart switchable par tabs)

5. Exemples de composants réutilisables
   <DashboardHeaderStats /> → pour le résumé haut de page

<ClientSummaryCard /> → mini fiche client dans aside

<ChartInvoicesByStatus />, <ChartQuotesMonthly /> → à afficher conditionnellement

🌟 Bonus UX
Idée Où Pourquoi
Bouton Créer document sticky Main Gagner en efficacité
Toast “Client sélectionné” Main Aide à comprendre le contexte actif
Breadcrumbs TopHeader Améliore la navigation (Clients > Jean Dupont)
