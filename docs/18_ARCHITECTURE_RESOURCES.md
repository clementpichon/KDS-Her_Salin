# 18_ARCHITECTURE_RESOURCES.md

# Architecture des Ressources

Version : 1.0

Statut : Architecture cible

---

# Objectif

Les ressources représentent les capacités physiques de production du KDS.

Une ressource exécute le travail.

Elle ne décide jamais quel travail réaliser.

Toutes les décisions sont prises par le Scheduler puis appliquées par le Dispatcher.

Les ressources constituent donc les exécutants du système.

---

# Position dans l'architecture

```text
ProductionPlan

↓

Dispatcher

↓

Resource

↓

Execution

↓

Events
```

Le Dispatcher affecte une Work Unit.

La ressource réalise cette Work Unit.

Elle produit ensuite des événements.

---

# Responsabilités

Une ressource possède les responsabilités suivantes.

| Responsabilité | Description |
|----------------|-------------|
| Exécuter une Work Unit | Réaliser le travail demandé. |
| Signaler son état | Disponible, occupée, indisponible… |
| Produire des événements | Début, fin, erreur… |
| Respecter les contraintes physiques | Capacité, temps, disponibilité. |

---

# Ce qu'une ressource ne fait jamais

Une ressource ne :

- calcule aucune priorité ;
- ne construit aucun Batch ;
- ne modifie jamais une Work Unit ;
- ne choisit jamais une commande ;
- ne connaît jamais les autres ressources ;
- ne dialogue jamais directement avec le Scheduler.

Elle exécute uniquement le travail qui lui est confié.

---

# Philosophie

Le Scheduler décide.

Le Dispatcher affecte.

La ressource produit.

Cette séparation constitue l'un des principes fondamentaux du KDS.

---

# Définition

Une ressource représente une capacité réelle de production.

Exemples :

- un pizzaiolo ;
- un four ;
- un poste Pani'NO ;
- un poste de finition ;
- un futur robot.

Toutes ces ressources possèdent la même architecture.

---

# Structure générale

```text
Resource

├── Metadata

├── Capabilities

├── Capacity

├── State

├── Assignments

├── Metrics

└── Events
```

Chaque section sera détaillée dans la suite du document.

---

# Structure des ressources

Toutes les ressources du KDS partagent une architecture commune.

Qu'il s'agisse :

- d'un pizzaiolo ;
- d'un four ;
- d'un poste Pani'NO ;
- d'un poste de finition ;
- d'un futur équipement automatisé,

elles sont représentées de manière homogène.

Cette uniformisation simplifie fortement le Scheduler et le Dispatcher.

---

# Structure générale

Chaque ressource possède la structure suivante.

```text
Resource

├── Metadata
├── Capabilities
├── Capacity
├── State
├── Assignments
├── Metrics
└── Events
```

Chaque section possède une responsabilité clairement définie.

---

# Metadata

Les métadonnées identifient la ressource.

Exemple :

```text
Metadata

├── resourceId
├── name
├── type
├── location
├── enabled
└── version
```

Les métadonnées ne changent que très rarement.

---

# Type de ressource

Chaque ressource appartient à une catégorie.

Exemples :

```text
Pizzaiolo
```

```text
Four
```

```text
Pani'NO
```

```text
Préparation froide
```

```text
Robot
```

Le Scheduler raisonne principalement sur ces types.

---

# Capabilities

Les capacités décrivent ce qu'une ressource sait faire.

Exemple :

```text
Capabilities

├── Preparation
├── Cooking
└── Finishing
```

ou

```text
Capabilities

├── Cooking
```

Le Dispatcher utilise ces informations lors des affectations.

---

# Capacity

Chaque ressource possède une capacité maximale.

Exemples :

```text
Four

↓

4 pizzas
```

```text
Pizzaiolo

↓

1 préparation simultanée
```

```text
Pani'NO

↓

2 assemblages
```

Cette capacité représente une contrainte physique.

---

# State

Une ressource possède toujours un état.

Exemple :

```text
Available
```

```text
Busy
```

```text
Reserved
```

```text
Unavailable
```

```text
Maintenance
```

Le Dispatcher consulte cet état avant toute affectation.

---

# Assignments

Les affectations décrivent les Work Units actuellement confiées à la ressource.

Exemple :

```text
Assignments

├── WU-101
├── WU-102
└── WU-103
```

Une affectation disparaît dès que la Work Unit est terminée.

---

# Metrics

Chaque ressource produit des statistiques.

Exemple :

```text
Metrics

├── utilisation
├── occupation
├── temps moyen
├── temps d'attente
└── interruptions
```

Ces métriques alimentent le moteur d'apprentissage.

---

# Events

Une ressource produit des événements.

Exemple :

```text
WorkStarted
```

```text
WorkCompleted
```

```text
ResourceUnavailable
```

```text
MaintenanceStarted
```

Ces événements sont envoyés au Scheduler via le Dispatcher.

---

# Disponibilité

La disponibilité ne dépend pas uniquement de l'état.

Exemple :

```text
Disponible

↓

Capacité atteinte
```

↓

Nouvelle affectation impossible.

Le Dispatcher tient compte de ces deux informations.

---

# Réservation

Une ressource peut être réservée avant de commencer réellement le travail.

Exemple :

```text
Four

↓

1 emplacement réservé

↓

Attente du Batch
```

Cette réservation évite les conflits d'affectation.

---

# Ressources identiques

Plusieurs ressources peuvent appartenir au même type.

Exemple :

```text
Four 1
```

```text
Four 2
```

Le Scheduler reste totalement indépendant du nombre réel de ressources.

Le Dispatcher choisit ensuite la plus adaptée.

---

# Ressources spécialisées

Certaines ressources peuvent posséder des capacités supplémentaires.

Exemple :

```text
Pizzaiolo senior

↓

Preparation

↓

Formation

↓

Contrôle qualité
```

Le Scheduler n'a pas besoin de connaître ces différences.

---

# Ressources temporaires

Une ressource peut apparaître ou disparaître.

Exemple :

```text
Employé supplémentaire

↓

Disponible

↓

Fin de service

↓

Retiré
```

L'architecture reste identique.

---

# État interne

Une ressource conserve uniquement son propre état.

Elle ne connaît jamais :

- les autres ressources ;
- le Scheduler ;
- les Batchs futurs ;
- les commandes.

Cette indépendance réduit fortement le couplage.

---

# Exemple complet

```text
Resource

Four principal

↓

Capabilities

Cooking

↓

Capacity

4

↓

State

Available

↓

Assignments

Aucun
```

Cette description suffit au Dispatcher pour réaliser une affectation.

---

# Invariants

Toutes les ressources respectent les règles suivantes.

- Une ressource possède un identifiant unique.
- Une ressource connaît uniquement son propre état.
- Une ressource n'effectue aucun calcul métier.
- Les capacités sont déclaratives.
- La capacité maximale ne peut jamais être dépassée.
- Les affectations sont temporaires.
- Les événements décrivent uniquement les changements d'état de la ressource.

Ces invariants garantissent une représentation homogène de toutes les capacités de production.

La partie suivante décrira le cycle de vie des ressources ainsi que leurs interactions avec le Dispatcher et le Scheduler.

---

# Cycle de vie des ressources

Les ressources évoluent tout au long du service.

Leur état change en fonction :

- des affectations ;
- de l'avancement des Work Units ;
- des indisponibilités ;
- des interventions humaines.

Le Scheduler ne modifie jamais directement une ressource.

Toutes les transitions passent par le Dispatcher et les événements.

---

# Cycle de vie

Chaque ressource suit le cycle général suivant.

```text
Création

↓

Disponible

↓

Réservée

↓

En cours d'exécution

↓

Libération

↓

Disponible
```

Ce cycle peut être interrompu par une indisponibilité ou une maintenance.

---

# Création

Une ressource est déclarée dans le système.

Exemple :

```text
Four principal

↓

Créé

↓

Disponible
```

À ce stade, aucune Work Unit ne lui est affectée.

---

# Disponible

Une ressource disponible peut recevoir une nouvelle affectation.

Exemple :

```text
State

↓

Available
```

Être disponible signifie uniquement :

- ressource active ;
- capacité suffisante ;
- aucune contrainte bloquante.

---

# Réservation

Avant le début réel du travail,

le Dispatcher réserve la ressource.

Exemple :

```text
Four

↓

1 emplacement réservé
```

ou

```text
Pizzaiolo

↓

Préparation réservée
```

Cette réservation évite qu'une autre Work Unit utilise simultanément la même capacité.

---

# Début d'exécution

Lorsque le travail commence,

la ressource produit :

```text
WorkStarted
```

Le Dispatcher met alors à jour son état.

Exemple :

```text
Reserved

↓

Busy
```

---

# Exécution

Pendant cette phase,

la ressource réalise la Work Unit.

Le Scheduler n'intervient plus.

La ressource applique simplement les opérations décrites par la recette.

---

# Fin d'exécution

Lorsque le travail est terminé,

la ressource produit :

```text
WorkCompleted
```

ou

```text
BatchCompleted
```

Le Dispatcher libère ensuite la capacité correspondante.

---

# Libération

Une fois la Work Unit terminée,

la ressource redevient disponible.

Exemple :

```text
Busy

↓

Available
```

Elle peut immédiatement recevoir une nouvelle affectation.

---

# Indisponibilité

Une ressource peut devenir indisponible à tout moment.

Exemples :

- panne ;
- absence ;
- nettoyage ;
- maintenance.

Le Dispatcher produit alors :

```text
ResourceUnavailable
```

Le Scheduler calcule un nouveau ProductionPlan.

---

# Maintenance

Certaines ressources peuvent entrer en maintenance.

Exemple :

```text
Available

↓

Maintenance

↓

Available
```

Pendant cette période,

aucune affectation n'est autorisée.

---

# Désactivation

Une ressource peut être retirée du système.

Exemple :

```text
Enabled

↓

Disabled
```

Elle reste connue du système,

mais ne participe plus à la production.

---

# Réactivation

Une ressource désactivée peut être réactivée.

Exemple :

```text
Disabled

↓

Available
```

Le Scheduler pourra alors l'utiliser lors des prochains calculs.

---

# Changement de capacité

Certaines ressources peuvent voir leur capacité évoluer.

Exemple :

```text
Four

↓

4 places
```

↓

```text
3 places disponibles
```

(en raison d'un emplacement défectueux)

Le Dispatcher tient compte de cette nouvelle capacité.

---

# Exemple complet

```text
Four

↓

Available

↓

Reserved

↓

Busy

↓

BatchCompleted

↓

Available
```

Ce cycle correspond au fonctionnement normal d'une fournée.

---

# Gestion des erreurs

Une erreur peut interrompre le cycle.

Exemple :

```text
Busy

↓

Erreur

↓

Unavailable

↓

Maintenance

↓

Available
```

Toutes les transitions sont signalées au Scheduler.

---

# Historique

Chaque ressource conserve un historique.

Exemple :

```text
08:00

↓

Available
```

```text
08:12

↓

Busy
```

```text
08:14

↓

Available
```

Cet historique est utilisé pour :

- les statistiques ;
- le diagnostic ;
- le moteur d'apprentissage.

---

# Invariants

Le cycle de vie des ressources respecte toujours les règles suivantes.

- Une ressource ne peut être affectée que si elle est disponible.
- Une réservation précède toujours une exécution.
- Une Work Unit terminée libère immédiatement la capacité utilisée.
- Une ressource indisponible ne reçoit aucune nouvelle affectation.
- Toutes les transitions produisent un événement.
- Le Scheduler ne modifie jamais directement l'état d'une ressource.
- Le Dispatcher est le seul composant autorisé à gérer les affectations.

Ces invariants garantissent un fonctionnement cohérent des ressources et une parfaite séparation entre la planification et l'exécution.

La partie suivante décrira les interactions entre les ressources, le Dispatcher, le Scheduler et le ProductionPlan.

---

# Intégration des ressources avec le KDS

Les ressources constituent les exécutants du système.

Elles représentent les capacités physiques de production.

Leur rôle est d'exécuter les Work Units qui leur sont confiées.

Elles ne prennent jamais de décision métier.

Cette séparation permet au Scheduler de rester totalement indépendant de l'organisation physique de la cuisine.

---

# Architecture générale

```text
Scheduler

↓

ProductionPlan

↓

Dispatcher

↓

Resource

↓

Recipe

↓

Execution

↓

Events

↓

Scheduler
```

Les ressources interviennent uniquement pendant la phase d'exécution.

---

# Interaction avec le Scheduler

Le Scheduler ne connaît jamais une ressource individuellement.

Il manipule uniquement des besoins.

Exemple :

```text
Cooking

↓

Besoin

↓

Four
```

Le choix du four appartient au Dispatcher.

---

# Interaction avec le Dispatcher

Le Dispatcher constitue l'intermédiaire entre le Scheduler et les ressources.

Il reçoit :

```text
Work Unit

↓

Dispatcher
```

Puis choisit :

```text
Resource
```

La ressource reçoit ensuite son affectation.

---

# Affectation

Une affectation contient notamment :

```text
Assignment

├── WorkUnitId
├── ResourceId
├── PlannedStart
├── PlannedEnd
├── Priority
└── RecipeVersion
```

Une fois créée,

l'affectation devient le contrat entre le Dispatcher et la ressource.

---

# Interaction avec le ProductionPlan

Le ProductionPlan décrit les affectations prévues.

Il ne modifie jamais directement une ressource.

Exemple :

```text
Batch

↓

Four principal
```

Cette information est consultative.

L'exécution réelle reste pilotée par le Dispatcher.

---

# Interaction avec les recettes

La ressource exécute les opérations définies par la recette.

Exemple :

```text
Work Unit

↓

Recipe

↓

Operations

↓

Execution
```

La ressource ne modifie jamais la recette.

---

# Interaction avec les opérateurs

Les ressources humaines utilisent les interfaces du KDS.

Exemple :

```text
Projection Pizzaiolo

↓

Instructions

↓

Travail réalisé
```

L'opérateur produit ensuite des événements.

---

# Interaction avec les Batchs

Certaines ressources travaillent sur un Batch entier.

Exemple :

```text
Four

↓

Batch

4 pizzas
```

D'autres travaillent sur une seule Work Unit.

Exemple :

```text
Pizzaiolo

↓

Preparation

1 pizza
```

Le Dispatcher adapte automatiquement l'affectation au type de ressource.

---

# Ressources humaines

Les ressources humaines possèdent des caractéristiques particulières.

Exemple :

- fatigue ;
- expérience ;
- polyvalence ;
- vitesse moyenne.

Ces caractéristiques pourront être utilisées par le moteur d'apprentissage.

Elles ne doivent jamais modifier directement les décisions du Scheduler.

---

# Ressources matérielles

Les équipements possèdent également leurs propres caractéristiques.

Exemple :

```text
Four

Capacité

4

Temps cuisson

90 s
```

ou

```text
Table de préparation

Capacité

1
```

Ces informations restent déclaratives.

---

# Ressources partagées

Certaines ressources peuvent être utilisées par plusieurs postes.

Exemple :

```text
Plan de travail
```

ou

```text
Saladette
```

Le Dispatcher pourra ultérieurement gérer ces ressources comme n'importe quelle autre capacité.

---

# Ressources virtuelles

Le système pourra introduire des ressources virtuelles.

Exemple :

```text
Temps d'attente
```

```text
Refroidissement
```

```text
Transport
```

Ces ressources ne représentent pas un opérateur,

mais une contrainte temporelle.

---

# Collaboration

Plusieurs ressources peuvent participer à une même Production Unit.

Exemple :

```text
Pizzaiolo

↓

Preparation
```

↓

```text
Four

↓

Cooking
```

↓

```text
Four

↓

Finishing
```

Chaque ressource réalise uniquement la partie qui lui est attribuée.

---

# Changement de ressource

Avant le début d'exécution,

le Dispatcher peut modifier une affectation.

Exemple :

```text
Four 1

↓

Panne
```

↓

```text
Four 2
```

Le Scheduler n'a pas besoin d'être modifié.

En revanche,

une fois la Work Unit commencée,

la ressource ne peut plus être changée automatiquement.

---

# Performance

Les ressources produisent des mesures.

Exemple :

```text
Temps d'utilisation
```

```text
Taux d'occupation
```

```text
Temps d'attente
```

```text
Nombre de Work Units réalisées
```

Ces informations alimentent les statistiques et le moteur d'apprentissage.

---

# Invariants

L'intégration des ressources respecte toujours les règles suivantes.

- Les ressources n'effectuent aucune planification.
- Le Dispatcher est le seul composant autorisé à créer des affectations.
- Les ressources exécutent uniquement les Work Units reçues.
- Les recettes restent indépendantes des ressources.
- Le Scheduler ne connaît pas les ressources individuelles.
- Les ressources produisent uniquement des événements décrivant leur état.
- Une Work Unit en cours ne change jamais automatiquement de ressource.

Ces invariants garantissent un découplage fort entre la décision, l'affectation et l'exécution.

La partie suivante présentera les mécanismes de mesure des performances, de supervision et d'apprentissage associés aux ressources.

---

# Mesure des performances et supervision des ressources

Les ressources représentent les capacités de production du KDS.

Pour permettre une amélioration continue, leur fonctionnement doit être mesurable.

L'objectif n'est pas de surveiller les opérateurs.

L'objectif est de comprendre le fonctionnement global du système afin d'améliorer :

- les estimations ;
- la planification ;
- l'organisation de la production.

---

# Objectifs

Le système mesure principalement :

- l'utilisation des ressources ;
- les temps d'exécution ;
- les temps d'attente ;
- les indisponibilités ;
- les écarts entre les prévisions et la réalité.

Ces informations alimentent le moteur d'apprentissage.

---

# Indicateurs

Chaque ressource produit un ensemble standardisé de métriques.

```text
Metrics

├── Utilisation
├── Occupation
├── Waiting Time
├── Execution Time
├── Idle Time
├── Error Count
├── Availability
└── Throughput
```

Toutes les ressources utilisent la même structure.

---

# Taux d'utilisation

Le taux d'utilisation mesure le temps pendant lequel une ressource exécute effectivement du travail.

Exemple :

```text
Service

3 h

↓

Occupation

2 h 10

↓

Utilisation

72 %
```

Une faible utilisation peut révéler :

- une mauvaise planification ;
- un manque de commandes ;
- un goulot d'étranglement en amont.

---

# Temps d'attente

Le système mesure également les périodes où une ressource reste disponible sans travail.

Exemple :

```text
Four disponible

↓

Aucune pizza

↓

Attente

2 min 40
```

Ces informations permettent d'améliorer les décisions du Scheduler.

---

# Temps d'exécution

Chaque Work Unit produit une durée réelle.

Exemple :

```text
Preparation

Prévue

55 s

↓

Réelle

63 s
```

Le moteur d'apprentissage utilise ces écarts pour améliorer les estimations futures.

---

# Temps d'inactivité

Une ressource peut être disponible sans être utilisée.

Exemple :

```text
Pizzaiolo

↓

Disponible

↓

Aucune Work Unit

↓

Idle
```

Ce temps est distingué du temps d'attente provoqué par une réservation.

---

# Débit

Le débit représente le nombre de Work Units réalisées.

Exemple :

```text
Four

↓

154 cuissons

↓

Service
```

ou

```text
Pizzaiolo

↓

138 préparations
```

Le débit est analysé à l'échelle du système.

---

# Saturation

Une ressource peut devenir saturée.

Exemple :

```text
Capacité

4

↓

Occupation

4

↓

Saturation
```

Le Dispatcher détecte cette situation.

Le Scheduler adapte ensuite le ProductionPlan.

---

# Disponibilité

La disponibilité est suivie en permanence.

Exemple :

```text
Available

92 %
```

```text
Busy

6 %
```

```text
Maintenance

2 %
```

Ces données facilitent l'analyse des performances globales.

---

# Historique

Toutes les métriques peuvent être historisées.

Exemple :

```text
19:00

↓

Utilisation

42 %
```

↓

```text
20:00

↓

96 %
```

↓

```text
21:00

↓

55 %
```

Cet historique permet de comprendre l'évolution du service.

---

# Supervision temps réel

Une projection spécifique pourra présenter :

```text
Toutes les ressources

↓

Occupation

↓

Charge

↓

Disponibilité

↓

Alertes
```

Cette vue sera principalement utilisée par le responsable de production.

---

# Alertes

Le système peut générer plusieurs types d'alertes.

Exemple :

```text
Ressource saturée
```

```text
Temps d'attente anormal
```

```text
Indisponibilité prolongée
```

```text
Temps réel supérieur aux estimations
```

Les alertes restent purement informatives.

---

# Apprentissage

Les métriques alimentent directement le moteur d'apprentissage.

Exemple :

```text
Temps moyen

↓

Nouvelle estimation
```

ou

```text
Occupation moyenne

↓

Nouvelle stratégie
```

Le moteur ne modifie jamais directement les ressources.

---

# Analyse comparative

Les ressources de même type peuvent être comparées.

Exemple :

```text
Four 1

VS

Four 2
```

ou

```text
Service vendredi

VS

Service samedi
```

Ces comparaisons servent uniquement à améliorer l'organisation.

---

# Confidentialité

Les mesures ne doivent jamais être utilisées pour évaluer individuellement un employé.

Leur objectif est d'améliorer le fonctionnement global du système.

Les interfaces opérationnelles n'affichent que les informations réellement utiles à la production.

---

# Compatibilité avec le Scheduler

Le Scheduler peut utiliser certaines métriques agrégées.

Exemple :

- durée moyenne observée ;
- disponibilité réelle ;
- capacité effective.

En revanche,

il ne consulte jamais les métriques détaillées d'une ressource pendant un calcul.

---

# Invariants

La supervision des ressources respecte toujours les règles suivantes.

- Les métriques décrivent les ressources, elles ne les pilotent pas.
- Les statistiques sont produites après l'exécution.
- Les mesures n'influencent jamais directement une affectation en cours.
- Le Scheduler utilise uniquement des données agrégées.
- Les alertes restent indépendantes des décisions métier.
- Les métriques sont historisées et comparables.
- Les ressources continuent de fonctionner même si la supervision est indisponible.

Ces principes garantissent une architecture robuste où la supervision améliore progressivement le système sans perturber la production.

La partie suivante présentera l'évolution des ressources, leur intégration avec le moteur d'apprentissage et leur adaptation aux futures évolutions du KDS.

---

# Évolution et apprentissage des ressources

Les ressources représentent les capacités de production du KDS.

Au fil du temps, leur comportement peut évoluer.

Le système doit être capable d'observer cette évolution afin d'améliorer progressivement les estimations du Scheduler sans modifier le comportement réel des ressources.

L'objectif est d'adapter la planification à la réalité du terrain.

---

# Objectifs

Le moteur d'apprentissage poursuit plusieurs objectifs.

- améliorer les estimations ;
- détecter les changements de comportement ;
- adapter les prévisions aux conditions réelles ;
- conserver un historique des performances.

Il ne modifie jamais directement une ressource.

---

# Principe fondamental

Le moteur observe.

Le Scheduler décide.

Le Dispatcher applique.

Les ressources exécutent.

Chaque composant conserve une responsabilité clairement définie.

---

# Sources d'apprentissage

Le moteur peut analyser les informations suivantes.

```text
Durées réelles

↓

Temps d'attente

↓

Temps d'occupation

↓

Capacité réellement utilisée

↓

Événements

↓

Historique des services
```

Toutes ces données sont produites automatiquement.

---

# Évolution des performances

Les performances d'une ressource évoluent naturellement.

Exemples :

- un pizzaiolo gagne en expérience ;
- un four chauffe différemment selon la saison ;
- un poste devient plus rapide après une réorganisation.

Le moteur détecte ces évolutions progressivement.

---

# Estimations adaptatives

Chaque ressource possède :

```text
Durée théorique
```

et

```text
Durée observée
```

Exemple :

```text
Préparation

Prévue

60 s

↓

Observée

54 s
```

Le Scheduler pourra progressivement utiliser cette nouvelle estimation.

---

# Profils de fonctionnement

Une même ressource peut présenter des comportements différents selon le contexte.

Exemples :

```text
Vendredi soir
```

```text
Samedi soir
```

```text
Service calme
```

```text
Service saturé
```

Le moteur d'apprentissage peut créer ces profils automatiquement.

---

# Influence de la charge

La vitesse d'exécution dépend parfois de la charge de travail.

Exemple :

```text
Occupation

35 %

↓

Préparation

52 s
```

↓

```text
Occupation

95 %

↓

Préparation

68 s
```

Ces écarts permettent au Scheduler d'améliorer ses prévisions.

---

# Fatigue opérationnelle

Certaines ressources voient leurs performances évoluer au cours du service.

Exemple :

```text
18:30

↓

58 s
```

↓

```text
21:00

↓

67 s
```

Le moteur peut détecter cette tendance.

Il ne doit jamais interpréter automatiquement sa cause.

---

# Détection des anomalies

Le moteur peut identifier :

```text
Durée anormale
```

```text
Occupation inhabituelle
```

```text
Nombre élevé d'interruptions
```

```text
Capacité rarement atteinte
```

Ces anomalies servent à améliorer les estimations futures.

---

# Suggestions

Le moteur peut produire des recommandations.

Exemple :

```text
Four principal

↓

Temps moyen observé

94 s

↓

Suggestion

95 s
```

Ces suggestions restent consultatives.

---

# Comparaison des ressources

Deux ressources identiques peuvent être comparées.

Exemple :

```text
Four 1

↓

91 s
```

VS

```text
Four 2

↓

96 s
```

Le système constate simplement l'écart.

Il ne cherche jamais à désigner une "meilleure" ressource.

---

# Évolution des capacités

Certaines capacités peuvent évoluer.

Exemple :

```text
Four

↓

4 places
```

↓

```text
1 emplacement inutilisable
```

Le Dispatcher applique cette nouvelle capacité.

Le Scheduler adapte ensuite son ProductionPlan.

---

# Historique

Toutes les évolutions sont historisées.

Exemple :

```text
Août

↓

Utilisation

82 %
```

↓

```text
Septembre

↓

87 %
```

Cet historique permet de suivre les tendances à long terme.

---

# Compatibilité avec le Scheduler

Le Scheduler utilise uniquement des données consolidées.

Exemples :

- durée moyenne observée ;
- disponibilité moyenne ;
- capacité effective.

Il ne consulte jamais les événements bruts pendant un calcul.

---

# Gouvernance

Les ajustements proposés par le moteur doivent rester transparents.

Chaque évolution doit être :

- mesurable ;
- explicable ;
- historisée.

Le système doit toujours pouvoir expliquer pourquoi une estimation a changé.

---

# Invariants

L'évolution des ressources respecte toujours les règles suivantes.

- Les ressources restent indépendantes du moteur d'apprentissage.
- Les observations ne modifient jamais directement une ressource.
- Les estimations sont ajustées progressivement.
- Les événements restent la seule source de données.
- Toutes les évolutions sont historisées.
- Les suggestions restent explicables.
- Les performances observées ne modifient jamais une Work Unit déjà planifiée.

Ces principes garantissent que le moteur d'apprentissage améliore progressivement la qualité des prévisions sans compromettre la stabilité de la production.

La partie suivante présentera l'intégration des ressources avec les autres composants du KDS ainsi que leur rôle dans l'architecture globale.

---

# Intégration des ressources avec l'architecture globale

Les ressources constituent le dernier maillon de la chaîne de décision.

Elles transforment une planification théorique en production réelle.

Pour conserver une architecture robuste, chaque interaction avec une ressource suit un chemin unique et parfaitement défini.

---

# Vue d'ensemble

```text
Commande

↓

Production Unit

↓

Work Unit

↓

Scheduler

↓

ProductionPlan

↓

Dispatcher

↓

Resource

↓

Execution

↓

Events

↓

Scheduler
```

Cette boucle constitue le cœur du fonctionnement du KDS.

---

# Interaction avec les Work Units

Les ressources n'exécutent jamais une commande.

Elles exécutent exclusivement des Work Units.

Exemple :

```text
Commande

↓

4 pizzas
```

↓

```text
12 Work Units
```

↓

```text
Work Unit

Preparation

↓

Pizzaiolo
```

Chaque ressource travaille uniquement sur l'unité qui lui est attribuée.

---

# Interaction avec les Batchs

Certaines ressources reçoivent directement un Batch.

Exemple :

```text
Batch

↓

Four

↓

4 pizzas
```

Le Batch représente alors une seule affectation.

La ressource n'a pas besoin de connaître les décisions ayant conduit à sa création.

---

# Interaction avec le Dispatcher

Le Dispatcher constitue l'unique point d'entrée des ressources.

Aucune ressource ne reçoit directement une instruction du Scheduler.

```text
Scheduler

↓

Dispatcher

↓

Resource
```

Cette règle est fondamentale.

---

# Interaction avec les événements

Les ressources ne modifient jamais le ProductionPlan.

Elles produisent uniquement des événements.

Exemple :

```text
WorkStarted
```

↓

```text
WorkCompleted
```

↓

```text
ResourceUnavailable
```

↓

```text
ResourceRecovered
```

Le Scheduler décide ensuite s'il doit recalculer un nouveau plan.

---

# Interaction avec les projections

Les projections affichent l'état des ressources.

Exemple :

Projection Four :

```text
Four

Occupé

3 / 4
```

Projection Supervision :

```text
Toutes les ressources

↓

Disponibilité

↓

Occupation

↓

Alertes
```

Les ressources ne connaissent jamais les projections.

---

# Interaction avec les interfaces

Les interfaces permettent uniquement :

- de consulter l'état ;
- de confirmer une action ;
- de signaler un événement.

Les interfaces ne modifient jamais directement une ressource.

---

# Interaction avec les recettes

Les ressources exécutent les recettes.

Elles ne les interprètent pas.

Elles appliquent simplement les opérations décrites.

Ainsi :

```text
Recipe

↓

Operations

↓

Resource

↓

Execution
```

---

# Ressources physiques

Les ressources physiques représentent les capacités réelles.

Exemples :

```text
Pizzaiolo
```

```text
Four
```

```text
Poste Pani'NO
```

```text
Zone de finition
```

Leur disponibilité évolue pendant le service.

---

# Ressources logiques

Certaines ressources ne correspondent pas à un objet physique.

Exemples :

```text
Capacité de stockage
```

```text
Temps de refroidissement
```

```text
Zone d'attente
```

L'architecture autorise leur introduction sans modifier le Scheduler.

---

# Évolutivité

Le modèle de ressources permet d'ajouter facilement :

- un deuxième four ;
- un deuxième pizzaiolo ;
- plusieurs postes de finition ;
- un robot de découpe ;
- une cellule de préparation automatique.

Aucun changement du Scheduler n'est nécessaire.

---

# Multi-sites

À terme,

plusieurs cuisines pourront être représentées.

Exemple :

```text
Cuisine A

↓

Ressources
```

```text
Cuisine B

↓

Ressources
```

Le Dispatcher choisira les ressources appropriées.

Le Scheduler continuera de produire le même ProductionPlan.

---

# Tolérance aux pannes

En cas de panne :

```text
Four

↓

Unavailable

↓

Event

↓

Scheduler

↓

Nouveau ProductionPlan
```

La panne est traitée comme un événement métier.

Le système continue de fonctionner avec les ressources restantes.

---

# Compatibilité avec l'apprentissage

Le moteur d'apprentissage observe :

- les performances ;
- les disponibilités ;
- les temps réels ;
- les interruptions.

Il améliore progressivement les estimations du Scheduler.

Les ressources restent totalement indépendantes de ce moteur.

---

# Vision long terme

À long terme,

les ressources pourront représenter :

- des opérateurs humains ;
- des équipements automatisés ;
- des robots ;
- des systèmes externes ;
- des services distants.

Le reste de l'architecture restera inchangé.

---

# Invariants

L'intégration des ressources respecte toujours les règles suivantes.

- Les ressources exécutent uniquement le travail reçu.
- Les ressources ne dialoguent jamais directement avec le Scheduler.
- Toutes les affectations transitent par le Dispatcher.
- Les ressources produisent uniquement des événements.
- Les interfaces ne modifient jamais directement les ressources.
- Les ressources restent indépendantes des recettes, des projections et du ProductionPlan.
- Une panne est toujours représentée par un événement métier.

Ces principes garantissent une architecture modulaire où les capacités de production peuvent évoluer indépendamment du moteur de planification.

La dernière partie présentera la vision globale des ressources, leur rôle définitif dans le KDS ainsi que les décisions d'architecture retenues.

---

# Vision globale des ressources

Les ressources constituent les capacités d'exécution du KDS.

Elles représentent tout ce qui est capable de transformer un ProductionPlan en production réelle.

Une ressource n'est jamais responsable de la planification.

Elle applique les décisions prises par le Scheduler, transmises par le Dispatcher, puis informe le système de son état au travers d'événements.

Cette séparation garantit une architecture robuste, modulaire et facilement extensible.

---

# Position dans l'architecture

```text
                     Commandes
                          │
                          ▼
                  Production Units
                          │
                          ▼
                     Work Units
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
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
     Pizzaiolo          Four          Poste Pani'NO
          │               │               │
          └───────────────┼───────────────┘
                          ▼
                     Événements
                          │
                          ▼
                      Scheduler
```

Les ressources constituent donc l'interface entre le monde numérique et la production réelle.

---

# Répartition des responsabilités

L'ensemble de l'architecture repose sur une responsabilité unique par composant.

| Composant | Responsabilité |
|-----------|----------------|
| Scheduler | Décider du travail à réaliser. |
| ProductionPlan | Décrire les décisions prises. |
| Dispatcher | Affecter le travail aux ressources. |
| Resource | Exécuter le travail. |
| Recipe | Décrire comment réaliser le travail. |
| Events | Décrire ce qui s'est réellement passé. |

Aucun composant ne doit empiéter sur le rôle d'un autre.

---

# Ce que les ressources apportent

Les ressources permettent :

- d'exécuter les Work Units ;
- de matérialiser les capacités réelles de la cuisine ;
- de mesurer les performances ;
- de détecter les indisponibilités ;
- d'alimenter le moteur d'apprentissage.

Elles constituent le lien entre la planification théorique et la réalité opérationnelle.

---

# Compatibilité avec les évolutions

L'architecture des ressources permet d'introduire progressivement :

## Plusieurs fours

```text
Four 1

Four 2

Four 3
```

Le Scheduler reste inchangé.

---

## Plusieurs pizzaiolos

```text
Pizzaiolo A

Pizzaiolo B

Pizzaiolo C
```

Le Dispatcher répartit simplement les Work Units.

---

## Plusieurs établissements

Chaque établissement possède son propre ensemble de ressources.

Le Scheduler peut continuer à produire des Work Units identiques.

---

## Robotisation

Une ressource peut représenter :

```text
Robot de préparation
```

```text
Robot de découpe
```

```text
Bras automatisé
```

Le reste de l'architecture ne change pas.

---

## Services externes

Une ressource pourra également représenter :

```text
API externe
```

```text
Machine connectée
```

```text
Système de convoyage
```

Le Dispatcher les utilisera exactement comme des ressources classiques.

---

# Compatibilité avec le moteur d'apprentissage

Le moteur d'apprentissage pourra analyser :

- les temps réels ;
- les indisponibilités ;
- les capacités utilisées ;
- les performances globales.

Il ne modifiera jamais directement une ressource.

Il proposera uniquement de meilleures estimations au Scheduler.

---

# Compatibilité avec les simulations

Les ressources pourront être remplacées par des ressources simulées.

Exemple :

```text
Scheduler

↓

Dispatcher

↓

Virtual Oven

↓

Simulation
```

Cette possibilité permettra :

- les tests automatiques ;
- les essais de nouveaux algorithmes ;
- les démonstrations ;
- les formations.

Aucune modification de l'architecture ne sera nécessaire.

---

# Compatibilité avec les statistiques

Toutes les ressources produisent des données exploitables.

Exemples :

- taux d'utilisation ;
- taux d'occupation ;
- nombre de Work Units exécutées ;
- temps moyen par type de travail ;
- durée des indisponibilités.

Ces informations alimentent les tableaux de bord du KDS.

---

# Décisions d'architecture

Les décisions suivantes sont considérées comme définitives.

| ID | Décision |
|----|----------|
| ADR-025 | Une ressource exécute le travail, elle ne le planifie jamais. |
| ADR-026 | Le Dispatcher est le seul composant autorisé à affecter une ressource. |
| ADR-027 | Les ressources ne communiquent jamais directement avec le Scheduler. |
| ADR-028 | Toutes les ressources utilisent la même structure logique. |
| ADR-029 | Les ressources produisent uniquement des événements décrivant leur état. |
| ADR-030 | Les performances des ressources alimentent le moteur d'apprentissage sans modifier directement leur comportement. |
| ADR-031 | Les capacités d'une ressource sont déclaratives et indépendantes de la planification. |
| ADR-032 | Toute évolution des ressources doit rester compatible avec les Work Units, le Dispatcher et le ProductionPlan. |

Ces décisions garantissent une architecture stable et évolutive.

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

Il définit le dernier composant nécessaire à l'exécution concrète des Work Units.

Il ne modifie aucun concept introduit dans les documents précédents.

---

# Vision à long terme

À terme, les ressources formeront un catalogue unique de toutes les capacités de production de l'entreprise.

Qu'elles soient humaines, matérielles, virtuelles ou automatisées, elles seront toutes pilotées de manière identique.

Cette homogénéité permettra au KDS de s'adapter à de nouveaux équipements, à plusieurs cuisines ou à de futurs systèmes robotisés sans remettre en cause le cœur de son architecture.

---

# Conclusion

Les ressources constituent le point de contact entre le moteur de planification et le monde réel.

En les isolant derrière le Dispatcher et en leur attribuant une responsabilité unique — **exécuter le travail** — le KDS obtient une architecture fortement découplée, capable d'évoluer sans réécriture majeure.

Avec les documents :

- **14 — Work Units**
- **15 — Scheduler**
- **16 — ProductionPlan**
- **17 — Recipes**
- **18 — Resources**

le cœur du moteur de production est désormais défini.

Les documents suivants (**19_ARCHITECTURE_EVENTS.md** puis **20_ARCHITECTURE_LEARNING.md**) décriront les deux derniers piliers de l'architecture : les événements qui alimentent le moteur et le système d'apprentissage qui lui permettra de s'améliorer au fil du temps.

---

# Fin du document