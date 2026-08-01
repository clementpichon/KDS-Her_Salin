# 10_SYNCHRONISATION.md

# Synchronisation et communication entre les systèmes

> Version : 2.1  
> Statut : Document de référence  
> Dépendances :
>
> - `00_ARCHITECTURE_GLOBALE.md`
> - `01_VISION_GENERALE.md`
> - `02_MODELE_DE_DONNEES.md`
> - `03_MOTEUR_PLANIFICATION.md`
> - `04_MOTEUR_DECISION.md`
> - `05_POSTE_CAISSE.md`
> - `06_POSTE_PIZZAIOLO.md`
> - `07_POSTE_FOUR.md`
> - `08_POSTE_PANINO.md`
> - `09_REGLES_METIER.md`

---

# 1. Objectif

Ce document définit la manière dont les données circulent entre :

- L’Addition ;
- le proxy local ;
- le KDS ;
- Supabase ;
- les différents postes de travail ;
- les futures commandes en ligne ;
- les appareils installés dans le restaurant.

La synchronisation doit garantir que tous les postes utilisent le même état métier.

Elle doit également éviter :

- les commandes en double ;
- les validations en double ;
- les pertes de données ;
- les états contradictoires ;
- les actions écrasées silencieusement ;
- l’affichage de données périmées comme si elles étaient certaines.

La couche de synchronisation transporte et sécurise les événements.

Elle ne prend pas de décision métier.

---

# 2. Principes fondamentaux

## 2.1 Une seule source de vérité

L’état partagé et confirmé du restaurant doit être conservé dans la base centrale.

Les interfaces peuvent conserver :

- un cache local ;
- un brouillon ;
- un état optimiste temporaire.

Elles ne doivent pas créer une seconde vérité indépendante.

---

## 2.2 Les actions sont exprimées par des événements métier

Les postes ne doivent pas modifier directement des états complexes sans intention explicite.

Exemples d’événements :

```text
order.created
```

```text
work_unit.started
```

```text
batch.locked
```

```text
production_unit.ready
```

```text
order.handed_over
```

Chaque événement décrit ce qui s’est réellement passé.

---

## 2.3 Les événements doivent être idempotents

Le même événement peut être reçu plusieurs fois à cause :

- d’une nouvelle tentative réseau ;
- d’un double clic ;
- d’une reconnexion ;
- d’un rejeu du proxy ;
- d’un abonnement temps réel dupliqué.

Il ne doit produire qu’un seul effet.

---

## 2.4 La synchronisation ne contient pas les règles métier

La couche de synchronisation ne doit pas décider :

- si un créneau est recommandé ;
- quelle pizza préparer ;
- si une base a été remplacée ;
- quelle fournée constituer.

Elle transporte les données nécessaires aux moteurs métier.

---

## 2.5 Les actions réelles priment sur les projections

Les projections peuvent être recalculées.

Les actions réelles doivent être conservées.

Exemples d’actions réelles :

- pizza placée sur un disque ;
- Work Unit commencée ;
- fournée verrouillée ;
- fournée enfournée ;
- pizza prête.

Une nouvelle projection ne doit jamais annuler silencieusement ces actions.

---

# 3. Architecture de synchronisation

```text
L’Addition
     │
     ▼
Impression ou source de commande
     │
     ▼
Proxy local
     │
     ▼
API d’import KDS
     │
     ▼
Validation et normalisation
     │
     ▼
Supabase
     │
     ├──────────────┐
     ▼              ▼
Événements       Realtime
métier              │
     │               ▼
     └────────► Postes KDS
```

Flux futur possible :

```text
Site de commande
       │
       ▼
API KDS
       │
       ▼
Même pipeline métier
```

Tous les canaux d’entrée doivent converger vers le même modèle métier.

---

# 4. Rôle du proxy

Le proxy assure la communication avec L’Addition ou les périphériques locaux.

Il peut notamment :

- recevoir une impression ;
- lire un flux de tickets ;
- convertir un format brut ;
- transmettre une commande au KDS ;
- conserver temporairement un message non envoyé ;
- retenter une transmission ;
- fournir un identifiant stable.

Le proxy ne doit pas :

- calculer les créneaux ;
- déterminer la priorité ;
- constituer les fournées ;
- décider de la base réelle au-delà d’une normalisation technique simple ;
- modifier les états de production.

---

# 5. Flux actuel L’Addition vers KDS

Le flux initial peut rester unidirectionnel.

```text
Prise de commande dans L’Addition
        ↓
Émission ou impression du ticket
        ↓
Proxy
        ↓
KDS
        ↓
Postes de production
```

Le KDS n’a pas besoin de renvoyer automatiquement les états de production vers L’Addition dans la première version.

Cette communication retour pourra être ajoutée ultérieurement.

---

# 6. Commandes créées dans le KDS

Une commande créée depuis le KDS suit le flux suivant :

```text
Brouillon Caisse
      ↓
Validation finale
      ↓
Création KDS
      ↓
Décomposition en Production Units
      ↓
Création des Work Units
      ↓
Diffusion aux postes
      ↓
Rubrique « À enregistrer dans L’Addition »
```

La production peut commencer avant la ressaisie dans L’Addition.

La commande reste commercialement en attente d’enregistrement.

---

# 7. Rapprochement avec L’Addition

Lorsqu’une commande KDS est ensuite saisie dans L’Addition, le système doit éviter de créer une seconde commande de production.

Le rapprochement peut s’appuyer sur plusieurs critères :

- identifiant externe transmis si disponible ;
- nom du client ;
- heure de remise ;
- contenu ;
- heure de création ;
- montant éventuel ;
- téléphone éventuel.

Le rapprochement automatique ne doit être utilisé que si la confiance est suffisante.

Sinon, demander une validation humaine.

---

# 8. Identifiants

Chaque entité doit disposer d’un identifiant stable.

Exemples :

```ts
order.id
orderItem.id
productionUnit.id
workUnit.id
batch.id
domainEvent.id
```

Les identifiants ne doivent pas dépendre :

- de l’ordre d’affichage ;
- de l’index d’un tableau ;
- de l’heure locale seule ;
- du nom du client.

---

# 9. Identifiants externes

Une commande peut posséder plusieurs références externes.

```ts
type ExternalReference = {
  system:
    | "addition"
    | "proxy"
    | "online"
    | "ocr"
    | "other"

  externalId: string
}
```

Une contrainte d’unicité doit empêcher l’import multiple d’une même référence.

---

# 10. Clé d’idempotence

Toute opération importante doit utiliser une clé d’idempotence.

Exemple :

```ts
type IdempotentCommand = {
  idempotencyKey: string
  action: string
  entityId?: string
  payload: unknown
}
```

Exemples d’opérations concernées :

- création de commande ;
- lancement d’une Work Unit ;
- verrouillage d’une fournée ;
- enfournement ;
- sortie du four ;
- validation d’une post-cuisson ;
- consommation de pâton ;
- marquage comme enregistré dans L’Addition.

---

# 11. Création idempotente d’une commande

Une nouvelle tentative avec la même clé doit retourner la commande déjà créée.

Elle ne doit pas :

- recréer les articles ;
- recréer les Production Units ;
- recréer les Work Units ;
- décrémenter à nouveau le stock ;
- envoyer plusieurs notifications.

---

# 12. Version des entités

Les entités modifiables doivent posséder une version ou un champ de mise à jour.

Exemple :

```ts
type VersionedEntity = {
  id: string
  version: number
  updatedAt: string
}
```

Une modification peut indiquer :

```ts
expectedVersion
```

Si la version ne correspond plus, le serveur refuse l’écrasement aveugle et renvoie l’état actuel.

---

# 13. Concurrence optimiste

La concurrence optimiste est recommandée pour les actions rapides.

Exemple :

1. l’interface affiche une pizza disponible ;
2. deux appareils tentent de la sélectionner ;
3. le premier enregistrement valide la nouvelle version ;
4. le second reçoit un conflit ;
5. son interface se met à jour.

Résultat attendu :

```text
Une seule sélection confirmée
```

---

# 14. Verrouillage des actions critiques

Certaines actions peuvent nécessiter une protection plus stricte.

Exemples :

- enfourner une fournée ;
- consommer un pain ;
- marquer une Production Unit prête ;
- réinitialiser le stock de pâtons ;
- rapprocher une commande externe.

Selon l’implémentation, utiliser :

- transaction ;
- fonction serveur ;
- contrainte d’unicité ;
- verrou logique ;
- procédure stockée.

---

# 15. Événements métier

Structure recommandée :

```ts
type DomainEvent = {
  id: string
  type: string

  entityType: string
  entityId: string

  aggregateId?: string | null

  occurredAt: string
  receivedAt: string

  actorId?: string | null
  source:
    | "kds"
    | "addition"
    | "proxy"
    | "online"
    | "system"
    | "migration"

  idempotencyKey?: string | null

  payload: Record<string, unknown>

  schemaVersion: number
}
```

---

# 16. Événements principaux

## Commandes

```text
order.created
order.updated
order.cancelled
order.pickup_time_changed
order.ready
order.handed_over
```

## Production Units

```text
production_unit.created
production_unit.selected
production_unit.status_changed
production_unit.ready
production_unit.cancelled
production_unit.remake_requested
```

## Work Units

```text
work_unit.created
work_unit.planned
work_unit.started
work_unit.blocked
work_unit.completed
work_unit.cancelled
```

## Fournées

```text
batch.projected
batch.locked
batch.started
batch.updated
batch.completed
batch.cancelled
```

## Ressources

```text
resource.available
resource.busy
resource.unavailable
```

## Stock

```text
dough_stock.initialized
dough_stock.consumed
dough_stock.loss_recorded
dough_stock.corrected
dough_stock.reset
```

---

# 17. Ordre des événements

Les événements peuvent arriver dans un ordre différent de leur émission.

Le système doit utiliser :

- `occurredAt` ;
- la version de l’entité ;
- les dépendances ;
- l’identifiant de l’événement.

Un événement ancien ne doit pas écraser un état plus récent.

---

# 18. Rejeu des événements

Le système doit pouvoir rejouer des événements sans produire de doublons.

Cela permet :

- de réparer une synchronisation ;
- de reconstruire un état ;
- de reprendre après une panne ;
- de migrer des données ;
- de recalculer certaines vues.

Les effets secondaires doivent rester idempotents.

---

# 19. Supabase Realtime

Supabase Realtime peut diffuser :

- les nouvelles commandes ;
- les changements d’état ;
- les Work Units ;
- les fournées ;
- les ressources ;
- les événements.

Les abonnements doivent être ciblés.

Éviter qu’un poste reçoive inutilement toutes les lignes de toutes les tables si seules certaines données lui sont utiles.

---

# 20. Canaux ou filtres par établissement

Le modèle doit pouvoir évoluer vers plusieurs établissements.

Toute donnée synchronisée doit pouvoir être filtrée par :

```ts
restaurantId
```

ou identifiant équivalent.

Un appareil ne doit jamais recevoir les commandes d’un autre établissement.

---

# 21. Filtres par poste

Exemples :

## Pizzaiolo

Recevoir principalement :

- commandes avec pizzas ;
- Work Units Pizzaiolo ;
- OF Pain ;
- fournées liées ;
- priorités ;
- annulations.

## Four

Recevoir principalement :

- fournées validées ;
- pizzas associées ;
- commandes complètes concernées ;
- post-cuissons ;
- prévisualisations.

## Pani’NO

Recevoir principalement :

- Work Units Pani’NO ;
- état des pains ;
- friteuse ;
- commandes mixtes concernées.

La Caisse peut recevoir une vue globale plus large.

---

# 22. Abonnements uniques

Un composant ou une route ne doit pas créer plusieurs abonnements identiques non nettoyés.

À la destruction du composant :

- désabonner ;
- supprimer les écouteurs ;
- arrêter les timers associés.

Les reconnexions doivent éviter les abonnements en double.

---

# 23. Reconnexion

Après reconnexion :

1. récupérer l’état courant depuis la source centrale ;
2. vérifier les versions ;
3. traiter les actions locales en attente ;
4. reprendre les abonnements temps réel ;
5. recalculer les moteurs ;
6. signaler les conflits éventuels.

Ne pas supposer que tous les événements manqués seront nécessairement rejoués par le canal temps réel.

---

# 24. État en ligne

L’interface doit distinguer au minimum :

```text
Connecté
```

```text
Reconnexion en cours
```

```text
Hors ligne
```

```text
Synchronisation en attente
```

L’absence de bannière ne doit pas faire croire que les données sont à jour si elles ne le sont pas.

---

# 25. Mode hors connexion

Le KDS dépend fortement du temps réel.

Toutes les actions ne peuvent donc pas être considérées comme sûres hors ligne.

Les actions doivent être classées.

## Actions locales sûres

Exemples possibles :

- ouvrir un détail ;
- replier une section ;
- conserver un brouillon non envoyé ;
- modifier une préférence d’affichage locale.

## Actions métier à risque

Exemples :

- sélectionner une pizza ;
- enfourner ;
- déclarer prête ;
- consommer du stock ;
- créer une commande confirmée.

Ces actions doivent être bloquées ou mises en attente avec une stratégie de rejeu fiable.

---

# 26. File d’attente locale

Une action mise en attente peut utiliser :

```ts
type PendingAction = {
  id: string
  idempotencyKey: string

  actionType: string
  entityId?: string | null

  payload: unknown

  createdAt: string

  status:
    | "pending"
    | "sending"
    | "confirmed"
    | "conflict"
    | "failed"

  retryCount: number
}
```

La file doit être persistée localement si elle doit survivre à une actualisation.

---

# 27. Rejeu des actions locales

À la reconnexion :

- conserver l’ordre causal ;
- envoyer les actions avec leur clé d’idempotence ;
- vérifier les versions ;
- arrêter le rejeu si une action dépend d’un conflit non résolu ;
- ne pas rejouer aveuglément une action devenue incohérente.

---

# 28. Conflit après reconnexion

Exemple :

- une pizza a été sélectionnée hors ligne ;
- pendant ce temps, elle a été sélectionnée sur un autre appareil.

Résultat attendu :

- l’action locale passe en conflit ;
- elle n’écrase pas l’action confirmée ;
- l’utilisateur est informé ;
- les autres actions indépendantes peuvent continuer.

---

# 29. État optimiste

Une interface peut afficher immédiatement une action avant confirmation serveur.

Exemples :

- déplacer une tuile ;
- sélectionner une pizza ;
- changer une priorité.

L’état optimiste doit pouvoir être annulé si le serveur refuse l’action.

Pour une action critique comme l’enfournement, une confirmation serveur rapide peut être préférable avant d’afficher l’état comme certain.

---

# 30. États visuels de synchronisation

Une action optimiste peut afficher discrètement :

```text
Enregistrement…
```

Une action confirmée :

```text
Synchronisé
```

Une action en échec :

```text
Non enregistré
```

Éviter les messages permanents pour chaque action confirmée lorsque tout fonctionne normalement.

---

# 31. Synchronisation du brouillon Caisse

Le brouillon de commande peut rester local tant qu’il n’est pas confirmé.

Il peut être sauvegardé dans :

- l’état de l’application ;
- un stockage local ;
- éventuellement une table de brouillons si plusieurs appareils doivent le partager.

Il ne doit pas alimenter les postes de production avant validation finale.

---

# 32. Soumission du brouillon

Lors de la validation finale :

1. générer une clé d’idempotence ;
2. transmettre le brouillon complet ;
3. créer la commande dans une opération atomique ou cohérente ;
4. créer les Production Units ;
5. créer les Work Units ;
6. enregistrer l’état d’enregistrement L’Addition ;
7. publier les événements ;
8. retourner la commande créée.

Une erreur partielle ne doit pas laisser une commande incohérente sans signalement.

---

# 33. Import du proxy

Le proxy doit envoyer un objet contenant au minimum :

```ts
type ProxyOrderInput = {
  sourceId: string
  receivedAt: string

  rawContent: string

  parsedOrder?: {
    customerName?: string
    phone?: string
    pickupTime?: string
    items: ParsedOrderItem[]
  }

  parserVersion?: string
}
```

Le contenu brut doit être conservé pour :

- audit ;
- correction ;
- amélioration du parseur ;
- résolution d’un cas ambigu.

---

# 34. Validation d’un import

Avant création :

- vérifier l’identifiant externe ;
- vérifier le schéma ;
- normaliser les heures ;
- normaliser les quantités ;
- détecter les doublons ;
- conserver les champs inconnus ;
- produire des avertissements plutôt que supprimer silencieusement des informations.

---

# 35. Import partiel

Si certains éléments sont ambigus :

- créer la commande si les informations minimales sont suffisantes ;
- marquer la qualité des données ;
- afficher un avertissement ;
- permettre une correction manuelle.

Exemple :

```ts
dataQuality = "partial"
```

Ne pas inventer une base ou une modification avec une confiance artificielle.

---

# 36. Version du parseur

Chaque import doit enregistrer la version du parseur utilisé.

```ts
parserVersion
```

Cela permet de savoir quelles commandes peuvent être retraitées après amélioration des règles.

---

# 37. Modification d’une commande importée

Une modification provenant de L’Addition ou du proxy doit pouvoir :

- ajouter un produit ;
- retirer un produit ;
- changer une quantité ;
- changer l’heure ;
- annuler la commande.

Le système doit comparer la nouvelle version à l’ancienne et produire les événements métier correspondants.

---

# 38. Modification après début de production

Si une commande est modifiée après le début :

- ne pas supprimer les actions déjà réalisées ;
- conserver l’historique ;
- créer ou annuler uniquement les Work Units concernées ;
- signaler les changements aux postes ;
- recalculer le retard.

Exemple :

une pizza supplémentaire est ajoutée à une commande déjà prête.

Le système doit créer une nouvelle charge sans remettre artificiellement les pizzas prêtes en production.

---

# 39. Annulation externe

Une annulation venant de L’Addition doit être signalée immédiatement.

Si aucune production n’a commencé :

- annuler les Work Units ;
- libérer les ressources ;
- retirer la charge.

Si la production a commencé :

- conserver l’historique ;
- demander ou appliquer la politique de perte ;
- avertir les postes concernés.

---

# 40. Synchronisation des fournées

Une fournée projetée peut être recalculée fréquemment.

Il n’est pas toujours nécessaire de persister chaque micro-variation.

En revanche, une fournée verrouillée doit être persistée avec :

- sa composition ;
- son auteur ;
- son heure de verrouillage ;
- sa version.

---

# 41. Modification d’une fournée verrouillée

Une modification exceptionnelle doit être explicite.

Elle doit :

- vérifier que la cuisson n’a pas commencé ;
- enregistrer l’auteur ;
- augmenter la version ;
- publier un événement ;
- prévenir le Four.

Une projection automatique ne doit jamais modifier une fournée verrouillée.

---

# 42. Synchronisation du plan de travail

Chaque position du plan de travail doit correspondre à une affectation unique.

Une Production Unit ne peut pas occuper simultanément deux positions.

Une position ne peut pas contenir simultanément deux Production Units.

Ces règles doivent être protégées côté serveur ou base.

---

# 43. Synchronisation du Four

Les actions suivantes doivent être protégées contre les doublons :

- enfournement ;
- sortie ;
- validation de post-cuisson ;
- passage à prêt ;
- demande de reprise.

Le minuteur affiché peut être calculé localement à partir de l’heure serveur confirmée.

---

# 44. Horloge de référence

Les heures métier doivent utiliser une horloge cohérente.

Préférer :

- timestamps UTC stockés ;
- conversion dans le fuseau du restaurant à l’affichage.

L’heure d’un appareil ne doit pas être la seule source de vérité pour :

- l’enfournement ;
- la fin ;
- les retards ;
- les événements.

---

# 45. Fuseau horaire

Le fuseau du restaurant doit être configuré explicitement.

Exemple :

```text
Europe/Paris
```

Les changements d’heure saisonniers doivent être gérés correctement.

---

# 46. Après minuit

Une commande ou une action après minuit doit rester rattachée au bon service opérationnel.

Le système ne doit pas casser :

- les heures ;
- les tris ;
- les durées ;
- les statistiques,

lorsque le service dépasse exceptionnellement minuit.

---

# 47. Synchronisation du stock de pâtons

Toute consommation doit utiliser un événement unique.

Exemple :

```text
dough_stock.consumed
```

L’événement doit indiquer :

- Production Unit concernée ;
- quantité ;
- raison ;
- clé d’idempotence.

Une nouvelle tentative ne doit pas consommer un second pâton.

---

# 48. Réinitialisation du stock

L’action :

```text
Réinitialiser stock pâtons
```

doit être exécutée comme une opération atomique.

Elle met à jour :

- stock initial ;
- stock restant ;
- pertes.

Elle doit enregistrer :

- ancienne valeur ;
- nouvelle valeur ;
- auteur ;
- date ;
- raison éventuelle.

---

# 49. Sécurité des échanges

Les appels du proxy doivent être authentifiés.

Exemples de protections :

- jeton dédié ;
- signature ;
- HTTPS ;
- rotation des secrets ;
- limitation de débit ;
- journalisation des échecs.

Les secrets ne doivent pas être exposés dans le code client.

---

# 50. Données téléphoniques

Les numéros peuvent être hachés ou protégés selon leur usage.

Les événements techniques ne doivent pas recopier inutilement le téléphone dans chaque payload.

Utiliser l’identifiant de commande lorsque cela suffit.

---

# 51. Permissions

Chaque action doit vérifier les permissions.

Exemples :

## Caisse

- créer une commande ;
- modifier un créneau ;
- renseigner le client ;
- marquer comme enregistré dans L’Addition.

## Pizzaiolo

- sélectionner ;
- préparer ;
- constituer une fournée ;
- valider un OF ;
- signaler une perte.

## Four

- enfourner ;
- sortir ;
- valider une post-cuisson ;
- demander une reprise.

## Administrateur

- corriger des données ;
- réinitialiser le stock ;
- modifier la configuration ;
- consulter les journaux.

---

# 52. Journal d’audit

Les actions sensibles doivent être auditables.

Exemples :

- annulation ;
- suppression ;
- correction d’état ;
- reprise ;
- modification d’une fournée verrouillée ;
- réinitialisation de stock ;
- rapprochement L’Addition ;
- modification des règles ou constantes.

Le journal doit indiquer :

- qui ;
- quoi ;
- quand ;
- ancienne valeur ;
- nouvelle valeur ;
- source.

---

# 53. Erreurs

Les erreurs doivent être classées.

```ts
type SyncErrorType =
  | "network"
  | "authentication"
  | "validation"
  | "conflict"
  | "duplicate"
  | "server"
  | "timeout"
  | "unknown"
```

L’interface doit afficher un message adapté.

Une erreur technique détaillée peut être journalisée sans être exposée intégralement à l’utilisateur.

---

# 54. Nouvelle tentative

Les erreurs réseau temporaires peuvent utiliser une stratégie de nouvelle tentative.

Exemple :

```text
1 s
2 s
5 s
10 s
```

Avec une limite maximale.

Ne pas retenter automatiquement sans limite une erreur de validation ou de permission.

---

# 55. Observabilité

La synchronisation doit pouvoir mesurer :

- événements reçus ;
- événements dupliqués ;
- délais de propagation ;
- conflits ;
- erreurs ;
- reconnexions ;
- actions en attente ;
- durée des imports proxy.

Ces données doivent aider à diagnostiquer les problèmes pendant le service.

---

# 56. Indicateurs de santé

Exemples :

```text
Supabase connecté
```

```text
Proxy connecté
```

```text
Dernière commande reçue
```

```text
Nombre d’actions en attente
```

```text
Dernier événement temps réel
```

Ces informations peuvent être réservées à un écran technique.

---

# 57. Cache PWA

Le cache PWA peut conserver :

- fichiers statiques ;
- icônes ;
- feuilles de style ;
- code de l’application ;
- ressources de démarrage.

Il ne doit pas servir de source prioritaire pour :

- commandes ;
- états de production ;
- fournées ;
- créneaux ;
- stocks ;
- données temps réel.

---

# 58. Mise à jour de la PWA

Lorsqu’une nouvelle version est disponible :

- ne pas interrompre brutalement un service ;
- signaler la mise à jour ;
- permettre un rechargement contrôlé ;
- éviter de mélanger des schémas incompatibles.

Une stratégie de compatibilité de version doit être prévue.

---

# 59. Version des schémas

Les payloads d’événements et les messages du proxy doivent posséder une version.

Exemple :

```ts
schemaVersion: 1
```

Un consommateur doit pouvoir :

- accepter les versions connues ;
- migrer les anciennes ;
- refuser proprement une version incompatible.

---

# 60. Compatibilité progressive

Pendant une migration, deux versions d’interface peuvent coexister.

Les nouvelles données doivent être ajoutées de manière compatible lorsque possible.

Éviter de rendre immédiatement obligatoires des champs que les anciennes interfaces ne fournissent pas encore.

---

# 61. Suppression de données

Les suppressions métier doivent généralement être logiques.

Exemple :

```text
cancelled
```

plutôt qu’une suppression physique immédiate.

La suppression définitive peut être réservée :

- aux données de test ;
- aux doublons techniques validés ;
- aux obligations de conservation ou d’effacement.

---

# 62. Sauvegarde et restauration

La base doit disposer d’une stratégie de sauvegarde adaptée.

Avant une migration importante :

- sauvegarder ;
- tester la restauration ;
- documenter la migration ;
- prévoir un retour arrière.

---

# 63. Environnements

Distinguer au minimum :

```text
développement
test
production
```

Les commandes de test ne doivent pas polluer la production.

Les secrets et URLs doivent être séparés.

---

# 64. Mode test du KDS

Le mode test peut :

- afficher plus de détails ;
- journaliser les scores ;
- permettre des commandes fictives ;
- exposer les événements ;
- simuler des ressources.

Il ne doit pas utiliser accidentellement les mêmes données que le service réel sans indication claire.

---

# 65. Tests d’acceptation — Commande proxy

## Action

Envoyer deux fois le même message avec le même `sourceId`.

## Résultat attendu

- une seule commande créée ;
- un seul ensemble de Work Units ;
- aucun double stock consommé ;
- seconde réponse reconnue comme doublon idempotent.

---

# 66. Tests d’acceptation — Double clic Caisse

## Action

Soumettre deux fois le même brouillon avec la même clé.

## Résultat attendu

- une seule commande ;
- même identifiant retourné ;
- aucun doublon.

---

# 67. Tests d’acceptation — Sélection concurrente

Deux appareils sélectionnent la même pizza.

Résultat attendu :

- une seule affectation confirmée ;
- un conflit retourné au second ;
- interface mise à jour ;
- aucun écrasement silencieux.

---

# 68. Tests d’acceptation — Double enfournement

Deux appareils appuient sur `Enfourner`.

Résultat attendu :

- un seul `batch.started` ;
- une seule heure de départ ;
- un seul minuteur de référence ;
- second appel idempotent ou refusé proprement.

---

# 69. Tests d’acceptation — Reconnexion

1. couper la connexion ;
2. modifier l’état depuis un autre appareil ;
3. reconnecter le premier appareil.

Résultat attendu :

- récupération de l’état central ;
- aucune confiance aveugle dans le cache ;
- interface cohérente ;
- conflits locaux signalés.

---

# 70. Tests d’acceptation — Commande prête hors ligne

Tenter de valider une commande prête hors ligne.

Résultat attendu selon la stratégie retenue :

- action bloquée avec message ;
- ou action mise en attente avec état clairement visible ;
- jamais affichée comme synchronisée sans confirmation.

---

# 71. Tests d’acceptation — Stock

Envoyer deux fois le même événement de consommation de pâton.

Résultat attendu :

```text
Consommation totale : 1
```

et non :

```text
2
```

---

# 72. Tests d’acceptation — Réinitialisation

Deux appareils tentent de réinitialiser le stock simultanément.

Résultat attendu :

- conflit ou ordre explicite ;
- aucune valeur intermédiaire incohérente ;
- audit complet.

---

# 73. Tests d’acceptation — Modification après production

Commande de quatre pizzas, trois déjà prêtes.

Ajouter une cinquième pizza depuis une source externe.

Résultat attendu :

- trois pizzas restent prêtes ;
- nouvelle Production Unit créée ;
- nouvelle charge créée ;
- commande globale redevient incomplète ;
- aucun retour en production des trois pizzas prêtes.

---

# 74. Tests d’acceptation — Annulation

Commande partiellement commencée annulée depuis L’Addition.

Résultat attendu :

- postes informés ;
- Work Units non commencées annulées ;
- actions déjà réalisées conservées ;
- pertes éventuelles enregistrables ;
- historique intact.

---

# 75. Contraintes d’implémentation

- Ne pas placer les secrets du proxy dans le client.
- Utiliser des clés d’idempotence pour les actions critiques.
- Centraliser la gestion des abonnements temps réel.
- Nettoyer les abonnements lors des changements de route.
- Ne pas utiliser le cache PWA comme vérité métier.
- Ne pas ignorer silencieusement les conflits.
- Conserver le contenu brut des imports.
- Versionner les payloads.
- Tester la reconnexion sur les appareils réels.
- Conserver temporairement les anciens flux pendant la migration.
- Ajouter des journaux techniques exploitables.
- Documenter toute différence entre environnement local et production.

---

# 76. Livrable attendu

Toute évolution importante de la synchronisation doit fournir :

- le diagramme du flux concerné ;
- les événements ajoutés ou modifiés ;
- les clés d’idempotence ;
- les protections contre les doublons ;
- la stratégie de conflit ;
- la stratégie hors ligne ;
- les migrations ;
- les tests ;
- les résultats de charge éventuels ;
- les paramètres de sécurité ;
- la procédure de retour arrière ;
- les points restant à vérifier sur le réseau réel du restaurant.

---

# Principe fondamental

> La synchronisation doit rendre les actions réelles visibles partout sans les dupliquer, sans les perdre et sans permettre qu’une projection ou un cache écrase l’état confirmé du restaurant.

Un poste peut momentanément afficher un état optimiste, mais seule la confirmation partagée constitue la vérité opérationnelle du KDS.