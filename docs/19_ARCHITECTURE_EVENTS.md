# 19_ARCHITECTURE_EVENTS.md

# Architecture des Événements

Version : 1.0

Statut : Architecture cible

---

# Objectif

Les événements constituent la seule manière de modifier l'état du système.

Ils décrivent uniquement des faits.

Un événement n'est jamais une décision.

Un événement ne contient aucune logique métier.

Il indique simplement :

> Quelque chose s'est produit.

Le Scheduler interprète ensuite ces événements afin de construire un nouveau ProductionPlan.

---

# Position dans l'architecture

```text
Resource

↓

Event

↓

Event Bus

↓

Scheduler

↓

ProductionPlan
```

Les événements constituent l'entrée unique du Scheduler.

---

# Philosophie

Le monde réel produit des événements.

Le Scheduler prend des décisions.

Le ProductionPlan décrit ces décisions.

Les ressources exécutent le plan.

Cette boucle constitue l'architecture événementielle du KDS.

---

# Responsabilités

Les événements possèdent quatre responsabilités.

| Responsabilité | Description |
|----------------|-------------|
| Décrire un fait | Exprimer ce qui vient réellement de se produire. |
| Déclencher un recalcul | Informer le Scheduler qu'un nouvel état existe. |
| Alimenter l'historique | Permettre la relecture complète d'un service. |
| Alimenter l'apprentissage | Fournir des données réelles au moteur Learning. |

---

# Ce qu'un événement ne fait jamais

Un événement :

- ne décide jamais ;
- ne calcule jamais une priorité ;
- ne construit jamais un Batch ;
- ne modifie jamais directement une Work Unit ;
- ne modifie jamais le ProductionPlan.

Il décrit uniquement un fait.

---

# Définition

Un événement est un objet immuable.

Une fois créé,

il ne peut plus être modifié.

Chaque événement représente un instant précis de la production.

---

# Structure générale

```text
Event

├── Metadata

├── Payload

├── Context

├── Source

└── Timestamp
```

Chaque section sera détaillée dans la suite du document.

---

# Structure des événements

Tous les événements du KDS possèdent une structure commune.

Cette homogénéité permet au Scheduler, au moteur d'apprentissage et aux outils de diagnostic de traiter tous les événements de la même manière.

Chaque événement est autonome.

Il contient toutes les informations nécessaires à sa compréhension.

---

# Structure générale

Chaque événement possède la structure suivante.

```text
Event

├── Metadata
├── Type
├── Payload
├── Context
├── Source
├── Correlation
└── Timestamp
```

Chaque section possède une responsabilité clairement définie.

---

# Metadata

Les métadonnées identifient l'événement.

Exemple :

```text
Metadata

├── eventId
├── eventVersion
├── schemaVersion
└── environment
```

Ces informations facilitent :

- le diagnostic ;
- le versionnement ;
- la compatibilité.

---

# Type

Le type décrit le fait observé.

Exemples :

```text
WorkStarted
```

```text
WorkCompleted
```

```text
BatchLocked
```

```text
BatchCompleted
```

```text
ResourceUnavailable
```

```text
OrderCancelled
```

Le type constitue l'information principale de l'événement.

---

# Payload

Le Payload contient les données propres à l'événement.

Exemple :

```text
WorkCompleted

↓

Payload

├── workUnitId
├── resourceId
├── duration
└── result
```

Chaque type possède son propre Payload.

---

# Context

Le contexte permet de replacer l'événement dans la production.

Exemple :

```text
Context

├── orderId
├── productionUnitId
├── batchId
├── recipeVersion
└── serviceId
```

Le contexte facilite les analyses ultérieures.

---

# Source

Chaque événement possède un émetteur clairement identifié.

Exemple :

```text
Source

↓

Four principal
```

ou

```text
Source

↓

Poste Pizzaiolo
```

ou

```text
Source

↓

Dispatcher
```

Le Scheduler connaît ainsi l'origine exacte du fait observé.

---

# Correlation

Les événements appartenant à une même action peuvent être regroupés.

Exemple :

```text
Correlation

↓

Order #548
```

ou

```text
Correlation

↓

Batch #27
```

Cette corrélation facilite la reconstitution complète d'une production.

---

# Timestamp

Chaque événement possède un horodatage.

Exemple :

```text
2026-08-02

19:42:18.531
```

Il représente le moment où le fait s'est réellement produit.

Jamais celui où il a été traité.

---

# Immutabilité

Un événement ne peut jamais être modifié.

Exemple :

```text
Event #1548

↓

Created
```

↓

```text
Immutable
```

Si une correction est nécessaire,

un nouvel événement est produit.

---

# Identifiant

Chaque événement possède un identifiant unique.

Exemple :

```text
EVT-0001548
```

Cet identifiant permet :

- le suivi ;
- l'audit ;
- le diagnostic ;
- la relecture.

---

# Versionnement

La structure des événements peut évoluer.

Exemple :

```text
Schema V1
```

↓

```text
Schema V2
```

Les anciennes versions restent interprétables.

Le Scheduler doit rester compatible avec les versions supportées.

---

# Granularité

Chaque événement décrit un seul fait.

Exemple autorisé :

```text
WorkCompleted
```

Exemple interdit :

```text
WorkCompleted

+

BatchCompleted

+

OrderCompleted
```

Ces trois faits doivent être représentés par trois événements distincts.

---

# Taille

Un événement doit rester compact.

Il contient uniquement les informations nécessaires.

Les objets volumineux (recettes, ProductionPlan, historiques...) ne doivent jamais être intégrés directement.

Ils sont référencés si nécessaire.

---

# Exemple complet

```text
Event

├── Id : EVT-845
├── Type : WorkCompleted
├── WorkUnit : WU-214
├── Resource : Four
├── Batch : B-18
├── Timestamp : 19:42:18
└── Version : 1
```

Cette structure est suffisante pour permettre au Scheduler de prendre une nouvelle décision.

---

# Invariants

Tous les événements respectent les règles suivantes.

- Un événement représente un seul fait.
- Un événement est immuable.
- Chaque événement possède un identifiant unique.
- Le Payload dépend uniquement du type d'événement.
- Le contexte reste indépendant de la logique métier.
- L'horodatage représente toujours le moment réel du fait observé.
- Les événements restent volontairement compacts.

Ces propriétés garantissent un système événementiel simple, robuste et facilement extensible.

La partie suivante décrira le cycle de vie des événements ainsi que leur circulation dans l'ensemble du KDS.

---

# Cycle de vie des événements

Les événements représentent les faits qui surviennent pendant la production.

Ils apparaissent.

Ils sont diffusés.

Ils sont traités.

Puis ils sont archivés.

Un événement ne disparaît jamais.

Il devient un élément permanent de l'historique du système.

---

# Cycle de vie

Chaque événement suit le cycle suivant.

```text
Création

↓

Publication

↓

Traitement

↓

Archivage
```

Chaque étape possède une responsabilité précise.

---

# Création

Un événement est créé lorsqu'un fait se produit.

Exemples :

```text
Le pizzaiolo commence une préparation.
```

↓

```text
WorkStarted
```

ou

```text
Le four termine une cuisson.
```

↓

```text
BatchCompleted
```

L'événement représente uniquement ce fait.

---

# Publication

Une fois créé,

l'événement est publié sur l'Event Bus.

```text
Resource

↓

Event

↓

Event Bus
```

Tous les composants abonnés peuvent alors le recevoir.

---

# Event Bus

L'Event Bus constitue le canal unique de diffusion.

```text
Event

↓

Event Bus

↓

Scheduler

↓

Learning

↓

Historique

↓

Supervision
```

Le producteur ne connaît jamais les consommateurs.

Cette séparation réduit fortement le couplage.

---

# Traitement

Chaque consommateur traite l'événement indépendamment.

Exemple :

```text
Scheduler

↓

Nouveau ProductionPlan
```

```text
Learning

↓

Nouvelle statistique
```

```text
Historique

↓

Archivage
```

Chaque composant reste indépendant.

---

# Archivage

Une fois traité,

l'événement est conservé.

```text
Event

↓

Archive
```

Il pourra être utilisé plus tard pour :

- les analyses ;
- les statistiques ;
- les simulations ;
- le diagnostic.

---

# Ordre des événements

Les événements doivent être traités dans l'ordre où ils se sont produits.

Exemple :

```text
WorkStarted

↓

WorkCompleted

↓

BatchCompleted
```

L'ordre inverse est interdit.

Cette propriété garantit la cohérence de la production.

---

# Idempotence

Un même événement ne doit jamais produire deux fois le même effet.

Exemple :

```text
Event #845

↓

Déjà traité
```

↓

Ignoré.

Le Scheduler doit pouvoir détecter un doublon.

---

# Événements concurrents

Plusieurs événements peuvent être produits presque simultanément.

Exemple :

```text
Four

↓

BatchCompleted
```

et

```text
Pizzaiolo

↓

WorkCompleted
```

Chaque événement est traité séparément.

Le Scheduler décide ensuite s'il produit un ou plusieurs nouveaux ProductionPlans.

---

# Rejeu

Les événements peuvent être rejoués.

Exemple :

```text
Archive

↓

Replay

↓

Scheduler
```

Cette fonctionnalité permet :

- de reproduire un service ;
- de tester un nouvel algorithme ;
- d'analyser un incident.

---

# Retard de traitement

Un événement peut être traité quelques millisecondes après sa création.

Son horodatage reste celui du fait observé.

Jamais celui du traitement.

Cette distinction est essentielle pour les analyses temporelles.

---

# Perte d'un événement

La perte d'un événement est considérée comme critique.

Le système doit garantir :

- sa persistance ;
- sa traçabilité ;
- sa possibilité de rejeu.

Un événement ne doit jamais disparaître silencieusement.

---

# Correction

Un événement publié n'est jamais modifié.

Si une correction est nécessaire,

un nouvel événement est créé.

Exemple :

```text
WorkCompleted
```

↓

Erreur détectée

↓

```text
WorkCorrectionRequested
```

Le système reste entièrement événementiel.

---

# Historique

Tous les événements forment le journal complet du service.

Exemple :

```text
18:30

OrderCreated
```

↓

```text
18:31

WorkStarted
```

↓

```text
18:32

WorkCompleted
```

↓

```text
18:34

BatchCompleted
```

↓

```text
18:35

OrderReady
```

Ce journal constitue la mémoire du KDS.

---

# Invariants

Le cycle de vie des événements respecte toujours les règles suivantes.

- Un événement est créé une seule fois.
- Un événement est immuable.
- Tous les événements transitent par l'Event Bus.
- Chaque consommateur traite l'événement indépendamment.
- Les événements sont archivés après traitement.
- L'ordre chronologique est conservé.
- Un événement déjà traité ne produit jamais deux fois le même effet.

Ces propriétés garantissent un système événementiel fiable, reproductible et parfaitement adapté à une architecture pilotée par les événements.

La partie suivante décrira les différentes familles d'événements utilisées dans le KDS ainsi que leur rôle dans le fonctionnement du moteur de production.

---

# Familles d'événements

Tous les événements ne jouent pas le même rôle.

Afin de simplifier leur traitement, le KDS les regroupe en familles.

Chaque famille possède une responsabilité clairement définie.

Cette classification facilite :

- le développement ;
- les tests ;
- le diagnostic ;
- l'évolution de l'architecture.

---

# Vue d'ensemble

Les événements sont répartis en six grandes familles.

```text
Events

├── Business Events
├── Workflow Events
├── Batch Events
├── Resource Events
├── System Events
└── Learning Events
```

Chaque famille possède son propre cycle de traitement.

---

# Business Events

Les Business Events décrivent les événements liés aux commandes.

Exemples :

```text
OrderCreated
```

```text
OrderUpdated
```

```text
OrderCancelled
```

```text
OrderReady
```

Ces événements modifient directement le contexte de production.

Ils provoquent généralement un nouveau calcul du Scheduler.

---

# Workflow Events

Les Workflow Events décrivent l'avancement des Work Units.

Exemples :

```text
WorkCreated
```

```text
WorkStarted
```

```text
WorkPaused
```

```text
WorkCompleted
```

```text
WorkFailed
```

Ces événements constituent la principale source d'information du Scheduler.

---

# Batch Events

Les Batch Events concernent la constitution et l'exécution des fournées.

Exemples :

```text
BatchCreated
```

```text
BatchLocked
```

```text
BatchStarted
```

```text
BatchCompleted
```

```text
BatchCancelled
```

Ils permettent au Scheduler de suivre précisément l'état du four.

---

# Resource Events

Les Resource Events décrivent l'évolution des ressources.

Exemples :

```text
ResourceAvailable
```

```text
ResourceUnavailable
```

```text
ResourceReserved
```

```text
ResourceReleased
```

```text
ResourceMaintenanceStarted
```

Ces événements permettent au Scheduler de connaître les capacités réellement disponibles.

---

# System Events

Les System Events concernent le fonctionnement du KDS lui-même.

Exemples :

```text
SchedulerStarted
```

```text
SchedulerCompleted
```

```text
ProductionPlanPublished
```

```text
ProjectionUpdated
```

```text
SystemRecovered
```

Ils servent principalement au diagnostic.

---

# Learning Events

Les Learning Events sont produits par le moteur d'apprentissage.

Exemples :

```text
DurationObserved
```

```text
PredictionUpdated
```

```text
AnomalyDetected
```

```text
SuggestionGenerated
```

Ces événements n'ont aucun impact immédiat sur la production.

Ils servent uniquement à améliorer progressivement les futures décisions.

---

# Événements internes

Certains événements restent internes à un composant.

Exemple :

```text
OperationCompleted
```

dans une recette.

Ils ne quittent jamais leur composant.

Ils ne transitent pas par l'Event Bus principal.

---

# Événements publics

Les événements publics sont diffusés sur l'Event Bus.

Exemple :

```text
WorkCompleted
```

↓

Scheduler

↓

Learning

↓

Historique

Tous les composants peuvent les consommer.

---

# Événements critiques

Certains événements nécessitent un traitement immédiat.

Exemples :

```text
ResourceUnavailable
```

```text
OrderCancelled
```

```text
BatchCompleted
```

Le Scheduler déclenche immédiatement un nouveau calcul.

---

# Événements informatifs

D'autres événements servent uniquement au suivi.

Exemples :

```text
PredictionUpdated
```

```text
StatisticsGenerated
```

Ils n'entraînent aucun recalcul du ProductionPlan.

---

# Événements composés

Un fait complexe peut produire plusieurs événements simples.

Exemple :

```text
Fin de cuisson

↓

BatchCompleted

+

ResourceReleased

+

WorkCompleted
```

Chaque événement reste indépendant.

Le Scheduler les traite séparément.

---

# Priorité des événements

Les événements peuvent être classés selon leur importance.

Exemple :

```text
Critique

↓

OrderCancelled
```

```text
Haute

↓

WorkCompleted
```

```text
Normale

↓

PredictionUpdated
```

Cette priorité concerne uniquement leur traitement.

Elle ne constitue jamais une priorité métier.

---

# Compatibilité

L'ajout d'un nouveau type d'événement ne doit jamais casser les composants existants.

Chaque consommateur ignore naturellement les événements qu'il ne connaît pas.

Cette propriété facilite l'évolution du système.

---

# Invariants

Les familles d'événements respectent toujours les règles suivantes.

- Un événement appartient à une seule famille.
- Une famille possède une responsabilité unique.
- Les événements restent indépendants les uns des autres.
- Les événements critiques peuvent déclencher un recalcul immédiat.
- Les événements informatifs ne modifient jamais directement la production.
- Les événements internes ne quittent jamais leur composant.
- Les événements publics transitent toujours par l'Event Bus.

Ces invariants garantissent une architecture événementielle simple, évolutive et parfaitement découplée.

La partie suivante présentera les mécanismes de diffusion, de consommation et de synchronisation des événements dans l'ensemble du KDS.

---

# Diffusion et consommation des événements

Les événements constituent le mécanisme de communication du KDS.

Aucun composant ne communique directement avec un autre.

Toute interaction passe par un événement.

Cette architecture réduit fortement le couplage entre les composants.

---

# Architecture générale

```text
Producteur

↓

Event

↓

Event Bus

↓

Consommateurs
```

Le producteur ne connaît jamais les consommateurs.

Le consommateur ne connaît jamais le producteur.

Ils ne partagent qu'un contrat : l'événement.

---

# Producteurs

Plusieurs composants peuvent produire des événements.

Exemples :

```text
Pizzaiolo
```

↓

```text
WorkStarted
```

---

```text
Four
```

↓

```text
BatchCompleted
```

---

```text
Dispatcher
```

↓

```text
ResourceReserved
```

---

```text
Caisse
```

↓

```text
OrderCreated
```

Tous les producteurs utilisent le même Event Bus.

---

# Consommateurs

Plusieurs composants peuvent consommer simultanément un même événement.

Exemple :

```text
WorkCompleted

↓

Scheduler

↓

Learning

↓

Historique

↓

Supervision
```

Chaque composant traite l'événement indépendamment.

---

# Découplage

Le Scheduler ne connaît jamais :

- le Four ;
- le Pizzaiolo ;
- la Caisse.

Il connaît uniquement les événements.

Exemple :

```text
WorkCompleted
```

Le Scheduler ignore totalement qui a produit cet événement.

---

# Publication

Lorsqu'un événement est publié,

il devient immédiatement disponible.

```text
Event

↓

Event Bus

↓

Subscribers
```

La publication ne dépend jamais du nombre de consommateurs.

---

# Consommation

Chaque consommateur possède son propre traitement.

Exemple :

```text
WorkCompleted

↓

Scheduler

↓

Recalcul
```

↓

```text
Learning

↓

Nouvelle mesure
```

↓

```text
Historique

↓

Archivage
```

Aucun consommateur ne bloque les autres.

---

# Traitement asynchrone

Les consommateurs peuvent traiter un événement à des vitesses différentes.

Exemple :

```text
Scheduler

↓

15 ms
```

↓

```text
Historique

↓

2 ms
```

↓

```text
Learning

↓

120 ms
```

Cette indépendance améliore les performances globales.

---

# Accusé de réception

Chaque consommateur confirme le traitement.

```text
Event

↓

Consumed
```

Cette confirmation permet :

- d'éviter les pertes ;
- de détecter les erreurs ;
- de garantir la fiabilité.

---

# Nouveaux consommateurs

L'ajout d'un nouveau composant ne nécessite aucune modification des producteurs.

Exemple :

```text
Event Bus

↓

Analytics
```

↓

```text
Dashboard
```

↓

```text
IA
```

Les producteurs continuent de fonctionner normalement.

---

# Échec d'un consommateur

Si un consommateur échoue,

les autres continuent.

Exemple :

```text
Learning

↓

Erreur
```

↓

```text
Scheduler

↓

Continue
```

↓

```text
Historique

↓

Continue
```

Le système reste opérationnel.

---

# Rejeu

Un consommateur peut rejouer les événements archivés.

Exemple :

```text
Historique

↓

Replay

↓

Learning
```

Cette fonctionnalité permet de recalculer des statistiques sans interrompre la production.

---

# Filtrage

Chaque consommateur choisit les événements qui l'intéressent.

Exemple :

```text
Scheduler

↓

Business Events

Workflow Events

Resource Events
```

```text
Learning

↓

Tous les événements
```

```text
Projection

↓

ProductionPlanPublished
```

Le filtrage réduit la charge de traitement.

---

# Garanties

Le système garantit :

- aucun événement perdu ;
- aucun traitement multiple involontaire ;
- ordre chronologique conservé par source ;
- possibilité de rejeu.

Ces garanties sont essentielles pour un moteur piloté par les événements.

---

# Synchronisation

Tous les composants observent la même séquence d'événements.

Exemple :

```text
OrderCreated

↓

WorkStarted

↓

BatchCompleted

↓

OrderReady
```

Cette chronologie constitue la référence unique du système.

---

# Historique

L'ensemble des événements forme un journal complet.

```text
Service

↓

Suite d'événements

↓

Historique
```

Le ProductionPlan peut toujours être reconstruit à partir de ce journal.

Cette propriété est fondamentale.

---

# Invariants

La diffusion des événements respecte toujours les règles suivantes.

- Les producteurs ignorent les consommateurs.
- Tous les échanges passent par l'Event Bus.
- Les consommateurs sont indépendants.
- Un échec local ne bloque jamais le système.
- Les événements peuvent être rejoués.
- Les composants filtrent uniquement les événements utiles.
- L'historique complet permet de reconstruire un service.

Ces propriétés font du système événementiel la colonne vertébrale de l'ensemble du KDS.

La partie suivante décrira les mécanismes de persistance, de traçabilité et de diagnostic des événements.

---

# Persistance, traçabilité et diagnostic des événements

Les événements constituent la mémoire du KDS.

Contrairement au ProductionPlan, qui représente une photographie de la production à un instant donné, les événements conservent toute l'histoire de cette production.

Ils permettent de comprendre :

- ce qui s'est passé ;
- pourquoi cela s'est produit ;
- dans quel ordre ;
- avec quelles conséquences.

---

# Objectifs

La persistance des événements poursuit plusieurs objectifs.

- conserver un historique complet ;
- permettre le rejeu d'un service ;
- faciliter le diagnostic ;
- alimenter le moteur d'apprentissage ;
- garantir l'auditabilité du système.

---

# Persistance

Chaque événement publié est enregistré.

```text
Event

↓

Event Store
```

L'enregistrement intervient avant tout traitement métier.

Ainsi, même en cas de panne,

aucun événement n'est perdu.

---

# Event Store

L'Event Store constitue la source de vérité historique.

```text
Event Store

├── Event #1
├── Event #2
├── Event #3
├── ...
└── Event #N
```

Les événements sont conservés dans leur ordre chronologique.

Ils ne sont jamais modifiés.

---

# Journal de production

L'ensemble des événements forme le journal complet du service.

Exemple :

```text
19:01

OrderCreated
```

↓

```text
19:02

WorkStarted
```

↓

```text
19:04

BatchCompleted
```

↓

```text
19:05

OrderReady
```

Ce journal constitue la référence historique du système.

---

# Traçabilité

Chaque décision du Scheduler doit pouvoir être reliée aux événements qui l'ont provoquée.

Exemple :

```text
OrderCreated

↓

Scheduler Run

↓

ProductionPlan #142
```

Cette relation permet de comprendre précisément l'origine de chaque décision.

---

# Reconstitution

À partir de l'Event Store,

il est possible de reconstruire entièrement un service.

```text
Replay

↓

Scheduler

↓

ProductionPlan
```

Cette propriété permet :

- les simulations ;
- les tests ;
- les analyses d'incidents.

---

# Diagnostic

Lorsqu'un problème survient,

les événements permettent de retrouver :

- la chronologie ;
- les ressources concernées ;
- les Work Units concernées ;
- les décisions prises.

Exemple :

```text
Retard

↓

Recherche

↓

Historique complet
```

---

# Corrélation

Les événements liés à une même commande peuvent être regroupés.

Exemple :

```text
Order #548

↓

Tous les événements associés
```

Il devient alors possible de suivre une commande du début jusqu'à sa remise au client.

---

# Corrélation des Batchs

La même logique s'applique aux Batchs.

Exemple :

```text
Batch #18

↓

Création

↓

Cuisson

↓

Fin
```

Toutes les étapes restent consultables.

---

# Audit

Le système doit permettre de répondre rapidement à des questions comme :

- Pourquoi cette commande est-elle sortie en retard ?
- Pourquoi cette fournée n'était-elle pas complète ?
- Pourquoi cette ressource est-elle devenue indisponible ?

Les réponses proviennent directement de l'Event Store.

---

# Replay sélectif

Il doit être possible de rejouer uniquement une partie du journal.

Exemple :

```text
19:30

↓

20:00
```

ou

```text
Commande #548
```

ou

```text
Four principal
```

Cette fonctionnalité accélère énormément les analyses.

---

# Purge

Les événements ne doivent jamais être supprimés pendant un service.

Après archivage,

une politique de conservation pourra être appliquée.

Exemple :

```text
Conserver

5 ans
```

ou

```text
Archivage externe
```

Cette politique reste indépendante de l'architecture.

---

# Confidentialité

Certaines données peuvent être anonymisées lors de l'archivage.

Exemple :

```text
Utilisateur

↓

Identifiant anonyme
```

Les informations métier restent conservées.

---

# Compatibilité avec le Learning

Le moteur d'apprentissage lit exclusivement les événements archivés.

Il n'intervient jamais dans leur création.

Cette séparation garantit que les analyses n'influencent pas la production en temps réel.

---

# Compatibilité avec les tests

Les événements archivés constituent les meilleurs jeux de tests possibles.

Ils permettent :

- de rejouer un service réel ;
- de comparer deux versions du Scheduler ;
- de mesurer les gains d'un nouvel algorithme.

Le moteur peut ainsi être validé sur des données authentiques.

---

# Invariants

La persistance des événements respecte toujours les règles suivantes.

- Tous les événements sont persistés avant traitement.
- Les événements sont immuables.
- L'Event Store constitue la mémoire officielle du système.
- Toute décision du Scheduler peut être reliée à ses événements d'origine.
- Les événements permettent de reconstruire intégralement un service.
- Les événements ne sont jamais supprimés pendant une production.
- Le moteur d'apprentissage travaille uniquement sur les événements archivés.

Ces principes font de l'Event Store la mémoire permanente du KDS et garantissent une traçabilité complète de toutes les décisions prises pendant un service.

La partie suivante présentera la vision globale des événements ainsi que leur rôle définitif dans l'architecture du KDS.

---

# Intégration des événements avec l'architecture globale

Les événements constituent le mécanisme de communication universel du KDS.

Tous les composants communiquent exclusivement par leur intermédiaire.

Cette architecture permet à chaque composant d'évoluer indépendamment sans créer de dépendances fortes.

---

# Architecture globale

```text
                   Commandes
                        │
                        ▼
                 Business Events
                        │
                        ▼
                    Event Bus
                        │
                        ▼
                    Scheduler
                        │
                        ▼
                 ProductionPlan
                        │
                        ▼
                   Dispatcher
                        │
                        ▼
                   Resources
                        │
                        ▼
                Workflow Events
                        │
                        ▼
                    Event Bus
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
    Learning       Historique      Supervision
```

Les événements relient tous les composants.

---

# Interaction avec les commandes

La création d'une commande produit immédiatement un événement.

Exemple :

```text
Nouvelle commande

↓

OrderCreated
```

Le Scheduler ne lit jamais directement la base de données des commandes.

Il attend simplement les événements.

---

# Interaction avec les Work Units

Chaque changement d'état d'une Work Unit produit un événement.

Exemple :

```text
Created
```

↓

```text
Started
```

↓

```text
Completed
```

↓

```text
Archived
```

Le Scheduler reconstruit ensuite la nouvelle situation.

---

# Interaction avec les ressources

Les ressources ne communiquent jamais directement avec le Scheduler.

Exemple :

```text
Four

↓

BatchCompleted

↓

Event Bus

↓

Scheduler
```

La ressource ignore totalement ce que fera ensuite le Scheduler.

---

# Interaction avec le Dispatcher

Le Dispatcher produit également des événements.

Exemple :

```text
AssignmentCreated
```

```text
AssignmentCancelled
```

```text
ResourceReserved
```

Ces événements améliorent la traçabilité de la production.

---

# Interaction avec le ProductionPlan

Le ProductionPlan n'est jamais modifié directement.

Le cycle est toujours :

```text
Event

↓

Scheduler

↓

ProductionPlan
```

Cette règle est absolue.

---

# Interaction avec le moteur d'apprentissage

Le moteur Learning consomme tous les événements.

Il construit progressivement :

- les statistiques ;
- les estimations ;
- les modèles prédictifs.

Il ne modifie jamais les événements.

---

# Interaction avec les projections

Les projections ne lisent généralement pas les événements.

Elles utilisent le ProductionPlan.

Exception :

certaines alertes temps réel pourront être affichées directement à partir d'événements spécifiques.

Exemple :

```text
ResourceUnavailable
```

---

# Interaction avec la supervision

Le module de supervision peut afficher les événements en temps réel.

Exemple :

```text
19:42

WorkCompleted
```

↓

```text
19:43

BatchCompleted
```

↓

```text
19:44

OrderReady
```

Cette vue facilite énormément le diagnostic.

---

# Interaction avec les statistiques

Les statistiques ne sont jamais calculées directement sur le ProductionPlan.

Elles utilisent les événements archivés.

Cette approche garantit des analyses exactes.

---

# Interaction avec les tests

Les événements constituent la meilleure base de tests.

Exemple :

```text
Replay

↓

Scheduler V1
```

↓

Résultat

Puis :

```text
Replay

↓

Scheduler V2
```

↓

Comparaison

Cette approche permet de valider chaque évolution du moteur.

---

# Compatibilité avec plusieurs établissements

Chaque événement peut être associé à un établissement.

Exemple :

```text
Restaurant A
```

ou

```text
Restaurant B
```

Le Scheduler filtre simplement les événements qui le concernent.

---

# Compatibilité avec plusieurs cuisines

Le même principe s'applique aux cuisines.

Exemple :

```text
Cuisine Pizza
```

```text
Cuisine Pani'NO
```

```text
Cuisine Friture
```

Toutes utilisent le même modèle événementiel.

---

# Compatibilité avec les systèmes externes

Des événements pourront également provenir :

- du proxy ;
- de L'Addition ;
- d'un site internet ;
- d'une borne de commande ;
- d'une API partenaire.

Le Scheduler restera totalement indépendant de leur origine.

---

# Vision long terme

À terme,

les événements permettront de piloter :

- plusieurs cuisines ;
- plusieurs restaurants ;
- plusieurs Scheduler ;
- plusieurs moteurs d'apprentissage.

Le contrat événementiel restera identique.

Cette stabilité constitue l'un des principaux objectifs de cette architecture.

---

# Invariants

L'intégration des événements respecte toujours les règles suivantes.

- Tous les composants communiquent exclusivement par événements.
- Les événements ne transportent jamais de logique métier.
- Le Scheduler ne lit jamais directement les ressources ou les commandes.
- Le ProductionPlan est toujours produit à partir d'événements.
- Les statistiques utilisent exclusivement les événements archivés.
- Le moteur d'apprentissage ne modifie jamais les événements.
- L'ajout d'un nouveau composant ne nécessite jamais de modifier les producteurs d'événements.

Ces principes font des événements le langage commun de l'ensemble du KDS et garantissent une architecture distribuée, découplée et facilement extensible.

La dernière partie présentera la vision globale du modèle événementiel ainsi que les décisions d'architecture retenues pour le KDS.

---

# Vision globale des événements

Les événements constituent le système nerveux du KDS.

Ils représentent tous les faits observables qui se produisent pendant un service.

Ils ne prennent aucune décision.

Ils ne modifient jamais directement l'état du système.

Ils décrivent simplement ce qui s'est réellement produit.

Le Scheduler transforme ensuite cette suite de faits en décisions.

---

# Position dans l'architecture

```text
                  Monde réel
                       │
                       ▼
                 Événements
                       │
                       ▼
                   Event Bus
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
    Scheduler      Learning     Historique
         │
         ▼
   ProductionPlan
         │
         ▼
     Dispatcher
         │
         ▼
      Resources
         │
         ▼
   Nouveaux événements
```

Cette boucle se répète continuellement pendant tout le service.

---

# Les événements comme source de vérité

Le ProductionPlan décrit l'état actuel.

Les événements décrivent toute l'histoire.

Autrement dit :

```text
ProductionPlan

↓

Photographie
```

```text
Events

↓

Film complet
```

Le ProductionPlan peut toujours être reconstruit à partir des événements.

L'inverse n'est pas vrai.

---

# Répartition des responsabilités

L'ensemble du moteur repose sur une séparation stricte.

| Composant | Responsabilité |
|-----------|----------------|
| Event | Décrire un fait observé. |
| Event Bus | Diffuser les événements. |
| Scheduler | Transformer les événements en décisions. |
| ProductionPlan | Décrire les décisions prises. |
| Dispatcher | Affecter les ressources. |
| Resources | Exécuter les décisions. |
| Learning | Observer les événements et améliorer les estimations. |

Chaque composant possède une responsabilité unique.

---

# Ce que les événements apportent

L'architecture événementielle permet :

- un fort découplage entre les composants ;
- une traçabilité complète de la production ;
- le rejeu d'un service ;
- l'audit des décisions ;
- l'apprentissage automatique ;
- la simulation ;
- les tests reproductibles.

Les événements deviennent ainsi le langage commun du KDS.

---

# Compatibilité avec l'évolution

Le modèle événementiel permet d'ajouter facilement :

## Nouveaux postes

Aucun changement du Scheduler.

Il suffit de produire les événements appropriés.

---

## Nouveaux équipements

Chaque nouvel équipement produit des événements.

Le reste du système reste inchangé.

---

## Nouveaux types de commandes

Les nouveaux Business Events s'intègrent naturellement à l'architecture.

Les composants qui ne les utilisent pas les ignorent.

---

## Plusieurs établissements

Chaque événement peut être associé à :

```text
Restaurant

Cuisine

Service
```

Le modèle reste identique.

---

## Services externes

Le système pourra recevoir des événements provenant :

- du proxy ;
- de L'Addition ;
- d'un site internet ;
- d'une borne de commande ;
- d'une API externe.

Tous utiliseront le même contrat événementiel.

---

# Compatibilité avec le moteur d'apprentissage

Le moteur Learning n'observe jamais directement les ressources.

Il observe uniquement les événements.

Cela garantit :

- une parfaite reproductibilité ;
- des analyses fiables ;
- un apprentissage indépendant de la production.

---

# Compatibilité avec les simulations

Un service complet peut être simulé.

```text
Archive

↓

Replay

↓

Scheduler

↓

ProductionPlan
```

Cette capacité permettra :

- les démonstrations ;
- les formations ;
- les comparaisons d'algorithmes ;
- les tests automatiques.

---

# Compatibilité avec les diagnostics

Chaque incident pourra être analysé.

Exemple :

```text
Commande en retard

↓

Recherche

↓

Suite d'événements

↓

Décision du Scheduler

↓

Cause identifiée
```

Cette traçabilité constitue l'un des principaux avantages de cette architecture.

---

# Décisions d'architecture

Les décisions suivantes sont considérées comme définitives.

| ID | Décision |
|----|----------|
| ADR-033 | Les événements représentent l'unique source de changement du système. |
| ADR-034 | Les événements sont immuables. |
| ADR-035 | Tous les composants communiquent exclusivement via l'Event Bus. |
| ADR-036 | Le Scheduler ne traite que des événements. |
| ADR-037 | Les événements sont persistés avant tout traitement. |
| ADR-038 | Le ProductionPlan est toujours dérivé des événements. |
| ADR-039 | Les événements constituent la source officielle pour le Learning et les statistiques. |
| ADR-040 | Tout service peut être rejoué intégralement à partir de son historique d'événements. |

Ces décisions constituent les fondations de l'architecture événementielle du KDS.

---

# Compatibilité documentaire

Le présent document complète directement :

```text
14_ARCHITECTURE_WORK_UNITS.md
```

```text
15_ARCHITECTURE_SCHEDULER.md
```

```text
16_ARCHITECTURE_PRODUCTION_PLAN.md
```

```text
17_ARCHITECTURE_RECIPES.md
```

```text
18_ARCHITECTURE_RESOURCES.md
```

Il définit le mécanisme de communication reliant tous ces composants.

Aucun concept des documents précédents n'est modifié.

---

# Vision à long terme

L'architecture événementielle permettra au KDS de devenir une véritable plateforme de pilotage de production.

Tous les composants — interfaces, Scheduler, Dispatcher, Learning, supervision, statistiques, simulations et futurs modules d'intelligence artificielle — partageront le même langage : les événements.

Cette homogénéité garantira la stabilité du système, quelle que soit son évolution.

---

# Conclusion

Les événements constituent la colonne vertébrale du KDS.

Ils relient l'ensemble des composants tout en conservant une séparation stricte entre :

- **les faits** (Events) ;
- **les décisions** (Scheduler) ;
- **la représentation** (ProductionPlan) ;
- **l'affectation** (Dispatcher) ;
- **l'exécution** (Resources) ;
- **l'amélioration continue** (Learning).

Grâce à cette architecture, le KDS devient un système événementiel moderne, robuste et entièrement traçable, capable d'évoluer progressivement sans remettre en cause ses fondations.

Avec les documents :

- **14 — Work Units**
- **15 — Scheduler**
- **16 — ProductionPlan**
- **17 — Recipes**
- **18 — Resources**
- **19 — Events**

l'architecture complète du moteur de production est désormais pratiquement finalisée.

Le dernier grand document (**20_ARCHITECTURE_LEARNING.md**) viendra décrire le moteur d'apprentissage, chargé d'améliorer les estimations et les décisions du Scheduler au fil des services, sans jamais compromettre la stabilité de la production.

---

# Fin du document