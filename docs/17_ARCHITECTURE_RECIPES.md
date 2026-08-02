# 17_ARCHITECTURE_RECIPES.md

# Architecture des Recettes

Version : 1.0

Statut : Architecture cible

---

# Objectif

Une recette décrit la manière d'exécuter une Work Unit.

Elle représente le savoir-faire de production.

Une recette ne décide jamais :

- quand commencer ;
- quelle priorité appliquer ;
- quelle ressource utiliser ;
- dans quel Batch intégrer une Work Unit.

Ces décisions appartiennent exclusivement au Scheduler.

La recette répond uniquement à la question :

> Comment réaliser correctement ce travail ?

---

# Position dans l'architecture

```text
Production Unit

↓

Workflow

↓

Work Unit

↓

Recette

↓

Opérations

↓

Exécution
```

Le Scheduler manipule uniquement les Work Units.

La recette n'intervient qu'au moment de l'exécution.

---

# Responsabilités

Une recette possède les responsabilités suivantes.

| Responsabilité | Description |
|----------------|-------------|
| Décrire les opérations | Définir les gestes à réaliser. |
| Définir l'ordre | Organiser les opérations de manière cohérente. |
| Définir les paramètres | Quantités, ingrédients, températures, etc. |
| Décrire les variantes | Adapter une même recette selon les options. |

---

# Ce qu'une recette ne fait jamais

Une recette ne :

- calcule aucune priorité ;
- ne crée aucune Work Unit ;
- ne construit aucun Batch ;
- ne choisit aucune ressource ;
- ne connaît aucune commande ;
- ne dialogue jamais avec le Scheduler.

Elle décrit uniquement le savoir-faire.

---

# Philosophie

Le Scheduler décide.

La recette explique.

L'opérateur exécute.

Cette séparation garantit une architecture simple et évolutive.

---

# Structure générale

```text
Recipe

├── Metadata

├── Operations

├── Parameters

├── Variants

├── Timing

├── Validation

└── Version
```

Chaque section sera détaillée dans la suite du document.

---

# Structure des recettes

Une recette est une définition déclarative.

Elle décrit le travail à réaliser.

Elle ne décrit jamais le contexte de production.

Une même recette peut donc être utilisée :

- dans une commande simple ;
- dans une commande de groupe ;
- dans une commande urgente ;
- dans une simulation.

Le comportement reste identique.

---

# Structure générale

Chaque recette possède la structure suivante.

```text
Recipe

├── Metadata
├── Operations
├── Parameters
├── Variants
├── Timing
├── Validation
└── Version
```

Chaque section possède une responsabilité précise.

---

# Metadata

Les métadonnées identifient la recette.

Exemple :

```text
Metadata

├── recipeId
├── name
├── category
├── productType
├── version
├── createdAt
└── updatedAt
```

Les métadonnées ne décrivent jamais la fabrication.

---

# Operations

Les opérations représentent les gestes élémentaires.

Exemple :

```text
Operations

↓

Prendre un pâton

↓

Étaler la pâte

↓

Étaler la crème de chèvre

↓

Ajouter la mozzarella

↓

Ajouter le chèvre
```

Chaque opération possède un objectif unique.

---

# Une opération

Une opération peut contenir :

```text
Operation

├── id
├── order
├── name
├── description
├── estimatedDuration
├── requiredSkills
└── validations
```

Les opérations restent indépendantes du Scheduler.

---

# Paramètres

Les paramètres décrivent les éléments variables.

Exemple :

```text
Parameters

├── Sauce
├── Base
├── Quantité mozzarella
├── Température
└── Temps cuisson
```

Les paramètres permettent d'éviter la duplication des recettes.

---

# Variantes

Une recette peut comporter plusieurs variantes.

Exemple :

```text
Regina

↓

Base tomate
```

```text
Regina

↓

Base crème
```

La structure reste identique.

Seuls certains paramètres changent.

---

# Exemple

```text
Recette

↓

Base

↓

Sauce tomate
```

↓

Variante

```text
Sauce crème
```

Le Scheduler ne voit jamais cette différence.

---

# Timing

Chaque recette possède des durées indicatives.

Exemple :

```text
Étaler

20 s
```

```text
Garnir

35 s
```

```text
Contrôle

5 s
```

Ces durées servent :

- au Scheduler ;
- au moteur d'apprentissage ;
- aux statistiques.

Elles restent indicatives.

---

# Validation

Une recette peut imposer des contrôles.

Exemple :

```text
Mozzarella présente

✓
```

```text
Base correcte

✓
```

```text
Produit conforme

✓
```

Ces validations garantissent la qualité.

---

# Ordonnancement

Les opérations possèdent un ordre.

Exemple :

```text
1

Étaler
```

↓

```text
2

Base
```

↓

```text
3

Mozzarella
```

↓

```text
4

Ingrédients
```

Cet ordre appartient à la recette.

Il ne dépend jamais du Scheduler.

---

# Dépendances internes

Certaines opérations dépendent d'autres opérations.

Exemple :

```text
Étaler

↓

Base

↓

Mozzarella
```

La recette définit ces dépendances.

Le Scheduler les ignore.

Il manipule uniquement la Work Unit globale.

---

# Opérations optionnelles

Une opération peut être conditionnelle.

Exemple :

```text
Supplément parmesan

↓

Oui

↓

Ajouter parmesan
```

Sinon :

```text
Ignorer
```

La recette gère ces variantes.

---

# Réutilisation

Une même opération peut être utilisée dans plusieurs recettes.

Exemple :

```text
Sortir du four
```

est utilisée par :

- Regina ;
- Piccante ;
- Napolitaine ;
- Chèvre miel.

Cette mutualisation réduit fortement les duplications.

---

# Héritage

Une recette peut hériter d'une autre.

Exemple :

```text
Pizza standard
```

↓

```text
Regina
```

↓

```text
Regina XL
```

La recette dérivée ajoute ou modifie uniquement les éléments nécessaires.

---

# Composition

Une recette peut également être composée.

Exemple :

```text
Pizza

+

Post-cuisson

+

Mise en boîte
```

↓

```text
Recette complète
```

Cette approche favorise la modularité.

---

# Invariants

Une recette respecte toujours les règles suivantes.

- Une recette est indépendante du Scheduler.
- Une recette est indépendante des commandes.
- Une recette décrit uniquement le savoir-faire.
- Les opérations sont ordonnées.
- Les variantes restent compatibles avec la recette principale.
- Les paramètres ne modifient jamais la structure générale.

Ces propriétés garantissent que les recettes resteront simples à maintenir et réutilisables.

La partie suivante décrira le cycle de vie d'une recette ainsi que son interaction avec les Work Units et les opérateurs.

---

# Cycle de vie des recettes

Une recette est un objet de référence.

Elle est créée avant toute production.

Elle est ensuite sélectionnée par une Work Unit.

Enfin, elle est exécutée par un opérateur ou une ressource.

Une recette n'est jamais modifiée pendant son exécution.

---

# Cycle de vie

Une recette suit le cycle suivant.

```text
Création

↓

Validation

↓

Publication

↓

Sélection

↓

Exécution

↓

Archivage
```

Chaque étape possède une responsabilité précise.

---

# Création

Une recette est créée par les responsables métier.

Elle décrit le savoir-faire attendu.

Exemple :

```text
Chèvre miel

↓

Préparation

↓

Post-cuisson

↓

Contrôles
```

À ce stade,

aucune Work Unit n'existe encore.

---

# Validation

Avant publication,

la recette est validée.

La validation porte notamment sur :

- la cohérence des opérations ;
- l'ordre d'exécution ;
- les paramètres ;
- les variantes ;
- les durées indicatives.

Une recette invalide ne peut jamais être utilisée.

---

# Publication

Une recette validée devient disponible.

Exemple :

```text
Recipe

Version 1.2

↓

Published
```

Les nouvelles Work Units pourront désormais la référencer.

---

# Sélection

Lorsqu'une Production Unit est créée,

le moteur sélectionne la recette appropriée.

Exemple :

```text
Production Unit

↓

Chèvre miel

↓

Recipe V1.2
```

La référence est figée.

Même si une nouvelle version apparaît ensuite,

la Work Unit continue d'utiliser la recette sélectionnée.

---

# Exécution

Une fois la Work Unit prête,

l'opérateur exécute les opérations décrites.

Exemple :

```text
Étaler

↓

Base

↓

Mozzarella

↓

Chèvre

↓

Validation
```

La recette guide l'exécution.

Elle ne pilote jamais l'opérateur.

---

# Versionnement

Chaque recette possède un numéro de version.

Exemple :

```text
Pizza Regina

↓

V1.0
```

↓

```text
V1.1
```

↓

```text
V2.0
```

Chaque version reste disponible pour les productions déjà commencées.

---

# Compatibilité

Une nouvelle version ne modifie jamais une Work Unit existante.

Exemple :

```text
WU-154

↓

Recipe V1.0
```

Même après publication de :

```text
Recipe V2.0
```

WU-154 continue d'utiliser V1.0.

Cette règle garantit la reproductibilité.

---

# Archivage

Une recette peut être retirée.

Exemple :

```text
Recipe

↓

Archived
```

Elle ne peut plus être sélectionnée.

En revanche,

les anciennes productions continuent de la référencer.

---

# Évolution

Une recette peut évoluer pour :

- améliorer un geste ;
- modifier un ingrédient ;
- changer une quantité ;
- ajouter un contrôle.

Ces évolutions produisent toujours une nouvelle version.

Jamais une modification directe.

---

# Exécution partielle

Toutes les opérations ne sont pas forcément réalisées.

Exemple :

```text
Supplément parmesan

↓

Absent
```

↓

L'opération est ignorée.

La recette prévoit ces cas.

---

# Échec

Une opération peut échouer.

Exemple :

```text
Produit tombé

↓

Reprise
```

La recette ne décide pas de la reprise.

Elle décrit simplement comment réaliser correctement le produit.

Le Scheduler créera une nouvelle Production Unit si nécessaire.

---

# Mesure

Pendant l'exécution,

le moteur peut mesurer :

- la durée réelle ;
- les validations ;
- les reprises ;
- les écarts.

Ces informations alimentent le moteur d'apprentissage.

La recette reste inchangée.

---

# Apprentissage

Le moteur d'apprentissage ne modifie jamais directement une recette.

Il peut suggérer :

- une durée plus réaliste ;
- une meilleure estimation ;
- un point de vigilance.

Toute modification de la recette reste une décision humaine.

---

# Réutilisation

Une même recette peut être utilisée simultanément par plusieurs Work Units.

Exemple :

```text
WU-101

↓

Recipe Regina V2.1
```

```text
WU-102

↓

Recipe Regina V2.1
```

Chaque Work Unit possède sa propre exécution.

La recette reste partagée.

---

# Interaction avec le Scheduler

Le Scheduler ne consulte jamais le contenu d'une recette.

Il manipule uniquement :

```text
Preparation

Cooking

Finishing
```

Les opérations internes restent invisibles.

Cette séparation évite un fort couplage.

---

# Interaction avec les opérateurs

Les opérateurs consultent les recettes.

Ils produisent ensuite des événements.

Exemple :

```text
Operation terminée

↓

WorkCompleted
```

Le Scheduler ne reçoit jamais :

```text
Étaler terminé
```

Il reçoit uniquement :

```text
Preparation Completed
```

Cette abstraction simplifie fortement le moteur.

---

# Invariants

Le cycle de vie des recettes respecte toujours les règles suivantes.

- Une recette est immuable après publication.
- Une Work Unit référence une seule version de recette.
- Les anciennes versions restent consultables.
- Les recettes sont indépendantes des Work Units.
- Les opérateurs exécutent les recettes.
- Le Scheduler ignore les opérations internes.
- Les modifications produisent toujours une nouvelle version.

Ces propriétés garantissent un système reproductible, stable et facilement évolutif.

La partie suivante décrira les opérations élémentaires qui composent une recette ainsi que leur rôle dans l'architecture globale.

---

# Architecture des opérations

Les opérations constituent le niveau le plus fin d'une recette.

Elles représentent les gestes élémentaires nécessaires à la réalisation d'une Work Unit.

Le Scheduler ne connaît jamais les opérations.

Il manipule uniquement les Work Units.

Les opérations sont exécutées localement par l'opérateur ou par une ressource.

---

# Hiérarchie

```text
Commande

↓

Production Unit

↓

Workflow

↓

Work Unit

↓

Recipe

↓

Operations
```

Chaque niveau possède une responsabilité différente.

Les opérations représentent uniquement le savoir-faire.

---

# Définition

Une opération est une action indivisible.

Exemples :

```text
Prendre un pâton
```

```text
Étaler la pâte
```

```text
Ajouter la mozzarella
```

```text
Mettre au four
```

```text
Ajouter le miel
```

Une opération ne doit jamais être découpée par le Scheduler.

---

# Structure

Une opération possède la structure suivante.

```text
Operation

├── id
├── sequence
├── name
├── description
├── estimatedDuration
├── requiredResources
├── requiredSkills
├── validations
├── optional
└── parameters
```

Cette structure reste indépendante du moteur de planification.

---

# Ordonnancement

Les opérations sont exécutées dans un ordre défini.

Exemple :

```text
1

Prendre un pâton

↓

2

Étaler

↓

3

Base

↓

4

Mozzarella

↓

5

Ingrédients
```

Cet ordre appartient exclusivement à la recette.

---

# Dépendances

Une opération peut dépendre d'une autre.

Exemple :

```text
Étaler

↓

Base

↓

Mozzarella
```

L'opération "Base" ne peut commencer que lorsque "Étaler" est terminée.

Ces dépendances restent internes à la recette.

---

# Opérations parallèles

Certaines opérations peuvent être réalisées simultanément.

Exemple :

```text
Préparer la boîte
```

pendant que :

```text
La pizza cuit
```

La recette peut déclarer ces possibilités.

Le Scheduler continue de voir une seule Work Unit.

---

# Ressources nécessaires

Une opération peut nécessiter certaines ressources.

Exemple :

```text
Étaler

↓

Plan de travail
```

```text
Cuisson

↓

Four
```

```text
Découpe

↓

Roulette
```

Ces besoins servent principalement à guider l'opérateur.

---

# Compétences

Certaines opérations nécessitent un savoir-faire particulier.

Exemple :

```text
Façonner une pâte napolitaine
```

ou

```text
Contrôler une cuisson
```

Ces informations pourront être utilisées ultérieurement pour affecter des opérateurs selon leurs compétences.

---

# Paramètres

Une opération accepte des paramètres.

Exemple :

```text
Ajouter mozzarella

↓

120 g
```

ou

```text
Cuisson

↓

90 secondes
```

Ces paramètres sont fournis par la recette.

---

# Validations

Une opération peut imposer un contrôle.

Exemple :

```text
Base correcte

✓
```

```text
Température atteinte

✓
```

```text
Aspect conforme

✓
```

Les validations améliorent la qualité de production.

---

# Opérations optionnelles

Une opération peut être conditionnelle.

Exemple :

```text
Supplément parmesan

↓

Oui

↓

Ajouter parmesan
```

Sinon :

```text
Ignorer
```

Cette logique appartient exclusivement à la recette.

---

# Opérations réutilisables

Une même opération peut être utilisée dans plusieurs recettes.

Exemple :

```text
Sortir du four
```

est utilisée par presque toutes les pizzas.

Le système évite ainsi la duplication.

---

# Groupes d'opérations

Une recette peut regrouper plusieurs opérations.

Exemple :

```text
Préparation

├── Étaler
├── Base
├── Garniture
```

```text
Post-cuisson

├── Contrôle
├── Miel
├── Mise en boîte
```

Ces regroupements améliorent la lisibilité.

---

# Exemple complet

```text
Recipe

Chèvre miel

↓

Préparation

↓

1 Étaler

2 Crème de chèvre

3 Mozzarella

4 Chèvre

↓

Cooking

↓

Finishing

↓

1 Sortir

2 Ajouter miel

3 Contrôle

4 Mise en boîte
```

Le Scheduler ne voit jamais cette décomposition.

Il voit uniquement :

```text
Preparation

↓

Cooking

↓

Finishing
```

---

# Mesure

Chaque opération peut produire des mesures.

Exemple :

```text
Durée réelle

18 s
```

```text
Validation

OK
```

```text
Nouvelle tentative

Non
```

Ces mesures alimentent le moteur d'apprentissage.

---

# Événements internes

Les opérations peuvent produire des événements locaux.

Exemple :

```text
OperationStarted
```

```text
OperationCompleted
```

Ces événements restent internes à l'exécution.

Ils ne sont jamais utilisés directement par le Scheduler.

---

# Interaction avec les Work Units

Une Work Unit est considérée terminée lorsque toutes les opérations obligatoires de la recette sont terminées.

```text
Operations

↓

Toutes terminées

↓

WorkCompleted
```

Le Scheduler reçoit uniquement cet événement.

---

# Invariants

Les opérations respectent toujours les règles suivantes.

- Une opération appartient à une seule recette.
- Les opérations sont ordonnées.
- Les dépendances restent internes à la recette.
- Les opérations ne sont jamais planifiées individuellement.
- Les opérations peuvent être réutilisées.
- Les paramètres restent indépendants du Scheduler.
- Les événements d'opérations ne modifient jamais directement le ProductionPlan.

Ces propriétés permettent de conserver un découplage fort entre la planification et l'exécution.

La partie suivante décrira les mécanismes de validation, de qualité et de contrôle des recettes avant leur mise en production.

---

# Validation et contrôle qualité des recettes

Une recette représente le savoir-faire officiel de la production.

Avant de pouvoir être utilisée, elle doit être validée.

Cette validation garantit que toutes les Work Units produites à partir de cette recette seront exécutées de manière cohérente.

---

# Objectifs

La validation poursuit plusieurs objectifs.

- garantir la cohérence des opérations ;
- éviter les erreurs de conception ;
- assurer la reproductibilité ;
- maintenir un niveau de qualité constant.

Une recette non validée ne peut jamais être publiée.

---

# Pipeline de validation

Chaque recette suit le processus suivant.

```text
Création

↓

Validation structurelle

↓

Validation métier

↓

Validation temporelle

↓

Validation qualité

↓

Publication
```

Toutes les étapes doivent être validées.

---

# Validation structurelle

La recette est d'abord analysée d'un point de vue technique.

Le moteur vérifie notamment :

- présence des métadonnées ;
- présence des opérations ;
- ordre des opérations ;
- identifiants uniques ;
- paramètres obligatoires.

Exemple :

```text
Recipe

↓

Structure valide

✓
```

---

# Validation métier

La recette est ensuite confrontée aux règles métier.

Exemples :

- tous les ingrédients existent ;
- les bases sont compatibles ;
- les variantes sont cohérentes ;
- les opérations obligatoires sont présentes.

Une incohérence bloque immédiatement la publication.

---

# Validation des dépendances

Les dépendances entre opérations sont contrôlées.

Exemple valide :

```text
Étaler

↓

Base

↓

Mozzarella
```

Exemple interdit :

```text
Mozzarella

↓

Étaler
```

Aucun cycle ne doit exister.

---

# Validation temporelle

Les durées estimées sont contrôlées.

Exemple :

```text
Étaler

20 s
```

```text
Garnir

35 s
```

↓

```text
Préparation

55 s
```

Les durées doivent rester réalistes.

---

# Validation des variantes

Toutes les variantes sont vérifiées.

Exemple :

```text
Regina

↓

Tomate
```

```text
Regina

↓

Crème
```

Les deux variantes doivent produire une recette complète.

Aucune variante incomplète n'est autorisée.

---

# Validation des paramètres

Chaque paramètre est contrôlé.

Exemple :

```text
Mozzarella

120 g
```

↓

Valeur valide.

Exemple interdit :

```text
Mozzarella

-20 g
```

Les paramètres doivent respecter leurs contraintes.

---

# Validation des opérations optionnelles

Une recette doit rester valide même lorsqu'une opération optionnelle est ignorée.

Exemple :

```text
Parmesan

↓

Absent
```

↓

La recette reste complète.

---

# Validation des ressources

Chaque opération doit pouvoir être exécutée avec une ressource connue.

Exemple :

```text
Cuisson

↓

Four
```

Valide.

Exemple interdit :

```text
Cuisson

↓

Ressource inconnue
```

---

# Validation des compétences

Les compétences requises sont également contrôlées.

Exemple :

```text
Contrôle cuisson

↓

Compétence requise
```

Cette information permettra ultérieurement d'affecter les opérateurs les plus adaptés.

---

# Contrôle qualité

Une recette peut définir des points de contrôle.

Exemple :

```text
Base uniforme

✓
```

```text
Garniture complète

✓
```

```text
Aspect conforme

✓
```

Ces contrôles servent principalement à garantir la qualité du produit fini.

---

# Simulation

Avant publication,

une recette peut être simulée.

Exemple :

```text
Recipe

↓

Simulation

↓

Toutes les opérations

↓

Validation
```

Cette simulation détecte les erreurs avant leur utilisation en production.

---

# Publication

Une fois toutes les validations réussies,

la recette devient disponible.

```text
Recipe

↓

Validated

↓

Published
```

Les nouvelles Work Units pourront désormais l'utiliser.

---

# Rejet

En cas d'échec,

la recette reste en état :

```text
Draft
```

Elle ne peut être sélectionnée par aucune Production Unit.

Toutes les erreurs doivent être corrigées avant une nouvelle validation.

---

# Audit

Toutes les validations sont historisées.

Exemple :

```text
Recipe V2.1

↓

Validated

↓

2026-08-02

↓

Auteur

↓

Commentaires
```

Cette traçabilité facilite les évolutions futures.

---

# Invariants

La validation des recettes respecte toujours les règles suivantes.

- Une recette publiée est toujours valide.
- Une recette invalide ne peut jamais être utilisée.
- Toutes les variantes sont validées indépendamment.
- Les paramètres respectent leurs contraintes.
- Les dépendances ne contiennent jamais de cycle.
- Les opérations obligatoires sont toujours présentes.
- Les contrôles qualité restent indépendants du Scheduler.

Ces invariants garantissent que toutes les recettes utilisées par le moteur représentent un savoir-faire cohérent, reproductible et maîtrisé.

La partie suivante décrira l'intégration des recettes avec le moteur d'apprentissage ainsi que leur évolution au fil du temps.

---

# Évolution et apprentissage des recettes

Les recettes décrivent le savoir-faire de l'entreprise.

Elles doivent pouvoir évoluer.

En revanche, cette évolution doit rester totalement indépendante de la production en cours.

Une recette publiée ne change jamais.

Une évolution produit toujours une nouvelle version.

---

# Objectifs

L'évolution des recettes poursuit plusieurs objectifs.

- améliorer la qualité ;
- simplifier les gestes ;
- réduire les temps de préparation ;
- intégrer de nouveaux produits ;
- conserver l'historique des versions.

Le système ne modifie jamais automatiquement une recette.

---

# Principe fondamental

Le moteur d'apprentissage observe.

Il suggère.

L'humain décide.

Cette règle est absolue.

Le KDS ne modifie jamais seul une recette officielle.

---

# Sources d'apprentissage

Le moteur peut analyser plusieurs types de données.

```text
Durées réelles
```

↓

```text
Temps d'attente
```

↓

```text
Écarts de production
```

↓

```text
Corrections manuelles
```

↓

```text
Contrôles qualité
```

↓

```text
Historique des services
```

Toutes ces informations servent à améliorer les futures recettes.

---

# Durées observées

Chaque opération possède :

```text
Durée théorique
```

et

```text
Durée observée
```

Exemple :

```text
Étaler

Théorique

20 s

↓

Observée

24 s
```

Le moteur détecte progressivement les écarts.

---

# Suggestions

Lorsque des écarts deviennent significatifs,

le moteur peut produire une suggestion.

Exemple :

```text
Suggestion

↓

Étaler

20 s

↓

24 s
```

Cette suggestion n'est jamais appliquée automatiquement.

---

# Optimisation des opérations

Le moteur peut détecter :

- une opération trop longue ;
- une opération rarement utilisée ;
- une validation inutile ;
- une dépendance simplifiable.

Ces observations sont proposées au responsable métier.

---

# Analyse des variantes

Les variantes peuvent être comparées.

Exemple :

```text
Regina

Base tomate
```

VS

```text
Regina

Base crème
```

Le moteur peut constater :

- des temps différents ;
- des difficultés différentes ;
- des taux d'erreur différents.

Ces analyses restent informatives.

---

# Analyse des opérateurs

Les statistiques peuvent également être calculées par opérateur.

Exemple :

```text
Temps moyen

Pizzaiolo A
```

VS

```text
Pizzaiolo B
```

Ces données servent à :

- détecter des besoins de formation ;
- identifier les bonnes pratiques ;
- améliorer les estimations.

Elles ne doivent jamais être utilisées pour modifier automatiquement les recettes.

---

# Détection des anomalies

Le moteur peut identifier :

```text
Durée anormale
```

```text
Nombre élevé de reprises
```

```text
Validation souvent refusée
```

```text
Erreur récurrente
```

Ces anomalies déclenchent une analyse.

---

# Création d'une nouvelle version

Lorsqu'une évolution est acceptée,

une nouvelle recette est créée.

```text
Recipe V2.1

↓

Modification

↓

Recipe V2.2
```

L'ancienne version reste conservée.

---

# Migration

Les nouvelles Work Units utilisent :

```text
Recipe V2.2
```

Les anciennes Work Units continuent avec :

```text
Recipe V2.1
```

Aucune migration en cours de production n'est autorisée.

---

# Comparaison de versions

Deux recettes peuvent être comparées.

Exemple :

```text
V2.1

↓

Temps moyen

95 s
```

VS

```text
V2.2

↓

Temps moyen

88 s
```

Ces comparaisons facilitent les décisions d'évolution.

---

# Validation après évolution

Toute nouvelle version suit exactement le même processus de validation.

```text
Nouvelle recette

↓

Validation

↓

Publication
```

Aucune exception n'est autorisée.

---

# Archivage

Les anciennes versions restent disponibles.

Elles permettent :

- la reproduction d'une production passée ;
- l'analyse d'un incident ;
- la comparaison historique ;
- la compréhension des évolutions.

Le système ne supprime jamais une version ayant déjà été utilisée.

---

# Compatibilité avec le Scheduler

Le Scheduler ne connaît que :

```text
Recipe ID

Version
```

Il ne dépend jamais du contenu de la recette.

Ainsi,

une évolution de recette n'entraîne aucune modification du moteur de planification.

---

# Compatibilité avec le moteur d'apprentissage

Le moteur d'apprentissage agit comme un conseiller.

Il peut :

- proposer ;
- comparer ;
- mesurer ;
- détecter.

Il ne peut jamais :

- publier ;
- modifier ;
- supprimer une recette.

Cette séparation garantit la stabilité du système.

---

# Gouvernance

Toute modification d'une recette doit être :

- documentée ;
- validée ;
- versionnée ;
- historisée.

Chaque évolution doit être traçable.

---

# Invariants

L'évolution des recettes respecte toujours les règles suivantes.

- Une recette publiée est immuable.
- Une évolution produit une nouvelle version.
- Le moteur d'apprentissage ne modifie jamais une recette.
- Les Work Units conservent leur version de recette.
- Toutes les modifications sont historisées.
- Les suggestions restent consultatives.
- Les anciennes versions restent disponibles.

Ces principes garantissent un savoir-faire maîtrisé, reproductible et capable d'évoluer progressivement sans perturber la production.

La partie suivante présentera l'intégration des recettes avec les ressources du KDS ainsi que leur utilisation concrète par les différents postes de travail.

---

# Intégration des recettes avec le KDS

Les recettes ne constituent pas un composant isolé.

Elles interagissent avec plusieurs éléments du KDS tout en conservant une responsabilité unique : décrire le savoir-faire.

Cette section définit les interfaces entre les recettes et les autres composants du système.

---

# Architecture générale

```text
                 Production Unit
                        │
                        ▼
                   Work Unit
                        │
                        ▼
                     Recipe
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
  Opérations      Paramètres      Validations
                        │
                        ▼
                  Exécution locale
                        │
                        ▼
                    Événements
                        │
                        ▼
                    Scheduler
```

La recette ne communique jamais directement avec le Scheduler.

---

# Interaction avec les Production Units

Chaque Production Unit référence une recette.

Exemple :

```text
PU-001

↓

Recipe Regina V2.3
```

Cette référence est déterminée lors de la création de la Production Unit.

Elle ne change jamais.

---

# Interaction avec les Work Units

Une Work Unit utilise la recette correspondant à son étape.

Exemple :

```text
Preparation

↓

Recipe

↓

Opérations de préparation
```

```text
Finishing

↓

Recipe

↓

Opérations de post-cuisson
```

Une même recette peut donc être utilisée par plusieurs Work Units.

---

# Interaction avec le Scheduler

Le Scheduler ne connaît jamais :

- les ingrédients ;
- les opérations ;
- les paramètres.

Il manipule uniquement :

```text
Work Unit

Preparation
```

```text
Work Unit

Cooking
```

```text
Work Unit

Finishing
```

Cette séparation est volontaire.

---

# Interaction avec le Dispatcher

Le Dispatcher ne lit jamais le contenu d'une recette.

Il affecte uniquement :

```text
Work Unit

↓

Ressource
```

La recette sera ensuite exécutée localement.

---

# Interaction avec les ressources

Les ressources exécutent les opérations décrites.

Exemple :

```text
Four

↓

Cuisson
```

```text
Pizzaiolo

↓

Préparation
```

La recette décrit ce qui doit être réalisé.

La ressource réalise effectivement le travail.

---

# Interaction avec les opérateurs

Les opérateurs consultent les recettes.

Ils exécutent ensuite les opérations.

Ils produisent enfin des événements.

Exemple :

```text
Recipe

↓

Préparation

↓

Operation Completed

↓

WorkCompleted
```

La recette ne contrôle jamais l'opérateur.

---

# Interaction avec le ProductionPlan

Le ProductionPlan ne contient jamais une recette complète.

Il référence uniquement :

```text
Recipe ID

Version
```

Les interfaces récupèrent ensuite la recette correspondante si nécessaire.

Cette approche évite de dupliquer inutilement les données.

---

# Interaction avec les projections

Chaque projection décide du niveau de détail affiché.

Exemple :

Projection Pizzaiolo :

```text
Afficher

↓

Opérations
```

Projection Four :

```text
Afficher

↓

Instructions de cuisson
```

Projection Caisse :

```text
Aucune recette
```

Toutes les projections utilisent la même recette.

---

# Interaction avec le moteur d'apprentissage

Le moteur d'apprentissage observe les recettes.

Il collecte notamment :

- les durées ;
- les écarts ;
- les validations ;
- les reprises.

Il ne modifie jamais directement les recettes.

---

# Interaction avec les statistiques

Les recettes constituent une excellente source d'analyse.

Exemples :

```text
Temps moyen
```

```text
Temps par opération
```

```text
Nombre de reprises
```

```text
Durée moyenne par recette
```

Ces données permettent d'améliorer progressivement les processus.

---

# Interaction avec les tests

Chaque recette peut être testée indépendamment.

Exemple :

```text
Recipe

↓

Simulation

↓

Validation
```

Cette indépendance facilite énormément les tests automatiques.

---

# Compatibilité

Une évolution de recette ne doit jamais imposer :

- une modification du Scheduler ;
- une modification du Dispatcher ;
- une modification du ProductionPlan.

La recette constitue un composant totalement indépendant.

---

# Extensibilité

Cette architecture permet d'ajouter facilement :

- un nouveau produit ;
- une nouvelle variante ;
- une nouvelle étape ;
- une nouvelle validation.

Aucun autre composant n'a besoin d'être modifié.

---

# Exemple complet

```text
Commande

↓

Production Unit

↓

Work Unit

↓

Recipe V3.1

↓

Opérations

↓

Travail réalisé

↓

WorkCompleted

↓

Scheduler

↓

ProductionPlan
```

Chaque composant intervient uniquement dans son domaine de responsabilité.

---

# Invariants

L'intégration des recettes respecte toujours les règles suivantes.

- Les recettes restent indépendantes du Scheduler.
- Les Work Units référencent une seule version de recette.
- Les ressources exécutent les opérations sans modifier la recette.
- Le ProductionPlan ne contient jamais les recettes complètes.
- Les projections affichent uniquement les informations nécessaires.
- Le moteur d'apprentissage observe les recettes sans les modifier.
- Une évolution de recette n'entraîne jamais une modification de l'architecture.

Ces invariants garantissent un système modulaire, évolutif et facilement maintenable.

La dernière partie présentera la vision globale des recettes, leur place définitive dans l'architecture du KDS ainsi que les décisions d'architecture retenues.

---

# Vision globale des recettes

Les recettes constituent la mémoire technique du KDS.

Elles décrivent précisément la manière de fabriquer chaque produit, indépendamment de son contexte de production.

Elles ne prennent aucune décision.

Elles ne planifient aucun travail.

Elles représentent uniquement le savoir-faire métier.

Cette séparation garantit que les méthodes de fabrication peuvent évoluer sans modifier le moteur de planification.

---

# Position dans l'architecture

```text
                    Commande
                         │
                         ▼
                 Production Unit
                         │
                         ▼
                    Workflow
                         │
                         ▼
                    Work Unit
                         │
                         ▼
                     Recipe
                         │
                         ▼
                   Opérations
                         │
                         ▼
               Ressource / Opérateur
                         │
                         ▼
                    Événements
                         │
                         ▼
                    Scheduler
                         │
                         ▼
                 ProductionPlan
```

La recette constitue le lien entre la planification abstraite et l'exécution réelle.

---

# Séparation des responsabilités

L'architecture du KDS repose sur une séparation stricte des responsabilités.

| Composant | Responsabilité |
|------------|----------------|
| Production Unit | Décrire le produit à fabriquer. |
| Workflow | Décrire les étapes de production. |
| Work Unit | Décrire un travail planifiable. |
| Scheduler | Décider quand réaliser ce travail. |
| Recipe | Décrire comment réaliser ce travail. |
| Ressource | Exécuter le travail. |
| ProductionPlan | Décrire le plan obtenu. |

Chaque composant possède une responsabilité unique.

---

# Ce que les recettes apportent

Les recettes permettent :

- la standardisation de la production ;
- la transmission du savoir-faire ;
- la réduction des erreurs ;
- la reproductibilité ;
- l'amélioration continue ;
- la formation des nouveaux employés.

Elles deviennent le référentiel technique de l'entreprise.

---

# Compatibilité avec l'évolution du KDS

Cette architecture permet d'ajouter facilement :

## Nouveaux produits

Créer une nouvelle recette.

Aucun changement du Scheduler.

---

## Nouveaux ingrédients

Ajouter des paramètres.

Aucune modification des Work Units.

---

## Nouveaux postes

Créer une nouvelle projection.

Les recettes restent inchangées.

---

## Plusieurs établissements

Chaque établissement peut posséder :

```text
Recipe V3.2

Noirmoutier
```

ou

```text
Recipe V4.0

Le Mans
```

Tout en conservant la même architecture.

---

## Internationalisation

Les textes affichés dans les recettes pourront être traduits.

Exemple :

```text
Ajouter mozzarella
```

↓

```text
Add mozzarella
```

↓

```text
Aggiungere mozzarella
```

La logique métier reste identique.

---

# Compatibilité avec l'apprentissage

Le moteur d'apprentissage peut analyser :

- les durées ;
- les reprises ;
- les validations ;
- les performances.

Il produit ensuite :

```text
Suggestions
```

Jamais :

```text
Modifications automatiques
```

L'humain reste responsable du savoir-faire.

---

# Compatibilité avec les simulations

Les recettes peuvent être exécutées dans un environnement de simulation.

Exemple :

```text
Recipe

↓

Simulation

↓

Résultat attendu
```

Cette capacité facilitera :

- les tests ;
- les démonstrations ;
- la validation de nouvelles recettes.

---

# Compatibilité avec les statistiques

Les recettes pourront alimenter :

- les tableaux de bord ;
- les temps moyens ;
- les écarts ;
- les analyses qualité ;
- les performances par produit.

Leur structure reste adaptée à ces futurs développements.

---

# Décisions d'architecture

Les décisions suivantes sont considérées comme définitives.

| ID | Décision |
|----|----------|
| ADR-017 | Une recette décrit uniquement le savoir-faire. |
| ADR-018 | Une recette publiée est immuable. |
| ADR-019 | Une Work Unit référence une version unique de recette. |
| ADR-020 | Le Scheduler ne connaît jamais les opérations internes d'une recette. |
| ADR-021 | Les recettes sont versionnées et historisées. |
| ADR-022 | Le moteur d'apprentissage ne modifie jamais directement une recette. |
| ADR-023 | Les recettes restent indépendantes des ressources et des interfaces. |
| ADR-024 | Toute évolution d'une recette produit une nouvelle version. |

Ces décisions garantissent la stabilité du référentiel technique.

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

Il définit le savoir-faire utilisé lors de l'exécution des Work Units.

Il ne modifie aucun concept introduit dans les documents précédents.

---

# Vision à long terme

À terme, les recettes constitueront une bibliothèque complète du savoir-faire de la pizzeria.

Chaque nouveau produit, chaque variante et chaque amélioration seront intégrés sous forme de nouvelles versions, sans impacter le moteur de planification.

Cette architecture permettra au KDS de faire évoluer indépendamment :

- la planification ;
- les recettes ;
- les ressources ;
- les interfaces ;
- le moteur d'apprentissage.

Cette indépendance est essentielle pour garantir la pérennité du projet.

---

# Conclusion

Les recettes représentent la connaissance métier du KDS.

Elles transforment un simple système de gestion de commandes en un véritable système d'assistance à la production, capable de documenter, transmettre et faire évoluer le savoir-faire de l'entreprise.

En séparant clairement :

- **quoi produire** (Production Unit) ;
- **quel travail réaliser** (Work Unit) ;
- **quand le réaliser** (Scheduler) ;
- **comment le réaliser** (Recipe) ;
- **où l'exécuter** (Dispatcher / Ressources) ;
- **comment le présenter** (ProductionPlan / Projections) ;

le KDS adopte une architecture modulaire, robuste et évolutive, adaptée aussi bien aux besoins actuels de la pizzeria qu'à ses évolutions futures.

Le document suivant (**18_ARCHITECTURE_RESOURCES.md**) décrira les ressources de production (pizzaiolos, fours, postes Pani'NO, matériel) et leur interaction avec le Scheduler et le Dispatcher.

---

# Fin du document