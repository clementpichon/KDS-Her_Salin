# 15_ARCHITECTURE_SCHEDULER.md

# Architecture du Scheduler

Version : 1.0

Statut : Architecture cible

---

# Objectif

Le Scheduler constitue le cœur décisionnel du KDS.

Il est responsable de transformer un ensemble de besoins de production en un plan d'exécution cohérent, stable et optimisé.

Son objectif n'est pas uniquement de produire rapidement.

Il doit produire intelligemment.

Chaque décision doit chercher le meilleur compromis entre :

- le respect des créneaux clients ;
- l'optimisation du débit ;
- la réduction de la charge mentale ;
- l'utilisation des ressources disponibles ;
- la stabilité du plan de production.

Le Scheduler représente donc le cerveau du KDS.

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
               ┌──────────────┐
               │  Scheduler   │
               └──────────────┘
                      │
                      ▼
                  Batchs
                      │
                      ▼
                Dispatcher
                      │
                      ▼
                 Ressources
```

Le Scheduler ne pilote jamais directement les ressources.

Il produit un plan.

Le Dispatcher exécute ce plan.

---

# Responsabilités

Le Scheduler possède les responsabilités suivantes.

| Responsabilité | Description |
|----------------|-------------|
| Construire le plan de production | Déterminer l'ordre d'exécution des Work Units. |
| Calculer les priorités | Déterminer quelles Work Units doivent être exécutées avant les autres. |
| Constituer les Batchs | Regrouper les Work Units compatibles. |
| Prévoir les horaires | Estimer les heures de début et de fin. |
| Détecter les conflits | Identifier les conflits de ressources ou de délais. |
| Réoptimiser | Adapter le plan lorsque le contexte évolue. |
| Expliquer ses décisions | Fournir une justification lisible pour chaque décision importante. |

---

# Ce que le Scheduler ne fait jamais

Le Scheduler ne doit jamais :

- préparer un produit ;
- lancer une cuisson ;
- choisir une recette ;
- modifier un Batch verrouillé ;
- modifier une Work Unit engagée ;
- piloter une interface utilisateur ;
- dialoguer directement avec Supabase ;
- afficher des informations à l'écran.

Ces responsabilités appartiennent à d'autres composants.

---

# Entrées

Le Scheduler travaille exclusivement à partir d'informations métier.

Entrées principales :

```text
Production Units

↓

Work Units

↓

Workflow

↓

Ressources disponibles

↓

Batchs existants

↓

Événements

↓

Heure courante

↓

Règles métier
```

Aucune information provenant directement de l'interface graphique ne doit influencer ses décisions.

---

# Sorties

Le Scheduler produit :

```text
Priorités

↓

Batchs projetés

↓

Heures estimées

↓

Raisons d'attente

↓

Réservations proposées

↓

Plan de production
```

Ces résultats sont ensuite exploités par le Dispatcher et par les différents postes du KDS.

---

# Philosophie

Le Scheduler ne cherche jamais la perfection.

Il cherche la meilleure décision possible au moment où il calcule.

Deux principes guident toutes ses décisions :

## 1. Une bonne décision maintenant vaut mieux qu'une décision parfaite trop tard.

## 2. Une décision stable vaut souvent mieux qu'une décision légèrement meilleure mais qui bouleverse constamment le plan de travail.

Cette stabilité est essentielle pour limiter la charge mentale des opérateurs.

---

# Le Scheduler est déterministe

Le Scheduler doit être entièrement déterministe.

À données identiques :

```text
Entrées identiques

↓

Calcul

↓

Résultat identique
```

Deux calculs successifs ne doivent jamais produire deux plans différents si aucune donnée n'a changé.

Cette propriété est indispensable pour :

- les tests unitaires ;
- les simulations ;
- le débogage ;
- la confiance des utilisateurs.

---

# Le Scheduler est incrémental

Le Scheduler ne reconstruit jamais tout le plan.

Il ne recalcule que les éléments réellement impactés.

Exemple :

```text
Nouvelle commande

↓

Analyse des impacts

↓

Recalcul local

↓

Mise à jour du plan
```

Cette approche permet :

- des calculs rapides ;
- une meilleure stabilité ;
- moins de changements visibles.

---

# Les trois horizons temporels

Le Scheduler distingue toujours trois horizons.

```text
Passé

Présent

Futur
```

Le passé est figé.

Le présent est engagé.

Le futur reste optimisable.

Cette distinction est fondamentale.

Elle interdit toute modification silencieuse d'un travail déjà commencé.

---

# Les trois niveaux de décision

Toutes les décisions du Scheduler appartiennent à l'un des trois niveaux suivants.

## Niveau 1

Décisions stratégiques.

Exemple :

- attendre une commande probable ;
- repousser une fournée ;
- absorber une surcharge.

---

## Niveau 2

Décisions tactiques.

Exemple :

- constituer une fournée ;
- choisir une priorité ;
- répartir la charge.

---

## Niveau 3

Décisions opérationnelles.

Exemple :

- ordonner les Work Units ;
- estimer une heure ;
- produire un Batch projeté.

Les niveaux supérieurs ne doivent jamais être influencés par des considérations de bas niveau.

---

# Vision générale

Le Scheduler n'est pas un simple algorithme de tri.

Il constitue un moteur de décision.

Son rôle est d'observer en permanence l'état de la production, d'anticiper les conséquences de chaque choix et de proposer le plan offrant le meilleur équilibre entre rapidité, stabilité et qualité de service.

La partie suivante décrit le pipeline complet de décision utilisé par le Scheduler.

---

# Pipeline de décision

Le Scheduler ne prend jamais une décision unique.

Chaque calcul suit un pipeline composé d'étapes successives.

Chaque étape possède :

- une responsabilité unique ;
- des entrées clairement définies ;
- des sorties clairement définies.

Cette architecture facilite :

- les tests unitaires ;
- le débogage ;
- l'évolution du moteur.

---

# Vue d'ensemble

```text
                    Scheduler

                         │
                         ▼

            Collecte des informations

                         │
                         ▼

             Construction du contexte

                         │
                         ▼

          Construction des Work Units

                         │
                         ▼

         Résolution des dépendances

                         │
                         ▼

          Calcul des priorités métier

                         │
                         ▼

         Constitution des Batchs projetés

                         │
                         ▼

      Vérification des ressources disponibles

                         │
                         ▼

        Estimation des heures prévisionnelles

                         │
                         ▼

          Détection des conflits éventuels

                         │
                         ▼

             Optimisation locale du plan

                         │
                         ▼

               Publication du résultat
```

Chaque étape possède une responsabilité indépendante.

Aucune étape ne doit connaître l'implémentation interne des autres.

---

# Étape 1 — Collecte des informations

Objectif :

Construire une photographie cohérente de l'état actuel.

Entrées :

- Production Units
- Work Units
- Batchs
- Ressources
- Événements
- Heure actuelle

Sortie :

```text
SchedulerContext
```

Le contexte est immuable pendant toute la durée du calcul.

Le Scheduler ne travaille jamais sur des données qui changent pendant son exécution.

---

# Étape 2 — Construction du contexte

Le contexte rassemble toutes les informations nécessaires.

Exemple :

```text
SchedulerContext

├── currentTime
├── productionUnits
├── workUnits
├── batches
├── resources
├── events
├── businessRules
└── predictions
```

Toutes les étapes suivantes utilisent exclusivement cet objet.

---

# Étape 3 — Construction des Work Units

Les nouvelles commandes sont transformées en Work Units.

Exemple :

```text
Commande

↓

Regina ×2

↓

PU-001

PU-002

↓

Preparation

Cooking

Finishing
```

À ce stade :

aucune priorité n'est encore calculée.

---

# Étape 4 — Résolution des dépendances

Chaque Work Unit est analysée.

Objectifs :

- vérifier les prérequis ;
- détecter les blocages ;
- déterminer les Work Units Ready.

Exemple :

```text
Preparation

Completed

↓

Cooking

Ready
```

Une Work Unit dont une dépendance manque reste :

```text
Pending
```

---

# Étape 5 — Calcul des priorités

Le Scheduler calcule ensuite un score.

Ce score ne représente pas uniquement l'urgence.

Il combine plusieurs critères.

Exemple :

```text
PriorityScore

=

Deadline

+

BatchScore

+

ResourceScore

+

WorkflowScore

+

BusinessScore
```

La formule exacte pourra évoluer.

Les critères resteront indépendants.

---

# Principe

Chaque critère produit un score.

Les scores sont ensuite agrégés.

Exemple :

```text
Deadline

85
```

```text
Batch

20
```

```text
Workflow

15
```

```text
Resource

5
```

↓

```text
Total

125
```

Cette approche permet de faire évoluer les pondérations sans modifier toute l'architecture.

---

# Étape 6 — Constitution des Batchs

Les Work Units compatibles sont regroupées.

Exemple :

```text
Cooking

↓

Regina

↓

Four

```

```text
Cooking

↓

Margherita

↓

Four
```

↓

```text
Batch

4 / 4
```

Le Scheduler cherche toujours à produire les regroupements les plus pertinents.

---

# Objectifs de constitution

Par ordre décroissant :

1. éviter les retards ;

2. remplir les ressources ;

3. limiter les changements ;

4. réduire les temps morts ;

5. réduire les manipulations.

L'algorithme ne cherche jamais uniquement à remplir un Batch.

---

# Étape 7 — Vérification des ressources

Les Batchs projetés sont confrontés aux ressources disponibles.

Exemple :

```text
Batch Four

↓

Four principal

↓

Disponible
```

ou

```text
↓

Attente
```

Le Scheduler ne réserve jamais directement une ressource.

Il vérifie uniquement la faisabilité.

---

# Étape 8 — Estimation des horaires

Chaque Work Unit reçoit :

```text
EstimatedStart

EstimatedEnd
```

Ces valeurs sont calculées à partir :

- des dépendances ;
- des ressources ;
- des Batchs ;
- des durées estimées.

Ces horaires restent prévisionnels.

---

# Étape 9 — Détection des conflits

Le Scheduler recherche ensuite les incohérences.

Exemples :

```text
Deux Batchs

↓

Même four

↓

Même heure
```

ou

```text
Retard inévitable
```

ou

```text
Ressource saturée
```

Chaque conflit est identifié avant la publication du plan.

---

# Étape 10 — Optimisation locale

Le Scheduler tente ensuite d'améliorer le plan.

Exemples :

- compléter une fournée ;

- inverser deux Work Units ;

- déplacer légèrement une préparation ;

- réduire un temps d'attente.

Une optimisation n'est conservée que si elle améliore réellement le résultat.

---

# Principe de stabilité

Une amélioration très faible ne justifie pas un changement important.

Exemple :

```text
Gain

3 secondes
```

↓

mais

```text
5 Batchs modifiés
```

↓

Refusé.

Le moteur privilégie la stabilité.

---

# Publication

Une fois le calcul terminé,

le Scheduler publie :

```text
PlanResult
```

Ce résultat contient notamment :

```text
Planned Work Units

Projected Batchs

Priority Scores

Estimated Times

Waiting Reasons

Conflicts
```

Le Dispatcher pourra ensuite utiliser ce résultat.

---

# Recalcul

Le pipeline est relancé uniquement lorsqu'un événement significatif survient.

Exemples :

- nouvelle commande ;
- Batch verrouillé ;
- Work Unit terminée ;
- ressource indisponible ;
- annulation.

Le Scheduler n'effectue jamais de recalcul permanent.

Il fonctionne sur événements.

---

# Garanties

Chaque exécution du pipeline garantit :

✓ aucune modification du passé ;

✓ aucune modification d'une Work Unit engagée ;

✓ cohérence des dépendances ;

✓ Batchs compatibles ;

✓ plan entièrement explicable ;

✓ résultat déterministe.

Ces garanties constituent le contrat principal du Scheduler.

La partie suivante détaillera le calcul des priorités, qui représente le cœur de la prise de décision.

---

# Calcul des priorités

Le calcul des priorités constitue le cœur du Scheduler.

Il détermine quelles Work Units doivent être exécutées avant les autres.

Contrairement à un simple tri chronologique, le Scheduler évalue simultanément plusieurs critères métier.

L'objectif n'est pas de trouver la Work Unit "la plus urgente".

L'objectif est de produire le meilleur plan de production.

---

# Philosophie

Une priorité n'est jamais absolue.

Elle représente uniquement une aide à la décision.

Deux Work Units très proches peuvent être inversées si cette inversion améliore :

- le débit ;
- la stabilité ;
- l'utilisation des ressources ;
- le respect des engagements.

Le Scheduler raisonne toujours à l'échelle du système.

Jamais à l'échelle d'une seule pizza.

---

# Principe général

Chaque Work Unit reçoit un ensemble de scores indépendants.

```text
WU

↓

Deadline Score

↓

Workflow Score

↓

Batch Score

↓

Resource Score

↓

Business Score

↓

Learning Score

↓

Priority Score
```

Chaque score est calculé indépendamment.

Cette séparation facilite :

- les tests ;
- les ajustements ;
- les futures évolutions.

---

# Deadline Score

Le premier critère est le temps restant avant la remise.

Plus une Work Unit risque de provoquer un retard,

plus son score augmente.

Exemple :

```text
Commande

Dans 45 min

↓

Score faible
```

```text
Commande

Dans 6 min

↓

Score élevé
```

Le Scheduler ne regarde jamais uniquement l'heure de remise.

Il compare :

- le temps restant ;
- le temps de production estimé.

---

# Workflow Score

Toutes les Work Units n'ont pas le même impact.

Certaines débloquent immédiatement plusieurs autres étapes.

Exemple :

```text
Preparation

↓

Cooking

↓

Finishing
```

Retarder la préparation retarde tout le workflow.

Le Scheduler favorise donc les Work Units qui débloquent le plus de travail.

---

# Batch Score

Le Batch Score mesure l'intérêt collectif.

Exemple :

```text
3 pizzas

↓

Four

↓

+1 pizza

↓

4 / 4
```

Compléter une fournée procure un gain important.

À l'inverse :

```text
1 pizza

↓

Four

↓

1 / 4
```

génère un faible score.

Le Batch Score permet de raisonner à l'échelle de la fournée plutôt qu'à l'échelle de la pizza.

---

# Resource Score

Certaines ressources sont rares.

Exemple :

```text
1 four

2 pizzaiolos
```

Le Scheduler évite qu'une ressource rare reste inutilisée.

Le Resource Score favorise les décisions qui améliorent l'utilisation des ressources critiques.

---

# Business Score

Certaines règles métier restent prioritaires.

Exemples :

- terminer une commande déjà commencée ;
- éviter une commande incomplète ;
- limiter les changements de base ;
- éviter une pizza isolée dans une future fournée.

Ces règles produisent un score spécifique.

Elles restent indépendantes des autres critères.

---

# Learning Score

Le moteur d'apprentissage peut ajuster certains scores.

Exemple :

Une Work Unit estimée à :

```text
90 secondes
```

nécessite en réalité :

```text
130 secondes
```

Le Scheduler peut alors augmenter progressivement sa priorité.

L'apprentissage ne modifie jamais directement les règles métier.

Il améliore uniquement la qualité des estimations.

---

# Agrégation

Tous les scores sont ensuite agrégés.

```text
Deadline

+

Workflow

+

Batch

+

Resource

+

Business

+

Learning

↓

Priority Score
```

Le Scheduler classe ensuite les Work Units selon ce résultat.

---

# Les pondérations

Chaque score possède une pondération.

Exemple :

```text
Deadline

★★★★★
```

```text
Batch

★★★★☆
```

```text
Workflow

★★★☆☆
```

Les valeurs exactes ne sont volontairement pas figées dans cette documentation.

Elles pourront évoluer après les phases de tests.

---

# Priorité individuelle

Le Scheduler calcule une priorité individuelle.

Exemple :

```text
Preparation

PU-042

↓

132
```

Cette priorité concerne uniquement cette Work Unit.

---

# Priorité collective

Le Scheduler calcule également une priorité collective.

Exemple :

```text
Batch

↓

4 pizzas

↓

Score global
```

Il est parfois préférable de retarder légèrement une Work Unit très prioritaire afin d'obtenir un Batch beaucoup plus performant.

Cette décision reste acceptable si elle ne crée aucun retard.

---

# Priorité dynamique

Une priorité évolue constamment.

Elle est recalculée à chaque événement important.

Exemple :

```text
Nouvelle commande

↓

Priorités recalculées
```

```text
Four libre

↓

Priorités recalculées
```

```text
Work Unit terminée

↓

Priorités recalculées
```

Le Scheduler ne conserve jamais un score obsolète.

---

# Vieillissement

Une Work Unit qui attend voit progressivement sa priorité augmenter.

Ce mécanisme évite qu'une Work Unit reste bloquée indéfiniment.

Le vieillissement reste progressif.

Il ne doit jamais provoquer des changements brutaux.

---

# Priorités interdites

Le Scheduler ne peut jamais :

- interrompre une Work Unit engagée ;
- modifier un Batch verrouillé ;
- ignorer une dépendance ;
- créer une priorité incohérente avec les règles métier.

Ces interdictions sont absolues.

---

# Arbitrage

Lorsque deux Work Units possèdent un score très proche,

le Scheduler applique des critères secondaires.

Ordre recommandé :

1. respecter les engagements client ;

2. terminer les commandes déjà commencées ;

3. compléter les Batchs ;

4. limiter les changements de base ;

5. conserver la stabilité du plan ;

6. respecter l'ordre chronologique.

Cet ordre d'arbitrage doit rester identique dans toutes les implémentations.

---

# Explicabilité

Chaque priorité doit pouvoir être expliquée.

Exemple :

```text
Preparation PU-042

Priorité : 186

Raisons :

+ Commande proche du retard

+ Complète une fournée

+ Débloque deux Work Units

- Ressource momentanément occupée
```

Le Scheduler ne doit jamais produire un score incompréhensible.

Toutes les décisions importantes doivent être justifiables.

---

# Résultat

À la fin de cette étape,

le Scheduler possède une liste totalement ordonnée de Work Units.

Cette liste ne constitue pas encore le plan définitif.

Elle sert de base à la construction des Batchs et à la planification temporelle, qui seront décrites dans la partie suivante.

---

# Constitution des Batchs

La constitution des Batchs est l'une des responsabilités majeures du Scheduler.

Elle consiste à transformer une liste ordonnée de Work Units en groupes cohérents pouvant être exécutés ensemble.

Le Scheduler ne cherche jamais uniquement à remplir une ressource.

Il cherche à produire le meilleur compromis entre :

- débit ;
- stabilité ;
- qualité de service ;
- charge mentale ;
- efficacité des ressources.

---

# Définition

Un Batch est un regroupement temporaire de Work Units compatibles.

Exemple :

```text
Batch Four

├── Cooking PU-041
├── Cooking PU-042
├── Cooking PU-043
└── Cooking PU-044
```

Les Work Units conservent leur identité.

Le Batch ne représente que leur exécution simultanée.

---

# Conditions de compatibilité

Deux Work Units ne peuvent appartenir au même Batch que si toutes les conditions suivantes sont réunies.

| Condition | Description |
|-----------|-------------|
| Même type | Exemple : Cooking. |
| Même famille de ressource | Exemple : Four. |
| État Ready | Les dépendances doivent être satisfaites. |
| Compatibilité métier | Les règles métier ne doivent pas l'interdire. |

La recette n'intervient jamais dans cette décision.

---

# Objectifs de constitution

Le Scheduler applique toujours les objectifs suivants.

Par ordre décroissant.

## 1. Éviter un retard client

Aucun regroupement ne doit provoquer un retard évitable.

---

## 2. Maximiser l'utilisation des ressources

Exemple :

```text
4 / 4

✓
```

est préférable à

```text
2 / 4

✗
```

si cela ne crée aucun retard.

---

## 3. Limiter les Batchs résiduels

Le Scheduler cherche à éviter :

```text
4 / 4

↓

1 / 4
```

au profit de

```text
3 / 4

↓

2 / 4
```

si cette répartition améliore le débit global.

---

## 4. Réduire les changements

Exemple :

```text
Tomate

↓

Tomate

↓

Tomate

↓

Crème
```

est généralement préférable à

```text
Tomate

↓

Crème

↓

Tomate

↓

Crème
```

Cette règle réduit la charge cognitive du pizzaiolo.

---

## 5. Préserver la stabilité

Un Batch déjà projeté ne doit pas être entièrement reconstruit à chaque nouveau calcul.

Le Scheduler modifie uniquement ce qui apporte un bénéfice significatif.

---

# Fenêtre de regroupement

Le Scheduler ne regarde jamais uniquement les Work Units immédiatement disponibles.

Il observe une fenêtre de planification.

Exemple :

```text
Ready

+

Presque Ready

+

Arrivée imminente
```

Cette fenêtre permet de décider s'il est préférable :

- d'attendre quelques secondes ;
- ou de lancer immédiatement un Batch.

---

# Attente volontaire

Le Scheduler peut volontairement attendre.

Exemple :

```text
3 pizzas

↓

Four
```

↓

Attente estimée :

```text
40 secondes
```

↓

Une quatrième pizza devient Ready.

↓

```text
4 / 4
```

Cette attente est acceptable si :

- elle ne crée aucun retard ;
- elle améliore significativement le Batch.

---

# Attente interdite

Le Scheduler ne peut jamais attendre si cette attente entraîne :

- un retard client ;
- une rupture des règles métier ;
- une surcharge future plus importante.

Dans ces cas, le Batch doit être lancé immédiatement.

---

# Batch projeté

Avant verrouillage, un Batch reste entièrement virtuel.

Il peut être :

- complété ;
- réduit ;
- supprimé ;
- fusionné.

Cette souplesse est indispensable pour conserver un moteur performant.

---

# Batch verrouillé

Lorsqu'un Batch devient Locked :

```text
Projected

↓

Locked
```

sa composition devient immuable.

Le Scheduler peut encore recalculer le reste du plan.

Il ne peut plus modifier ce Batch.

---

# Exemple

Situation initiale :

```text
Batch A

4 / 4
```

```text
Batch B

2 / 4
```

Deux nouvelles pizzas deviennent Ready.

Le Scheduler transforme :

```text
Batch B

2 / 4
```

en

```text
Batch B

4 / 4
```

Cette modification reste autorisée tant que Batch B n'est pas verrouillé.

---

# Évaluation d'un Batch

Chaque Batch reçoit un score.

Exemple :

```text
Batch Score

=

Capacity

+

Deadline

+

Stability

+

Business

+

Resource
```

Le Scheduler compare ensuite plusieurs compositions possibles.

Il retient celle présentant le meilleur score global.

---

# Exemple de comparaison

Option A

```text
4 / 4

Départ immédiat
```

Option B

```text
3 / 4

Départ immédiat

+

4 / 4

30 secondes plus tard
```

Le Scheduler compare :

- les retards ;
- les attentes ;
- le débit ;
- la stabilité.

La décision retenue dépend du score global.

---

# Batchs concurrents

Deux Batchs peuvent être en concurrence pour une même ressource.

Exemple :

```text
Batch Pizza
```

↓

Four

↑

```text
Batch Calzone
```

Le Scheduler choisit celui dont le bénéfice global est le plus élevé.

Il ne travaille jamais selon la règle :

> premier arrivé, premier servi.

---

# Batchs incomplets

Un Batch incomplet n'est pas nécessairement mauvais.

Exemple :

```text
1 / 4
```

peut être la meilleure décision si :

- une commande devient urgente ;
- aucune autre pizza compatible n'arrive ;
- attendre provoquerait un retard.

Le Scheduler privilégie toujours le service client.

---

# Batchs mixtes

Le moteur doit accepter des Batchs contenant des produits différents.

Exemple :

```text
Regina

Margherita

Chèvre miel

Napolitaine
```

La compatibilité est définie par les règles métier.

Jamais par le nom commercial du produit.

---

# Limites

Le Scheduler ne doit jamais :

- dépasser la capacité d'une ressource ;
- ignorer une incompatibilité ;
- créer une Work Unit supplémentaire pour compléter artificiellement un Batch ;
- déplacer une Work Unit engagée.

---

# Résultat

À la fin de cette étape, le Scheduler possède :

- une liste de Batchs projetés ;
- leur composition ;
- leur ordre d'exécution ;
- leur score global.

Ces informations seront ensuite utilisées pour construire le planning temporel et détecter les conflits de production, qui seront étudiés dans la partie suivante.

---

# Planification temporelle

Une fois les Batchs constitués, le Scheduler doit construire un planning temporel.

Ce planning répond à une question simple :

> À quel moment chaque Work Unit doit-elle commencer ?

L'objectif n'est pas uniquement de respecter les créneaux clients.

Le planning doit également :

- lisser la charge ;
- éviter les périodes d'inactivité ;
- limiter les attentes inutiles ;
- conserver une marge de réoptimisation.

---

# Les trois notions de temps

Le Scheduler distingue systématiquement trois notions.

```text
Temps estimé

↓

Temps planifié

↓

Temps réel
```

Ces trois valeurs ne doivent jamais être confondues.

---

## Temps estimé

Le temps estimé correspond à la durée théorique d'une Work Unit.

Exemple :

```text
Preparation

↓

90 s
```

Cette valeur provient :

- des recettes ;
- du moteur d'apprentissage ;
- des statistiques.

---

## Temps planifié

Le temps planifié est calculé par le Scheduler.

Exemple :

```text
Début

19:24:30

Fin

19:26:00
```

Il s'agit d'une prévision.

---

## Temps réel

Le temps réel correspond à l'exécution effective.

Exemple :

```text
Début

19:25:12

Fin

19:27:08
```

Le moteur compare ensuite :

```text
Réel

VS

Prévu
```

pour améliorer ses estimations futures.

---

# Construction du planning

Le Scheduler procède de proche en proche.

```text
Work Unit

↓

Dépendances

↓

Disponibilité ressource

↓

Batch

↓

Créneau

↓

Planning
```

Chaque étape réduit progressivement les possibilités.

---

# Marge de sécurité

Chaque planning conserve une marge.

Exemple :

Commande prévue :

```text
20:00
```

Le Scheduler peut viser :

```text
19:57
```

afin d'absorber :

- une erreur ;
- une attente ;
- une reprise ;
- un imprévu.

Cette marge est dynamique.

---

# Fenêtre de planification

Le Scheduler ne cherche pas à planifier toute la soirée.

Il travaille sur une fenêtre glissante.

Exemple :

```text
Maintenant

↓

+30 minutes
```

Les éléments plus éloignés restent indicatifs.

Cette approche limite les recalculs inutiles.

---

# Plan figé

Une partie du planning devient progressivement figée.

```text
Passé

██████████

Présent

████

Futur

░░░░░░░░░
```

Le Scheduler peut uniquement modifier :

```text
░░░░░░░░░
```

Cette règle garantit la stabilité du travail.

---

# Réoptimisation

Le Scheduler réoptimise uniquement le futur.

Exemple :

```text
Nouvelle commande

↓

Analyse

↓

Modification locale

↓

Nouveau planning
```

Le passé reste inchangé.

Le présent reste engagé.

---

# Gestion des retards

Le Scheduler distingue trois situations.

## Retard évitable

Le moteur peut modifier le planning pour éviter le retard.

Une réoptimisation est déclenchée.

---

## Retard probable

Le retard semble difficile à éviter.

Le Scheduler tente :

- une meilleure utilisation des ressources ;
- une modification des Batchs ;
- une réorganisation locale.

---

## Retard inévitable

Le moteur estime qu'aucune planification réaliste ne permet d'éviter le retard.

Dans ce cas :

- le planning reste optimisé ;
- le retard est assumé ;
- les explications sont conservées.

Le Scheduler ne cherche jamais à masquer un retard.

---

# Conflits

Un conflit apparaît lorsque deux décisions deviennent incompatibles.

Exemples :

```text
Deux Batchs

↓

Même four

↓

Même heure
```

ou

```text
Même ressource

↓

Deux Work Units

↓

Même instant
```

Les conflits sont détectés avant la publication du plan.

---

# Résolution des conflits

Le Scheduler applique toujours la même stratégie.

1. supprimer les impossibilités ;

2. respecter les engagements clients ;

3. conserver les décisions déjà engagées ;

4. limiter les modifications du planning ;

5. optimiser le débit.

Cette hiérarchie reste fixe.

---

# Raisons d'attente

Une Work Unit peut rester Ready sans être immédiatement exécutée.

Le Scheduler doit toujours produire une raison explicite.

Exemples :

```text
WAITING_BATCH
```

```text
WAITING_RESOURCE
```

```text
WAITING_TARGET_TIME
```

```text
WAITING_DEPENDENCY
```

```text
WAITING_OPERATOR
```

Ces raisons sont utilisées par les interfaces du KDS.

---

# Raisons de réoptimisation

Le Scheduler conserve également la cause de chaque recalcul.

Exemples :

```text
NEW_ORDER
```

```text
RESOURCE_UNAVAILABLE
```

```text
WORK_COMPLETED
```

```text
ORDER_CANCELLED
```

```text
LEARNING_UPDATE
```

Cette traçabilité facilite énormément le diagnostic.

---

# Plan candidat

Avant publication,

le Scheduler produit un **Plan candidat**.

Ce plan contient :

- les horaires ;
- les Batchs ;
- les priorités ;
- les attentes.

Le moteur peut produire plusieurs plans candidats.

Exemple :

```text
Plan A

↓

Départ immédiat
```

```text
Plan B

↓

Attendre 45 s
```

```text
Plan C

↓

Modifier une fournée
```

Chaque plan reçoit ensuite un score global.

Le meilleur devient le plan publié.

Cette approche remplace progressivement une logique de décisions isolées par une logique de comparaison de scénarios.

---

# Publication

Une fois le meilleur plan retenu,

le Scheduler publie un objet unique.

```text
ProductionPlan
```

Il contient notamment :

```text
Current Plan

Projected Batchs

Planned Work Units

Estimated Times

Priority Details

Waiting Reasons

Detected Conflicts
```

Tous les autres composants utilisent exclusivement cet objet.

---

# Invariants

Le planning publié doit toujours respecter les règles suivantes.

- Aucun conflit de ressource.
- Aucune dépendance violée.
- Aucun Batch dépassant sa capacité.
- Aucune Work Unit engagée déplacée.
- Aucun horaire incohérent.
- Toutes les décisions sont explicables.
- Tous les recalculs sont traçables.

Ces invariants garantissent la cohérence du moteur de planification.

La partie suivante détaillera l'interaction entre le Scheduler, le Dispatcher et les autres composants du KDS.

---

# Interaction avec le Dispatcher

Le Scheduler et le Dispatcher constituent deux composants distincts.

Leur séparation est volontaire.

Le Scheduler décide :

> Quel travail doit être réalisé ?

Le Dispatcher décide :

> Où et par qui ce travail sera réalisé ?

Cette distinction permet de faire évoluer les ressources sans modifier la logique de planification.

---

# Contrat d'interface

Le Scheduler ne communique jamais directement avec les ressources.

Il produit un unique objet :

```text
ProductionPlan
```

Le Dispatcher lit ce plan et réalise les affectations nécessaires.

Le Scheduler ne reçoit jamais de retour direct des ressources.

Il reçoit uniquement des événements.

---

# Cycle d'interaction

```text
ProductionPlan

        │

        ▼

Dispatcher

        │

        ▼

Réservations

        │

        ▼

Exécution

        │

        ▼

Événements

        │

        ▼

Scheduler
```

Cette boucle constitue le cycle normal de fonctionnement.

---

# Réservations

Avant qu'une Work Unit ne commence réellement,

le Dispatcher réserve les ressources nécessaires.

Exemple :

```text
Work Unit

↓

Cooking

↓

Four principal

↓

1 emplacement réservé
```

Cette réservation empêche une autre Work Unit d'utiliser la même capacité.

---

# Validation

Le Dispatcher vérifie :

- que la ressource existe ;
- qu'elle est disponible ;
- qu'elle possède la capacité suffisante ;
- qu'elle est compatible avec la Work Unit.

En cas d'échec,

aucune décision locale n'est prise.

Le Dispatcher produit simplement un événement.

---

# Exemple

```text
Four principal

↓

Maintenance
```

↓

```text
ResourceUnavailable
```

↓

```text
Scheduler
```

Le Scheduler produit alors un nouveau ProductionPlan.

---

# Le Dispatcher ne planifie jamais

Cette règle est absolue.

Le Dispatcher ne peut jamais :

- modifier une priorité ;
- déplacer une Work Unit ;
- créer un Batch ;
- supprimer un Batch ;
- changer un horaire.

Il applique exclusivement le ProductionPlan.

---

# Les postes du KDS

Les postes ne dialoguent jamais directement avec le Scheduler.

Ils lisent uniquement le ProductionPlan.

Exemple :

```text
Scheduler

↓

ProductionPlan

↓

Poste Four
```

ou

```text
Scheduler

↓

ProductionPlan

↓

Poste Pizzaiolo
```

Chaque poste extrait uniquement les informations qui le concernent.

---

# Le ProductionPlan

Le ProductionPlan devient la seule représentation publique de la planification.

Il contient notamment :

```text
Work Units

Batchs

Estimated Times

Waiting Reasons

Priorities

Assignments

Alerts
```

Les composants externes ne doivent jamais reconstruire leur propre vision du planning.

---

# Responsabilités des postes

Chaque poste possède une responsabilité unique.

## Poste Caisse

Consulte :

- les créneaux ;
- les estimations ;
- les alertes.

Ne modifie jamais la planification.

---

## Poste Pizzaiolo

Consulte :

- les Work Units de préparation ;
- les Batchs projetés ;
- les priorités.

Produit :

```text
WorkStarted

WorkCompleted
```

---

## Poste Four

Consulte :

- les Batchs ;
- les cuissons ;
- les post-cuissons.

Produit :

```text
BatchLocked

BatchCompleted
```

---

## Poste Pani'NO

Consulte :

- les Work Units d'assemblage.

Produit :

```text
WorkCompleted
```

---

## Poste Prêtes

Consulte :

- les Production Units terminées.

Produit :

```text
OrderDelivered
```

---

# Communication

Tous les échanges passent par des événements.

Exemple :

```text
Pizzaiolo

↓

WorkCompleted

↓

Scheduler

↓

ProductionPlan

↓

Four
```

Les postes ne communiquent jamais directement entre eux.

Cette architecture réduit fortement le couplage.

---

# Réoptimisation

Lorsqu'un événement est reçu,

le Scheduler décide si une réoptimisation est nécessaire.

Exemple :

```text
WorkCompleted

↓

Impact ?

↓

Oui

↓

Nouveau ProductionPlan
```

ou

```text
↓

Non

↓

Aucun recalcul
```

Le Scheduler évite ainsi les recalculs inutiles.

---

# Explicabilité

Le ProductionPlan doit conserver les raisons ayant conduit aux décisions.

Exemple :

```text
Batch

↓

Attente

↓

Reason

WAITING_BATCH_COMPLETION
```

ou

```text
Priority

↓

Reason

AVOID_LATE_ORDER
```

Les interfaces ne recalculent jamais ces informations.

---

# Tolérance aux erreurs

Le Scheduler considère les événements comme la source de vérité.

Si un poste disparaît temporairement,

le moteur conserve l'état courant.

À la reconnexion,

le poste recharge simplement le dernier ProductionPlan.

Aucune logique particulière n'est nécessaire dans l'interface.

---

# Synchronisation

Le Scheduler ne pousse jamais des modifications partielles.

Il publie toujours un ProductionPlan cohérent.

Chaque publication représente un instant logique de la planification.

Les postes passent alors atomiquement :

```text
Plan N

↓

Plan N+1
```

Cette approche évite les incohérences visuelles.

---

# Invariants

Les échanges entre le Scheduler et les autres composants doivent toujours respecter les règles suivantes.

- Une seule source de vérité : le ProductionPlan.
- Les postes sont des consommateurs du plan.
- Le Dispatcher est un exécutant.
- Les ressources ne décident jamais.
- Les événements sont la seule source de retour.
- Aucune interface ne modifie directement la planification.

Ces invariants garantissent une architecture faiblement couplée, facilement testable et évolutive.

La partie suivante présentera les invariants globaux du Scheduler ainsi que les exigences de performance et les scénarios de validation.

---

# Invariants du Scheduler

Les invariants constituent le contrat de fonctionnement du Scheduler.

Ils représentent les propriétés qui doivent toujours rester vraies, indépendamment des évolutions futures du moteur.

Toute implémentation du Scheduler devra respecter ces invariants.

---

# Invariant 1 — Déterminisme

À état identique,

le Scheduler doit toujours produire exactement le même ProductionPlan.

```text
Entrées identiques

↓

Même ProductionPlan
```

Aucun comportement aléatoire n'est autorisé.

---

# Invariant 2 — Immutabilité du passé

Une décision déjà exécutée ne peut jamais être modifiée.

```text
Completed

↓

Immuable
```

Le Scheduler travaille exclusivement sur le futur.

---

# Invariant 3 — Immutabilité du présent

Une Work Unit engagée ne peut jamais être déplacée.

Exemple :

```text
Preparation

In Progress
```

↓

Interdiction de :

- changer de Batch ;
- changer de ressource ;
- modifier son ordre.

---

# Invariant 4 — Respect des dépendances

Aucune Work Unit ne peut commencer si une dépendance n'est pas satisfaite.

Exemple :

```text
Preparation

↓

Cooking
```

Cooking ne pourra jamais devenir :

```text
In Progress
```

tant que :

```text
Preparation

Completed
```

n'est pas vrai.

---

# Invariant 5 — Unicité

Une Work Unit ne peut appartenir qu'à un seul Batch.

Exemple interdit :

```text
WU-042

↓

Batch A

↓

Batch B
```

Cette situation ne doit jamais exister.

---

# Invariant 6 — Cohérence des ressources

Le Scheduler ne peut jamais produire un ProductionPlan nécessitant une capacité inexistante.

Exemple interdit :

```text
Four

Capacité

4
```

↓

```text
Batch

5 pizzas
```

---

# Invariant 7 — Explicabilité

Chaque décision importante doit être justifiable.

Exemple :

```text
Pourquoi attendre ?

↓

WAITING_BATCH
```

```text
Pourquoi cette priorité ?

↓

COMPLETE_BATCH
```

Aucune décision ne doit être impossible à expliquer.

---

# Invariant 8 — Une seule source de vérité

Le ProductionPlan représente l'unique sortie officielle du Scheduler.

Les autres composants ne reconstruisent jamais leur propre planning.

---

# Invariant 9 — Calcul incrémental

Le Scheduler ne recalcule jamais inutilement tout le système.

Seules les parties impactées sont réévaluées.

Cette règle garantit :

- de bonnes performances ;
- une grande stabilité.

---

# Invariant 10 — Aucune connaissance de l'interface

Le Scheduler ignore totalement :

- React ;
- Supabase ;
- les composants visuels ;
- les tablettes ;
- les écrans.

Il manipule uniquement des objets métier.

---

# Performances attendues

Le Scheduler doit rester suffisamment rapide pour être utilisé en temps réel.

Objectifs :

| Élément | Objectif |
|---------|----------|
| Nouveau calcul | < 100 ms |
| Réoptimisation locale | < 50 ms |
| Publication d'un ProductionPlan | instantanée |
| Aucun blocage visible de l'interface | obligatoire |

Ces valeurs représentent des objectifs d'architecture.

Elles pourront être ajustées après les premiers tests.

---

# Testabilité

Chaque étape du Scheduler doit pouvoir être testée indépendamment.

Exemple :

```text
Priority Engine
```

↓

Tests unitaires.

```text
Batch Builder
```

↓

Tests unitaires.

```text
Planning Engine
```

↓

Tests unitaires.

Le Scheduler ne doit jamais constituer un bloc monolithique impossible à tester.

---

# Jeux de tests

Les scénarios suivants devront exister.

## Cas simples

- une pizza ;
- deux pizzas ;
- une commande complète.

---

## Batchs

- 4/4 ;
- 3/4 ;
- 2/4 ;
- Batch verrouillé ;
- Batch projeté.

---

## Dépendances

- workflow linéaire ;
- workflow parallèle ;
- dépendance manquante.

---

## Ressources

- four disponible ;
- four saturé ;
- four indisponible.

---

## Retards

- retard évitable ;
- retard probable ;
- retard inévitable.

---

## Réoptimisation

- nouvelle commande ;
- annulation ;
- panne ressource ;
- fin de cuisson.

---

# Scénarios extrêmes

Le Scheduler doit également être testé avec :

- plusieurs dizaines de commandes simultanées ;
- plusieurs centaines de Work Units ;
- plusieurs ressources identiques ;
- plusieurs Batchs concurrents.

L'objectif est de garantir que le comportement reste stable quelle que soit la charge.

---

# Débogage

Le Scheduler doit produire des informations de diagnostic.

Exemple :

```text
Scheduler Run

Run #284

Duration

14 ms

Modified Work Units

12

Modified Batchs

2

Reason

NEW_ORDER
```

Ces informations faciliteront énormément le développement.

---

# Journalisation

Chaque exécution importante pourra être historisée.

Exemple :

```text
Run

↓

Inputs

↓

Plan

↓

Reason

↓

Duration
```

Cette journalisation permettra :

- la reproduction des bugs ;
- les comparaisons de versions ;
- les simulations.

---

# Mode Simulation

Le Scheduler devra pouvoir fonctionner sans agir sur le système réel.

Exemple :

```text
Simulation

↓

Nouveau ProductionPlan

↓

Aucune publication
```

Ce mode permettra :

- les essais ;
- les comparaisons ;
- l'entraînement ;
- les tests automatiques.

---

# Objectif final

Le Scheduler doit devenir un moteur :

- déterministe ;
- incrémental ;
- explicable ;
- performant ;
- testable ;
- prédictible.

Ces propriétés sont plus importantes que la sophistication des algorithmes.

Une architecture simple, stable et compréhensible restera toujours préférable à une optimisation complexe mais difficile à maintenir.

La dernière partie du document présentera la vision d'ensemble du Scheduler, son évolution future et son rôle dans l'architecture globale du KDS.

---

# Vision d'ensemble

Le Scheduler constitue le composant central du moteur de production.

Son rôle est de transformer un ensemble de besoins métier en un plan d'exécution cohérent, stable et optimisé.

Il ne prépare jamais les produits.

Il ne pilote jamais les interfaces.

Il ne contrôle jamais directement les ressources.

Il décide uniquement :

- quoi faire ;
- quand le faire ;
- dans quel ordre ;
- avec quel niveau de priorité.

Toutes les autres décisions découlent de ce plan.

---

# Architecture finale

```text
                         Commandes
                              │
                              ▼
                     Production Units
                              │
                              ▼
                        Workflows
                              │
                              ▼
                        Work Units
                              │
                              ▼
                    ┌─────────────────┐
                    │    Scheduler    │
                    └─────────────────┘
                              │
                    ProductionPlan
                              │
             ┌────────────────┼────────────────┐
             ▼                ▼                ▼
       Dispatcher        Poste Four      Poste Pizzaiolo
             │                                 │
             ▼                                 ▼
         Ressources                      Événements
             └───────────────┬─────────────────┘
                             ▼
                         Scheduler
```

Cette architecture repose sur une boucle événementielle.

Le Scheduler ne travaille jamais en continu.

Il réagit uniquement aux événements significatifs.

---

# Cycle de vie

Le fonctionnement complet du Scheduler peut être résumé ainsi.

```text
Réception d'un événement

↓

Construction du contexte

↓

Calcul des priorités

↓

Construction des Batchs

↓

Construction du planning

↓

Production du ProductionPlan

↓

Publication

↓

Attente d'un nouvel événement
```

Chaque cycle est totalement indépendant du précédent.

Le Scheduler ne conserve aucun état caché entre deux calculs.

---

# Résumé des responsabilités

| Composant | Responsabilité |
|-----------|----------------|
| Scheduler | Construire le ProductionPlan. |
| Dispatcher | Affecter les ressources. |
| Ressources | Exécuter le travail. |
| Postes | Afficher le ProductionPlan et produire des événements. |
| Événements | Décrire les faits réellement survenus. |

Cette répartition limite fortement le couplage entre les composants.

---

# Principes fondamentaux

Toute évolution future devra respecter les principes suivants.

## Le Scheduler décide.

Il ne réalise jamais le travail.

---

## Le Dispatcher exécute.

Il ne prend jamais de décision métier.

---

## Les ressources produisent.

Elles ne planifient jamais.

---

## Les postes observent.

Ils n'organisent jamais la production.

---

## Les événements racontent.

Ils ne prennent aucune décision.

---

## Le ProductionPlan représente l'unique vérité de la planification.

Toutes les interfaces lisent le même plan.

---

# Évolutions prévues

Cette architecture permet d'introduire progressivement :

## Plusieurs fours

Le Scheduler continuera à produire les mêmes Work Units.

Le Dispatcher répartira automatiquement les Batchs.

---

## Plusieurs pizzaiolos

Les Work Units pourront être distribuées entre plusieurs opérateurs sans modifier le Scheduler.

---

## Plusieurs cuisines

Le Dispatcher pourra affecter un Batch à une cuisine différente.

Le Scheduler restera inchangé.

---

## Nouveaux produits

Ajouter un produit reviendra uniquement à :

- créer une recette ;
- définir un workflow.

Aucune modification du Scheduler ne devra être nécessaire.

---

## Intelligence artificielle

Le moteur d'apprentissage pourra améliorer :

- les durées ;
- les prédictions ;
- les priorités.

Il ne remplacera jamais les règles métier.

Le Scheduler restera le seul décideur.

---

# Ce que cette architecture apporte

Par rapport au moteur actuel, cette architecture introduit :

- une séparation claire des responsabilités ;
- une planification explicable ;
- des objets métier indépendants ;
- une forte testabilité ;
- une évolution progressive sans réécriture.

Elle prépare également le projet à une croissance importante.

---

# Stratégie de migration

La migration devra être réalisée progressivement.

Ordre recommandé :

```text
1

Production Units
```

↓

```text
2

Work Units
```

↓

```text
3

Scheduler
```

↓

```text
4

ProductionPlan
```

↓

```text
5

Dispatcher
```

↓

```text
6

Migration des postes
```

Chaque étape devra être :

- développée ;
- testée ;
- validée ;
- déployée ;

avant de commencer la suivante.

---

# Critères de validation

Le Scheduler sera considéré comme conforme lorsque les conditions suivantes seront réunies.

## Fonctionnelles

- toutes les règles métier existantes sont respectées ;
- les Work Units sont correctement générées ;
- les Batchs sont cohérents ;
- les créneaux restent réalistes.

---

## Techniques

- le Scheduler est déterministe ;
- les calculs sont incrémentaux ;
- les interfaces restent fluides ;
- le ProductionPlan est cohérent.

---

## Métier

- diminution de la charge mentale ;
- meilleure anticipation des fournées ;
- réduction des attentes inutiles ;
- meilleure stabilité du service.

---

# Conclusion

Le Scheduler constitue le cœur du futur moteur KDS.

Son rôle n'est pas simplement de classer des commandes.

Il construit une représentation complète de la production à partir des Work Units, des contraintes métier et des ressources disponibles.

Cette architecture fournit un cadre suffisamment générique pour accompagner les évolutions futures du projet tout en restant compatible avec les documents d'architecture précédents.

Les documents suivants détailleront les composants qui gravitent autour du Scheduler :

- les recettes ;
- les ressources ;
- les événements ;
- le moteur d'apprentissage ;
- la stratégie de migration.

Ensemble, ils constitueront l'architecture complète du moteur de production du KDS.

---

# Décisions d'architecture (ADR)

Les décisions suivantes sont considérées comme structurantes pour le projet.

| ID | Décision |
|----|----------|
| ADR-001 | Le Scheduler est le seul composant autorisé à construire un ProductionPlan. |
| ADR-002 | Le ProductionPlan constitue l'unique vue publique de la planification. |
| ADR-003 | Les postes ne communiquent jamais directement entre eux. |
| ADR-004 | Toutes les interactions passent par des événements métier. |
| ADR-005 | Les Batchs sont construits par le Scheduler, jamais par les postes. |
| ADR-006 | Une décision engagée ne peut jamais être modifiée automatiquement. |
| ADR-007 | Les recettes décrivent le savoir-faire, jamais la planification. |
| ADR-008 | Les ressources exécutent, elles ne décident jamais. |

Ces ADR devront rester compatibles avec tous les futurs développements.

---

# Fin du document