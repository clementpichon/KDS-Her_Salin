# 20_ARCHITECTURE_LEARNING.md

# Architecture du moteur d'apprentissage

Version : 1.0

Statut : Architecture cible

---

# Objectif

Le moteur d'apprentissage (Learning Engine) observe le fonctionnement réel du KDS afin d'améliorer progressivement les estimations utilisées par le Scheduler.

Il ne participe jamais directement à la production.

Son rôle est exclusivement analytique.

Le Scheduler reste entièrement capable de fonctionner si le moteur d'apprentissage est arrêté.

Cette indépendance est une propriété fondamentale de l'architecture.

---

# Position dans l'architecture

```text
Resources

↓

Events

↓

Event Store

↓

Learning Engine

↓

Knowledge Base

↓

Scheduler
```

Le moteur n'observe que des événements.

Il ne dialogue jamais directement avec les ressources.

---

# Philosophie

Le Learning Engine observe.

Il apprend.

Il propose.

Le Scheduler décide.

L'humain valide les évolutions métier.

Cette séparation garantit que la production reste toujours stable.

---

# Responsabilités

Le moteur d'apprentissage possède les responsabilités suivantes.

| Responsabilité | Description |
|----------------|-------------|
| Observer | Analyser les événements archivés. |
| Mesurer | Calculer les durées réelles et les écarts. |
| Apprendre | Construire progressivement un modèle statistique. |
| Prédire | Fournir de meilleures estimations au Scheduler. |
| Détecter | Identifier les anomalies et les changements de comportement. |

---

# Ce que le Learning Engine ne fait jamais

Le moteur d'apprentissage :

- ne construit jamais un Batch ;
- ne modifie jamais une Work Unit ;
- ne modifie jamais une recette ;
- ne commande jamais une ressource ;
- ne publie jamais un ProductionPlan.

Toutes ces responsabilités appartiennent au Scheduler.

---

# Définition

Le Learning Engine constitue un composant autonome.

Il peut être :

- démarré ;
- arrêté ;
- remplacé ;
- amélioré ;

sans modifier le reste du KDS.

---

# Structure générale

```text
Learning Engine

├── Data Collector

├── Analyzer

├── Predictor

├── Knowledge Base

├── Model Manager

└── Metrics
```

Chaque composant sera décrit dans la suite du document.

---

# Structure du moteur d'apprentissage

Le Learning Engine est constitué de plusieurs composants spécialisés.

Chaque composant possède une responsabilité unique.

Cette architecture permet de faire évoluer le moteur d'apprentissage sans modifier le Scheduler.

---

# Architecture générale

```text
Learning Engine

├── Data Collector
├── Event Analyzer
├── Statistics Engine
├── Predictor
├── Knowledge Base
├── Model Manager
└── Diagnostics
```

Chaque composant est indépendant.

---

# Data Collector

Le Data Collector constitue le point d'entrée du moteur.

Il lit exclusivement les événements archivés.

```text
Event Store

↓

Data Collector
```

Il ne dialogue jamais directement avec :

- le Scheduler ;
- les ressources ;
- les interfaces.

---

# Responsabilités du Data Collector

Le Data Collector :

- récupère les événements ;
- les valide ;
- les ordonne ;
- les transmet aux composants suivants.

Il ne réalise aucun calcul statistique.

---

# Event Analyzer

L'Event Analyzer transforme les événements bruts en informations exploitables.

Exemple :

```text
WorkStarted

↓

WorkCompleted
```

↓

```text
Durée réelle

58 s
```

Cette transformation simplifie énormément les analyses.

---

# Statistics Engine

Le Statistics Engine calcule les indicateurs.

Exemples :

```text
Temps moyen
```

```text
Temps médian
```

```text
Écart-type
```

```text
Percentiles
```

```text
Distribution
```

Ces statistiques servent ensuite au Predictor.

---

# Predictor

Le Predictor produit les estimations utilisées par le Scheduler.

Exemples :

```text
Préparation

↓

57 s
```

```text
Cuisson

↓

91 s
```

```text
Post-cuisson

↓

42 s
```

Il ne construit jamais de ProductionPlan.

---

# Knowledge Base

La Knowledge Base stocke les connaissances apprises.

Exemple :

```text
Knowledge Base

├── Durées observées
├── Capacités effectives
├── Profils de service
├── Variabilité
└── Historique
```

Cette base représente la mémoire statistique du système.

---

# Model Manager

Le Model Manager gère les différentes versions des modèles.

Exemple :

```text
Model V1
```

↓

```text
Model V2
```

↓

```text
Model V3
```

Chaque modèle reste historisé.

Le Scheduler peut revenir à une version précédente si nécessaire.

---

# Diagnostics

Le module Diagnostics surveille le fonctionnement du moteur.

Exemples :

```text
Nombre d'événements analysés
```

```text
Temps de calcul
```

```text
Qualité des prédictions
```

```text
Écart moyen
```

Ces informations servent uniquement à améliorer le Learning Engine.

---

# Pipeline complet

Le fonctionnement du moteur peut être résumé ainsi.

```text
Events

↓

Data Collector

↓

Event Analyzer

↓

Statistics Engine

↓

Predictor

↓

Knowledge Base

↓

Scheduler
```

Chaque étape est indépendante.

---

# Données utilisées

Le Learning Engine exploite notamment :

- les Work Units ;
- les Batchs ;
- les ressources ;
- les recettes ;
- les événements.

Il ne modifie jamais ces objets.

Il les observe uniquement.

---

# Modèles spécialisés

Le système peut utiliser plusieurs modèles.

Exemples :

```text
Temps préparation
```

```text
Temps cuisson
```

```text
Temps post-cuisson
```

```text
Charge ressources
```

Chaque modèle reste indépendant.

---

# Mise à jour

Les connaissances sont mises à jour progressivement.

Exemple :

```text
Nouveaux événements

↓

Nouvelles statistiques

↓

Nouvelle estimation
```

Aucune mise à jour brutale n'est autorisée.

---

# Persistance

La Knowledge Base est persistée.

Elle peut être sauvegardée,

restaurée,

ou reconstruite intégralement à partir de l'Event Store.

Cette propriété garantit une excellente robustesse.

---

# Compatibilité

Le Scheduler ne dépend jamais de l'implémentation interne du Learning Engine.

Il reçoit uniquement :

```text
Estimated Duration
```

```text
Confidence
```

```text
Prediction Version
```

Le reste demeure entièrement interne au moteur d'apprentissage.

---

# Invariants

Le Learning Engine respecte toujours les règles suivantes.

- Les événements constituent l'unique source d'apprentissage.
- Les statistiques sont dérivées des événements.
- Les prédictions proviennent exclusivement de la Knowledge Base.
- Les modèles sont versionnés.
- Toutes les connaissances sont reconstruisibles depuis l'Event Store.
- Le Scheduler ignore totalement l'architecture interne du moteur.
- Le Learning Engine peut être remplacé sans modifier le reste du KDS.

Ces propriétés garantissent un moteur d'apprentissage robuste, modulaire et capable d'évoluer indépendamment du moteur de production.

La partie suivante décrira les mécanismes d'apprentissage, de prédiction et d'amélioration continue utilisés par le Learning Engine.

---

# Mécanismes d'apprentissage

Le Learning Engine améliore progressivement les estimations du Scheduler.

Son objectif n'est pas de prendre des décisions.

Son objectif est de produire une représentation toujours plus fidèle du fonctionnement réel de la cuisine.

Toutes les connaissances proviennent exclusivement de l'observation.

---

# Cycle d'apprentissage

Le fonctionnement général peut être résumé ainsi.

```text
Production

↓

Événements

↓

Analyse

↓

Connaissances

↓

Prédictions

↓

Scheduler
```

Chaque étape est indépendante.

---

# Observation

Le moteur observe tous les événements archivés.

Exemples :

```text
WorkStarted
```

```text
WorkCompleted
```

```text
BatchCompleted
```

```text
ResourceUnavailable
```

Aucune hypothèse n'est faite avant cette observation.

---

# Mesure

Chaque événement permet de mesurer une propriété.

Exemple :

```text
WorkStarted

↓

19:42:15
```

```text
WorkCompleted

↓

19:43:09
```

↓

```text
Durée réelle

54 s
```

Cette mesure constitue l'information de base.

---

# Agrégation

Les mesures individuelles sont regroupées.

Exemple :

```text
54 s

57 s

55 s

58 s

56 s
```

↓

```text
Temps moyen

56 s
```

Le Scheduler utilise ces données agrégées plutôt que des mesures isolées.

---

# Segmentation

Toutes les productions ne sont pas identiques.

Le moteur peut construire des profils.

Exemple :

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
Très forte affluence
```

```text
Saison estivale
```

Chaque contexte possède progressivement ses propres statistiques.

---

# Pondération temporelle

Les observations récentes sont généralement plus représentatives.

Exemple :

```text
Aujourd'hui

↓

Poids élevé
```

↓

```text
Il y a 2 ans

↓

Poids plus faible
```

Le moteur conserve néanmoins l'historique complet.

---

# Détection des anomalies

Certaines observations ne doivent pas influencer les prédictions.

Exemple :

```text
Préparation

4 min 30
```

causée par :

```text
Panne

↓

Téléphone

↓

Discussion
```

Le moteur identifie progressivement ces valeurs atypiques.

---

# Intervalle de confiance

Une estimation est toujours accompagnée d'un niveau de confiance.

Exemple :

```text
Préparation

56 s
```

↓

```text
Confiance

96 %
```

ou

```text
Confiance

42 %
```

Le Scheduler pourra utiliser cette information lors de ses arbitrages.

---

# Variabilité

Le moteur mesure également la dispersion.

Exemple :

```text
Temps moyen

56 s
```

mais

```text
Écart important
```

↓

Prévision moins fiable.

Deux moyennes identiques ne produisent donc pas nécessairement la même confiance.

---

# Corrélations

Le Learning Engine peut découvrir des relations entre plusieurs facteurs.

Exemples :

```text
Charge élevée

↓

Préparation plus lente
```

```text
Post-cuisson importante

↓

Occupation du four prolongée
```

```text
Grande commande

↓

Temps d'attente supérieur
```

Ces corrélations améliorent progressivement les prévisions.

---

# Prédictions

Le Predictor transforme les connaissances en estimations.

Exemple :

```text
Nouvelle Work Unit

↓

Prévision

58 s
```

Le Scheduler reçoit uniquement cette estimation.

Il ignore totalement son mode de calcul.

---

# Réapprentissage

Le moteur apprend en permanence.

```text
Nouveaux événements

↓

Nouvelles statistiques

↓

Nouvelle prédiction
```

Aucun redémarrage n'est nécessaire.

---

# Régression

Chaque nouvelle version d'un modèle est comparée à la précédente.

Exemple :

```text
Modèle V7

Erreur moyenne

8,2 %
```

↓

```text
Modèle V8

Erreur moyenne

6,9 %
```

Le nouveau modèle est adopté uniquement s'il améliore réellement les prédictions.

---

# Robustesse

Si le Learning Engine est arrêté,

le Scheduler continue de fonctionner.

Il utilise simplement la dernière Knowledge Base validée.

Cette propriété garantit la continuité de la production.

---

# Validation

Avant d'être utilisée,

une nouvelle prédiction est comparée aux données historiques.

Une estimation incohérente est rejetée.

Le moteur privilégie toujours la stabilité à une adaptation trop rapide.

---

# Invariants

Les mécanismes d'apprentissage respectent toujours les règles suivantes.

- L'apprentissage repose exclusivement sur les événements.
- Les observations individuelles sont agrégées avant utilisation.
- Les valeurs atypiques sont traitées séparément.
- Chaque prédiction possède un niveau de confiance.
- Les nouveaux modèles sont validés avant leur utilisation.
- Le Scheduler ne dépend jamais de l'algorithme d'apprentissage.
- La production continue même si le Learning Engine est indisponible.

Ces propriétés garantissent un moteur d'apprentissage fiable, explicable et capable d'améliorer progressivement les performances du KDS sans compromettre sa stabilité.

La partie suivante décrira la Knowledge Base, le versionnement des modèles et la gouvernance des connaissances apprises.

---

# Knowledge Base et gouvernance des connaissances

La Knowledge Base constitue la mémoire du Learning Engine.

Elle ne contient pas les événements.

Elle ne contient pas les Work Units.

Elle contient uniquement les connaissances apprises à partir de ces données.

Cette séparation permet de reconstruire entièrement la Knowledge Base à partir de l'Event Store si nécessaire.

---

# Objectif

La Knowledge Base a pour rôle de centraliser toutes les connaissances utilisées par le Scheduler.

Elle fournit notamment :

- les durées estimées ;
- les capacités observées ;
- les niveaux de confiance ;
- les profils de fonctionnement ;
- les modèles statistiques.

Elle ne contient aucune logique métier.

---

# Position dans l'architecture

```text
Event Store

↓

Learning Engine

↓

Knowledge Base

↓

Scheduler
```

Le Scheduler ne lit jamais directement l'Event Store.

Il consulte uniquement la Knowledge Base.

---

# Structure générale

La Knowledge Base est organisée en plusieurs domaines.

```text
Knowledge Base

├── Duration Models
├── Resource Models
├── Batch Models
├── Demand Models
├── Confidence Models
└── Metadata
```

Chaque domaine possède sa propre responsabilité.

---

# Duration Models

Les modèles de durée décrivent le temps observé pour réaliser une tâche.

Exemple :

```text
Preparation

↓

56 s

↓

Confiance : 95 %
```

ou

```text
Post-cuisson

↓

38 s

↓

Confiance : 88 %
```

Ces modèles sont les plus utilisés par le Scheduler.

---

# Resource Models

Les modèles de ressources décrivent le comportement réel des capacités de production.

Exemples :

- vitesse moyenne ;
- disponibilité observée ;
- capacité effective ;
- taux d'occupation.

Ils permettent d'obtenir des estimations plus réalistes.

---

# Batch Models

Les Batch Models décrivent le comportement des fournées.

Exemples :

```text
4 pizzas

↓

Temps moyen
```

```text
3 pizzas

↓

Temps moyen
```

```text
Mélange de bases

↓

Impact observé
```

Ces modèles améliorent progressivement les prévisions de cuisson.

---

# Demand Models

Le moteur peut apprendre les habitudes de fréquentation.

Exemples :

```text
Vendredi

20 h

↓

Pic d'activité
```

```text
Août

↓

Très forte demande
```

Ces informations permettent au Scheduler d'anticiper certaines situations.

---

# Confidence Models

Chaque connaissance possède un niveau de confiance.

Exemple :

```text
Préparation

↓

56 s

↓

97 %
```

ou

```text
Nouvelle recette

↓

63 s

↓

32 %
```

Le Scheduler peut adapter son comportement selon cette confiance.

---

# Métadonnées

Chaque modèle possède des informations descriptives.

Exemple :

```text
Model

↓

Version

↓

Date

↓

Nombre d'observations

↓

Qualité
```

Ces métadonnées facilitent le suivi des connaissances.

---

# Versionnement

Chaque évolution produit une nouvelle version.

Exemple :

```text
Knowledge Base

V5
```

↓

```text
Knowledge Base

V6
```

Les anciennes versions restent disponibles.

Le Scheduler peut revenir à une version précédente si nécessaire.

---

# Validation

Une nouvelle version n'est jamais utilisée immédiatement.

Le Learning Engine vérifie notamment :

- la cohérence des modèles ;
- la stabilité des prédictions ;
- l'absence de régression.

Une version rejetée n'est jamais publiée.

---

# Publication

Une fois validée,

la nouvelle Knowledge Base devient active.

```text
Validation

↓

Publication

↓

Scheduler
```

Cette publication est atomique.

Le Scheduler ne mélange jamais plusieurs versions.

---

# Reconstruction

La Knowledge Base peut être reconstruite.

```text
Event Store

↓

Replay

↓

Learning Engine

↓

Knowledge Base
```

Cette propriété garantit une excellente robustesse.

---

# Gouvernance

Toute évolution de la Knowledge Base doit être :

- versionnée ;
- historisée ;
- explicable ;
- reproductible.

Aucune connaissance ne doit apparaître sans pouvoir expliquer son origine.

---

# Compatibilité

La structure interne de la Knowledge Base peut évoluer.

En revanche,

l'interface exposée au Scheduler reste stable.

Le Scheduler reçoit toujours :

- une estimation ;
- un niveau de confiance ;
- une version de modèle.

Cette stabilité protège le moteur de production.

---

# Invariants

La Knowledge Base respecte toujours les règles suivantes.

- Les connaissances proviennent exclusivement des événements.
- Les modèles sont reconstruisibles depuis l'Event Store.
- Chaque version est validée avant publication.
- Le Scheduler consulte uniquement la Knowledge Base.
- Les anciennes versions restent disponibles.
- Toutes les connaissances sont traçables.
- La publication est atomique.

Ces principes garantissent une mémoire statistique fiable, reproductible et indépendante du moteur de production.

La partie suivante décrira l'intégration du Learning Engine avec le Scheduler, le ProductionPlan et l'ensemble de l'architecture du KDS.

---

# Intégration du Learning Engine avec le KDS

Le Learning Engine est entièrement découplé du moteur de production.

Il observe le fonctionnement du système.

Il ne participe jamais directement à une décision opérationnelle.

Cette séparation garantit que la production reste stable même en cas de panne ou de remplacement du moteur d'apprentissage.

---

# Vue d'ensemble

```text
               Event Store
                    │
                    ▼
            Learning Engine
                    │
                    ▼
             Knowledge Base
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
                  Events
```

Le flux est à sens unique.

Le Learning Engine ne produit jamais d'événements de production.

---

# Interaction avec l'Event Store

Le Learning Engine lit exclusivement les événements archivés.

```text
Event Store

↓

Learning Engine
```

Il ne reçoit jamais directement les événements temps réel des ressources.

Cette séparation évite toute influence sur la production.

---

# Interaction avec le Scheduler

Le Scheduler consulte uniquement la Knowledge Base.

Il ne connaît pas :

- les algorithmes ;
- les modèles ;
- les statistiques internes.

Il demande simplement :

```text
Estimated Duration
```

```text
Confidence
```

```text
Prediction Version
```

Le Scheduler reste totalement indépendant du moteur.

---

# Interaction avec le ProductionPlan

Le Learning Engine ne modifie jamais un ProductionPlan.

Une fois publié,

un ProductionPlan reste figé.

Les observations réalisées pendant son exécution serviront uniquement aux décisions futures.

---

# Interaction avec les Work Units

Le moteur observe les Work Units terminées.

Il calcule notamment :

- durée réelle ;
- écart avec la prévision ;
- variabilité ;
- contexte d'exécution.

Il ne modifie jamais une Work Unit existante.

---

# Interaction avec les recettes

Le Learning Engine n'altère jamais une recette.

En revanche,

il peut produire des observations telles que :

```text
Post-cuisson

↓

Temps moyen supérieur
```

ou

```text
Nouvelle variante

↓

Confiance faible
```

Ces informations pourront aider à faire évoluer les recettes,

mais aucune modification automatique n'est autorisée.

---

# Interaction avec les ressources

Les ressources produisent des événements.

Le Learning Engine les analyse.

Exemple :

```text
ResourceUnavailable
```

↓

Impact sur les temps

↓

Nouvelle estimation

Les ressources ne connaissent jamais le moteur d'apprentissage.

---

# Interaction avec les Batchs

Le moteur peut analyser :

- le taux de remplissage ;
- les temps de cuisson ;
- les délais d'attente ;
- les changements de Batch.

Exemple :

```text
Batch de 4 pizzas

↓

Temps moyen

91 s
```

Ces données améliorent progressivement les prédictions.

---

# Interaction avec les projections

Les interfaces opérationnelles ne consultent jamais directement le Learning Engine.

Elles utilisent uniquement les décisions du Scheduler.

Des interfaces d'administration pourront en revanche afficher :

- les modèles ;
- les statistiques ;
- les anomalies ;
- les niveaux de confiance.

---

# Interaction avec la supervision

Le module de supervision peut afficher l'état du Learning Engine.

Exemple :

```text
Modèle actif

V8
```

```text
Dernière mise à jour

14:32
```

```text
Confiance moyenne

93 %
```

Ces informations sont destinées à l'administration du système.

---

# Compatibilité multi-sites

Chaque établissement possède sa propre Knowledge Base.

Exemple :

```text
Restaurant Noirmoutier

↓

Knowledge Base A
```

```text
Restaurant Le Mans

↓

Knowledge Base B
```

À terme,

certaines connaissances pourront être mutualisées.

---

# Compatibilité avec les simulations

Le Learning Engine peut être utilisé en mode simulation.

Exemple :

```text
Replay

↓

Learning

↓

Nouveau modèle
```

Aucune donnée de production réelle n'est modifiée.

---

# Compatibilité avec les futures IA

L'architecture permet d'intégrer ultérieurement :

- des modèles prédictifs avancés ;
- des réseaux de neurones ;
- des modèles de séries temporelles ;
- des agents spécialisés.

Le Scheduler continuera de recevoir exactement la même interface.

Cette stabilité protège toute l'architecture.

---

# Compatibilité documentaire

Le Learning Engine complète directement :

- les Events ;
- le Scheduler ;
- le ProductionPlan ;
- les Resources.

Il ne modifie aucun des contrats définis dans les documents précédents.

---

# Invariants

L'intégration du Learning Engine respecte toujours les règles suivantes.

- Le Learning Engine lit uniquement l'Event Store.
- Le Scheduler consulte uniquement la Knowledge Base.
- Aucun ProductionPlan n'est modifié après publication.
- Les recettes restent indépendantes du moteur d'apprentissage.
- Les ressources ignorent totalement l'existence du Learning Engine.
- Les projections opérationnelles n'accèdent jamais directement aux modèles.
- Les futures évolutions du moteur ne modifient jamais son interface publique.

Ces principes garantissent que le Learning Engine reste un composant autonome, remplaçable et entièrement découplé du moteur de production.

La partie suivante présentera la vision globale du moteur d'apprentissage ainsi que les décisions d'architecture retenues pour assurer son évolution à long terme.

---

# Évolution, validation et gouvernance du Learning Engine

Le Learning Engine évolue au fil du temps.

Cependant, cette évolution ne doit jamais compromettre la stabilité du moteur de production.

Toute amélioration suit un processus strict de validation avant d'être utilisée par le Scheduler.

---

# Objectif

La gouvernance du Learning Engine poursuit plusieurs objectifs.

- garantir la stabilité des prédictions ;
- éviter les régressions ;
- assurer une parfaite traçabilité ;
- permettre le retour à une version précédente ;
- maintenir un comportement explicable.

Le moteur doit rester entièrement maîtrisable.

---

# Cycle d'évolution

Chaque évolution suit le cycle suivant.

```text
Nouvelles données

↓

Nouveau modèle

↓

Validation

↓

Comparaison

↓

Publication

↓

Scheduler
```

Aucune nouvelle version n'est utilisée sans validation.

---

# Construction d'un nouveau modèle

Le Learning Engine construit régulièrement un nouveau modèle à partir des événements archivés.

Exemple :

```text
Knowledge Base V8

↓

Nouveaux événements

↓

Knowledge Base V9
```

Cette nouvelle version reste isolée tant qu'elle n'est pas validée.

---

# Validation

Avant toute publication,

le moteur vérifie plusieurs critères.

Exemples :

- cohérence statistique ;
- stabilité des estimations ;
- absence de dérive ;
- qualité des prédictions.

Une seule anomalie peut bloquer la publication.

---

# Comparaison

La nouvelle version est comparée à la version actuellement utilisée.

Exemple :

```text
V8

Erreur moyenne

7,4 %
```

↓

```text
V9

Erreur moyenne

5,9 %
```

Le nouveau modèle doit démontrer une amélioration mesurable.

---

# Régression

Certaines évolutions peuvent détériorer les performances.

Exemple :

```text
Nouvelle estimation

↓

Moins précise
```

Dans ce cas,

la publication est annulée.

La version précédente reste active.

---

# Publication

Lorsqu'un modèle est validé,

la publication est atomique.

```text
Knowledge Base V8

↓

Knowledge Base V9
```

Le Scheduler ne voit jamais une version intermédiaire.

---

# Retour arrière

Une version précédente peut être restaurée.

Exemple :

```text
V9

↓

Incident

↓

Retour V8
```

Cette opération est immédiate.

Aucun réapprentissage n'est nécessaire.

---

# Historique

Toutes les versions restent disponibles.

Exemple :

```text
V5

↓

V6

↓

V7

↓

V8
```

Chaque version possède :

- sa date ;
- son auteur (humain ou système) ;
- ses métriques ;
- son historique de validation.

---

# Explicabilité

Le Learning Engine doit toujours être capable d'expliquer une prédiction.

Exemple :

```text
Préparation

58 s
```

↓

Basée sur :

- 8 426 observations ;
- services estivaux ;
- charge élevée ;
- modèle V8.

Aucune prédiction ne doit être opaque.

---

# Supervision

Le moteur produit ses propres indicateurs.

Exemples :

```text
Précision moyenne
```

```text
Nombre de modèles
```

```text
Confiance moyenne
```

```text
Temps de reconstruction
```

Ces données permettent de suivre l'évolution du Learning Engine.

---

# Gouvernance humaine

Certaines décisions restent exclusivement humaines.

Exemples :

- publication d'un nouveau modèle ;
- suppression d'un modèle ;
- changement de stratégie d'apprentissage ;
- modification des règles métier.

Le Learning Engine ne peut jamais prendre ces décisions seul.

---

# Compatibilité avec les simulations

Avant publication,

un modèle peut être évalué sur des services historiques.

Exemple :

```text
Replay

↓

Scheduler

↓

Comparaison

↓

Validation
```

Cette étape réduit fortement le risque de régression.

---

# Compatibilité avec le Scheduler

Le Scheduler reste indépendant.

Si aucune nouvelle version n'est publiée,

il continue simplement à utiliser la dernière Knowledge Base validée.

Le fonctionnement de la production n'est jamais interrompu.

---

# Gouvernance documentaire

Chaque version publiée doit être documentée.

Elle doit préciser notamment :

- les données utilisées ;
- les améliorations obtenues ;
- les éventuelles limites ;
- les résultats des tests.

Cette documentation facilite le suivi du projet sur plusieurs années.

---

# Invariants

L'évolution du Learning Engine respecte toujours les règles suivantes.

- Toute évolution produit une nouvelle version.
- Chaque version est validée avant publication.
- Le Scheduler utilise toujours une version stable.
- Les anciennes versions restent disponibles.
- Chaque prédiction reste explicable.
- Un retour arrière est toujours possible.
- Les décisions de gouvernance restent sous contrôle humain.

Ces principes garantissent un moteur d'apprentissage fiable, auditable et capable d'évoluer continuellement sans compromettre la stabilité du KDS.

La partie suivante présentera la vision globale du Learning Engine ainsi que son intégration définitive dans l'architecture générale du système.

---

# Vision globale du Learning Engine

Le Learning Engine constitue le seul composant capable d'améliorer progressivement le fonctionnement du KDS.

Contrairement au Scheduler, il ne prend aucune décision opérationnelle.

Contrairement aux Resources, il n'exécute aucun travail.

Contrairement aux Recipes, il ne décrit aucun savoir-faire.

Il transforme simplement l'expérience accumulée en meilleures estimations.

---

# Position dans l'architecture

```text
                Event Store
                     │
                     ▼
             Learning Engine
                     │
                     ▼
              Knowledge Base
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
                   Events
```

Le Learning Engine complète le cycle sans jamais intervenir directement dans la production.

---

# Séparation des responsabilités

Le cœur du KDS repose sur une séparation stricte des responsabilités.

| Composant | Responsabilité |
|-----------|----------------|
| Events | Décrire les faits observés. |
| Learning Engine | Transformer les faits en connaissances. |
| Knowledge Base | Conserver les connaissances validées. |
| Scheduler | Transformer les connaissances en décisions. |
| ProductionPlan | Décrire les décisions prises. |
| Dispatcher | Affecter le travail. |
| Resources | Exécuter le travail. |

Chaque composant possède une responsabilité unique.

---

# Ce que le Learning Engine apporte

Le moteur d'apprentissage permet notamment :

- d'améliorer les estimations de durée ;
- d'anticiper les variations de charge ;
- de mesurer la qualité des prédictions ;
- de détecter les anomalies ;
- d'adapter progressivement les modèles statistiques.

Il augmente la qualité des décisions sans modifier leur logique.

---

# Les connaissances apprises

Au fil du temps,

le Learning Engine construit une véritable mémoire de la production.

Exemples :

```text
Temps moyen

↓

Préparation
```

```text
Temps moyen

↓

Cuisson
```

```text
Temps moyen

↓

Post-cuisson
```

```text
Profils

↓

Vendredi

↓

Samedi

↓

Été

↓

Hiver
```

Toutes ces connaissances restent indépendantes des règles métier.

---

# Compatibilité avec les évolutions

Le moteur permet d'intégrer progressivement :

## Nouveaux produits

Les nouvelles recettes génèrent automatiquement de nouvelles observations.

Le modèle s'enrichit sans modification de l'architecture.

---

## Nouveaux postes

L'ajout d'un poste produit simplement de nouvelles données.

Le Learning Engine adapte progressivement ses estimations.

---

## Nouveaux établissements

Chaque établissement peut posséder :

- sa propre Knowledge Base ;
- ses propres modèles ;
- ses propres statistiques.

Ou partager certaines connaissances avec d'autres établissements.

---

## Nouveaux algorithmes

Le moteur pourra évoluer vers :

- apprentissage statistique avancé ;
- modèles bayésiens ;
- apprentissage par renforcement ;
- réseaux de neurones ;
- modèles hybrides.

Le Scheduler continuera à recevoir exactement la même interface.

---

# Compatibilité avec les simulations

Le Learning Engine peut être entièrement reconstruit.

```text
Replay

↓

Learning

↓

Knowledge Base
```

Cette propriété facilite :

- les essais de nouveaux modèles ;
- les comparaisons ;
- les validations ;
- les démonstrations.

---

# Compatibilité avec les audits

Toutes les connaissances restent explicables.

Pour chaque estimation,

le système peut indiquer :

- les données utilisées ;
- le nombre d'observations ;
- la version du modèle ;
- le niveau de confiance.

Cette transparence est indispensable pour conserver la maîtrise du système.

---

# Décisions d'architecture

Les décisions suivantes sont considérées comme définitives.

| ID | Décision |
|----|----------|
| ADR-041 | Le Learning Engine observe uniquement les événements archivés. |
| ADR-042 | Les connaissances sont stockées dans une Knowledge Base indépendante. |
| ADR-043 | Le Scheduler ne dépend jamais de l'algorithme d'apprentissage. |
| ADR-044 | Toute évolution produit une nouvelle version de la Knowledge Base. |
| ADR-045 | Les modèles doivent rester explicables et traçables. |
| ADR-046 | Le Learning Engine peut être remplacé sans modifier le Scheduler. |
| ADR-047 | Les connaissances sont reconstruisibles à partir de l'Event Store. |
| ADR-048 | Le moteur d'apprentissage ne modifie jamais directement la production. |

Ces décisions garantissent une évolution maîtrisée du système.

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

```text
19_ARCHITECTURE_EVENTS.md
```

Il constitue le dernier pilier du moteur de production.

---

# Vision à long terme

À terme,

le Learning Engine permettra au KDS d'améliorer continuellement ses performances sans remettre en cause son architecture.

Les décisions resteront déterministes.

Les connaissances évolueront progressivement.

Les règles métier resteront sous contrôle humain.

Cette séparation permettra au système de gagner en précision au fil des années tout en conservant une stabilité totale.

---

# Invariants

Le Learning Engine respecte toujours les règles suivantes.

- Il n'intervient jamais directement dans la production.
- Toutes les connaissances proviennent des événements.
- Les modèles sont versionnés.
- Les connaissances restent explicables.
- Le Scheduler reste indépendant des algorithmes utilisés.
- Les modèles sont reconstruisibles.
- La production continue même si le Learning Engine est arrêté.

Ces principes garantissent un système capable d'apprendre continuellement sans compromettre la robustesse du moteur de production.

La dernière partie présentera la conclusion générale du Learning Engine et clôturera l'ensemble de l'architecture du moteur du KDS.

---

# Conclusion générale du Learning Engine

Le Learning Engine constitue le dernier composant du moteur de production du KDS.

Son rôle est unique :

observer la production réelle afin d'améliorer progressivement les estimations utilisées par le Scheduler.

Il ne participe jamais aux décisions opérationnelles.

Il ne remplace jamais les règles métier.

Il représente uniquement la mémoire statistique du système.

---

# Position dans l'architecture complète

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
                          Recipes
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
                           Events
                             │
                             ▼
                        Event Store
                             │
                             ▼
                     Learning Engine
                             │
                             ▼
                      Knowledge Base
                             │
                             └──────────────► Scheduler
```

Le moteur d'apprentissage ferme la boucle sans jamais intervenir directement dans la production.

---

# Vision globale du moteur du KDS

L'architecture complète repose sur huit composants majeurs.

| Composant | Responsabilité |
|-----------|----------------|
| Production Unit | Décrire le produit à fabriquer. |
| Work Unit | Décrire le travail planifiable. |
| Recipe | Décrire la manière d'exécuter ce travail. |
| Scheduler | Décider du meilleur ordre d'exécution. |
| ProductionPlan | Représenter la décision du Scheduler. |
| Dispatcher | Affecter les Work Units aux ressources. |
| Resource | Réaliser physiquement le travail. |
| Event | Décrire ce qui s'est réellement produit. |
| Learning Engine | Transformer l'expérience en connaissances. |

Chaque composant possède une responsabilité unique.

---

# Principes fondateurs

L'ensemble du moteur repose sur quelques principes simples.

## Séparation des responsabilités

Chaque composant possède une mission précise.

Aucun composant ne réalise le travail d'un autre.

---

## Architecture événementielle

Toutes les informations circulent sous forme d'événements.

Les composants restent découplés.

Ils peuvent évoluer indépendamment.

---

## Décisions déterministes

Le Scheduler reste entièrement déterministe.

À partir d'un même état,

il produit toujours le même ProductionPlan.

Le Learning Engine améliore les estimations,

jamais la logique décisionnelle.

---

## Apprentissage progressif

Les connaissances évoluent progressivement.

Aucune modification brutale n'est autorisée.

Toutes les évolutions sont :

- mesurées ;
- validées ;
- historisées ;
- explicables.

---

## Tolérance aux pannes

Chaque composant peut être arrêté indépendamment.

Exemple :

```text
Learning indisponible

↓

Scheduler continue
```

ou

```text
Supervision indisponible

↓

Production continue
```

Cette propriété garantit une excellente robustesse.

---

# Décisions d'architecture finales

Les décisions suivantes concluent définitivement l'architecture du moteur.

| ID | Décision |
|----|----------|
| ADR-049 | Le moteur de production est entièrement piloté par les événements. |
| ADR-050 | Le Scheduler est le seul composant autorisé à prendre des décisions de planification. |
| ADR-051 | Les Recipes décrivent uniquement le savoir-faire métier. |
| ADR-052 | Les Resources exécutent uniquement le travail qui leur est affecté. |
| ADR-053 | Le ProductionPlan représente uniquement l'état courant de la production. |
| ADR-054 | Le Learning Engine améliore exclusivement les estimations utilisées par le Scheduler. |
| ADR-055 | Tous les composants sont remplaçables indépendamment grâce à des contrats stables. |
| ADR-056 | L'architecture doit rester compatible avec une évolution progressive, sans réécriture complète du système. |

Ces ADR constituent le socle technique du KDS.

---

# Compatibilité avec les évolutions futures

Cette architecture permet d'intégrer sans remise en cause du cœur du moteur :

- plusieurs cuisines ;
- plusieurs établissements ;
- plusieurs Schedulers spécialisés ;
- de nouveaux types de ressources ;
- de nouvelles recettes ;
- des robots de production ;
- des systèmes de commande en ligne ;
- des bornes interactives ;
- des outils de supervision avancés ;
- de nouveaux moteurs d'intelligence artificielle.

Toutes ces évolutions s'appuieront sur les mêmes contrats d'architecture.

---

# Compatibilité documentaire

Les documents suivants constituent désormais le référentiel d'architecture du moteur.

```text
13_ARCHITECTURE_WORKFLOWS.md
14_ARCHITECTURE_WORK_UNITS.md
15_ARCHITECTURE_SCHEDULER.md
16_ARCHITECTURE_PRODUCTION_PLAN.md
17_ARCHITECTURE_RECIPES.md
18_ARCHITECTURE_RESOURCES.md
19_ARCHITECTURE_EVENTS.md
20_ARCHITECTURE_LEARNING.md
```

Ils définissent les fondations techniques du KDS.

Les documents suivants porteront principalement sur :

- les projections (interfaces utilisateurs) ;
- les protocoles de communication ;
- les API ;
- le Proxy ;
- les modèles de données ;
- les règles métier détaillées ;
- les tests d'acceptation ;
- le déploiement.

---

# Vision finale

Le KDS n'est pas un simple système d'affichage de commandes.

Il constitue un moteur de pilotage de production capable de :

- comprendre les commandes ;
- planifier intelligemment le travail ;
- coordonner les ressources ;
- assister les opérateurs ;
- mesurer les performances ;
- apprendre de l'expérience ;
- améliorer progressivement ses estimations.

Cette architecture permet de construire un système :

- robuste ;
- modulaire ;
- explicable ;
- testable ;
- évolutif ;
- durable.

Elle constitue une base solide pour accompagner la croissance de la pizzeria, puis son extension éventuelle à plusieurs établissements ou à d'autres activités de restauration.

---

# Fin du document

**Fin du noyau d'architecture du KDS.**