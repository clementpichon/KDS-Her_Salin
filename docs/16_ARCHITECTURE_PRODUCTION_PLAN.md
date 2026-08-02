# 16_ARCHITECTURE_PRODUCTION_PLAN.md

# Architecture du ProductionPlan

Version : 1.0

Statut : Architecture cible

---

# Objectif

Le ProductionPlan représente l'unique vue publique de la planification produite par le Scheduler.

Il constitue le contrat d'échange entre le moteur de décision et le reste du système.

Aucun composant externe ne consulte directement les Work Units, les Batchs ou les calculs internes du Scheduler.

Tous les consommateurs utilisent exclusivement le ProductionPlan.

Cette approche garantit :

- une seule source de vérité ;
- une cohérence globale ;
- une architecture faiblement couplée ;
- une synchronisation simplifiée.

---

# Position dans l'architecture

```text
                 Scheduler
                      │
                      ▼
              ProductionPlan
        ┌─────────┼─────────┐
        ▼         ▼         ▼
     Caisse   Pizzaiolo    Four
        ▼         ▼         ▼
      Pani'NO   Prêtes   Dispatcher
```

Le ProductionPlan représente une photographie complète de la production à un instant donné.

Il ne contient aucune logique métier.

Il décrit uniquement le résultat des calculs du Scheduler.

---

# Responsabilités

Le ProductionPlan possède quatre responsabilités.

| Responsabilité | Description |
|----------------|-------------|
| Décrire le plan courant | Représenter la production telle qu'elle doit être exécutée. |
| Synchroniser les postes | Fournir une vision identique à tous les écrans. |
| Expliquer les décisions | Conserver les raisons calculées par le Scheduler. |
| Garantir la cohérence | Éviter que chaque poste reconstruise sa propre vision. |

---

# Ce que le ProductionPlan ne fait jamais

Le ProductionPlan ne :

- calcule aucune priorité ;
- ne construit aucun Batch ;
- ne choisit aucune ressource ;
- ne modifie jamais les Work Units ;
- ne contient aucune règle métier.

Il est une représentation.

Jamais un moteur de décision.

---

# Philosophie

Le Scheduler réfléchit.

Le ProductionPlan décrit.

Les postes exécutent.

Cette séparation constitue le principe fondamental de l'architecture.

---

# Structure générale

```text
ProductionPlan

├── Metadata

├── Timeline

├── Work Units

├── Batchs

├── Resources

├── Alerts

├── Waiting Reasons

├── Estimated Times

└── Diagnostics
```

Chaque section possède une responsabilité clairement définie.

La suite du document décrit chacune d'elles.

---

# Structure du ProductionPlan

Le ProductionPlan est un objet immuable.

Chaque publication représente une nouvelle version complète du plan de production.

Le Scheduler ne modifie jamais un ProductionPlan existant.

Il en publie un nouveau.

---

# Versionnement

Chaque ProductionPlan possède un identifiant unique.

Exemple :

```text
Plan #152
```

Puis :

```text
Plan #153
```

Le plan précédent reste disponible à des fins :

- de diagnostic ;
- de simulation ;
- de comparaison ;
- d'historique.

---

# Métadonnées

Les métadonnées décrivent le contexte général.

Exemple :

```text
Metadata

├── planId
├── version
├── createdAt
├── schedulerRunId
├── currentTime
├── planningWindow
└── generatedIn
```

Ces informations ne participent pas directement à la production.

Elles facilitent la traçabilité.

---

# Fenêtre de planification

Le ProductionPlan décrit uniquement une fenêtre de temps.

Exemple :

```text
19:30

↓

20:00
```

ou

```text
Maintenant

↓

+30 minutes
```

Le Scheduler pourra publier un nouveau plan avant la fin de cette fenêtre.

---

# Timeline

Le ProductionPlan contient une représentation temporelle.

Exemple :

```text
19:32

Preparation

↓

19:34

Cooking

↓

19:36

Finishing

↓

19:37

Ready
```

Cette Timeline reste indépendante des interfaces.

Chaque poste choisit ensuite sa propre représentation graphique.

---

# Work Units

Les Work Units constituent le cœur du ProductionPlan.

Chaque Work Unit expose uniquement les informations utiles à l'exécution.

Exemple :

```text
Work Unit

├── id
├── productionUnitId
├── type
├── status
├── priority
├── plannedStart
├── plannedEnd
├── waitingReason
└── batchId
```

Le Scheduler peut utiliser beaucoup plus d'informations en interne.

Le ProductionPlan n'expose que le nécessaire.

---

# Batchs

Le ProductionPlan contient également les Batchs projetés.

Exemple :

```text
Batch

├── id
├── resourceKind
├── state
├── capacity
├── occupancy
├── plannedStart
└── workUnits
```

Les postes Four utilisent principalement cette section.

---

# Production Units

Le ProductionPlan conserve une vue synthétique des Production Units.

Exemple :

```text
Production Unit

├── id
├── product
├── status
├── estimatedReady
└── orderId
```

Cette vue évite aux interfaces de reconstruire elles-mêmes l'état global d'un produit.

---

# Commandes

Les commandes restent présentes.

Mais uniquement comme vue métier.

Exemple :

```text
Commande

├── id
├── estimatedReady
├── status
├── productionUnits
└── deliveryState
```

Le ProductionPlan ne planifie jamais les commandes.

Il expose simplement leur état.

---

# Ressources

Le ProductionPlan contient un résumé des ressources.

Exemple :

```text
Resource

├── id
├── kind
├── state
├── occupancy
└── nextAvailability
```

Les interfaces n'ont ainsi pas besoin d'interroger directement les ressources.

---

# Alertes

Le Scheduler peut produire des alertes.

Exemples :

```text
Late Risk
```

```text
Resource Saturated
```

```text
Batch Waiting Too Long
```

```text
Estimated Delay
```

Ces alertes sont directement exploitables par les interfaces.

---

# Waiting Reasons

Toutes les attentes sont centralisées.

Exemple :

```text
WU-042

↓

WAITING_BATCH
```

```text
WU-043

↓

WAITING_RESOURCE
```

```text
WU-044

↓

WAITING_TARGET_TIME
```

Les interfaces affichent ces raisons sans les recalculer.

---

# Diagnostics

Le ProductionPlan peut intégrer des informations de diagnostic.

Exemple :

```text
Diagnostics

├── schedulerDuration
├── modifiedWorkUnits
├── modifiedBatchs
├── conflictCount
└── planningScore
```

Ces données restent facultatives pour les interfaces.

Elles sont principalement destinées au développement et au débogage.

---

# Vues spécialisées

Le ProductionPlan reste unique.

Les postes utilisent ensuite des vues spécialisées.

Exemple :

```text
ProductionPlan

↓

Projection

↓

Vue Four
```

ou

```text
ProductionPlan

↓

Projection

↓

Vue Pizzaiolo
```

Le ProductionPlan n'est jamais dupliqué.

Chaque vue constitue simplement une projection adaptée à un poste.

---

# Projection

Une projection est une transformation en lecture seule.

Exemple :

```text
ProductionPlan

↓

Projection Four

↓

Batchs

Cuissons

Post-cuissons
```

ou

```text
ProductionPlan

↓

Projection Caisse

↓

Créneaux

Retards

Estimations
```

Aucune projection ne modifie le ProductionPlan.

---

# Immutabilité

Une fois publié,

le ProductionPlan devient immuable.

Aucune interface ne peut modifier :

- une Work Unit ;
- un Batch ;
- une priorité ;
- une estimation.

Toute modification nécessite la publication d'un nouveau ProductionPlan.

---

# Avantages

Cette architecture apporte plusieurs bénéfices.

- Synchronisation simplifiée.
- Historique naturel.
- Débogage facilité.
- Comparaison de versions.
- Tests reproductibles.
- Interfaces découplées.
- Cohérence globale.

Le ProductionPlan devient ainsi le point central de communication entre le Scheduler et l'ensemble du KDS.

La partie suivante détaillera le cycle de vie d'un ProductionPlan ainsi que les mécanismes de publication et de synchronisation.

---

# Cycle de vie du ProductionPlan

Le ProductionPlan suit un cycle de vie simple.

Il est créé.

Publié.

Consommé.

Puis remplacé.

Il n'est jamais modifié.

Cette propriété garantit une parfaite cohérence entre tous les postes.

---

# États

Un ProductionPlan traverse les états suivants.

```text
Building

↓

Validated

↓

Published

↓

Superseded

↓

Archived
```

Chaque état possède une signification précise.

---

## Building

Le Scheduler construit un nouveau plan.

Pendant cette phase :

- aucun poste ne le consulte ;
- aucune publication n'est effectuée ;
- les calculs restent internes.

Le plan est invisible.

---

## Validated

Le calcul est terminé.

Le Scheduler vérifie les invariants.

Exemple :

- aucune dépendance violée ;
- aucune ressource surchargée ;
- aucun Batch impossible.

Si une anomalie est détectée,

le plan est rejeté.

---

## Published

Le ProductionPlan devient la référence officielle.

Tous les postes basculent simultanément vers cette nouvelle version.

Exemple :

```text
Plan #184

↓

Plan #185
```

La transition est atomique.

Il n'existe jamais d'état intermédiaire.

---

## Superseded

Un nouveau plan a été publié.

L'ancien plan reste conservé.

Il peut encore être utilisé pour :

- le diagnostic ;
- les comparaisons ;
- les statistiques.

Il n'est plus utilisé par les postes.

---

## Archived

Le plan quitte la mémoire active.

Il devient un élément d'historique.

Aucune modification n'est désormais possible.

---

# Publication atomique

Le Scheduler ne publie jamais une modification partielle.

Il publie toujours un ProductionPlan complet.

Exemple interdit :

```text
Batchs

↓

mis à jour

Work Units

↓

ancienne version
```

Cette situation ne doit jamais exister.

---

# Synchronisation

Tous les postes utilisent exactement la même version.

Exemple :

```text
ProductionPlan

#212

↓

Caisse

↓

Pizzaiolo

↓

Four

↓

Pani'NO

↓

Prêtes
```

Tous les écrans partagent la même référence.

---

# Changement de version

Lorsqu'un nouveau plan apparaît,

chaque poste remplace entièrement son ancienne référence.

Exemple :

```text
Plan #212

↓

Plan #213
```

Aucune fusion locale n'est autorisée.

---

# Delta interne

Le Scheduler peut calculer uniquement les différences.

Exemple :

```text
Work Units modifiées

3
```

```text
Batchs modifiés

1
```

Cependant,

le résultat publié reste toujours un ProductionPlan complet.

Cette règle simplifie énormément les interfaces.

---

# Consommation

Les postes ne modifient jamais le ProductionPlan.

Ils le consultent uniquement.

Exemple :

```text
ProductionPlan

↓

Lecture

↓

Affichage
```

Aucune écriture n'est autorisée.

---

# Production d'événements

Les postes ne modifient pas le plan.

Ils produisent des événements.

Exemple :

```text
ProductionPlan

↓

Travail réalisé

↓

WorkCompleted

↓

Scheduler
```

Le Scheduler décide ensuite si un nouveau ProductionPlan est nécessaire.

---

# Cas sans publication

Tous les événements ne nécessitent pas un nouveau plan.

Exemple :

```text
Ouverture écran
```

↓

Aucun recalcul.

```text
Défilement
```

↓

Aucun recalcul.

```text
Consultation

↓

Aucun recalcul.
```

Le Scheduler ne publie un nouveau plan que si l'état métier change.

---

# Déclencheurs

Les événements suivants peuvent produire un nouveau ProductionPlan.

| Événement | Nouveau plan |
|-----------|--------------|
| Nouvelle commande | Oui |
| Annulation | Oui |
| WorkCompleted | Oui |
| BatchLocked | Oui |
| Ressource indisponible | Oui |
| Fin de cuisson | Oui |
| Ouverture d'un écran | Non |
| Rafraîchissement graphique | Non |

Cette liste pourra évoluer.

---

# Identité

Deux ProductionPlans sont considérés différents uniquement si leur contenu métier diffère.

Exemple :

```text
Plan #220

↓

identique

↓

Plan #221
```

Cette publication est inutile.

Le Scheduler doit éviter de publier des versions identiques.

---

# Signature

Chaque ProductionPlan peut posséder une signature.

Exemple :

```text
Hash

↓

9E1A4B...
```

Cette signature permet :

- de détecter rapidement les changements ;
- d'éviter les publications inutiles ;
- de faciliter la synchronisation.

---

# Reconnexion

Lorsqu'un poste se reconnecte,

il demande simplement :

```text
Dernier ProductionPlan
```

Aucun rattrapage d'événements n'est nécessaire.

Cette propriété simplifie énormément la gestion réseau.

---

# Comparaison

Deux ProductionPlans peuvent être comparés.

Exemple :

```text
Plan #240

VS

Plan #241
```

Différences :

- 2 Work Units ajoutées.
- 1 Batch modifié.
- 1 estimation ajustée.

Cette capacité sera très utile pour le développement.

---

# Invariants

Le cycle de vie doit toujours respecter les règles suivantes.

- Un ProductionPlan est immuable.
- Une publication est atomique.
- Tous les postes voient la même version.
- Les événements produisent éventuellement un nouveau plan.
- Aucun poste ne modifie directement un ProductionPlan.
- Une version identique ne doit pas être republiée.

Ces invariants garantissent une synchronisation robuste et une architecture facilement distribuable.

La partie suivante décrira les projections spécialisées utilisées par chaque poste de travail.

---

# Projections du ProductionPlan

Le ProductionPlan est volontairement générique.

Il contient toutes les informations utiles à la production.

Cependant, aucun poste n'a besoin de consulter l'intégralité du plan.

Chaque poste utilise une **projection**.

Une projection est une vue spécialisée, construite à partir du ProductionPlan.

---

# Définition

Une projection est une représentation partielle du ProductionPlan.

Elle sélectionne uniquement les informations pertinentes pour un poste donné.

Une projection :

- ne modifie jamais le ProductionPlan ;
- ne contient aucune logique métier ;
- ne possède aucun état propre.

Elle constitue uniquement une vue en lecture.

---

# Architecture

```text
                ProductionPlan

                      │

        ┌─────────────┼─────────────┐

        ▼             ▼             ▼

Projection       Projection     Projection

 Caisse          Pizzaiolo         Four

        ▼             ▼             ▼

     Interface     Interface     Interface
```

Toutes les projections proviennent de la même version du ProductionPlan.

---

# Principe

Le Scheduler ne produit jamais :

```text
Vue Four
```

ou

```text
Vue Caisse
```

Il produit uniquement :

```text
ProductionPlan
```

Les projections sont calculées après publication.

Cette séparation simplifie énormément le Scheduler.

---

# Projection Caisse

Objectif :

Aider la prise de commande.

Informations affichées :

```text
Créneaux disponibles

↓

Temps estimés

↓

Alertes de retard

↓

Charge future

↓

Explications
```

La Caisse ne voit jamais :

- les dépendances ;
- les ressources ;
- les Work Units internes.

---

# Projection Pizzaiolo

Objectif :

Guider la préparation.

Informations affichées :

```text
Work Units

↓

Priorité

↓

Batch futur

↓

Temps estimé

↓

Instructions
```

Le Pizzaiolo ne voit pas :

- les commandes déjà terminées ;
- les statistiques ;
- les calculs internes du Scheduler.

---

# Projection Four

Objectif :

Piloter les cuissons.

Informations affichées :

```text
Batchs

↓

Composition

↓

Temps de cuisson

↓

Post-cuisson

↓

Priorité
```

Le Four ne consulte jamais les Work Units de préparation.

---

# Projection Pani'NO

Objectif :

Piloter les assemblages.

Informations affichées :

```text
Assemblages

↓

Produits

↓

Ordre

↓

Priorités
```

Les informations concernant le four restent masquées.

---

# Projection Prêtes

Objectif :

Remettre les commandes.

Informations affichées :

```text
Production Units

↓

Ready

↓

Commande

↓

Remise client
```

Ce poste ne connaît pas le détail de la fabrication.

---

# Projection Supervision

Une projection supplémentaire pourra être créée.

Objectif :

Visualiser toute la production.

Exemple :

```text
Charge

↓

Batchs

↓

Ressources

↓

Retards

↓

Timeline
```

Cette vue sera principalement utilisée pour :

- le diagnostic ;
- la formation ;
- l'analyse.

---

# Construction

Les projections sont obtenues par filtrage.

Exemple :

```text
ProductionPlan

↓

Projection Four

↓

Batchs uniquement
```

ou

```text
ProductionPlan

↓

Projection Caisse

↓

Créneaux uniquement
```

Le filtrage ne modifie jamais le plan.

---

# Aucune logique métier

Une projection n'est jamais autorisée à :

- modifier une priorité ;
- déplacer une Work Unit ;
- recalculer une estimation ;
- reconstruire un Batch.

Toutes ces informations proviennent du Scheduler.

---

# Rafraîchissement

Lorsqu'un nouveau ProductionPlan est publié,

toutes les projections sont automatiquement reconstruites.

Exemple :

```text
Plan #184

↓

Projection Four #184

↓

Affichage
```

Puis :

```text
Plan #185

↓

Projection Four #185

↓

Affichage
```

Les anciennes projections sont immédiatement abandonnées.

---

# Cache

Une projection peut être conservée temporairement en mémoire.

Cependant,

elle ne constitue jamais une source de vérité.

À chaque publication d'un nouveau ProductionPlan,

le cache doit être invalidé.

---

# Personnalisation

Une projection peut adapter :

- l'ordre d'affichage ;
- le regroupement ;
- les couleurs ;
- les filtres.

Elle ne peut jamais modifier les données métier.

Exemple :

```text
Tri par priorité
```

ou

```text
Tri par heure
```

Ces transformations restent purement visuelles.

---

# Avantages

Cette architecture apporte plusieurs bénéfices.

- Interfaces très simples.
- Aucune duplication de logique.
- Synchronisation automatique.
- Tests plus faciles.
- Ajout d'un nouveau poste sans modifier le Scheduler.
- Faible couplage entre les écrans.

---

# Exemple complet

```text
Scheduler

↓

ProductionPlan #312

↓

Projection Four

↓

Affichage Four
```

Puis :

```text
BatchCompleted

↓

Scheduler

↓

ProductionPlan #313

↓

Projection Four

↓

Nouvel affichage
```

Le poste Four ne connaît jamais les calculs ayant conduit au nouveau plan.

Il affiche simplement la nouvelle projection.

---

# Invariants

Toutes les projections doivent respecter les règles suivantes.

- Une projection provient d'un unique ProductionPlan.
- Une projection est immuable.
- Une projection est reconstruite à chaque nouvelle version.
- Une projection ne contient aucune logique métier.
- Une projection ne modifie jamais le ProductionPlan.
- Une projection peut être détruite à tout moment.

Ces propriétés garantissent une architecture extrêmement simple à maintenir.

La partie suivante décrira les mécanismes de synchronisation temps réel, de diffusion des ProductionPlans et les exigences de cohérence entre les différents postes.

---

# Synchronisation du ProductionPlan

Le ProductionPlan constitue le point de synchronisation unique entre tous les composants du KDS.

Tous les postes travaillent toujours sur la même version.

Cette propriété garantit que chaque opérateur possède exactement la même compréhension de l'état de la production.

---

# Objectif

Le système ne synchronise pas des Work Units.

Il ne synchronise pas des Batchs.

Il synchronise uniquement des versions successives du ProductionPlan.

Cette approche simplifie considérablement le moteur.

---

# Cycle de synchronisation

```text
Événement

↓

Scheduler

↓

ProductionPlan

↓

Publication

↓

Projections

↓

Interfaces
```

Chaque publication représente un nouvel état cohérent de la cuisine.

---

# Publication atomique

Une publication est indivisible.

Le système ne diffuse jamais :

- une Work Unit seule ;
- un Batch seul ;
- une nouvelle priorité seule.

Toutes les informations sont publiées simultanément.

```text
Plan #412

↓

Publication

↓

Tous les postes
```

Il ne peut jamais exister deux postes utilisant des versions différentes de manière durable.

---

# Version active

À un instant donné,

une seule version est considérée comme active.

```text
Plan #411

↓

Archivé
```

```text
Plan #412

↓

Actif
```

Toutes les décisions futures s'appuient exclusivement sur la version active.

---

# Cohérence globale

Tous les postes doivent observer exactement :

- les mêmes Work Units ;
- les mêmes Batchs ;
- les mêmes estimations ;
- les mêmes priorités.

Les différences concernent uniquement la manière d'afficher ces informations.

Jamais leur contenu.

---

# Diffusion

Le Scheduler publie le ProductionPlan.

Les consommateurs s'abonnent à ce flux.

```text
Scheduler

↓

ProductionPlan

↓

Subscribers

├── Caisse
├── Pizzaiolo
├── Four
├── Pani'NO
├── Prêtes
└── Supervision
```

Le Scheduler ne connaît pas ses abonnés.

Il diffuse simplement une nouvelle version.

---

# Réception

Chaque poste applique toujours la même séquence.

```text
Réception

↓

Validation

↓

Projection

↓

Affichage
```

Aucune logique métier supplémentaire n'est exécutée.

---

# Validation

Avant d'utiliser un nouveau ProductionPlan,

le poste vérifie :

- l'identifiant ;
- la version ;
- l'intégrité ;
- la compatibilité.

Un plan invalide est rejeté.

Le poste continue alors d'utiliser la dernière version valide.

---

# Gestion des pertes réseau

Un poste peut être temporairement déconnecté.

Pendant cette période :

- le Scheduler continue de produire des plans ;
- les autres postes continuent de fonctionner.

À la reconnexion :

```text
Dernière version connue

↓

Version actuelle

↓

Téléchargement

↓

Synchronisation
```

Aucun rejeu complet des événements n'est nécessaire.

---

# Synchronisation partielle

Le moteur peut transmettre uniquement les différences.

Exemple :

```text
Δ Plan #412

↓

3 Work Units

1 Batch

2 estimations
```

Cependant,

avant utilisation,

le poste reconstruit toujours un ProductionPlan complet.

Les interfaces ne travaillent jamais directement sur un delta.

---

# Horodatage logique

Chaque ProductionPlan possède un horodatage logique.

Exemple :

```text
Plan #412

↓

2026-08-02T19:42:18.421
```

Cet horodatage décrit :

- le moment de publication ;
- non le moment d'exécution des Work Units.

---

# Ordre garanti

Les ProductionPlans doivent toujours être appliqués dans l'ordre.

Exemple :

```text
Plan #412

↓

Plan #413

↓

Plan #414
```

Le poste ne doit jamais appliquer :

```text
412

↓

414

↓

413
```

Cette situation est interdite.

---

# Rejet d'une ancienne version

Si un poste reçoit :

```text
Plan #410
```

alors que :

```text
Plan #412
```

est déjà actif,

le plan est ignoré.

Le Scheduler ne doit jamais provoquer de retour en arrière.

---

# Tolérance aux erreurs

En cas d'échec de publication,

le ProductionPlan précédent reste actif.

Le moteur préfère conserver un plan légèrement ancien plutôt que publier un plan incohérent.

---

# Historique

Les dernières versions peuvent être conservées.

Exemple :

```text
Plan #410

Plan #411

Plan #412
```

Cet historique permet :

- les comparaisons ;
- le diagnostic ;
- la relecture d'un service ;
- les simulations.

---

# Relecture

Grâce aux versions successives,

il devient possible de rejouer un service complet.

Exemple :

```text
19:00

↓

Plan #120
```

↓

```text
19:01

↓

Plan #121
```

↓

```text
19:02

↓

Plan #122
```

Cette fonctionnalité sera particulièrement utile pour :

- analyser un incident ;
- former un nouvel employé ;
- comparer deux versions du Scheduler.

---

# Compatibilité

Tous les postes doivent accepter la même version du ProductionPlan.

Si une évolution casse la compatibilité,

un changement de version majeure devra être réalisé.

Le Scheduler et les postes doivent toujours partager le même contrat.

---

# Invariants

La synchronisation respecte toujours les règles suivantes.

- Un seul ProductionPlan actif.
- Publications atomiques.
- Ordre strict des versions.
- Aucun retour en arrière.
- Aucune logique métier dans les postes.
- Les projections proviennent toujours de la même version.
- Les deltas ne sont jamais exposés aux interfaces.
- Les erreurs réseau ne modifient jamais le dernier plan valide.

Ces propriétés garantissent une synchronisation fiable, même dans un environnement distribué.

La partie suivante décrira les mécanismes de diagnostic, de traçabilité et d'explicabilité associés au ProductionPlan.

---

# Diagnostic et explicabilité

Le ProductionPlan ne constitue pas uniquement un plan d'exécution.

Il constitue également un support de diagnostic.

Chaque décision importante produite par le Scheduler doit pouvoir être comprise, expliquée et analysée.

Le ProductionPlan transporte donc les informations nécessaires à cette explicabilité.

---

# Objectifs

Le système doit permettre de répondre rapidement aux questions suivantes.

- Pourquoi cette Work Unit est-elle prioritaire ?
- Pourquoi cette commande attend-elle ?
- Pourquoi cette fournée est-elle incomplète ?
- Pourquoi cette estimation a-t-elle changé ?
- Pourquoi un nouveau ProductionPlan a-t-il été publié ?

Ces réponses doivent être disponibles sans recalcul.

---

# Niveaux d'explication

Le ProductionPlan distingue trois niveaux.

## Niveau 1 — Utilisateur

Messages simples.

Exemple :

```text
Complète une fournée.
```

```text
Risque de retard.
```

```text
Attente volontaire.
```

Ces messages sont affichés sur les interfaces.

---

## Niveau 2 — Technique

Raisons structurées.

Exemple :

```text
WAITING_BATCH_COMPLETION
```

```text
RESOURCE_SATURATED
```

```text
LATE_ORDER_RISK
```

Ces codes sont utilisés par les développeurs et les journaux.

---

## Niveau 3 — Diagnostic

Détails complets.

Exemple :

```text
Priority

Deadline : 82

Batch : 35

Workflow : 18

Business : 12

Learning : 4

Total : 151
```

Ce niveau est principalement destiné aux outils de supervision.

---

# Raisons de priorité

Chaque priorité importante peut être justifiée.

Exemple :

```text
PriorityReason

├── COMPLETE_BATCH
├── HIGH_DEADLINE_RISK
└── FINISH_STARTED_ORDER
```

Le Scheduler conserve l'ensemble des raisons ayant conduit à cette décision.

---

# Raisons d'attente

Chaque attente est expliquée.

Exemple :

```text
WAITING_BATCH
```

↓

Attente d'une pizza compatible.

---

```text
WAITING_RESOURCE
```

↓

Ressource momentanément occupée.

---

```text
WAITING_TARGET_TIME
```

↓

Production volontairement différée.

---

```text
WAITING_DEPENDENCY
```

↓

Une étape précédente n'est pas terminée.

---

# Alertes

Le Scheduler peut produire différents niveaux d'alerte.

## Information

```text
Nouvelle fournée constituée.
```

---

## Attention

```text
Marge faible.
```

---

## Avertissement

```text
Retard probable.
```

---

## Critique

```text
Retard inévitable.
```

Les interfaces choisissent ensuite la manière de présenter ces alertes.

---

# Diagnostic d'un Batch

Chaque Batch peut être expliqué.

Exemple :

```text
Batch

4 / 4

↓

Créé car :

- complète le four ;

- aucun retard ;

- bases compatibles.
```

Cette explication est produite par le Scheduler.

---

# Diagnostic d'une estimation

Une estimation doit pouvoir être justifiée.

Exemple :

```text
Estimated Ready

19:42
```

↓

Calcul basé sur :

- durée préparation ;
- attente Batch ;
- cuisson ;
- post-cuisson.

Toutes les composantes restent consultables.

---

# Diagnostic d'une révision

Chaque ProductionPlan indique pourquoi il a été publié.

Exemple :

```text
RevisionReason

NEW_ORDER
```

ou

```text
WORK_COMPLETED
```

ou

```text
RESOURCE_UNAVAILABLE
```

Cette information facilite énormément la compréhension du système.

---

# Journal d'exécution

Chaque ProductionPlan peut être associé à un journal.

Exemple :

```text
Run #512

↓

Start

19:42:18.123

↓

End

19:42:18.139

↓

Duration

16 ms
```

Ce journal reste principalement destiné au développement.

---

# Comparaison de plans

Deux ProductionPlans peuvent être comparés.

Exemple :

```text
Plan #510

↓

Plan #511
```

Différences :

```text
+ 2 Work Units

+ 1 Batch

- 1 attente

≈ Priorités recalculées
```

Cette fonctionnalité sera très utile pour analyser les effets d'un changement d'algorithme.

---

# Audit

Toutes les décisions importantes peuvent être auditées.

Exemple :

```text
Pourquoi cette pizza ?

↓

Historique complet
```

Le système doit permettre de retrouver :

- la décision ;
- sa cause ;
- le moment où elle a été prise ;
- le Scheduler Run correspondant.

---

# Mode développeur

Une projection spécifique pourra afficher les informations de diagnostic.

Exemple :

```text
Priority Score

Batch Score

Deadline Score

Resource Score

Learning Score
```

Cette vue n'est jamais destinée aux opérateurs.

---

# Confidentialité

Les informations de diagnostic ne doivent jamais être mélangées aux informations métier.

Les interfaces destinées à la production n'affichent que :

- les messages utiles ;
- les alertes pertinentes ;
- les explications simplifiées.

Les détails techniques restent réservés aux outils d'administration.

---

# Traçabilité

Toutes les décisions importantes doivent pouvoir être retracées.

Exemple :

```text
ProductionPlan #620

↓

Batch #84

↓

WU-153

↓

Priority

↓

Reason

COMPLETE_BATCH
```

Cette chaîne de traçabilité simplifie énormément les investigations.

---

# Invariants

Les mécanismes de diagnostic doivent toujours respecter les règles suivantes.

- Toute décision importante est explicable.
- Une raison est produite une seule fois par le Scheduler.
- Les interfaces ne recalculent jamais les explications.
- Les diagnostics n'influencent jamais la planification.
- Les journaux sont indépendants des projections.
- Les informations techniques restent séparées des informations métier.

Ces propriétés garantissent un moteur transparent, compréhensible et facilement maintenable.

La partie suivante présentera les invariants globaux du ProductionPlan ainsi que la stratégie de validation de ce composant.

---

# Invariants et validation du ProductionPlan

Le ProductionPlan constitue le contrat public du moteur de planification.

Sa structure et son comportement doivent rester stables dans le temps.

Les invariants définis dans cette section devront être respectés par toutes les implémentations futures.

---

# Invariant 1 — Une seule source de vérité

À un instant donné,

il ne peut exister qu'un seul ProductionPlan actif.

```text
Plan #842

↓

Production officielle
```

Toutes les interfaces utilisent cette même référence.

---

# Invariant 2 — Immutabilité

Un ProductionPlan publié devient immédiatement immuable.

Aucun composant ne peut modifier :

- une Work Unit ;
- un Batch ;
- une estimation ;
- une priorité ;
- une projection.

Toute modification nécessite la création d'un nouveau ProductionPlan.

---

# Invariant 3 — Publication atomique

Une publication est toujours complète.

Situation autorisée :

```text
Plan #215

↓

Publication

↓

Tous les postes
```

Situation interdite :

```text
Batchs

↓

Version N+1

Work Units

↓

Version N
```

Aucun état intermédiaire ne doit être visible.

---

# Invariant 4 — Cohérence interne

Toutes les informations présentes dans un ProductionPlan doivent être compatibles entre elles.

Exemples :

- une Work Unit appartient à un Batch existant ;
- une Production Unit référence des Work Units existantes ;
- une commande référence des Production Units existantes.

Aucune référence orpheline n'est autorisée.

---

# Invariant 5 — Horodatage cohérent

Les estimations doivent respecter l'ordre chronologique.

Exemple :

```text
Preparation

↓

Cooking

↓

Finishing
```

Les horaires suivants sont interdits :

```text
Cooking

↓

19:35
```

```text
Preparation

↓

19:36
```

Les dépendances temporelles doivent toujours rester cohérentes.

---

# Invariant 6 — Compatibilité des ressources

Le ProductionPlan ne peut jamais représenter une capacité impossible.

Exemple interdit :

```text
Four

Capacité

4
```

↓

```text
Batch

6 pizzas
```

Les ressources disponibles constituent une contrainte absolue.

---

# Invariant 7 — Explicabilité

Chaque décision importante doit posséder une justification.

Exemple :

```text
Priority

↓

Reason

COMPLETE_BATCH
```

ou

```text
Waiting

↓

Reason

WAITING_RESOURCE
```

Le ProductionPlan ne contient jamais de décision inexpliquée.

---

# Invariant 8 — Déterminisme

Deux Scheduler Runs utilisant exactement les mêmes données doivent produire un ProductionPlan identique.

Cette propriété facilite :

- les tests ;
- les simulations ;
- les comparaisons.

---

# Validation structurelle

Avant publication,

le Scheduler valide la structure.

Liste minimale :

```text
✓ Metadata

✓ Timeline

✓ Work Units

✓ Batchs

✓ Production Units

✓ Orders

✓ Resources

✓ Alerts
```

Tout élément obligatoire manquant entraîne le rejet du plan.

---

# Validation métier

Le Scheduler valide ensuite les règles métier.

Exemples :

- aucune Work Unit sans Production Unit ;
- aucune Production Unit sans commande ;
- aucun Batch vide ;
- aucune dépendance violée ;
- aucune ressource surchargée.

Cette validation précède toujours la publication.

---

# Validation temporelle

Le Scheduler vérifie :

```text
PlannedStart

≤

PlannedEnd
```

Ainsi que :

```text
Preparation

↓

Cooking

↓

Finishing
```

L'ordre du workflow ne peut jamais être inversé.

---

# Validation des projections

Toutes les projections doivent être construites à partir du même ProductionPlan.

Exemple :

```text
Plan #320

↓

Projection Four

↓

Projection Pizzaiolo

↓

Projection Caisse
```

Il est interdit qu'un poste affiche une projection issue d'une version différente.

---

# Validation des interfaces

Chaque poste doit être capable de fonctionner uniquement avec le ProductionPlan.

Une interface qui nécessite :

- un accès direct au Scheduler ;
- un accès direct aux Work Units internes ;
- un accès direct aux Batchs internes ;

viole cette architecture.

---

# Tests de conformité

Les scénarios suivants devront être automatisés.

## Publication

- publication initiale ;
- publication successive ;
- publication identique ;
- publication rejetée.

---

## Synchronisation

- reconnexion d'un poste ;
- perte réseau ;
- réception d'une ancienne version ;
- réception dans le désordre.

---

## Cohérence

- Batch valide ;
- Batch dépassant la capacité ;
- dépendance manquante ;
- Work Unit orpheline.

---

## Robustesse

- plusieurs centaines de Work Units ;
- plusieurs dizaines de Batchs ;
- plusieurs postes simultanés ;
- nombreuses publications successives.

---

# Métriques

Le Scheduler peut produire plusieurs indicateurs.

Exemple :

```text
ProductionPlan

↓

Metrics

├── buildDuration
├── modifiedBatchs
├── modifiedWorkUnits
├── conflictCount
├── averageWaitingTime
└── planningScore
```

Ces métriques permettent de suivre les performances du moteur.

---

# Évolutivité

Le ProductionPlan doit pouvoir évoluer.

Les nouvelles informations devront être ajoutées sans casser les projections existantes.

Le contrat public reste stable.

Les extensions restent compatibles.

---

# Objectif

Le ProductionPlan doit devenir un objet :

- stable ;
- prédictible ;
- explicable ;
- facilement testable ;
- indépendant des interfaces ;
- indépendant des ressources.

Il représente le point de convergence de toute la planification.

La dernière partie présentera la vision globale du ProductionPlan, son rôle dans l'architecture du KDS et les décisions d'architecture retenues.

---

# Vision globale

Le ProductionPlan constitue le contrat public entre le moteur de planification et l'ensemble du KDS.

Il représente une photographie cohérente de la production à un instant donné.

Il ne contient aucune logique métier.

Il ne prend aucune décision.

Il décrit uniquement le résultat du travail du Scheduler.

Cette séparation garantit une architecture stable, explicable et facilement évolutive.

---

# Position dans l'architecture

```text
                    Événements
                         │
                         ▼
                    Scheduler
                         │
                         ▼
                 ProductionPlan
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   Projections      Dispatcher      Supervision
        │
        ▼
Interfaces utilisateur
```

Le ProductionPlan constitue le point de convergence entre le moteur de décision et tous les consommateurs.

---

# Résumé des responsabilités

| Composant | Responsabilité |
|-----------|----------------|
| Scheduler | Construire un ProductionPlan. |
| ProductionPlan | Décrire le plan de production. |
| Projections | Adapter le plan à chaque poste. |
| Dispatcher | Affecter les ressources. |
| Interfaces | Afficher les projections. |
| Événements | Décrire les changements d'état. |

Chaque composant possède une responsabilité unique.

---

# Cycle de vie global

Le fonctionnement complet peut être résumé ainsi.

```text
Événement

↓

Scheduler Run

↓

ProductionPlan

↓

Publication

↓

Projection

↓

Affichage

↓

Travail réalisé

↓

Nouvel événement

↓

Nouveau Scheduler Run
```

Cette boucle se répète pendant toute la durée du service.

---

# Contrat public

Le ProductionPlan représente le seul contrat public du Scheduler.

Les interfaces ne doivent jamais accéder directement :

- aux algorithmes ;
- aux structures internes ;
- aux scores de calcul ;
- aux objets temporaires.

Toute communication passe exclusivement par le ProductionPlan.

---

# Bénéfices

Cette architecture apporte plusieurs avantages.

## Simplicité

Le Scheduler possède une unique sortie.

---

## Robustesse

Toutes les interfaces utilisent exactement la même version du plan.

---

## Évolutivité

Un nouveau poste peut être ajouté sans modifier le Scheduler.

---

## Testabilité

Le Scheduler peut être testé indépendamment des interfaces.

---

## Reproductibilité

Chaque ProductionPlan représente un instant précis de la production.

Il peut être archivé puis rejoué.

---

## Débogage

Les décisions restent entièrement traçables.

---

# Cas d'utilisation

Le ProductionPlan doit permettre naturellement :

- l'affichage des postes ;
- la synchronisation temps réel ;
- les simulations ;
- la comparaison de versions ;
- les statistiques ;
- les analyses post-service ;
- la formation des nouveaux employés ;
- les futures fonctionnalités d'intelligence artificielle.

Aucune adaptation spécifique ne doit être nécessaire.

---

# Décisions d'architecture

Les décisions suivantes sont considérées comme définitives.

| ID | Décision |
|----|----------|
| ADR-009 | Le Scheduler publie uniquement un ProductionPlan. |
| ADR-010 | Un seul ProductionPlan est actif à un instant donné. |
| ADR-011 | Les ProductionPlans sont immuables. |
| ADR-012 | Les projections sont reconstruites à chaque publication. |
| ADR-013 | Les interfaces ne possèdent aucune logique de planification. |
| ADR-014 | Les explications sont calculées par le Scheduler et transportées par le ProductionPlan. |
| ADR-015 | Les événements constituent la seule source de changement du ProductionPlan. |
| ADR-016 | Les publications sont atomiques. |

Ces décisions devront être respectées par tous les futurs développements.

---

# Compatibilité avec les autres documents

Le présent document complète directement :

```text
14_ARCHITECTURE_WORK_UNITS.md
```

et

```text
15_ARCHITECTURE_SCHEDULER.md
```

Il ne remplace aucun concept existant.

Il définit simplement le contrat public permettant aux autres composants de communiquer avec le Scheduler.

Les documents suivants s'appuieront sur cette architecture pour décrire :

- les recettes ;
- les ressources ;
- les événements ;
- le moteur d'apprentissage.

---

# Évolutions futures

Cette architecture permet d'introduire sans rupture :

- plusieurs cuisines ;
- plusieurs établissements ;
- plusieurs Scheduler spécialisés ;
- des simulations avancées ;
- des comparaisons de scénarios ;
- un moteur de prévision basé sur l'historique ;
- une IA d'assistance à la décision.

Ces évolutions ne modifieront pas le rôle du ProductionPlan.

Elles enrichiront simplement son contenu.

---

# Critères de validation

Le ProductionPlan sera considéré comme conforme lorsque :

- tous les postes fonctionneront uniquement à partir de ses projections ;
- aucune interface ne recalculera une information métier ;
- les publications resteront atomiques ;
- les décisions du Scheduler seront entièrement explicables ;
- les ProductionPlans pourront être archivés, comparés et rejoués.

---

# Conclusion

Le ProductionPlan constitue la pierre angulaire de la communication entre le moteur de planification et les interfaces du KDS.

Il isole complètement le Scheduler des postes de travail, garantit une vision cohérente de la production et prépare le système aux futures évolutions.

En séparant clairement :

- la décision (**Scheduler**) ;
- la représentation (**ProductionPlan**) ;
- l'exécution (**Dispatcher**) ;
- l'affichage (**Projections**) ;

le KDS adopte une architecture modulaire, stable et évolutive, capable d'accompagner durablement le développement du projet.

---

# Fin du document