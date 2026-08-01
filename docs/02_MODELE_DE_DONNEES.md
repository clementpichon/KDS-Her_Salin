# 02_MODELE_DE_DONNEES.md

# Modèle de données métier

> Version : 2.1  
> Statut : Document de référence  
> Dépendances :
>
> - `00_ARCHITECTURE_GLOBALE.md`
> - `01_VISION_GENERALE.md`

---

# 1. Objectif

Ce document définit les entités métier fondamentales du KDS.

Ces entités représentent le fonctionnement réel de la pizzeria. Elles doivent être utilisées de manière cohérente par :

- le moteur de décomposition ;
- le moteur de planification ;
- le moteur de décision ;
- les postes de travail ;
- les outils de synchronisation ;
- les statistiques.

Le modèle métier doit rester indépendant :

- de React ;
- de Supabase ;
- de l’interface graphique ;
- du proxy ;
- de la structure actuelle des composants.

Le schéma réel de la base de données peut différer de ce modèle, mais il doit toujours pouvoir le représenter sans perte d’information.

---

# 2. Principes de modélisation

## 2.1 Représenter le restaurant, pas l’interface

Les objets métier décrivent :

- une commande ;
- un produit ;
- une tâche ;
- une ressource ;
- une fournée ;
- un état de production.

Ils ne décrivent jamais :

- une tuile ;
- un bouton ;
- une couleur ;
- une colonne d’écran ;
- une animation.

---

## 2.2 Une responsabilité par entité

Une commande représente la demande du client.

Une Work Unit représente un travail à effectuer.

Une fournée représente un cycle de cuisson.

Une ressource représente une capacité physique ou humaine.

Ces responsabilités ne doivent pas être mélangées.

---

## 2.3 Conserver les données d’origine

Les données reçues de L’Addition, du proxy, de l’OCR ou de la Caisse KDS doivent être conservées.

Les données interprétées par le KDS doivent être stockées séparément.

Exemple :

- texte brut du ticket ;
- modifications détectées ;
- base finale déduite ;
- méthode de déduction.

Le système doit pouvoir recalculer une interprétation si les règles métier évoluent.

---

# 3. Vue générale des entités

```text
Commande
   │
   ├── Articles commandés
   │      │
   │      └── Unités de production individuelles
   │
   └── Heure de remise
          │
          ▼
Moteur de décomposition
          │
          ▼
Work Units et dépendances
          │
          ▼
Moteur de planification
          │
          ├── Créneaux de production
          ├── Affectations prévisionnelles
          └── Fournées projetées
          │
          ▼
Moteur de décision
          │
          ▼
Postes de travail
```

---

# 4. Commande — `Order`

Une commande représente une demande commerciale faite par un client.

Elle constitue le regroupement utilisé pour :

- identifier le client ;
- annoncer une heure de remise ;
- suivre l’avancement global ;
- remettre les produits ensemble ;
- enregistrer la vente dans L’Addition.

Une commande ne représente pas directement une unité de travail.

## 4.1 Propriétés recommandées

```ts
type Order = {
  id: string

  customerName: string
  customerPhone?: string | null

  pickupTime: string
  createdAt: string
  updatedAt: string

  source:
    | "kds"
    | "addition"
    | "proxy"
    | "ocr"
    | "online"
    | "other"

  operationalOrigin:
    | "planned"
    | "spontaneous"
    | "unknown"

  status:
    | "draft"
    | "confirmed"
    | "in_production"
    | "ready"
    | "handed_over"
    | "cancelled"

  items: OrderItem[]
}
```

## 4.2 Heure de remise

`pickupTime` correspond à l’heure annoncée au client.

Elle ne doit jamais être confondue avec :

- l’heure de début de préparation ;
- un créneau interne de production ;
- une heure d’enfournement ;
- une heure de fin réelle.

---

# 5. Article commandé — `OrderItem`

Un article représente une ligne commerciale de la commande.

Les types principaux sont :

```ts
type ProductType =
  | "pizza"
  | "panino"
  | "fish_and_no"
  | "fries"
  | "other"
```

## 5.1 Quantité et unités individuelles

Une ligne peut contenir une quantité supérieure à un.

Exemple :

```text
Regina × 4
```

Toutefois, la production doit pouvoir suivre les quatre exemplaires séparément.

Le modèle doit donc distinguer :

- la ligne commerciale agrégée ;
- chaque unité physique à produire.

```ts
type OrderItem = {
  id: string
  orderId: string

  productType: ProductType
  productId?: string | null
  productNameSnapshot: string

  quantity: number

  additions: Modification[]
  removals: Modification[]

  productionUnits: ProductionUnit[]
}
```

---

# 6. Unité de production — `ProductionUnit`

Une unité de production représente un exemplaire physique d’un article.

Exemples :

- une Regina parmi une ligne `Regina × 4` ;
- un Pani’NO parmi une ligne `Pani’NO × 3` ;
- une portion de Fish&NO ;
- une portion de frites.

Elle permet de suivre chaque exemplaire indépendamment.

## 6.1 Propriétés recommandées

```ts
type ProductionUnit = {
  id: string

  orderId: string
  orderItemId: string

  productType: ProductType
  sequenceIndex: number

  productionStatus: ProductionStatus

  assignedBatchId?: string | null
  assignedWorktopPosition?: number | null

  createdAt: string
  updatedAt: string
}
```

## 6.2 Pourquoi cette entité est nécessaire

Avec une ligne :

```text
Regina × 4
```

le système doit pouvoir représenter :

- une Regina prête ;
- une Regina au four ;
- une Regina en préparation ;
- une Regina encore en attente.

Une simple quantité agrégée ne permet pas ce suivi.

---

# 7. Pizza — `PizzaProductionData`

Les propriétés propres aux pizzas peuvent être portées par l’unité de production ou par une structure spécialisée associée.

```ts
type PizzaProductionData = {
  productionUnitId: string

  recipeId?: string | null
  recipeNameSnapshot: string

  defaultBase: PizzaBase
  requestedBase: PizzaBase

  baseResolution: BaseResolution
  baseConfidence?: "high" | "medium" | "low" | null

  additions: Modification[]
  removals: Modification[]

  preparationDifficulty: number
  ovenDifficulty: number

  estimatedPreparationSeconds?: number | null
  estimatedPostBakeSeconds?: number | null
}
```

---

# 8. Base de pizza — `PizzaBase`

Les bases doivent utiliser des identifiants internes normalisés.

```ts
type PizzaBase =
  | "tomato"
  | "cream"
  | "goat_cream"
  | "truffle_cream"
  | "none"
  | "other"
  | "unknown"
```

Les libellés affichés sont gérés séparément.

Exemples de normalisation :

```text
sauce tomate
tomate
base tomate
→ tomato
```

```text
crème
crème fraîche
base crème
→ cream
```

```text
crème de chèvre
base chèvre
→ goat_cream
```

---

# 9. Résolution de la base — `BaseResolution`

La base réelle correspond à la base principale effectivement demandée.

```ts
type BaseResolution =
  | "default"
  | "explicit"
  | "inferred_replacement"
  | "removed_without_replacement"
  | "default_with_extra_base_ingredient"
  | "ambiguous"
  | "unknown"
  | "unknown_legacy"
```

## 9.1 Exemple de supplément sans remplacement

```text
Regina
+ crème
```

Résultat :

```text
requestedBase = tomato
baseResolution = default_with_extra_base_ingredient
```

La crème reste un supplément.

## 9.2 Exemple de remplacement

```text
Regina
- sauce tomate
+ crème
```

Résultat :

```text
requestedBase = cream
baseResolution = inferred_replacement
```

Les modifications utilisées pour déduire le remplacement ne doivent pas être affichées une seconde fois comme ajout et retrait ordinaires.

## 9.3 Exemple sans base

```text
Regina
- sauce tomate
```

Résultat :

```text
requestedBase = none
baseResolution = removed_without_replacement
```

---

# 10. Modification — `Modification`

Une modification représente un ajout ou un retrait.

```ts
type Modification = {
  id: string

  rawLabel: string
  normalizedIngredientId?: string | null

  kind: "addition" | "removal"

  source:
    | "kds"
    | "addition"
    | "ocr"
    | "proxy"
    | "online"
    | "other"

  consumedByBaseResolution?: boolean
}
```

Les libellés bruts doivent être conservés.

---

# 11. Difficulté

La difficulté ne doit pas être réduite à une seule valeur globale.

Une pizza peut être :

- simple pour le Pizzaiolo ;
- complexe pour le poste Four ;
- longue en post-cuisson.

Le modèle doit donc pouvoir distinguer plusieurs dimensions.

```ts
type DifficultyProfile = {
  preparation: number
  oven: number
  postBake: number
  attention: number
}
```

Les valeurs peuvent utiliser, dans une première version, une échelle normalisée, par exemple :

```text
0 à 100
```

Elles doivent rester configurables et pouvoir être remplacées progressivement par des mesures observées.

---

# 12. État de production — `ProductionStatus`

Chaque unité physique doit posséder un état réel.

```ts
type ProductionStatus =
  | "waiting"
  | "selected"
  | "preparing"
  | "ready_for_oven"
  | "baking"
  | "post_bake"
  | "ready"
  | "handed_over"
  | "cancelled"
```

## 12.1 Signification

### `waiting`

La production n’a pas commencé.

### `selected`

L’unité a été affectée à une prochaine action ou au plan de travail.

### `preparing`

La préparation physique est en cours.

### `ready_for_oven`

La pizza est prête à être enfournée.

### `baking`

La cuisson est en cours.

### `post_bake`

Une opération après cuisson reste à effectuer.

### `ready`

La production est terminée.

La pizza ne mobilise plus la capacité de production.

### `handed_over`

Le produit a été remis au client.

### `cancelled`

La production a été annulée.

---

# 13. Work Unit

La Work Unit est l’unité fondamentale d’ordonnancement du KDS.

Elle ne représente pas seulement une tâche descriptive.

Elle représente un objet complet pouvant être :

- planifié ;
- priorisé ;
- affecté à un poste ;
- bloqué par des dépendances ;
- commencé ;
- mesuré ;
- terminé.

Le moteur de planification organise des Work Units.

Le moteur de décision compare des Work Units.

Les interfaces peuvent afficher une représentation simplifiée sans exposer cette structure complète.

---

# 14. Types de Work Units

```ts
type WorkUnitType =
  | "prepare_pizza"
  | "prepare_panino_bread"
  | "assemble_panino"
  | "cook_panino"
  | "prepare_fish_and_no"
  | "fry_fish"
  | "fry_fries"
  | "load_oven"
  | "bake_batch"
  | "unload_oven"
  | "post_bake"
  | "assemble_order"
  | "hand_over"
  | "other"
```

La liste doit pouvoir évoluer sans remettre en cause l’architecture.

---

# 15. Structure d’une Work Unit

```ts
type WorkUnit = {
  id: string
  type: WorkUnitType

  orderId?: string | null
  orderItemId?: string | null
  productionUnitIds: string[]

  workstation: WorkstationType
  requiredResourceIds: string[]

  status: WorkUnitStatus

  dependencies: WorkUnitDependency[]

  pickupDeadline?: string | null
  earliestStartAt?: string | null
  latestStartAt?: string | null

  estimatedDurationSeconds: number
  actualDurationSeconds?: number | null

  basePriority: number
  computedPriority?: number | null

  blockingLevel: BlockingLevel
  blockingReason?: string | null

  plannedStartAt?: string | null
  plannedEndAt?: string | null

  startedAt?: string | null
  completedAt?: string | null

  assignedOperatorId?: string | null
  assignedResourceId?: string | null

  isLocked: boolean

  createdAt: string
  updatedAt: string
}
```

---

# 16. État d’une Work Unit — `WorkUnitStatus`

```ts
type WorkUnitStatus =
  | "waiting"
  | "planned"
  | "available"
  | "selected"
  | "in_progress"
  | "blocked"
  | "completed"
  | "cancelled"
```

## 16.1 `waiting`

La tâche existe, mais ses conditions de lancement ne sont pas encore réunies.

## 16.2 `planned`

La tâche possède une position prévisionnelle dans le plan.

## 16.3 `available`

Toutes ses dépendances sont satisfaites. Elle peut être commencée.

## 16.4 `selected`

Un opérateur ou le moteur l’a intégrée à la prochaine action.

## 16.5 `in_progress`

L’exécution réelle a commencé.

## 16.6 `blocked`

Une contrainte empêche temporairement son exécution.

## 16.7 `completed`

La tâche est terminée.

## 16.8 `cancelled`

La tâche n’est plus nécessaire.

---

# 17. Dépendances entre Work Units

Une Work Unit peut dépendre d’une ou plusieurs autres.

```ts
type WorkUnitDependency = {
  workUnitId: string

  dependencyType:
    | "finish_to_start"
    | "finish_to_finish"
    | "resource_release"
    | "manual_validation"

  isRequired: boolean
}
```

## 17.1 Exemple pizza

```text
Préparer la pizza
        ↓
Charger la pizza au four
        ↓
Cuire la fournée
        ↓
Décharger la fournée
        ↓
Effectuer la post-cuisson
        ↓
Pizza prête
```

La post-cuisson ne devient disponible qu’après la sortie du four.

## 17.2 Exemple Pani’NO

```text
Préparer les pains
        ↓
Assembler les Pani’NO
        ↓
Cuire ou griller
        ↓
Produit prêt
```

---

# 18. Échéances d’une Work Unit

Une Work Unit peut posséder plusieurs contraintes temporelles.

## `pickupDeadline`

Heure de remise finale de la commande.

## `earliestStartAt`

Heure avant laquelle la tâche ne doit normalement pas commencer.

Exemple :

un OF pain Pani’NO prévu trente minutes avant la remise.

## `latestStartAt`

Heure limite estimée pour commencer sans provoquer de retard.

## `plannedStartAt`

Début prévisionnel calculé par le moteur.

## `startedAt`

Début réel.

Ces valeurs doivent rester distinctes.

---

# 19. Priorité d’une Work Unit

La priorité ne doit pas être stockée comme une vérité définitive.

Elle peut combiner :

- une priorité de base ;
- une priorité calculée dynamiquement.

```ts
type WorkUnitPriority = {
  basePriority: number
  computedPriority: number

  reasons: PriorityReason[]
}
```

Exemples de raisons :

```ts
type PriorityReason =
  | "pickup_deadline_near"
  | "order_already_started"
  | "batch_completion"
  | "same_base_group"
  | "current_delay"
  | "workstation_idle"
  | "blocking_other_work"
  | "panino_bread_due"
  | "manual_override"
```

La priorité calculée peut évoluer à chaque recalcul.

---

# 20. Niveau de blocage — `BlockingLevel`

```ts
type BlockingLevel =
  | "none"
  | "soft"
  | "hard"
```

## `none`

La tâche est réalisable.

## `soft`

La tâche est réalisable, mais déconseillée.

Exemple :

cuisson très anticipée.

## `hard`

Une dépendance ou une ressource rend actuellement la tâche impossible.

Exemples :

- four indisponible ;
- pain Pani’NO non préparé ;
- tâche précédente non terminée.

Les blocages métier ne doivent pas être utilisés pour interdire arbitrairement une action humaine lorsque le terrain permet réellement de l’effectuer.

---

# 21. Poste responsable — `WorkstationType`

```ts
type WorkstationType =
  | "cashier"
  | "pizzaiolo"
  | "oven"
  | "panino"
  | "ready"
  | "system"
```

Une Work Unit possède un poste responsable principal.

Elle peut néanmoins mobiliser plusieurs ressources.

---

# 22. Ressource — `Resource`

Une ressource représente une capacité limitée.

```ts
type Resource = {
  id: string

  type:
    | "operator"
    | "worktop"
    | "oven"
    | "oven_slot"
    | "fryer"
    | "panino_station"
    | "storage_area"
    | "other"

  capacity: number
  status: "available" | "busy" | "unavailable"

  workstation: WorkstationType
}
```

Exemples :

- plan de travail : quatre positions ;
- four : quatre places ;
- friteuse : capacité configurable ;
- poste Pani’NO : un opérateur principal.

---

# 23. Plan de travail — `Worktop`

Le plan de travail du Pizzaiolo constitue une ressource physique à quatre positions.

```ts
type WorktopPosition = {
  position: 1 | 2 | 3 | 4

  productionUnitId?: string | null
  workUnitId?: string | null

  status: "empty" | "occupied" | "locked"
}
```

Chaque position affichée doit correspondre à une pizza physique réellement placée sur le plan de travail.

---

# 24. Fournée — `Batch`

Une fournée représente un cycle de cuisson.

```ts
type Batch = {
  id: string

  type: "projected" | "locked" | "baking" | "completed"

  capacity: number
  productionUnitIds: string[]

  productionSlot?: string | null

  createdAt: string
  lockedAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
}
```

La capacité actuelle du four est :

```text
4 pizzas
```

Une fournée peut contenir des pizzas de plusieurs commandes.

---

# 25. Fournée projetée

Une fournée projetée est une hypothèse calculée par le moteur.

Elle peut être :

- complétée ;
- déplacée ;
- recomposée ;
- supprimée.

Elle ne doit pas être considérée comme une décision définitive.

---

# 26. Fournée verrouillée

Une fournée devient verrouillée lorsqu’une action réelle commence, notamment :

- lorsqu’une pizza est placée sur le plan de travail avec une affectation confirmée ;
- lorsque le pizzaiolo confirme la fournée ;
- lorsqu’elle est envoyée au poste Four.

Une fournée verrouillée ne doit plus être modifiée automatiquement.

---

# 27. Créneau de remise — `PickupSlot`

Un créneau de remise représente une heure pouvant être proposée au client.

```ts
type PickupSlot = {
  date: string
  time: string

  service: "lunch" | "evening"

  currentOrderIds: string[]
}
```

Le créneau de remise n’est pas une capacité de four.

---

# 28. Créneau de production — `ProductionSlot`

Un créneau de production est une unité temporelle interne utilisée pour projeter la charge.

```ts
type ProductionSlot = {
  startAt: string
  endAt: string

  workstationLoads: Partial<
    Record<WorkstationType, WorkstationLoad>
  >

  projectedBatchIds: string[]
  lockedBatchIds: string[]
}
```

Les créneaux de production ne doivent pas être confondus avec les fournées réelles.

---

# 29. Affectation prévisionnelle — `ProductionAllocation`

Une affectation prévisionnelle relie une unité de production ou une Work Unit à un créneau interne.

```ts
type ProductionAllocation = {
  id: string

  workUnitId: string
  productionUnitIds: string[]

  productionSlotStart: string

  status:
    | "projected"
    | "confirmed"
    | "locked"
    | "completed"
    | "cancelled"
}
```

Une affectation projetée peut être recalculée.

Une affectation verrouillée ne doit plus être déplacée automatiquement.

---

# 30. Charge d’un poste — `WorkstationLoad`

```ts
type WorkstationLoad = {
  workstation: WorkstationType

  remainingWorkUnits: number
  estimatedRemainingSeconds: number

  activeWorkUnits: number
  blockedWorkUnits: number

  availableCapacity: number
}
```

La charge ne doit pas être représentée uniquement par un nombre de produits.

Elle doit pouvoir intégrer :

- la durée ;
- la difficulté ;
- les dépendances ;
- les ressources.

---

# 31. Charge résiduelle

La charge résiduelle correspond uniquement au travail qui reste à effectuer.

Elle est calculée à partir des Work Units qui ne sont ni :

- `completed` ;
- ni `cancelled`.

Une pizza déjà prête ne doit plus participer à la charge du Pizzaiolo ou du Four.

---

# 32. Réserve de capacité

La réserve représente une capacité volontairement conservée pour absorber une commande spontanée.

```ts
type CapacityReserve = {
  workstation: WorkstationType

  targetCapacity: number
  availableCapacity: number

  status:
    | "preserved"
    | "reduced"
    | "consumed"
    | "unavailable"
}
```

La réserve n’est jamais une charge.

Sa consommation ne signifie pas automatiquement une surcharge.

---

# 33. Score de faisabilité

Le moteur de décision produit un score interne.

```ts
type FeasibilityResult = {
  score: number

  recommendation:
    | "recommended"
    | "fluid"
    | "dense"
    | "very_busy"

  reasons: string[]
}
```

Le score est dérivé des données de planification.

Il ne doit pas être stocké comme une vérité permanente si les données peuvent évoluer.

---

# 34. Événement métier — `DomainEvent`

Tout changement important produit un événement.

```ts
type DomainEvent = {
  id: string
  type: string

  entityType:
    | "order"
    | "order_item"
    | "production_unit"
    | "work_unit"
    | "batch"
    | "resource"

  entityId: string

  occurredAt: string

  source:
    | "user"
    | "system"
    | "proxy"
    | "realtime"
    | "migration"

  payload?: Record<string, unknown>
}
```

Exemples :

- `order.created` ;
- `work_unit.started` ;
- `work_unit.completed` ;
- `batch.locked` ;
- `production_unit.ready` ;
- `order.handed_over`.

---

# 35. Temps théorique et temps observé

Chaque Work Unit doit pouvoir enregistrer :

- une durée théorique ;
- une durée estimée ;
- une durée réelle.

```ts
type WorkUnitTiming = {
  theoreticalSeconds?: number | null
  estimatedSeconds: number
  actualSeconds?: number | null
}
```

L’estimation pourra progressivement utiliser :

- le produit ;
- les modifications ;
- l’opérateur ;
- le poste ;
- le contexte du service ;
- les observations historiques.

---

# 36. Compatibilité avec les anciennes données

Le nouveau modèle ne doit pas rendre les anciennes commandes illisibles.

Lorsqu’une donnée manque :

- appliquer un repli explicite ;
- marquer l’information comme héritée ou inconnue ;
- ne pas inventer une certitude.

Exemples :

- base absente : utiliser la base par défaut de la recette ;
- état individuel absent : reconstruire temporairement depuis l’état agrégé ;
- durée absente : utiliser une valeur théorique ;
- origine absente : utiliser `unknown`.

Les migrations doivent être progressives.

---

# 37. Ce que le modèle ne contient jamais

Le modèle métier ne contient jamais :

- du JSX ;
- des composants React ;
- des classes CSS ;
- des couleurs ;
- des dimensions d’écran ;
- des animations ;
- des textes longs propres à une interface ;
- des règles dépendant d’un appareil précis.

---

# 38. Évolutions prévues

Le modèle doit pouvoir accueillir sans refonte fondamentale :

- plusieurs pizzaiolos ;
- plusieurs fours ;
- plusieurs postes Pani’NO ;
- plusieurs friteuses ;
- plusieurs établissements ;
- commandes en ligne ;
- livraison ;
- apprentissage automatique ;
- planification prédictive ;
- maintenance des équipements ;
- suivi avancé des stocks.

---

# 39. Règle d’architecture

Les commandes représentent ce que le client a demandé.

Les unités de production représentent les produits physiques.

Les Work Units représentent le travail à effectuer.

Les ressources représentent les capacités disponibles.

Les fournées représentent les cycles de cuisson.

Les moteurs organisent ces objets.

Les interfaces les présentent aux utilisateurs.

Ces responsabilités ne doivent jamais être fusionnées.

---

# Principe fondamental

> Le KDS n’ordonnance pas directement des commandes. Il ordonnance des Work Units liées à des produits physiques, soumises à des dépendances, des ressources, des durées et des échéances.

Cette structure constitue le socle du moteur de planification et du moteur de décision.