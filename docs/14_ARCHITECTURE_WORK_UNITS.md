# 14_ARCHITECTURE_WORK_UNITS.md

# Architecture des Work Units

Version : 1.0

Statut : Architecture cible

---

# Objectif

Ce document définit le modèle de production du KDS.

Il introduit les deux concepts fondamentaux qui serviront de base à l'ensemble du moteur de planification :

- la **Production Unit** ;
- la **Work Unit**.

L'objectif est de séparer complètement :

- la représentation commerciale d'une commande ;
- la représentation physique des produits à fabriquer ;
- les tâches réellement exécutées par la cuisine.

Cette séparation permet au moteur de raisonner sur le travail à effectuer plutôt que sur les tickets de caisse.

Elle constitue la base de toute l'évolution future du KDS.

---

# Philosophie générale

Le KDS ne doit jamais piloter des commandes.

Il doit piloter de la production.

Une commande représente un engagement commercial envers un client.

La production représente les actions nécessaires pour satisfaire cet engagement.

Le moteur ne doit donc jamais répondre à la question :

> Quelle commande dois-je préparer ?

Il doit répondre à une autre question :

> Quel travail dois-je réaliser maintenant ?

Cette différence paraît faible.

En réalité, elle change complètement l'architecture.

---

# Hiérarchie du modèle

Le modèle de production est organisé selon la hiérarchie suivante.

```text
Commande

↓

Article commercial

↓

Production Unit

↓

Workflow

↓

Work Units

↓

Recette

↓

Opérations
```

Chaque niveau possède une responsabilité unique.

Aucun niveau ne doit reproduire les responsabilités d'un autre.

---

# La commande

La commande reste un objet purement commercial.

Elle contient notamment :

- le client ;
- l'heure de remise ;
- le canal de vente ;
- les remarques ;
- les articles commandés.

La commande n'est jamais utilisée directement pour organiser le travail de la cuisine.

Elle sert uniquement de point d'entrée.

---

# Les articles commerciaux

Chaque ligne de commande représente un article commercial.

Exemple :

```text
Regina ×2

Fish & NO ×1

Pani'NO Burger ×1
```

Ces lignes décrivent uniquement ce que le client achète.

Elles ne décrivent pas encore le travail à réaliser.

---

# Pourquoi les articles commerciaux ne suffisent pas

Prenons l'exemple suivant.

```text
Regina ×4
```

Pour le logiciel de caisse, cette ligne est suffisante.

Pour la cuisine, elle ne l'est pas.

En réalité, quatre pizzas distinctes devront être :

- préparées ;
- enfournées ;
- éventuellement réparties dans plusieurs fournées ;
- terminées ;
- remises au client.

Le moteur doit pouvoir suivre chacune de ces pizzas individuellement.

---

# Production Unit

La Production Unit représente un produit physique unique.

Une pizza.

Un Fish & NO.

Un Pani'NO.

Une portion de frites.

Une boisson préparée.

Une Production Unit ne représente jamais une quantité.

Elle représente toujours une unité physique.

Exemple :

```text
Commande

↓

Regina ×4

↓

Production Units

PU-001

PU-002

PU-003

PU-004
```

Les quatre pizzas deviennent indépendantes.

---

# Pourquoi individualiser les produits

Cette individualisation répond à de nombreux cas réels.

Exemple :

```text
PU-001

Prête
```

```text
PU-002

Au four
```

```text
PU-003

En préparation
```

```text
PU-004

Pas encore commencée
```

Avec un modèle basé uniquement sur une quantité :

```text
Regina ×4
```

une telle situation serait impossible à représenter proprement.

---

# Responsabilité d'une Production Unit

Une Production Unit répond uniquement à la question suivante :

> Où en est exactement ce produit ?

Elle ne répond pas :

- qui le prépare ;
- comment il est préparé ;
- quand il sera lancé au four.

Ces décisions appartiennent à d'autres composants.

---

# Informations portées par une Production Unit

Une Production Unit possède notamment :

- un identifiant unique ;
- une commande d'origine ;
- un article commercial d'origine ;
- une définition produit ;
- les personnalisations demandées ;
- une heure cible de disponibilité ;
- un état global ;
- un historique.

Elle ne contient jamais les opérations détaillées de préparation.

---

# Heure cible

Chaque Production Unit possède une heure de disponibilité attendue.

Cette heure correspond au moment où le produit doit être prêt à être remis au client.

Elle ne correspond pas :

- au début de préparation ;
- à la mise au four ;
- à la sortie du four.

Elle représente uniquement le résultat attendu.

Le Scheduler déterminera ensuite les moments optimaux pour produire cette unité.

---

# État global

Chaque Production Unit possède un état global.

Exemples :

```text
Created

In production

Ready

Failed

Cancelled

Delivered
```

Cet état résume la situation générale du produit.

Il est calculé à partir de l'avancement réel de sa production.

Il ne remplace pas les états détaillés des Work Units.

---

# Workflow

Chaque Production Unit suit un workflow.

Le workflow décrit les étapes nécessaires pour fabriquer ce produit.

Exemple simplifié :

```text
Préparation

↓

Cuisson

↓

Post-cuisson

↓

Produit prêt
```

Toutes les Production Units ne possèdent pas forcément le même workflow.

Une Margherita et un Fish & NO ne suivent pas exactement les mêmes étapes.

Le moteur ne doit donc jamais supposer qu'un produit suit un parcours fixe.

Le workflow dépend du produit concerné.

---

# Définition du workflow

Le workflow est un modèle.

Il décrit les étapes possibles.

Il ne représente pas une exécution réelle.

Lorsqu'une Production Unit est créée, le système instancie le workflow correspondant.

Cette instanciation produit les Work Units qui seront réellement planifiées.

---

# Le workflow est un graphe

Le workflow n'est pas obligatoirement une simple suite linéaire.

Certaines productions comportent plusieurs branches parallèles.

Exemple :

```text
Cuisson poisson

──────────────┐

              │

              ▼

          Assemblage

              ▲

              │

Cuisson grenailles

──────────────┘
```

Le modèle doit donc accepter les dépendances multiples.

Chaque étape peut dépendre :

- d'une étape unique ;
- de plusieurs étapes ;
- d'aucune étape.

Cette représentation permet de décrire l'ensemble des produits actuels sans créer de cas particuliers.

---

# Work Unit

Une Work Unit représente une tâche élémentaire de production.

Elle constitue l'unité de travail manipulée par le Scheduler.

Une Work Unit est :

- planifiable ;
- attribuable ;
- mesurable ;
- exécutable ;
- traçable.

Elle représente un objectif concret de production.

Exemples :

- préparer une pizza ;
- cuire une pizza ;
- effectuer une post-cuisson ;
- assembler un Fish & NO ;
- mettre un produit en boîte.

La suite du document décrit précisément le fonctionnement des Work Units.

---

# Types de Work Units

Une Work Unit ne représente jamais un produit.

Elle représente un travail.

Cette distinction est essentielle.

Une même Work Unit peut être utilisée par plusieurs familles de produits.

Exemple :

```text
Work Unit

Cooking
```

Cette Work Unit peut correspondre à :

- la cuisson d'une pizza ;
- la cuisson d'un poisson ;
- la cuisson de frites ;
- la cuisson d'un Pani'NO.

Le comportement concret dépend ensuite :

- de la Production Unit ;
- de la recette ;
- du profil d'exécution.

Le Scheduler n'a donc pas besoin de connaître les produits.

Il manipule uniquement des Work Units.

---

# Typologie des Work Units

Le KDS utilise des types génériques de Work Units.

Ces types décrivent la nature du travail.

Exemple :

```text
Preparation

Cooking

Finishing

Assembly

Packaging

QualityControl

Handover
```

Cette liste reste volontairement réduite.

Elle permet au Scheduler de raisonner sur des catégories de travail plutôt que sur des centaines de tâches spécifiques.

---

# Exemple

Une Chèvre miel pourra produire :

```text
Preparation

↓

Cooking

↓

Finishing
```

Une Margherita :

```text
Preparation

↓

Cooking

↓

Packaging
```

Un Fish & NO :

```text
Preparation

↓

Cooking Fish

──────────────┐

              ▼

          Assembly

              ▲

──────────────┘

Cooking Potatoes
```

Le Scheduler manipule toujours des Work Units.

La recette décrit ensuite comment réaliser chacune d'elles.

---

# Les Work Units ne connaissent pas la recette

Une Work Unit décrit uniquement :

> le résultat attendu.

Elle ne décrit jamais :

- les ingrédients ;
- les gestes ;
- les quantités ;
- les opérations détaillées.

Par exemple :

```text
Work Unit

Preparation
```

ne signifie pas :

```text
prendre un pâton

étaler la pâte

mettre la crème

mettre la mozzarella
```

Ces opérations appartiennent exclusivement à la recette.

Cette séparation permet de modifier une recette sans modifier le moteur.

---

# Informations minimales d'une Work Unit

Chaque Work Unit possède au minimum :

```text
id

productionUnitId

workflowNodeId

type

status

priority

estimatedDuration

executionProfileId

createdAt

updatedAt
```

Des informations supplémentaires pourront être ajoutées selon les besoins.

Par exemple :

```text
plannedStartAt

plannedEndAt

actualStartAt

actualEndAt

batchId

assignedResourceId

holdReason

failureReason
```

Ces informations ne sont pas toutes obligatoires lors de la première migration.

---

# Cycle de vie

Une Work Unit suit toujours le même cycle.

```text
Pending

↓

Ready

↓

Reserved

↓

In Progress

↓

Completed
```

Des états exceptionnels existent également.

```text
Blocked

Failed

Cancelled
```

Chaque transition possède une signification métier précise.

---

## Pending

La Work Unit existe.

Elle ne peut cependant pas encore commencer.

Au moins une dépendance n'est pas satisfaite.

Exemple :

```text
Cuisson

↓

attend

↓

Préparation
```

La cuisson reste Pending tant que la préparation n'est pas terminée.

---

## Ready

Toutes les dépendances sont satisfaites.

La Work Unit peut commencer.

Attention :

Ready ne signifie pas :

> commencer immédiatement.

Le Scheduler peut volontairement attendre.

Exemple :

Deux pizzas sont prêtes.

Le four possède quatre places.

Le Scheduler préfère attendre quelques instants afin de compléter la fournée.

Les deux Work Units restent donc Ready.

---

## Reserved

La Work Unit possède déjà les ressources nécessaires.

Exemple :

Le Scheduler réserve :

- une place dans une fournée ;
- une ressource ;
- un créneau.

Le travail n'a pas encore commencé.

Cet état évite qu'une autre décision utilise les mêmes ressources.

---

## In Progress

Le travail physique a commencé.

À partir de cet instant :

la Work Unit devient engagée.

Le Scheduler ne doit plus modifier silencieusement sa planification.

C'est un principe fondamental de l'architecture.

---

## Completed

Le résultat attendu est obtenu.

La Work Unit est terminée.

Les Work Units dépendantes peuvent maintenant devenir Ready.

---

## Blocked

Une Work Unit peut être temporairement bloquée.

Exemples :

- attente d'une ressource ;
- panne ;
- ingrédient manquant ;
- validation opérateur.

Blocked n'est pas un échec.

Le travail reprendra dès que le blocage disparaîtra.

---

## Failed

Le travail a été tenté.

Le résultat obtenu est incorrect.

Exemples :

- pizza brûlée ;
- poisson tombé ;
- erreur de préparation.

Une Work Unit Failed n'est jamais réinitialisée.

Elle reste dans l'historique.

Une nouvelle tentative sera créée.

---

## Cancelled

La Work Unit ne doit plus être exécutée.

Exemple :

Le client annule la commande avant la préparation.

La Work Unit est annulée.

Elle n'est pas marquée Failed.

---

# Dépendances

Les dépendances constituent le cœur du workflow.

Chaque Work Unit peut dépendre :

- d'aucune autre ;
- d'une seule ;
- de plusieurs.

Exemple simple :

```text
Preparation

↓

Cooking

↓

Finishing
```

Exemple parallèle :

```text
Cooking Fish

────────────┐

            ▼

        Assembly

            ▲

────────────┘

Cooking Potatoes
```

L'Assembly ne devient Ready que lorsque les deux cuissons sont Completed.

---

# Pourquoi utiliser des dépendances explicites

Il serait possible de déduire l'ordre des tâches.

Nous ne le faisons pas.

Les dépendances sont toujours décrites explicitement.

Ainsi :

- le moteur est plus lisible ;
- les erreurs sont détectables ;
- les recettes évoluent plus facilement ;
- les tests deviennent beaucoup plus simples.

Une règle importante ne doit jamais dépendre d'un simple ordre d'affichage.

---

# Priorité

Chaque Work Unit possède une priorité calculée.

Cette priorité n'est pas figée.

Elle évolue selon :

- l'heure cible ;
- les dépendances ;
- la charge actuelle ;
- les ressources disponibles ;
- les règles métier.

Le Scheduler utilise cette priorité pour déterminer le prochain travail à exécuter.

La priorité ne constitue pas un ordre absolu.

Elle représente un critère parmi d'autres.

---

# Durée estimée

Chaque Work Unit possède une durée estimée.

Cette durée est utilisée pour :

- prévoir les heures de début ;
- prévoir les heures de fin ;
- calculer la charge ;
- estimer les retards.

La durée estimée pourra évoluer grâce au moteur d'apprentissage.

Le Scheduler n'utilise jamais une durée fixe codée en dur.

---

# Work Unit et Production Unit

Une Work Unit appartient généralement à une seule Production Unit.

Exemple :

```text
PU-042

↓

Preparation

Cooking

Finishing
```

Les trois Work Units concernent uniquement cette pizza.

Une Work Unit ne peut jamais appartenir simultanément à plusieurs Production Units.

Les travaux communs seront représentés autrement.

C'est précisément le rôle des Batches, qui seront décrits dans la partie suivante.

---

# Batch

Jusqu'à présent, toutes les Work Units décrites concernent une seule Production Unit.

Pourtant, certaines ressources exécutent plusieurs travaux simultanément.

Le meilleur exemple est le four.

Le four ne cuit pas une pizza.

Il cuit une fournée.

Il est donc nécessaire d'introduire un second niveau d'organisation :

le Batch.

---

# Définition

Un Batch représente un regroupement temporaire de plusieurs Work Units compatibles.

Le Batch ne remplace jamais les Work Units.

Il les regroupe afin d'utiliser une ressource commune.

Exemple :

```text
Batch Four

↓

WU Cooking PU-001

WU Cooking PU-002

WU Cooking PU-003

WU Cooking PU-004
```

Chaque Work Unit continue d'exister indépendamment.

Le Batch ne représente que leur exécution commune.

---

# Pourquoi créer un Batch

Sans Batch, le moteur devrait considérer que quatre cuissons indépendantes démarrent exactement au même instant.

En réalité, la cuisine raisonne autrement.

Elle prépare :

> une fournée.

Cette notion est indispensable pour représenter correctement :

- le four ;
- une friteuse ;
- un grill ;
- toute ressource capable de traiter plusieurs éléments simultanément.

---

# Responsabilité d'un Batch

Le Batch répond uniquement à la question :

> Quels travaux seront exécutés ensemble ?

Il ne répond pas :

- quel produit est concerné ;
- comment le produit est préparé ;
- quelle recette utiliser.

Ces responsabilités restent portées par les Work Units.

---

# Exemple

Commande :

```text
Regina

Regina

Margherita

Chèvre miel
```

Le Scheduler peut créer :

```text
Batch Four B-018

↓

Cooking Regina

Cooking Regina

Cooking Margherita

Cooking Chèvre miel
```

Le Batch représente simplement cette composition.

---

# Informations minimales

Chaque Batch possède au minimum :

```text
id

resourceKind

status

capacity

usedCapacity

createdAt

updatedAt
```

Il référence ensuite les Work Units qu'il contient.

---

# Capacité

Chaque Batch possède une capacité.

Exemple :

```text
Four

Capacité

4
```

Le Batch connaît donc :

```text
Capacité totale

4

Occupation actuelle

3
```

Cette information permet au Scheduler de rechercher automatiquement les meilleurs regroupements.

---

# États

Un Batch suit le cycle suivant.

```text
Projected

↓

Selected

↓

Locked

↓

In Progress

↓

Completed
```

Chaque état possède une signification métier précise.

---

## Projected

Le Scheduler propose une composition.

Cette composition reste entièrement modifiable.

Aucune ressource n'est encore engagée.

Aucune décision physique n'a été prise.

Le Scheduler peut :

- déplacer des pizzas ;
- compléter la fournée ;
- supprimer complètement le Batch.

Un Batch Projected ne constitue pas une vérité métier.

Il représente uniquement une projection.

---

## Selected

Le Batch est retenu comme prochaine fournée.

Cette décision peut provenir :

- du Scheduler ;
- du Pizzaiolo ;
- d'une validation utilisateur.

La composition devient beaucoup plus stable.

Cependant, elle peut encore être abandonnée avant le début réel du travail.

---

## Locked

Le travail physique commence.

Exemple :

Le premier pâton est étalé.

Ou :

La première pizza est réellement destinée à cette fournée.

À partir de cet instant :

le Scheduler ne doit plus modifier automatiquement la composition.

Cette règle garantit que l'interface reste cohérente avec le travail réellement effectué.

---

## In Progress

Le Batch est en cours d'exécution.

Exemple :

Les pizzas sont dans le four.

Ou :

Le panier est dans la friteuse.

Le Batch représente maintenant une réalité physique.

---

## Completed

Le travail collectif est terminé.

Le Batch devient un élément d'historique.

Les Work Units individuelles poursuivent ensuite leur propre cycle.

---

# Pourquoi distinguer Projected et Locked

Cette distinction constitue l'un des principes fondamentaux du moteur.

Exemple :

Commande A

↓

6 pizzas

Le Scheduler propose :

```text
Batch 1

4 pizzas
```

```text
Batch 2

2 pizzas
```

Quelques instants plus tard :

une nouvelle commande de deux pizzas arrive.

Le Scheduler peut transformer :

```text
4

+

2
```

en :

```text
4

+

4
```

Cette optimisation est possible uniquement parce que le second Batch est encore Projected.

Si le Batch était déjà Locked :

la composition resterait inchangée.

---

# Batch et Scheduler

Le Scheduler produit des Batchs.

Il ne les exécute pas.

Son rôle consiste à :

- rechercher les meilleurs regroupements ;
- optimiser la capacité ;
- limiter les attentes ;
- respecter les heures de remise.

Le Scheduler ne manipule jamais directement les ressources physiques.

---

# Batch et Dispatcher

Une fois le Batch validé,

le Dispatcher réserve la ressource correspondante.

Exemple :

```text
Batch Four

↓

Four principal
```

Le Dispatcher ne modifie jamais la composition du Batch.

Il choisit uniquement la ressource capable de l'exécuter.

---

# Batch et Production Unit

Une Production Unit ne connaît jamais directement son Batch.

Elle connaît uniquement ses Work Units.

Ce sont les Work Units qui rejoignent temporairement un Batch.

Ainsi,

une Production Unit reste totalement indépendante des stratégies de regroupement.

Le même produit pourra appartenir :

- à un Batch différent ;
- à un autre four ;
- à une autre ressource ;

sans modifier son identité.

---

# Batch et historique

Une fois terminé,

le Batch devient un objet historique.

Il permet notamment de connaître :

- quelles pizzas ont été cuites ensemble ;
- à quelle heure ;
- sur quelle ressource ;
- pendant combien de temps.

Ces informations pourront ensuite alimenter :

- les statistiques ;
- le moteur d'apprentissage ;
- les outils de diagnostic.

---

# Les Batchs ne remplacent jamais les Work Units

Cette règle est extrêmement importante.

Un Batch n'est pas une tâche.

Il n'est pas une Production Unit.

Il n'est pas une commande.

Il est uniquement un regroupement temporaire.

Lorsque le Batch disparaît,

les Work Units continuent d'exister.

Cette séparation simplifie énormément le moteur.

---

# Travail individuel et travail collectif

L'architecture distingue désormais clairement deux niveaux.

Travail individuel :

```text
Production Unit

↓

Work Unit
```

Travail collectif :

```text
Batch

↓

Regroupe plusieurs Work Units
```

Cette séparation permet de représenter naturellement :

- les fournées du four ;
- les paniers de friteuse ;
- les regroupements futurs qui pourraient apparaître dans le KDS.

---

# Principe fondamental

Une Work Unit décrit :

> un travail.

Un Batch décrit :

> un regroupement de travaux.

Ces deux concepts sont complémentaires.

Ils ne doivent jamais être fusionnés.

La partie suivante introduit maintenant le composant qui orchestre l'ensemble de ces objets :

le Scheduler.

---

# Scheduler

Le Scheduler constitue le cœur du moteur de production.

Son rôle n'est pas d'exécuter le travail.

Son rôle est de décider :

- quel travail doit être effectué ;
- dans quel ordre ;
- à quel moment ;
- avec quels regroupements.

Le Scheduler ne connaît jamais l'interface utilisateur.

Il ne connaît jamais les composants React.

Il ne connaît jamais les écrans.

Il prend uniquement des décisions de planification.

---

# Responsabilités

Le Scheduler est responsable de :

- l'analyse de la charge de travail ;
- le calcul des priorités ;
- la constitution des Batchs ;
- l'optimisation des ressources ;
- le respect des heures de remise ;
- la réduction des temps d'attente ;
- la limitation des changements inutiles.

Il ne réalise jamais lui-même le travail.

---

# Ce que le Scheduler ne fait jamais

Le Scheduler ne :

- prépare aucune pizza ;
- n'enfourne aucune pizza ;
- n'affecte directement aucune personne ;
- ne modifie aucune recette ;
- ne pilote aucune interface graphique.

Il produit uniquement des décisions.

---

# Entrées

Le Scheduler reçoit notamment :

```text
Production Units

↓

Work Units

↓

Batchs existants

↓

Ressources disponibles

↓

Règles métier
```

Ces informations représentent l'état actuel du système.

---

# Sorties

Le Scheduler produit :

- les priorités ;
- les heures prévisionnelles ;
- les Batchs projetés ;
- les attentes recommandées ;
- les réservations futures.

Ces résultats pourront ensuite être utilisés par :

- le Dispatcher ;
- les écrans du KDS ;
- les outils de simulation.

---

# Fonctionnement général

À chaque modification importante :

- nouvelle commande ;
- annulation ;
- Work Unit terminée ;
- ressource indisponible ;
- Batch verrouillé ;

le Scheduler recalcule le plan futur.

Il ne modifie jamais le passé.

---

# Planification glissante

Le Scheduler travaille selon une fenêtre glissante.

Il ne recalcule que la partie du plan encore modifiable.

Cette règle limite fortement les changements inutiles.

Elle améliore également la stabilité perçue par les opérateurs.

---

# Plan projeté

Le Scheduler construit en permanence un plan projeté.

Ce plan contient :

- les Work Units futures ;
- les Batchs projetés ;
- les estimations horaires.

Le plan projeté peut être recalculé autant de fois que nécessaire.

Il ne représente jamais une décision physique.

---

# Décision engagée

Une décision devient engagée lorsqu'une action réelle commence.

Exemples :

- un pâton est étalé ;
- une pizza est enfournée ;
- un panier est plongé dans la friteuse.

À partir de cet instant :

le Scheduler considère cette décision comme définitive.

---

# Principe fondamental

Le Scheduler ne doit jamais modifier silencieusement une décision déjà engagée.

Ce principe garantit :

- la stabilité des écrans ;
- la confiance des opérateurs ;
- la cohérence entre le logiciel et la cuisine.

Une optimisation ne doit jamais conduire à déplacer une pizza déjà en cours de préparation.

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

Une nouvelle commande arrive.

Si Batch B est encore Projected :

```text
Batch B

↓

4 / 4
```

Le Scheduler complète automatiquement la fournée.

En revanche,

si Batch B est Locked,

aucune modification n'est effectuée.

---

# Critères de décision

Le Scheduler évalue simultanément plusieurs critères.

Par exemple :

- heure de remise ;
- priorité métier ;
- capacité disponible ;
- taille des Batchs ;
- regroupement des bases ;
- limitation des changements ;
- durée estimée des Work Units.

Aucun critère ne doit être utilisé seul.

Le résultat provient toujours d'un compromis.

---

# Priorité métier

Les règles métier restent prioritaires.

Exemple :

Compléter une fournée ne doit jamais provoquer un retard client.

Inversement,

respecter strictement l'ordre chronologique ne doit pas conduire à laisser des emplacements de four inutilement vides.

Le Scheduler recherche le meilleur équilibre.

---

# Work Units Ready

Une Work Unit Ready n'est pas forcément exécutée immédiatement.

Exemple :

Deux pizzas sont prêtes.

Le four possède quatre places.

Le Scheduler peut volontairement attendre quelques minutes.

Les deux Work Units restent Ready.

Cette attente est une décision de planification.

Elle ne constitue pas un retard.

---

# Hold Reason

Lorsqu'une Work Unit Ready reste volontairement en attente,

le Scheduler doit fournir une explication.

Exemple :

```text
WAITING_FOR_BATCH_COMPLETION
```

```text
WAITING_FOR_RESOURCE
```

```text
WAITING_FOR_TARGET_TIME
```

```text
WAITING_FOR_OPERATOR_CONFIRMATION
```

Ces informations permettent d'expliquer les décisions du moteur.

---

# Calcul incrémental

Le Scheduler ne reconstruit pas systématiquement l'ensemble du plan.

Il travaille de manière incrémentale.

Il réévalue uniquement les éléments impactés.

Cette approche réduit :

- le temps de calcul ;
- les mouvements inutiles ;
- les modifications d'interface.

---

# Déterminisme

À état identique,

le Scheduler doit toujours produire le même résultat.

Deux calculs successifs ne doivent jamais proposer deux plans différents sans modification des données d'entrée.

Cette propriété facilite :

- les tests ;
- le débogage ;
- la compréhension du moteur.

---

# Explicabilité

Chaque décision importante doit pouvoir être expliquée.

Exemples :

Pourquoi cette pizza est-elle prioritaire ?

Pourquoi cette fournée n'est-elle pas lancée ?

Pourquoi cette commande change-t-elle de créneau ?

Le Scheduler doit pouvoir fournir une justification lisible.

Cette exigence est indispensable pour conserver la confiance des utilisateurs.

---

# Aucune décision magique

Le Scheduler ne prend jamais une décision impossible à justifier.

Chaque recommandation doit pouvoir être reliée :

- aux règles métier ;
- aux contraintes de ressources ;
- aux temps estimés ;
- aux objectifs de production.

Le moteur reste entièrement déterministe.

---

# Objectif

Le Scheduler ne cherche pas uniquement à produire rapidement.

Il cherche à produire :

- dans le bon ordre ;
- avec le moins de charge mentale possible ;
- en utilisant efficacement les ressources ;
- tout en respectant les engagements envers le client.

Il constitue donc le véritable chef d'orchestre de la production.

La partie suivante décrit maintenant le composant chargé de transformer ces décisions théoriques en affectations réelles :

le Dispatcher.

---

# Dispatcher

Le Dispatcher constitue le lien entre la planification et l'exécution.

Le Scheduler décide :

> ce qu'il faut faire.

Le Dispatcher décide :

> qui ou quoi va le faire.

Cette séparation est volontaire.

Elle permet de modifier les ressources disponibles sans modifier les règles de planification.

---

# Responsabilité

Le Dispatcher transforme une décision théorique en affectation concrète.

Exemple :

Le Scheduler décide :

```text
Cooking

↓

WU-042
```

Le Dispatcher décide :

```text
WU-042

↓

Four principal
```

ou

```text
WU-042

↓

Four secondaire
```

Le Scheduler reste totalement indépendant des équipements réellement présents.

---

# Pourquoi séparer Scheduler et Dispatcher

Imaginons que la pizzeria installe :

- un second four ;
- une deuxième friteuse ;
- un nouveau poste Pani'NO.

Le Scheduler n'a rien à modifier.

Il continue de produire exactement les mêmes Work Units.

Seul le Dispatcher choisira désormais une autre ressource.

Cette séparation réduit énormément le couplage.

---

# Les ressources

Une ressource représente un moyen d'exécution.

Une ressource peut être :

- un four ;
- une friteuse ;
- un grill ;
- un plan de travail ;
- un poste Pani'NO ;
- une équipe.

Le moteur ne distingue pas fondamentalement une personne d'un équipement.

Les deux sont des ressources.

---

# Ressources logiques

Dans la première version,

les ressources humaines resteront logiques.

Exemple :

```text
Équipe Pizzaiolo
```

plutôt que :

```text
Pierre

Paul

Lucas
```

Cette approche simplifie énormément la migration.

L'individualisation des employés pourra être introduite ultérieurement.

---

# Informations minimales

Une ressource possède au minimum :

```text
id

kind

status

capacity

availableCapacity

executionProfiles

createdAt

updatedAt
```

Ces informations suffisent pour réaliser une première affectation.

---

# Types de ressources

Le moteur distingue les familles de ressources.

Exemple :

```text
Oven
```

```text
Fryer
```

```text
Grill
```

```text
PreparationStation
```

```text
PackagingStation
```

Chaque famille peut posséder plusieurs instances.

---

# Disponibilité

Une ressource possède un état.

Exemple :

```text
Available
```

```text
Busy
```

```text
Unavailable
```

```text
Maintenance
```

Le Dispatcher ne peut utiliser qu'une ressource compatible et disponible.

---

# Capacité

Une ressource possède également une capacité.

Exemple :

```text
Four

Capacité

4 pizzas
```

Le Dispatcher connaît donc la place encore disponible.

Cette information complète celle portée par les Batchs.

---

# Affectation

Une Work Unit n'est jamais liée définitivement à une ressource.

L'affectation intervient le plus tard possible.

Cela permet :

- d'absorber les changements ;
- d'utiliser les ressources réellement disponibles ;
- de limiter les blocages.

---

# Exemple

Le Scheduler produit :

```text
Cooking
```

Le Dispatcher observe :

```text
Four principal

Occupé
```

```text
Four secondaire

Libre
```

La Work Unit est affectée au second four.

Le Scheduler n'a pas besoin de connaître cette décision.

---

# Réservation

Une fois la ressource choisie,

le Dispatcher effectue une réservation.

Cette réservation garantit que deux Work Units incompatibles n'utiliseront pas simultanément la même capacité.

La réservation reste interne au Dispatcher.

Le Scheduler manipule uniquement des capacités disponibles.

---

# Changement de ressource

Tant qu'une Work Unit n'est pas engagée,

le Dispatcher peut modifier son affectation.

Exemple :

Le four principal tombe en panne.

Le Dispatcher déplace automatiquement les Work Units encore non engagées vers une autre ressource compatible.

Le Scheduler n'a rien à recalculer.

---

# Ressource indisponible

Lorsqu'une ressource devient indisponible,

le Dispatcher :

- libère les réservations futures ;
- informe le Scheduler ;
- déclenche un nouveau calcul.

Les Work Units déjà engagées ne sont pas déplacées automatiquement.

---

# Les écrans ne sont pas des ressources

Cette règle est importante.

Le poste Four n'est pas une ressource.

L'écran Four représente simplement une vue.

La ressource est le four.

Même principe pour :

- Pizzaiolo ;
- Pani'NO ;
- Prêtes.

Les interfaces utilisateur ne doivent jamais devenir des objets métier.

---

# Exécution

Une fois la ressource affectée,

la Work Unit peut commencer.

Le Dispatcher ne suit plus ensuite le détail de l'exécution.

Les changements d'état sont produits par :

- les opérateurs ;
- les événements de production.

---

# Exemple complet

Le Scheduler produit :

```text
WU Cooking PU-042
```

Le Dispatcher choisit :

```text
Four principal
```

Le Batch devient :

```text
Locked
```

Les pizzas sont enfournées.

La Work Unit passe :

```text
In Progress
```

Puis :

```text
Completed
```

Le Dispatcher libère ensuite la capacité correspondante.

---

# Échec

Une ressource peut échouer.

Exemple :

Le four tombe en panne.

Le Dispatcher marque la ressource :

```text
Unavailable
```

Toutes les Work Units futures sont réaffectées.

Les Work Units déjà en cours restent associées à l'événement ayant provoqué l'incident.

Cette distinction facilite énormément les analyses futures.

---

# Principes fondamentaux

Le Dispatcher applique les principes suivants.

- Une Work Unit reste indépendante des ressources.
- Une ressource reste indépendante des produits.
- Les affectations sont tardives.
- Les réservations sont explicites.
- Les ressources peuvent devenir indisponibles.
- Les écrans ne sont jamais des ressources.
- Une décision déjà engagée n'est pas modifiée automatiquement.

---

# Exécution distribuée

Cette architecture permet également une évolution future.

Demain,

plusieurs postes pourront exécuter simultanément les mêmes Work Units.

Le Dispatcher répartira naturellement les affectations.

Aucune modification du Scheduler ne sera nécessaire.

Cette séparation constitue l'une des bases de l'évolutivité du moteur.

---

# Interaction avec les recettes

Le Dispatcher sait :

- quelle ressource utiliser.

La recette sait :

- comment réaliser le travail.

Le Dispatcher ne lit jamais une recette.

Il se contente de fournir les moyens nécessaires à son exécution.

La partie suivante introduit précisément les recettes de production et leur rôle dans l'architecture globale.

---

# Les recettes

Une recette décrit la manière d'exécuter une Work Unit.

Elle ne décide jamais :

- quand commencer ;
- dans quel ordre travailler ;
- quelle ressource utiliser.

Ces décisions appartiennent respectivement :

- au Scheduler ;
- au Dispatcher.

La recette répond uniquement à une question :

> Comment réaliser correctement ce travail ?

---

# Séparation des responsabilités

Cette séparation constitue l'un des principes fondamentaux du moteur.

Le Scheduler répond :

> Que faut-il faire ?

Le Dispatcher répond :

> Avec quelle ressource ?

La recette répond :

> Comment faut-il le faire ?

Ces trois responsabilités ne doivent jamais être mélangées.

---

# Exemple

Le Scheduler décide :

```text
Preparation

↓

PU-042
```

Le Dispatcher affecte :

```text
Plan de travail principal
```

La recette décrit :

```text
prendre un pâton

↓

étaler la pâte

↓

étaler la crème de chèvre

↓

ajouter la mozzarella

↓

ajouter le chèvre
```

Chaque composant reste indépendant.

---

# Pourquoi séparer les recettes

Les recettes évoluent régulièrement.

Une préparation peut changer.

Un nouvel ingrédient peut apparaître.

Un ordre d'assemblage peut être amélioré.

Ces modifications ne doivent jamais nécessiter une modification du Scheduler.

Le moteur reste totalement indépendant du savoir-faire culinaire.

---

# Une recette dépend toujours du produit

Une Work Unit est générique.

La recette est spécifique.

Exemple :

```text
Work Unit

Preparation
```

Cette Work Unit peut utiliser plusieurs recettes.

Exemple :

```text
Preparation

↓

Margherita
```

ou

```text
Preparation

↓

Chèvre miel
```

ou

```text
Preparation

↓

Pani'NO Burger
```

La Work Unit reste identique.

La recette change.

---

# Les opérations

Une recette est composée d'opérations.

Une opération représente un geste concret.

Exemple :

```text
prendre un pâton
```

```text
étaler la pâte
```

```text
ajouter la mozzarella
```

```text
mettre le miel
```

Les opérations ne sont pas planifiées individuellement.

Le Scheduler manipule uniquement les Work Units.

---

# Pourquoi ne pas planifier les opérations

Une recette peut contenir :

- trois opérations ;
- dix opérations ;
- vingt opérations.

Si chacune devenait une Work Unit,

le moteur deviendrait extrêmement complexe.

Les opérations servent principalement :

- à guider l'opérateur ;
- à mesurer les temps ;
- à former les nouveaux employés.

Elles restent donc internes à la recette.

---

# Exemple complet

Production Unit :

```text
Chèvre miel
```

Work Unit :

```text
Preparation
```

Recette :

```text
prendre un pâton

↓

étaler la pâte

↓

étaler la crème de chèvre

↓

ajouter la mozzarella

↓

ajouter le chèvre
```

Le Scheduler ne voit jamais cette succession d'opérations.

---

# Exemple de post-cuisson

Production Unit :

```text
Chèvre miel
```

Work Unit :

```text
Finishing
```

Recette :

```text
sortir la pizza

↓

ajouter le miel

↓

contrôler

↓

mettre en boîte
```

La recette reste spécifique au produit.

---

# Les recettes sont versionnées

Une recette peut évoluer.

Exemple :

```text
Recette V1
```

```text
Recette V2
```

Une Production Unit conserve toujours la version utilisée lors de sa création.

Une modification future ne doit jamais modifier une production déjà commencée.

---

# Les recettes sont indépendantes des postes

Une recette ne dépend pas :

- du poste Four ;
- du poste Pizzaiolo ;
- du poste Pani'NO.

Elle décrit uniquement le travail.

Les écrans du KDS représentent ensuite les Work Units correspondant au poste concerné.

---

# Les événements

Chaque changement important produit un événement.

Les événements constituent la mémoire du moteur.

Ils permettent :

- la synchronisation ;
- les statistiques ;
- les diagnostics ;
- l'apprentissage.

Le moteur ne reconstruit jamais son historique à partir de suppositions.

Il s'appuie sur les événements réellement produits.

---

# Exemples d'événements

```text
ProductionUnitCreated
```

```text
WorkUnitCreated
```

```text
WorkUnitReady
```

```text
WorkUnitStarted
```

```text
WorkUnitCompleted
```

```text
BatchCreated
```

```text
BatchLocked
```

```text
BatchCompleted
```

```text
ProductionUnitReady
```

```text
OrderDelivered
```

Cette liste pourra évoluer avec le projet.

---

# Historique

L'historique ne doit jamais être perdu.

Exemple :

Une pizza tombe.

Le système ne remet pas simplement son état à zéro.

Il produit :

```text
WorkUnitFailed
```

Puis :

```text
WorkUnitCreated
```

pour la nouvelle tentative.

L'historique reste complet.

---

# Refabrication

Une Production Unit peut être remplacée.

Exemple :

```text
PU-042

↓

Failed
```

Le système crée ensuite :

```text
PU-042-R1
```

Cette nouvelle Production Unit possède son propre workflow.

Les deux unités restent liées.

Ainsi,

les statistiques pourront distinguer :

- les produits réussis du premier coup ;
- les reprises ;
- les causes d'échec.

---

# Apprentissage

Le moteur d'apprentissage observe les événements.

Il mesure notamment :

- les durées réelles ;
- les attentes ;
- les retards ;
- les reprises ;
- les temps de cuisson ;
- les temps de préparation.

Ces informations permettent d'améliorer progressivement les estimations.

Le moteur ne modifie jamais directement les règles métier.

Il améliore uniquement les modèles utilisés par le Scheduler.

---

# Exemple

Une Work Unit possède une durée estimée de :

```text
90 secondes
```

Après plusieurs centaines d'exécutions,

le moteur observe une moyenne réelle de :

```text
105 secondes
```

La durée estimée pourra être ajustée.

Le comportement du moteur devient progressivement plus précis.

---

# Principe fondamental

Le moteur apprend.

Il ne décide pas seul de modifier les règles métier.

Les contraintes importantes restent définies par la documentation fonctionnelle.

L'apprentissage améliore uniquement :

- les estimations ;
- les prédictions ;
- les recommandations.

Il ne remplace jamais les décisions métier validées.

---

# Architecture globale

À ce stade,

le modèle complet devient :

```text
Commande

↓

Articles

↓

Production Units

↓

Workflow

↓

Work Units

↓

Scheduler

↓

Batchs

↓

Dispatcher

↓

Ressources

↓

Recettes

↓

Opérations

↓

Événements

↓

Apprentissage
```

Cette architecture sépare clairement :

- le métier ;
- la planification ;
- l'exécution ;
- le savoir-faire ;
- l'observation.

La dernière partie du document présente maintenant les invariants, la stratégie de migration et les principes qui devront rester vrais tout au long de l'évolution du KDS.

---

# Invariants

Les invariants représentent les règles qui devront toujours rester vraies.

Ils constituent le contrat d'architecture du moteur.

Une évolution future ne doit jamais les remettre en cause sans révision explicite de cette documentation.

---

# Invariants concernant les commandes

Une commande représente un engagement commercial.

Elle ne constitue jamais une unité de planification.

Une commande peut contenir :

- une ou plusieurs Production Units ;
- plusieurs workflows ;
- plusieurs Batchs.

Le Scheduler ne travaille jamais directement sur les commandes.

---

# Invariants concernant les Production Units

Une Production Unit représente toujours un produit physique unique.

Une Production Unit ne représente jamais :

- une quantité ;
- une fournée ;
- une commande.

Chaque Production Unit possède :

- un identifiant unique ;
- un workflow ;
- un état propre ;
- un historique propre.

Deux produits différents ne doivent jamais partager la même Production Unit.

---

# Invariants concernant les Work Units

Une Work Unit représente toujours un travail.

Elle ne représente jamais :

- un produit ;
- une commande ;
- une ressource.

Une Work Unit appartient à une seule Production Unit.

Elle possède un objectif clairement identifié.

Elle peut être :

- planifiée ;
- exécutée ;
- mesurée ;
- historisée.

---

# Invariants concernant les Batchs

Un Batch regroupe plusieurs Work Units.

Il ne remplace jamais les Work Units.

Un Batch peut être :

- projeté ;
- sélectionné ;
- verrouillé ;
- exécuté.

Les Work Units continuent d'exister indépendamment du Batch.

---

# Invariants concernant les ressources

Une ressource représente un moyen d'exécution.

Une ressource n'est jamais :

- une commande ;
- un produit ;
- un écran.

Une Work Unit peut changer de ressource tant qu'elle n'est pas engagée.

---

# Invariants concernant le Scheduler

Le Scheduler reste entièrement déterministe.

À données identiques,

il produit toujours le même résultat.

Il ne modifie jamais une décision déjà engagée.

Il ne pilote jamais directement une ressource.

Il ne connaît jamais les interfaces utilisateur.

---

# Invariants concernant le Dispatcher

Le Dispatcher affecte les ressources.

Il ne modifie jamais :

- les priorités ;
- les recettes ;
- les règles métier.

Il applique les décisions produites par le Scheduler.

---

# Invariants concernant les recettes

Une recette décrit uniquement :

> comment réaliser un travail.

Elle ne décide jamais :

- du moment ;
- de la priorité ;
- de la ressource.

Une recette peut évoluer sans modifier le Scheduler.

---

# Invariants concernant les événements

Chaque transition importante produit un événement.

Les événements ne sont jamais reconstruits a posteriori.

Ils représentent les faits réellement survenus.

L'historique est donc toujours traçable.

---

# Une seule source de vérité

Le moteur distingue deux notions.

Le plan projeté.

Et l'état réel.

Le plan projeté peut changer.

L'état réel représente uniquement les actions effectivement engagées.

Ces deux informations ne doivent jamais être confondues.

---

# Migration

L'introduction des Work Units doit rester progressive.

La migration suit les étapes suivantes.

---

## Étape 1

Création du nouveau modèle en mémoire.

Aucune modification des postes.

Aucune migration Supabase.

Le moteur actuel continue de fonctionner normalement.

---

## Étape 2

Création d'adaptateurs.

Les Production Units sont générées à partir des Order Items.

Les Work Units sont générées à partir des workflows.

Les Batchs restent calculés en mémoire.

Les interfaces continuent d'utiliser les structures actuelles.

---

## Étape 3

Double exécution.

L'ancien moteur et le nouveau moteur fonctionnent simultanément.

Leurs résultats sont comparés.

Les différences sont analysées avant toute bascule.

Cette étape est essentielle.

Elle permet de vérifier que le nouveau moteur respecte toutes les règles métier existantes.

---

## Étape 4

Migration des postes.

Ordre recommandé :

```text
Pizzaiolo

↓

Four

↓

Pani'NO

↓

Prêtes
```

Chaque poste est migré indépendamment.

Une validation complète est réalisée avant de passer au poste suivant.

---

## Étape 5

Persistance.

Une fois les comportements validés,

les nouvelles structures pourront être persistées progressivement.

Aucune migration de données importante ne doit intervenir avant cette validation.

---

## Étape 6

Suppression de l'ancien modèle.

L'ancien moteur ne sera retiré qu'après plusieurs semaines de validation en conditions réelles.

Cette suppression constitue la dernière étape de la migration.

---

# Compatibilité

Cette architecture reste compatible avec les principes déjà définis dans les documents 00 à 13.

Elle ne remet notamment pas en cause :

- les règles métier ;
- les postes de travail ;
- les interfaces actuelles ;
- la communication avec Supabase ;
- le proxy ;
- les modes de fonctionnement.

Elle introduit uniquement une nouvelle représentation interne de la production.

---

# Bénéfices attendus

Cette architecture permettra notamment :

- une planification plus fine ;
- une meilleure gestion des commandes mixtes ;
- une représentation correcte des fournées ;
- une diminution de la charge mentale ;
- une meilleure explicabilité des décisions ;
- une meilleure traçabilité ;
- une évolution progressive sans réécriture complète.

Elle prépare également le terrain pour les futurs moteurs d'apprentissage.

---

# Cas couverts

L'architecture doit permettre de gérer naturellement :

- une pizza unique ;
- plusieurs pizzas identiques ;
- une commande répartie sur plusieurs fournées ;
- plusieurs commandes fusionnées dans une même fournée ;
- une refabrication ;
- une annulation ;
- une commande mixte ;
- plusieurs ressources identiques ;
- une panne de ressource ;
- plusieurs postes travaillant simultanément.

Aucun de ces cas ne doit nécessiter une architecture spécifique.

Ils doivent émerger naturellement du modèle présenté dans ce document.

---

# Critères de validation

L'architecture sera considérée comme validée lorsque les conditions suivantes seront réunies.

Le Scheduler produit des Work Units cohérentes.

Les Batchs représentent correctement les regroupements physiques.

Les postes utilisent les Work Units sans dépendre directement des commandes.

Les décisions restent explicables.

Les interfaces restent stables pendant le service.

Les anciennes règles métier restent respectées.

La migration peut être réalisée progressivement sans interruption de production.

---

# Conclusion

Cette architecture remplace progressivement un modèle centré sur les commandes par un modèle centré sur le travail réel.

Les commandes deviennent l'origine des besoins.

Les Production Units représentent les produits physiques.

Les Work Units représentent les tâches.

Les Batchs représentent les regroupements d'exécution.

Le Scheduler organise.

Le Dispatcher affecte.

Les recettes décrivent le savoir-faire.

Les événements mémorisent l'exécution.

Cette séparation constitue la base technique des futures évolutions du KDS.

La dernière partie présente une synthèse globale de l'architecture et les perspectives d'évolution retenues pour les versions futures.

---

# Vision à long terme

Cette architecture a été conçue pour accompagner durablement l'évolution du KDS.

Elle ne répond pas uniquement aux besoins actuels de la pizzeria.

Elle établit une base suffisamment générique pour intégrer progressivement de nouveaux produits, de nouveaux postes et de nouvelles stratégies de planification sans remettre en cause les fondations du moteur.

Chaque nouveau développement devra s'appuyer sur les concepts définis dans ce document.

---

# Évolutions prévues

L'architecture permet d'envisager, sans modification structurelle majeure :

- plusieurs fours ;
- plusieurs pizzaiolos ;
- plusieurs friteuses ;
- plusieurs postes Pani'NO ;
- plusieurs cuisines ;
- plusieurs établissements ;
- de nouveaux types de produits ;
- de nouvelles familles de Work Units.

Le modèle reste identique.

Seules les données évolueront.

---

# Évolutions reportées

Les fonctionnalités suivantes ne sont pas nécessaires à la première migration.

Elles pourront être introduites ultérieurement.

## Ressources humaines individualisées

Aujourd'hui :

```text
Équipe Pizzaiolo
```

Demain :

```text
Pierre

Paul

Lucas
```

Le Dispatcher pourra alors répartir les Work Units entre plusieurs opérateurs.

---

## Éditeur graphique de workflows

Les workflows pourront un jour être créés visuellement.

Cette fonctionnalité n'est pas indispensable pour la première version.

Le modèle actuel la rend néanmoins possible.

---

## Simulation

Le Scheduler pourra produire plusieurs scénarios.

Exemple :

```text
Plan A

↓

Lancer immédiatement
```

```text
Plan B

↓

Attendre deux minutes
```

Le moteur pourra comparer ces scénarios avant de retenir le meilleur.

Cette fonctionnalité reste volontairement hors du périmètre de la V1.

---

## Apprentissage avancé

Le moteur pourra apprendre progressivement :

- les temps de préparation ;
- les temps de cuisson ;
- les temps de post-cuisson ;
- les variations selon les jours ;
- les variations selon les horaires ;
- les performances des ressources.

Ces apprentissages amélioreront les estimations sans modifier les règles métier.

---

## Prévision des commandes

À terme,

le moteur pourra estimer la probabilité d'arrivée de nouvelles commandes.

Exemple :

```text
Vendredi

19 h 05

↓

Forte probabilité
d'une nouvelle commande
dans les trois prochaines minutes.
```

Le Scheduler pourra alors décider d'attendre avant de lancer une fournée incomplète.

Cette capacité reste une évolution future.

La V1 repose exclusivement sur les commandes effectivement reçues.

---

# Ce que cette architecture ne doit jamais devenir

Le moteur ne doit jamais devenir un système opaque.

Chaque décision importante doit pouvoir être expliquée.

L'utilisateur doit toujours pouvoir comprendre :

- pourquoi une Work Unit est prioritaire ;
- pourquoi une fournée est différée ;
- pourquoi une ressource est choisie ;
- pourquoi une commande change de créneau.

L'explicabilité constitue un objectif permanent.

---

# Charge mentale

Le principal objectif du KDS reste la réduction de la charge mentale.

Le logiciel ne doit pas demander aux opérateurs d'interpréter des dizaines d'informations.

Il doit prendre les décisions complexes et présenter uniquement ce qui est utile au poste concerné.

Chaque écran devra répondre à une question simple.

Exemple :

**Pizzaiolo**

> Que dois-je préparer maintenant ?

**Four**

> Quelle est la prochaine fournée ?

**Pani'NO**

> Quel produit dois-je assembler ?

**Prêtes**

> Quelle commande peut être remise ?

L'architecture est conçue pour rendre ces réponses possibles.

---

# Principes directeurs

Toutes les évolutions futures devront respecter les principes suivants.

## Une responsabilité par objet

Chaque objet possède un rôle unique.

Les responsabilités ne doivent jamais être mélangées.

---

## Une seule source de vérité

Les informations critiques ne doivent exister qu'à un seul endroit.

Les autres composants doivent les consulter et non les recopier.

---

## Décisions explicables

Le moteur doit toujours pouvoir justifier ses recommandations.

---

## Migration progressive

Aucune évolution ne doit imposer une réécriture complète du KDS.

Chaque étape doit pouvoir être :

- développée ;
- testée ;
- validée ;
- déployée ;

indépendamment.

---

## Compatibilité

Les règles métier existantes restent prioritaires.

Une amélioration technique ne doit jamais modifier le fonctionnement attendu par la cuisine sans validation explicite.

---

## Simplicité

Une architecture plus complexe n'est acceptable que si elle apporte un bénéfice concret.

Tout nouveau concept devra justifier clairement sa présence.

---

# Résumé de l'architecture

Le modèle complet peut désormais être résumé ainsi.

```text
Commande
        │
        ▼
Article commercial
        │
        ▼
Production Unit
        │
        ▼
Workflow
        │
        ▼
Work Units
        │
        ▼
Scheduler
        │
        ▼
Batchs projetés
        │
        ▼
Dispatcher
        │
        ▼
Ressources
        │
        ▼
Recettes
        │
        ▼
Opérations
        │
        ▼
Événements
        │
        ▼
Apprentissage
```

Chaque niveau possède une responsabilité clairement identifiée.

Cette séparation permet :

- une meilleure lisibilité ;
- une meilleure évolutivité ;
- une meilleure maintenabilité ;
- une meilleure testabilité.

---

# Validation du document

Le présent document est considéré comme validé lorsque :

- les concepts sont compris ;
- leurs responsabilités sont clairement définies ;
- les invariants sont respectés ;
- la stratégie de migration est acceptée.

Il devient alors la référence pour l'implémentation progressive des Work Units.

Toute évolution importante devra rester compatible avec les principes définis ici ou faire l'objet d'une révision explicite de cette architecture.

---

# Fin du document