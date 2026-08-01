# 04_MOTEUR_DECISION.md

# Moteur de décision

> Version : 2.1  
> Statut : Document de référence  
> Dépendances :
>
> - `00_ARCHITECTURE_GLOBALE.md`
> - `01_VISION_GENERALE.md`
> - `02_MODELE_DE_DONNEES.md`
> - `03_MOTEUR_PLANIFICATION.md`

---

# 1. Objectif

Le moteur de décision transforme les données du moteur de planification en recommandations compréhensibles et actionnables.

Il répond à des questions différentes selon le poste.

## Caisse

> Quel créneau de remise perturbera le moins la production ?

## Pizzaiolo

> Quelles pizzas ou Work Units est-il pertinent de préparer maintenant ?

## Four

> Quelle fournée peut être enfournée ou traitée en priorité ?

## Pani’NO

> Quelle Work Unit doit être traitée en premier ?

Le moteur de décision ne modifie jamais directement la production.

Il produit :

- des scores ;
- des priorités ;
- des recommandations ;
- des explications structurées.

L’utilisateur conserve toujours la décision finale.

---

# 2. Séparation des responsabilités

## Le moteur de planification

Il détermine ce qui est :

- réalisable ;
- disponible ;
- bloqué ;
- projeté ;
- en retard ;
- consommateur de ressources.

## Le moteur de décision

Il compare les solutions possibles et indique celles qui semblent les plus pertinentes.

## L’interface

Elle affiche les résultats et recueille le choix humain.

Le moteur de décision ne doit pas :

- recréer les créneaux ;
- recalculer les dépendances ;
- reconstruire les fournées ;
- lire directement la base de données ;
- connaître les composants React ;
- déclencher seul une action de production.

---

# 3. Principe général

Toute décision suit le même cycle.

```text
État réel
    ↓
Planification
    ↓
Options réalisables
    ↓
Évaluation de chaque option
    ↓
Score
    ↓
Règles prioritaires
    ↓
Classement
    ↓
Recommandation
    ↓
Décision humaine
```

Le moteur ne doit jamais recommander une option qui n’existe pas dans le résultat de planification.

---

# 4. Types de décisions

```ts
type DecisionType =
  | "pickup_slot"
  | "pizzaiolo_work_unit"
  | "pizzaiolo_batch"
  | "oven_batch"
  | "oven_post_bake"
  | "panino_work_unit"
  | "order_attention"
  | "other"
```

Chaque type de décision utilise :

- un socle commun de critères ;
- des critères spécifiques au poste.

---

# 5. Requête de décision

```ts
type DecisionRequest = {
  type: DecisionType
  requestedAt: string

  planningResult: PlanningResult

  candidateIds?: string[]

  context: DecisionContext
}
```

```ts
type DecisionContext = {
  workstation?: WorkstationType

  operatorId?: string | null
  resourceId?: string | null

  draftOrder?: OrderDraft | null
  selectedPickupSlot?: string | null

  manualOverrides?: ManualDecisionOverride[]

  configuration: DecisionConfiguration
}
```

Le moteur doit travailler sur un instantané cohérent du résultat de planification.

---

# 6. Résultat d’une décision

```ts
type DecisionResult = {
  type: DecisionType
  generatedAt: string

  recommendations: RankedRecommendation[]

  warnings: DecisionWarning[]

  dataQuality:
    | "complete"
    | "partial"
    | "reconstructed"
    | "legacy"
}
```

```ts
type RankedRecommendation = {
  candidateId: string

  score: number
  recommendationLevel: RecommendationLevel

  rank: number

  scoreBreakdown: ScoreBreakdown
  reasons: DecisionReason[]

  hardBlocks: DecisionBlock[]
  softWarnings: DecisionWarning[]

  isSelectable: boolean
  requiresConfirmation: boolean
}
```

---

# 7. Score de décision

Chaque option reçoit un score compris entre :

```text
0 et 100
```

Interprétation générale :

```text
100
Option idéale dans la situation actuelle

0
Option très risquée, très difficile ou irréalisable
```

Le score constitue une aide au classement.

Il ne remplace pas les règles métier prioritaires.

---

# 8. Niveaux de recommandation

```ts
type RecommendationLevel =
  | "recommended"
  | "fluid"
  | "dense"
  | "very_busy"
```

Libellés utilisateur :

```text
recommended → Recommandé
fluid       → Fluide
dense       → Dense
very_busy   → Très chargé
```

Seuils initiaux :

```ts
export const RECOMMENDATION_THRESHOLDS = {
  recommended: 85,
  fluid: 65,
  dense: 40
}
```

Conversion :

```ts
function scoreToRecommendation(
  score: number
): RecommendationLevel {
  if (score >= 85) return "recommended"
  if (score >= 65) return "fluid"
  if (score >= 40) return "dense"
  return "very_busy"
}
```

Les seuils doivent être configurables.

---

# 9. Pondérations communes

Le moteur utilise un ensemble de critères pondérés.

Configuration initiale recommandée :

```ts
export const COMMON_SCORE_WEIGHTS = {
  residualCapacity: 25,
  deadlineSafety: 20,
  delayImpact: 15,
  resourceAvailability: 15,
  dependencyReadiness: 10,
  workloadBalance: 10,
  remainingReserve: 5
}
```

La somme vaut 100.

Ces poids constituent une base.

Chaque type de décision peut appliquer des critères complémentaires.

---

# 10. Critères communs

## 10.1 Capacité résiduelle

Le moteur évalue si l’option peut être absorbée par la capacité réellement disponible.

La capacité doit être calculée à partir :

- des Work Units restantes ;
- des ressources disponibles ;
- des tâches déjà engagées ;
- des allocations verrouillées.

Les produits déjà `ready` ne doivent plus réduire cette capacité de production.

---

## 10.2 Sécurité de l’échéance

Le moteur doit favoriser les options qui laissent une marge suffisante avant l’heure de remise.

Il doit pénaliser :

- une marge trop faible ;
- un début prévu après `latestStartAt` ;
- une fin projetée après la remise.

---

## 10.3 Impact sur le retard

Une option ne doit pas être bien classée si elle augmente fortement le retard d’autres commandes.

Le retard réel et le retard projeté doivent peser davantage que la simple consommation d’une réserve.

---

## 10.4 Disponibilité des ressources

Le moteur tient compte :

- du plan de travail ;
- du four ;
- de la friteuse ;
- du poste Pani’NO ;
- des opérateurs ;
- des ressources temporairement indisponibles.

Une ressource indisponible peut créer un blocage dur.

---

## 10.5 Dépendances

Une Work Unit dont les dépendances ne sont pas satisfaites ne doit pas être recommandée comme immédiatement exécutable.

Elle peut néanmoins apparaître dans une projection future.

---

## 10.6 Équilibrage de la charge

Le moteur peut favoriser une option qui répartit mieux la charge entre les postes concernés.

Il ne doit pas déplacer artificiellement une charge vers un poste déjà saturé.

---

## 10.7 Réserve restante

La réserve représente une marge opérationnelle.

Elle doit avoir un poids faible.

```text
Réserve préservée
→ petit bonus

Réserve réduite
→ effet faible

Réserve consommée
→ léger malus éventuel

Capacité réellement dépassée
→ forte pénalité liée à la capacité, pas à la réserve
```

La réserve n’est jamais une charge.

---

# 11. Règles prioritaires

Les règles prioritaires sont appliquées après le calcul du score brut.

Elles empêchent les résultats incohérents.

---

## 11.1 Une option bloquée n’est pas recommandée

Une option présentant un blocage dur doit être marquée :

```ts
isSelectable = false
```

sauf si le blocage peut être levé manuellement et que le produit autorise explicitement une dérogation.

---

## 11.2 Une action humaine autorisée reste possible

Une option déconseillée peut rester sélectionnable.

Exemples :

- créneau très chargé ;
- fournée incomplète ;
- lancement anticipé ;
- priorité manuellement modifiée.

Le moteur avertit.

Il ne bloque pas arbitrairement.

---

## 11.3 La réserve seule ne dégrade jamais fortement

La seule consommation de la réserve ne peut jamais provoquer :

```text
Dense
```

ou :

```text
Très chargé
```

si aucun autre facteur réel ne le justifie.

---

## 11.4 Une fournée complétée sans risque reste favorable

Exemple :

```text
1 pizza restante
+ 3 pizzas du panier
= 4 pizzas
```

Si :

- aucun retard important n’existe ;
- le Four est disponible ;
- aucune surcharge réelle n’apparaît ;

alors le résultat ne doit pas être inférieur à :

```text
Fluide
```

Même si la réserve restante devient nulle.

---

## 11.5 Les tâches terminées ne chargent plus la décision

Une Work Unit `completed` et une Production Unit `ready` ne doivent plus pénaliser la capacité de production.

---

## 11.6 Les actions verrouillées ne sont pas réorganisées

Le moteur peut recommander autour des Work Units verrouillées.

Il ne doit jamais proposer de déplacer automatiquement :

- une pizza déjà sur un disque ;
- une Work Unit `in_progress` ;
- une fournée verrouillée ;
- une pizza au four.

---

# 12. Raisons structurées

Chaque recommandation doit pouvoir être expliquée.

```ts
type DecisionReason =
  | "high_residual_capacity"
  | "low_residual_capacity"
  | "batch_completed"
  | "full_batches_created"
  | "partial_batch_created"
  | "isolated_pizza_created"
  | "deadline_safe"
  | "deadline_at_risk"
  | "current_delay"
  | "projected_delay"
  | "resource_available"
  | "resource_overloaded"
  | "dependency_ready"
  | "dependency_blocked"
  | "order_already_started"
  | "same_base_group"
  | "base_change_reduced"
  | "post_bake_load_high"
  | "reserve_preserved"
  | "reserve_reduced"
  | "reserve_consumed_without_overload"
  | "residual_capacity_released"
  | "anticipation_possible"
  | "manual_override"
  | "other_station_overloaded"
```

Les raisons servent :

- aux tests ;
- au débogage ;
- aux explications facultatives ;
- aux statistiques futures.

---

# 13. Score détaillé

```ts
type ScoreBreakdown = {
  total: number

  components: {
    key: string
    weight: number
    rawValue: number
    weightedValue: number
  }[]

  appliedRules: string[]
}
```

Le détail du score ne doit pas être affiché par défaut en production.

Il doit être accessible en mode test.

---

# 14. Décision Caisse : choix d’un créneau

Le moteur doit comparer les créneaux de remise encore proposés.

## Entrées spécifiques

- panier en cours ;
- créneaux disponibles ;
- résultat de simulation pour chaque créneau ;
- charge résiduelle ;
- fournées projetées ;
- retard ;
- charge des postes concernés.

## Critères spécifiques

```ts
export const PICKUP_SLOT_SCORE_WEIGHTS = {
  productionFeasibility: 30,
  batchEfficiency: 20,
  deadlineSafety: 15,
  currentDelay: 15,
  workstationLoad: 10,
  anticipationOpportunity: 5,
  remainingReserve: 5
}
```

---

# 15. Charge du créneau Caisse

Le moteur ne doit pas se demander uniquement :

```text
Combien de pizzas sont rattachées à 19 h 30 ?
```

Il doit se demander :

```text
Combien de travail reste réellement à absorber
pour accepter cette commande à 19 h 30 ?
```

Exemple :

```text
12 pizzas historiquement prévues
8 déjà prêtes
4 restent à produire
```

La charge utilisée pour la recommandation est :

```text
4
```

et non :

```text
12
```

---

# 16. Fournées et recommandation Caisse

Le moteur doit favoriser les créneaux qui :

- complètent une fournée ;
- créent des fournées pleines ;
- évitent une pizza isolée ;
- utilisent une capacité déjà ouverte.

## Cas obligatoire

```text
Charge résiduelle : 1 pizza
Panier : 3 pizzas
Projection : 4 pizzas
Réserve restante : 0
```

Résultat attendu :

```text
Fournée complète
Recommandé ou Fluide
```

Résultat interdit :

```text
Très chargé à cause de la réserve
```

---

# 17. Grosses commandes à la Caisse

Une commande importante doit être évaluée à partir de sa projection de production.

Exemple :

```text
6 pizzas pour 19 h 30
```

Projection :

```text
19 h 25 : 4/4
19 h 30 : 2/4
```

Le score doit prendre en compte :

- une fournée complète ;
- une fournée partielle ;
- la possibilité de compléter les deux places restantes ;
- l’anticipation possible ;
- les autres postes concernés.

---

# 18. Affichage recommandé à la Caisse

Le moteur retourne les données.

L’interface peut afficher une forme compacte :

```text
19 h 30

1 à produire + 3 du panier = 4

Fournée complète

Recommandé
```

Pour une grosse commande :

```text
19 h 30

6 pizzas · 2 fournées projetées

1 complète · 2 places restantes

Fluide
```

Les données techniques détaillées restent repliées.

---

# 19. Décision Pizzaiolo : prochaine Work Unit

Le moteur doit comparer les Work Units disponibles au poste Pizzaiolo.

## Critères spécifiques

- proximité de l’échéance ;
- commande déjà commencée ;
- capacité du plan de travail ;
- possibilité de compléter une fournée ;
- similitude des bases ;
- difficulté ;
- nombre de changements de préparation ;
- risque de laisser une pizza isolée ;
- priorité manuelle.

Pondération initiale :

```ts
export const PIZZAIOLO_WORK_UNIT_WEIGHTS = {
  deadlineUrgency: 25,
  batchCompletion: 20,
  startedOrderCompletion: 15,
  worktopFit: 15,
  baseGrouping: 10,
  preparationDifficulty: 5,
  futureIsolationRisk: 5,
  manualPriority: 5
}
```

---

# 20. Priorités Pizzaiolo

Ordre métier :

1. éviter le retard ;
2. remplir les quatre places ;
3. terminer les commandes commencées ;
4. respecter autant que possible l’ordre des commandes ;
5. éviter une pizza seule dans une prochaine fournée ;
6. regrouper les bases ;
7. limiter les changements inutiles.

Le regroupement des bases ne doit jamais passer devant :

- l’échéance ;
- le remplissage du four ;
- une commande déjà engagée.

---

# 21. Sélection manuelle du Pizzaiolo

Le pizzaiolo peut :

- choisir une autre pizza ;
- sélectionner une commande entière ;
- lancer une commande en avance ;
- réorganiser les tuiles ;
- retirer une pizza du plan de travail.

Une priorité manuelle doit être conservée assez longtemps pour éviter que le moteur annule immédiatement le choix.

```ts
type ManualDecisionOverride = {
  id: string

  targetType:
    | "work_unit"
    | "batch"
    | "order"
    | "pickup_slot"

  targetId: string

  action:
    | "promote"
    | "demote"
    | "lock"
    | "exclude"
    | "force_select"

  createdAt: string
  expiresAt?: string | null

  createdBy: string
}
```

---

# 22. Décision Pizzaiolo : composition d’une fournée

Le moteur peut proposer une fournée de une à quatre pizzas.

Il doit chercher en priorité quatre pizzas.

## Critères

- échéances compatibles ;
- Work Units disponibles ;
- capacité du plan de travail ;
- commandes commencées ;
- remplissage à quatre ;
- bases identiques ou proches ;
- post-cuisson future ;
- répartition évitant une pizza isolée.

Une fournée incomplète reste possible si :

- aucune pizza compatible n’est disponible ;
- attendre créerait un retard ;
- le pizzaiolo la lance manuellement ;
- le service touche à sa fin.

---

# 23. Décision Four : prochaine fournée

Le moteur compare les fournées :

- verrouillées ;
- prêtes à enfourner ;
- compatibles avec l’heure de remise.

## Critères spécifiques

```ts
export const OVEN_BATCH_WEIGHTS = {
  deadlineUrgency: 30,
  batchReadiness: 25,
  batchFillRate: 15,
  postBakeLoad: 10,
  orderCompletion: 10,
  bakingLeadSafety: 5,
  manualPriority: 5
}
```

Le moteur doit éviter de recommander une cuisson trop anticipée si elle nuit à la qualité.

---

# 24. Décision Four : post-cuisson

Les Work Units de post-cuisson doivent être ordonnées selon :

- l’heure de sortie ;
- l’urgence de la commande ;
- la durée de l’opération ;
- le nombre d’autres pizzas attendues dans la commande ;
- le risque de refroidissement ;
- la charge restante du poste Four.

Une tâche de post-cuisson peut bloquer l’état `ready`.

---

# 25. Décision Pani’NO

Le moteur compare les Work Units du poste Pani’NO.

## Critères

- heure de remise ;
- dépendances ;
- pains disponibles ;
- temps de cuisson ou de friture ;
- regroupement des produits similaires ;
- commandes déjà commencées ;
- charge de la friteuse ;
- priorité des OF Pain.

---

# 26. OF Pain Pani’NO

Une Work Unit `prepare_panino_bread` doit devenir visible :

```text
30 minutes avant l’heure de remise
```

ou immédiatement si la commande est reçue moins de trente minutes avant.

Cette Work Unit doit recevoir une priorité élevée car son oubli bloque les Work Units suivantes.

Raisons possibles :

```text
panino_bread_due
blocking_other_work
pickup_deadline_near
```

Elle doit apparaître en tête de liste lorsqu’elle devient réellement due.

---

# 27. Décision de suivi d’une commande

Le moteur peut identifier les commandes nécessitant une attention particulière.

Exemples :

- commande en retard ;
- commande partiellement prête ;
- commande avec Work Unit bloquée ;
- commande dont une partie est prête depuis longtemps ;
- commande créée dans le KDS mais pas encore enregistrée dans L’Addition.

Cette décision n’est pas une priorité de production directe.

Elle sert à attirer l’attention de la Caisse ou d’un responsable.

---

# 28. Blocages

```ts
type DecisionBlock = {
  type:
    | "dependency"
    | "resource"
    | "capacity"
    | "invalid_state"
    | "missing_data"
    | "manual_lock"

  messageKey: string
  relatedEntityIds: string[]
}
```

Un blocage dur rend normalement l’option non sélectionnable.

Un avertissement souple conserve l’option sélectionnable.

---

# 29. Avertissements

```ts
type DecisionWarning = {
  type:
    | "high_delay_risk"
    | "low_reserve"
    | "incomplete_batch"
    | "early_baking"
    | "high_difficulty"
    | "other_station_load"
    | "partial_data"
    | "legacy_data"

  severity:
    | "info"
    | "warning"
    | "critical"

  relatedEntityIds: string[]
}
```

---

# 30. Explications destinées à l’utilisateur

Les explications doivent rester courtes.

Exemples :

```text
Fournée complétée
```

```text
Aucun retard prévu
```

```text
Four déjà très sollicité
```

```text
Deux pizzas restent à produire
```

```text
Réserve utilisée sans surcharge
```

Ne pas afficher directement les identifiants techniques des raisons.

La traduction appartient à l’interface.

---

# 31. Classement des options

Le classement doit être stable.

Ordre recommandé :

1. absence de blocage dur ;
2. score décroissant ;
3. niveau de recommandation ;
4. échéance la plus proche ;
5. commande déjà commencée ;
6. date de création ;
7. identifiant stable.

À contexte identique, le résultat doit être identique.

---

# 32. Décision et simulation

Pour la Caisse, chaque créneau doit être évalué avec une simulation du panier.

La simulation ne doit pas modifier l’état réel.

```ts
simulateDecision({
  planningInput,
  hypotheticalChanges
})
```

Exemple :

```ts
hypotheticalChanges = {
  addDraftOrderAtPickupTime: "19:30"
}
```

Le moteur recalcule alors :

- la charge projetée ;
- les fournées ;
- les retards ;
- les réserves ;
- le score.

---

# 33. Données partielles

Le moteur doit rester tolérant envers les anciennes données.

En cas de données incomplètes :

- utiliser les replis documentés ;
- réduire le niveau de confiance ;
- produire un avertissement ;
- éviter les décisions trop affirmatives.

Exemple :

```ts
dataQuality = "legacy"
```

Une donnée partielle ne doit pas faire planter toute la Caisse.

---

# 34. Configuration

```ts
type DecisionConfiguration = {
  recommendationThresholds: {
    recommended: number
    fluid: number
    dense: number
  }

  commonWeights: Record<string, number>

  pickupSlotWeights: Record<string, number>
  pizzaioloWeights: Record<string, number>
  ovenWeights: Record<string, number>
  paninoWeights: Record<string, number>

  ruleOverrides: DecisionRuleOverride[]
}
```

Tous les seuils et poids doivent être centralisés.

---

# 35. Apprentissage futur

À terme, certaines valeurs pourront être ajustées grâce aux données observées :

- durée réelle des Work Units ;
- difficulté réelle ;
- impact d’une combinaison de pizzas ;
- performance par poste ;
- fréquence des retards ;
- capacité réelle à absorber une commande spontanée.

L’apprentissage ne doit pas modifier directement les règles fondamentales.

Il peut ajuster :

- les estimations ;
- les coefficients ;
- les durées ;
- certains seuils.

Les modifications apprises doivent rester explicables et réversibles.

---

# 36. Fonction centrale

```ts
evaluateDecision(
  request: DecisionRequest
): DecisionResult
```

Des fonctions spécialisées peuvent appeler ce noyau :

```ts
evaluatePickupSlots()
rankPizzaioloWorkUnits()
rankProjectedBatches()
rankOvenBatches()
rankPaninoWorkUnits()
```

La logique commune ne doit pas être dupliquée.

---

# 37. Journalisation en mode test

En mode test, exposer :

- le score brut ;
- le détail des composantes ;
- les règles prioritaires appliquées ;
- les raisons ;
- les blocages ;
- les avertissements ;
- le classement final.

Exemple :

```ts
{
  candidateId: "slot-19:30",

  score: 97,
  recommendationLevel: "recommended",

  scoreBreakdown: {
    productionFeasibility: 30,
    batchEfficiency: 20,
    deadlineSafety: 15,
    currentDelay: 15,
    workstationLoad: 10,
    anticipationOpportunity: 5,
    remainingReserve: 2
  },

  reasons: [
    "batch_completed",
    "deadline_safe",
    "reserve_consumed_without_overload"
  ],

  appliedRules: [
    "minimum_fluid_when_batch_completed_without_delay"
  ]
}
```

Ne pas afficher ce détail par défaut en production.

---

# 38. Tests obligatoires — Caisse

## Cas 1 — 1 + 3

```text
1 pizza résiduelle
+3 pizzas panier
=4
```

Résultat :

- fournée complète ;
- score élevé ;
- recommandé ou fluide ;
- jamais chargé à cause de la réserve seule.

## Cas 2 — 3 + 1

Résultat :

- bonus de complément de fournée ;
- classement favorable.

## Cas 3 — 4 + 1

Résultat :

- une fournée complète ;
- une pizza isolée projetée ;
- score inférieur à `3 + 1` ;
- pas obligatoirement dense si le service est calme.

## Cas 4 — 7 + 1

Résultat :

- deux fournées complètes ;
- classement favorable.

## Cas 5 — commande prête en avance

Quatre pizzas de 19 h 30 déjà prêtes.

Nouvelle commande de quatre pizzas pour 19 h 30.

Résultat :

- charge actuelle = 0 ;
- charge projetée = 4 ;
- ne pas compter 8 pizzas à produire.

## Cas 6 — réserve consommée

Résultat :

- faible malus éventuel ;
- aucun mauvais classement pour ce seul motif.

## Cas 7 — retard réel

Même scénario que `1 + 3`, avec retard significatif.

Résultat :

- score diminué ;
- classement potentiellement dense ;
- raison liée au retard.

## Cas 8 — commande mixte

Résultat :

- prise en compte des seuls postes concernés.

---

# 39. Tests obligatoires — Pizzaiolo

- compléter une fournée de trois pizzas ;
- privilégier une commande commencée à priorité proche ;
- ne pas regrouper les bases au détriment d’un retard ;
- respecter une priorité manuelle ;
- ne pas déplacer une pizza verrouillée ;
- éviter une pizza isolée lorsque cela est possible ;
- proposer une commande jusqu’à trente minutes en avance ;
- permettre malgré tout une sélection différente.

---

# 40. Tests obligatoires — Four

- privilégier une fournée urgente et prête ;
- ne pas proposer une fournée bloquée ;
- reconnaître une fournée complète ;
- tenir compte des post-cuissons longues ;
- ne pas cuire excessivement tôt sans avertissement ;
- ne pas modifier une fournée verrouillée ;
- classer une commande incomplète sans la déclarer prête.

---

# 41. Tests obligatoires — Pani’NO

- afficher l’OF Pain trente minutes avant ;
- l’afficher immédiatement si la commande est proche ;
- placer l’OF bloquant en priorité ;
- attendre la fin de préparation du pain avant l’assemblage ;
- tenir compte de la charge Fish&NO et friteuse ;
- ne pas pénaliser un poste non concerné.

---

# 42. Contraintes d’implémentation

- Le moteur doit être indépendant de React.
- Il ne doit pas lire directement Supabase.
- Les fonctions de score doivent être pures.
- Les pondérations doivent être centralisées.
- Les règles prioritaires doivent être explicites.
- Les décisions doivent être reproductibles.
- Les options humaines autorisées doivent rester sélectionnables.
- L’ancien moteur peut rester disponible temporairement pour comparaison.
- Les résultats doivent être testables avec des objets en mémoire.
- Les règles métier doivent être référencées depuis `09_REGLES_METIER.md`.

---

# 43. Livrable attendu

Toute évolution du moteur de décision doit fournir :

- les critères utilisés ;
- les poids ;
- les seuils ;
- les règles prioritaires ;
- les raisons structurées ;
- les fonctions modifiées ;
- les tests ajoutés ;
- les résultats de test ;
- les comparaisons avec l’ancien moteur ;
- les cas encore ambigus ;
- les paramètres à ajuster en service réel ;
- la procédure de retour arrière.

---

# Principe fondamental

> Le moteur de décision ne cherche pas l’option contenant le moins de travail. Il cherche l’option qui permet de poursuivre la production avec le moins de perturbations, le moins de risques et le meilleur usage des ressources disponibles.

Ses résultats doivent rester explicables, configurables et toujours soumis à la décision humaine.