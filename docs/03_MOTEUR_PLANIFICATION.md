# 03_MOTEUR_PLANIFICATION.md

# Moteur de planification

> Version : 2.1  
> Statut : Document de référence  
> Dépendances :
>
> - `00_ARCHITECTURE_GLOBALE.md`
> - `01_VISION_GENERALE.md`
> - `02_MODELE_DE_DONNEES.md`

---

# 1. Objectif

Le moteur de planification transforme l’état réel de la pizzeria en un plan de production prévisionnel.

Il organise les Work Units en tenant compte :

- des heures de remise ;
- des dépendances entre les tâches ;
- des ressources disponibles ;
- des capacités physiques ;
- de l’avancement réel ;
- des commandes déjà connues ;
- des commandes spontanées ;
- des fournées projetées.

Le moteur de planification ne choisit pas ce que l’utilisateur doit faire.

Il prépare les données nécessaires au moteur de décision.

Sa question principale est :

> Comment répartir le travail restant dans le temps et sur les ressources disponibles sans créer une situation irréalisable ?

---

# 2. Responsabilités

Le moteur de planification est responsable de :

- générer les plages et créneaux de service ;
- décomposer la charge dans le temps ;
- calculer la charge résiduelle ;
- déterminer les Work Units disponibles, bloquées et terminées ;
- calculer les dates de début au plus tôt et au plus tard ;
- projeter l’utilisation des ressources ;
- construire des fournées provisoires ;
- répartir les grosses commandes sur plusieurs cycles ;
- anticiper les commandes planifiées ;
- préserver une capacité potentielle pour les commandes spontanées ;
- recalculer le plan après chaque événement métier ;
- produire un résultat exploitable par le moteur de décision.

Le moteur de planification ne doit pas :

- choisir définitivement un créneau client ;
- imposer une action à un opérateur ;
- modifier une Work Unit verrouillée ;
- contenir de logique d’interface ;
- envoyer directement une commande à un poste.

---

# 3. Entrées du moteur

Le moteur reçoit un instantané cohérent de l’état métier.

```ts
type PlanningInput = {
  now: string

  orders: Order[]
  orderItems: OrderItem[]
  productionUnits: ProductionUnit[]
  workUnits: WorkUnit[]

  batches: Batch[]
  resources: Resource[]

  serviceWindows: ServiceWindow[]
  configuration: PlanningConfiguration
}
```

Toutes les données doivent provenir d’une même version cohérente de l’état.

Le moteur ne doit pas effectuer de lectures réseau au milieu d’un calcul.

---

# 4. Configuration métier

Les constantes doivent être centralisées.

```ts
type PlanningConfiguration = {
  serviceWindows: ServiceWindow[]

  productionSlotMinutes: number

  ovenCapacity: number
  worktopCapacity: number

  maxPreparationLeadMinutes: number
  maxBakingLeadMinutes: number

  spontaneousReserveWindowMinutes: number
  spontaneousReserveTarget: number

  planningLookaheadMinutes: number

  allowIncompleteBatchProjection: boolean
}
```

Configuration initiale recommandée :

```ts
export const PLANNING_CONFIGURATION = {
  serviceWindows: [
    {
      id: "lunch",
      start: "12:00",
      end: "14:00"
    },
    {
      id: "evening",
      start: "19:00",
      end: "22:30"
    }
  ],

  productionSlotMinutes: 5,

  ovenCapacity: 4,
  worktopCapacity: 4,

  maxPreparationLeadMinutes: 30,
  maxBakingLeadMinutes: 10,

  spontaneousReserveWindowMinutes: 15,
  spontaneousReserveTarget: 4,

  planningLookaheadMinutes: 30,

  allowIncompleteBatchProjection: true
}
```

Ces valeurs sont des paramètres initiaux.

Elles doivent pouvoir être ajustées après observation du fonctionnement réel.

---

# 5. Plages de service

Les créneaux proposés doivent couvrir toute la plage restante du service concerné.

## Service du midi

```text
12 h 00 → 14 h 00
```

## Service du soir

```text
19 h 00 → 22 h 30
```

Le moteur ne doit jamais limiter artificiellement la projection à une heure après l’instant actuel.

---

# 6. Génération des créneaux de remise

Créer une fonction pure :

```ts
generatePickupSlots({
  now,
  serviceWindows,
  intervalMinutes
})
```

Comportement attendu :

- avant le service du midi : proposer tout le service du midi ;
- pendant le midi : proposer les créneaux restants jusqu’à 14 h 00 ;
- entre les deux services : proposer le service du soir ;
- pendant le soir : proposer les créneaux restants jusqu’à 22 h 30 ;
- après le dernier service : ne pas proposer de créneaux passés du jour ;
- arrondir au prochain intervalle valide ;
- conserver l’ordre chronologique.

Les créneaux du midi et du soir ne doivent pas être mélangés sans indication explicite.

---

# 7. Créneaux de production

Les créneaux de production sont internes.

Ils permettent de projeter la charge sur une grille temporelle.

```ts
generateProductionSlots({
  serviceWindow,
  intervalMinutes
})
```

Un créneau de production ne représente pas nécessairement :

- une fournée réelle ;
- le début exact d’une tâche ;
- l’heure de remise client.

Il sert à agréger et visualiser la charge prévisionnelle.

---

# 8. Heure de remise et échéances

Chaque Work Unit peut être rattachée à une échéance finale.

Pour une commande :

```ts
pickupDeadline = order.pickupTime
```

Le moteur doit ensuite calculer :

- `earliestStartAt` ;
- `latestStartAt` ;
- `plannedStartAt` ;
- `plannedEndAt`.

Ces valeurs doivent rester distinctes.

---

# 9. Calcul du début au plus tôt

Le début au plus tôt dépend notamment :

- de la fenêtre d’anticipation autorisée ;
- des dépendances ;
- de la disponibilité des ressources ;
- de règles spécifiques au type de Work Unit.

Exemple pour une préparation pizza :

```ts
earliestStartAt =
  pickupDeadline - maxPreparationLeadMinutes
```

Exemple pour une cuisson :

```ts
earliestStartAt =
  pickupDeadline - maxBakingLeadMinutes
```

Exemple pour un OF pain Pani’NO :

```ts
earliestStartAt =
  pickupDeadline - 30 minutes
```

Si la commande est reçue après cette heure, la Work Unit devient disponible immédiatement.

---

# 10. Calcul du début au plus tard

Le moteur doit calculer une heure limite de démarrage à partir :

- de la durée estimée ;
- des dépendances restantes ;
- du temps de cuisson ;
- de la post-cuisson ;
- du temps de regroupement ;
- de l’heure de remise.

Exemple simplifié :

```ts
latestStartAt =
  pickupDeadline
  - remainingDependencyDurations
  - estimatedDurationSeconds
```

Une Work Unit dont `latestStartAt` est dépassé contribue au retard estimé.

---

# 11. Graphe de dépendances

Le moteur doit construire un graphe orienté des Work Units.

Exemple pizza :

```text
PREPARE_PIZZA
      ↓
LOAD_OVEN
      ↓
BAKE_BATCH
      ↓
UNLOAD_OVEN
      ↓
POST_BAKE
      ↓
ASSEMBLE_ORDER
```

Exemple sans post-cuisson :

```text
PREPARE_PIZZA
      ↓
LOAD_OVEN
      ↓
BAKE_BATCH
      ↓
UNLOAD_OVEN
      ↓
ASSEMBLE_ORDER
```

Exemple Pani’NO :

```text
PREPARE_PANINO_BREAD
      ↓
ASSEMBLE_PANINO
      ↓
COOK_PANINO
      ↓
ASSEMBLE_ORDER
```

Le moteur doit détecter :

- les Work Units sans dépendance ;
- celles dont les dépendances sont terminées ;
- celles encore bloquées ;
- les cycles invalides dans le graphe.

Un cycle de dépendance doit être considéré comme une erreur métier.

---

# 12. Disponibilité d’une Work Unit

Une Work Unit est `available` lorsque :

- toutes ses dépendances obligatoires sont satisfaites ;
- son heure de début au plus tôt est atteinte ;
- les ressources indispensables existent ;
- elle n’est ni terminée ni annulée ;
- elle n’est pas verrouillée par une autre action incompatible.

```ts
isWorkUnitAvailable(workUnit, context)
```

Une Work Unit peut être disponible sans être recommandée.

La recommandation appartient au moteur de décision.

---

# 13. Work Units bloquées

Une Work Unit peut être bloquée par :

- une dépendance non terminée ;
- une ressource indisponible ;
- une validation manuelle manquante ;
- une Work Unit précédente encore active ;
- une contrainte de production.

Le résultat de planification doit distinguer :

```ts
type WorkUnitBlock = {
  workUnitId: string
  level: "soft" | "hard"
  reasons: string[]
}
```

Exemples :

```text
dependency_not_completed
resource_unavailable
bread_not_ready
oven_full
manual_validation_required
too_early_for_baking
```

---

# 14. Charge résiduelle

La charge résiduelle correspond au travail non terminé.

Elle doit être calculée à partir des Work Units :

- non terminées ;
- non annulées.

```ts
computeResidualLoad(workUnits)
```

La charge résiduelle peut être exprimée selon plusieurs axes :

```ts
type ResidualLoad = {
  remainingWorkUnits: number
  estimatedRemainingSeconds: number

  byWorkstation: Record<
    WorkstationType,
    WorkstationResidualLoad
  >

  byPickupTime: Record<string, PickupResidualLoad>
}
```

Une pizza `ready` ne doit plus charger :

- le Pizzaiolo ;
- le Four ;
- la projection des fournées.

Elle peut encore mobiliser une zone de stockage ou de remise, mais cette charge doit rester distincte.

---

# 15. Charge par poste

Le moteur doit calculer une charge indépendante pour chaque poste.

```ts
type WorkstationResidualLoad = {
  waitingSeconds: number
  activeSeconds: number
  blockedSeconds: number

  availableWorkUnits: number
  activeWorkUnits: number
  blockedWorkUnits: number
}
```

Le nombre de pizzas ne doit pas être la seule unité de mesure.

Le temps estimé et les dépendances doivent être pris en compte.

---

# 16. Projection des ressources

Le moteur doit projeter l’utilisation des ressources limitées.

Exemples :

- quatre positions sur le plan de travail ;
- quatre places au four ;
- capacité de la friteuse ;
- disponibilité du poste Pani’NO ;
- disponibilité d’un opérateur.

Une allocation prévisionnelle ne doit pas dépasser la capacité d’une ressource.

```ts
projectResourceUsage({
  workUnits,
  resources,
  productionSlots
})
```

---

# 17. Plan de travail du Pizzaiolo

Le plan de travail constitue une ressource à quatre positions.

Le moteur peut projeter de futures tâches, mais seules les pizzas réellement placées sur un disque occupent physiquement cette ressource.

Une affectation devient verrouillée lorsqu’elle correspond à une action réelle.

Le moteur ne doit pas remplir automatiquement les quatre disques sans action ou validation si l’interface prévoit une sélection humaine.

---

# 18. Constitution des fournées projetées

Le moteur doit construire des fournées provisoires d’une capacité maximale de quatre pizzas.

```ts
buildProjectedBatches({
  productionUnits,
  workUnits,
  pickupDeadlines,
  existingBatches,
  capacity: 4
})
```

Une fournée projetée peut contenir des pizzas issues :

- de plusieurs commandes ;
- de plusieurs heures de remise proches ;
- de bases différentes.

---

# 19. Priorités de constitution des fournées

Appliquer cet ordre :

1. respecter les échéances de remise ;
2. éviter les retards ;
3. remplir les quatre places ;
4. terminer les commandes déjà commencées ;
5. compléter les fournées partielles ;
6. respecter autant que possible l’ordre des commandes ;
7. éviter une pizza isolée dans une fournée suivante ;
8. regrouper les bases lorsque cela n’entre pas en conflit avec les priorités précédentes ;
9. limiter les changements de préparation inutiles.

La similitude des bases est une optimisation secondaire.

Elle ne doit jamais conduire à laisser volontairement une place vide alors qu’une pizza compatible est disponible.

---

# 20. Cas de référence : compléter une fournée

Charge existante :

```text
3 pizzas
```

Nouvelle commande :

```text
1 pizza
```

Résultat projeté :

```text
4/4
```

Le moteur doit reconnaître :

- une fournée complète ;
- aucune nouvelle fournée partielle ;
- aucune pizza isolée.

---

# 21. Répartition d’une grosse commande

Une commande de six pizzas ne doit pas être entièrement affectée à son heure de remise.

Exemple :

```text
6 pizzas à 19 h 30
```

Projection possible :

```text
19 h 25 : 4 pizzas
19 h 30 : 2 pizzas
```

La fournée partielle restante doit pouvoir recevoir des pizzas d’autres commandes proches.

---

# 22. Chevauchement de commandes

Le chevauchement est normal.

Exemple :

Commande A :

```text
3 pizzas à 19 h 25
```

Commande B :

```text
5 pizzas à 19 h 30
```

Projection souhaitée :

```text
Fournée 1 :
3 pizzas A
1 pizza B

Fournée 2 :
4 pizzas B
```

Le moteur ne doit pas traiter les commandes comme des blocs indivisibles.

---

# 23. Commandes planifiées et spontanées

Une commande planifiée est connue assez tôt pour être anticipée.

Une commande spontanée arrive pendant le service.

Le moteur doit pouvoir avancer la charge planifiée afin de dégager de la capacité future.

La planification ne doit cependant pas :

- cuire excessivement tôt ;
- encombrer le plan de travail ;
- créer une accumulation irréaliste ;
- retarder une commande plus urgente.

---

# 24. Réserve de capacité

La réserve représente une capacité que l’on souhaite conserver pour absorber une commande spontanée.

Elle doit être calculée dans une fenêtre glissante.

```ts
computeCapacityReserve({
  workstation,
  windowStart,
  windowEnd,
  projectedUsage,
  targetCapacity
})
```

La réserve :

- n’est jamais ajoutée à la charge ;
- peut être consommée ;
- ne constitue pas une contrainte dure ;
- ne doit pas rendre un plan irréalisable uniquement parce qu’elle disparaît.

Le moteur de planification calcule la réserve disponible.

Le moteur de décision détermine l’influence de cette réserve sur une recommandation.

---

# 25. Anticipation et libération de capacité

Une commande déjà produite en avance ne doit plus charger son heure de remise.

Exemple :

```text
4 pizzas pour 19 h 30
toutes prêtes à 19 h 05
```

À partir de 19 h 05 :

```text
charge résiduelle pour 19 h 30 = 0
```

Le créneau peut être réutilisé pour projeter une nouvelle commande.

Cette libération doit être immédiate après le passage à `ready`.

---

# 26. Fournées provisoires et verrouillées

## Fournée provisoire

Elle peut être :

- recomposée ;
- déplacée ;
- complétée ;
- supprimée.

## Fournée verrouillée

Elle ne peut plus être modifiée automatiquement.

Une fournée doit être verrouillée lorsqu’une action réelle l’engage, par exemple :

- confirmation du Pizzaiolo ;
- affectation physique sur le plan de travail ;
- transmission au Four ;
- démarrage de la cuisson.

Le moteur doit préserver l’historique de la composition verrouillée.

---

# 27. Ordonnancement des Work Units

Le moteur doit produire un ordre prévisionnel, mais pas une décision finale.

Pour chaque Work Unit, le plan peut contenir :

```ts
type PlannedWorkUnit = {
  workUnitId: string

  plannedStartAt?: string | null
  plannedEndAt?: string | null

  assignedResourceId?: string | null
  assignedProductionSlot?: string | null
  projectedBatchId?: string | null

  planningReasons: string[]
}
```

Exemples de raisons :

```text
deadline_proximity
dependency_released
batch_completion
planned_order_anticipation
resource_availability
partial_batch_completion
```

---

# 28. Stratégie de planification initiale

Une première implémentation stable peut utiliser une stratégie gloutonne déterministe.

Ordre recommandé :

1. conserver les Work Units verrouillées ;
2. exclure les Work Units terminées et annulées ;
3. résoudre les dépendances ;
4. calculer les échéances ;
5. trier par `latestStartAt` ;
6. favoriser les commandes commencées ;
7. construire les fournées complètes ;
8. compléter avec les commandes suivantes compatibles ;
9. affecter les ressources disponibles ;
10. calculer la réserve restante ;
11. produire les résultats de planification.

Cette stratégie doit être isolée afin de pouvoir être remplacée plus tard par un ordonnanceur plus avancé.

---

# 29. Déterminisme

À état identique et configuration identique, le moteur doit produire le même résultat.

Éviter :

- les tris non stables ;
- les choix aléatoires ;
- les dépendances à l’ordre de retour réseau ;
- les timestamps générés pendant les comparaisons.

Tous les critères de départage doivent être explicites.

Exemple :

1. échéance ;
2. commande déjà commencée ;
3. date de création ;
4. identifiant stable.

---

# 30. Résultat du moteur

```ts
type PlanningResult = {
  generatedAt: string

  pickupSlots: PickupSlot[]
  productionSlots: ProductionSlot[]

  plannedWorkUnits: PlannedWorkUnit[]
  availableWorkUnitIds: string[]
  blockedWorkUnits: WorkUnitBlock[]

  projectedBatches: Batch[]
  lockedBatches: Batch[]

  residualLoad: ResidualLoad
  resourceUsage: ResourceProjection[]

  capacityReserves: CapacityReserve[]

  delayProjection: DelayProjection

  warnings: PlanningWarning[]
}
```

---

# 31. Projection du retard

Le moteur doit calculer le retard prévisionnel.

```ts
type DelayProjection = {
  currentDelayMinutes: number
  projectedMaxDelayMinutes: number

  delayedOrderIds: string[]
  endangeredOrderIds: string[]
}
```

Une commande est :

- `endangered` si le plan actuel laisse peu de marge ;
- `delayed` si l’échéance prévisionnelle est dépassée.

Le moteur de décision utilisera ces informations pour ajuster les recommandations.

---

# 32. Avertissements de planification

```ts
type PlanningWarning =
  | {
      type: "dependency_cycle"
      workUnitIds: string[]
    }
  | {
      type: "missing_resource"
      workUnitId: string
    }
  | {
      type: "capacity_exceeded"
      resourceId: string
      at: string
    }
  | {
      type: "missing_duration"
      workUnitId: string
    }
  | {
      type: "unplannable_before_deadline"
      workUnitId: string
    }
```

Le moteur ne doit pas planter silencieusement.

Il doit retourner un résultat partiel accompagné d’avertissements lorsque cela reste possible.

---

# 33. Recalcul

Le moteur doit être recalculé après les événements suivants :

- `order.created` ;
- `order.updated` ;
- `order.cancelled` ;
- `production_unit.status_changed` ;
- `work_unit.started` ;
- `work_unit.completed` ;
- `work_unit.cancelled` ;
- `batch.locked` ;
- `batch.started` ;
- `batch.completed` ;
- `resource.status_changed`.

Le recalcul peut être débouncé techniquement, mais le résultat doit rester rapidement synchronisé.

---

# 34. Idempotence

Un même événement traité plusieurs fois ne doit pas créer :

- de Work Unit dupliquée ;
- de fournées dupliquées ;
- d’affectations en double ;
- de charge artificielle.

Les identifiants et les opérations doivent permettre un traitement idempotent.

---

# 35. Compatibilité avec les anciennes données

Pendant la migration :

- les commandes sans Work Units doivent pouvoir être décomposées à la volée ;
- les quantités agrégées doivent pouvoir générer des Production Units ;
- les anciens états doivent être convertis vers les états normalisés ;
- les Work Units manquantes doivent être créées sans dupliquer les existantes ;
- une ancienne commande doit rester affichable même si sa planification est partielle.

Prévoir un indicateur :

```ts
planningDataQuality:
  | "complete"
  | "reconstructed"
  | "partial"
  | "legacy"
```

---

# 36. Performances

Le moteur doit rester utilisable pendant un rush comportant :

- de nombreuses commandes simultanées ;
- des commandes jusqu’à 15 pizzas ;
- exceptionnellement environ 30 pizzas ;
- plusieurs centaines de Work Units dans le service.

Objectifs initiaux :

- calcul local rapide ;
- absence de blocage perceptible de l’interface ;
- recalcul incrémental envisageable plus tard ;
- aucun appel réseau dans les fonctions pures.

---

# 37. Journalisation en mode test

En mode test, le moteur doit pouvoir exposer :

- les Work Units générées ;
- leur état de dépendance ;
- les affectations prévues ;
- les fournées projetées ;
- les ressources saturées ;
- la charge résiduelle ;
- les avertissements ;
- les raisons de planification.

Ces données servent au débogage.

Elles ne doivent pas alourdir l’interface de production.

---

# 38. Tests obligatoires

## Génération des créneaux

- 11 h 30 → 12 h 00 à 14 h 00 ;
- 12 h 37 → prochain intervalle jusqu’à 14 h 00 ;
- 17 h 14 → 19 h 00 à 22 h 30 ;
- 20 h 10 → créneaux restants jusqu’à 22 h 30 ;
- après 22 h 30 → aucun créneau passé.

## Charge résiduelle

- pizza en attente → charge active ;
- pizza au four → charge active ;
- pizza en post-cuisson → charge active ;
- pizza prête → charge nulle pour la production ;
- pizza annulée → charge nulle.

## Dépendances

- post-cuisson bloquée avant la cuisson ;
- assemblage Pani’NO bloqué sans pain ;
- Work Unit disponible après dépendance terminée ;
- cycle de dépendance détecté.

## Fournées

- `3 + 1 = 4` ;
- `1 + 3 = 4` ;
- `7 + 1 = 8` ;
- `4 + 1 = 5` crée une fournée partielle ;
- 6 pizzas → `4 + 2` ;
- 6 pizzas + 2 pizzas compatibles → `4 + 4` ;
- 3 pizzas à 19 h 25 + 5 pizzas à 19 h 30 → `4 + 4`.

## Anticipation

- commande de 19 h 30 visible à la préparation dès 19 h 00 ;
- cuisson non recommandée trop tôt ;
- commande planifiée terminée en avance libère la capacité.

## Verrouillage

- fournée provisoire modifiable ;
- fournée verrouillée inchangée après nouvelle commande ;
- Work Unit en cours non déplacée.

## Ressources

- maximum quatre pizzas sur le plan de travail ;
- maximum quatre pizzas dans une fournée ;
- ressource indisponible bloque l’affectation.

---

# 39. Contraintes d’implémentation

- Les fonctions centrales doivent être pures autant que possible.
- La logique ne doit pas dépendre de React.
- La logique ne doit pas dépendre directement de Supabase.
- Les constantes doivent être centralisées.
- Le moteur doit être testable avec des objets en mémoire.
- Les migrations doivent être progressives.
- L’ancien moteur ne doit être supprimé qu’après validation complète.
- Prévoir un mécanisme de comparaison temporaire entre ancien et nouveau résultat.
- Les règles métier doivent être référencées depuis `09_REGLES_METIER.md`.

---

# 40. Livrable attendu pour une implémentation

Toute évolution importante du moteur doit fournir :

- les fonctions ajoutées ou modifiées ;
- les structures métier utilisées ;
- les constantes ;
- les migrations éventuelles ;
- les tests unitaires ;
- les tests de non-régression ;
- les résultats de lint et build ;
- les cas non couverts ;
- les différences avec l’ancien moteur ;
- une procédure de retour arrière.

---

# Principe fondamental

> Le moteur de planification ne choisit pas ce que l’équipe doit faire. Il construit un plan réalisable à partir des Work Units, des dépendances, des échéances et des ressources réelles.

Le moteur de décision utilisera ensuite ce plan pour produire des recommandations adaptées à chaque poste.