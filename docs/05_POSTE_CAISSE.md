# 05_POSTE_CAISSE.md

# Poste Caisse

> Version : 2.1  
> Statut : Document de référence  
> Dépendances :
>
> - `00_ARCHITECTURE_GLOBALE.md`
> - `01_VISION_GENERALE.md`
> - `02_MODELE_DE_DONNEES.md`
> - `03_MOTEUR_PLANIFICATION.md`
> - `04_MOTEUR_DECISION.md`

---

# 1. Objectif

Le poste Caisse est l’interface de prise de commande, de choix des créneaux et de suivi de la production.

Il ne doit pas reproduire l’intégralité des fonctions de L’Addition.

Son rôle principal est de :

- aider à constituer une commande ;
- proposer les créneaux de remise les plus adaptés ;
- montrer l’impact réel de la commande sur la production ;
- envoyer immédiatement la commande aux postes concernés ;
- permettre de suivre son avancement ;
- conserver les commandes saisies dans le KDS en attente d’enregistrement dans L’Addition.

La Caisse utilise les résultats du moteur de planification et du moteur de décision.

Elle ne recalcule jamais elle-même :

- la charge ;
- les fournées ;
- le score ;
- la réserve ;
- les retards ;
- les créneaux recommandés.

---

# 2. Philosophie de l’interface

Le poste Caisse doit fonctionner comme un assistant guidé.

À chaque étape, l’utilisateur ne doit répondre qu’à une seule question.

```text
Étape 1
Quels produits souhaite le client ?

Étape 2
Quel créneau de remise choisir ?

Étape 3
Quel nom donner à la commande ?
```

Les trois étapes ne doivent pas être affichées simultanément.

Chaque étape remplace la précédente afin de :

- limiter le défilement ;
- réduire la charge visuelle ;
- accélérer la saisie ;
- éviter les erreurs.

---

# 3. Parcours général

```text
Sélection des produits
        ↓
Validation du panier
        ↓
Simulation des créneaux
        ↓
Choix du créneau
        ↓
Identification du client
        ↓
Création définitive
        ↓
Envoi vers les postes
        ↓
À enregistrer dans L’Addition
```

La commande ne doit être créée définitivement qu’à la dernière étape.

Avant cette validation, elle reste un brouillon.

---

# 4. Brouillon de commande

Toutes les étapes doivent utiliser un objet unique.

```ts
type OrderDraft = {
  id: string

  items: OrderDraftItem[]

  selectedPickupTime?: string | null

  customerName: string
  customerPhone?: string | null

  source: "kds"

  currentStep:
    | "products"
    | "pickup_slot"
    | "customer"
    | "submitting"
    | "completed"

  createdAt: string
  updatedAt: string
}
```

Le brouillon doit conserver :

- les produits ;
- les quantités ;
- les modifications ;
- la base réelle demandée ;
- le créneau sélectionné ;
- le nom ;
- le téléphone.

Un retour à l’étape précédente ne doit jamais effacer les données.

---

# 5. Étape 1 — Sélection des produits

La première étape affiche uniquement les produits.

Catégories principales :

- Pizzas ;
- Pani’NO ;
- Fish&NO ;
- Frites.

L’utilisateur doit pouvoir :

- ajouter un produit ;
- retirer un produit ;
- modifier une quantité ;
- modifier la base d’une pizza ;
- ajouter un supplément ;
- ajouter un retrait ;
- consulter le panier ;
- supprimer une ligne.

---

# 6. Organisation des produits

L’interface peut utiliser :

- des catégories ;
- des onglets ;
- une recherche ;
- des favoris ;
- des produits fréquemment commandés.

L’affichage doit rester tactile et compact.

Aucune action essentielle ne doit dépendre :

- d’un clic droit ;
- d’un survol ;
- d’un geste difficile à reproduire sur tablette.

---

# 7. Base des pizzas

Lorsqu’une pizza est ajoutée, l’utilisateur doit pouvoir choisir sa base réelle.

La valeur enregistrée doit représenter la base principale réellement demandée.

Exemple :

```text
Fromages

Base par défaut :
Crème de chèvre

Base choisie :
Tomate
```

Résultat :

```text
requestedBase = tomato
baseResolution = explicit
```

Une sauce ajoutée en supplément ne doit pas automatiquement remplacer la base.

Exemple :

```text
Regina
+ crème
```

Résultat :

```text
Base réelle : tomate
Supplément : crème
```

---

# 8. Panier compact

Le panier doit rester visible sous une forme compacte.

Exemple :

```text
3 pizzas · 1 Pani’NO · 1 Fish&NO
```

Le détail peut être ouvert à la demande.

Le résumé ne doit pas occuper une grande carte.

Le bouton principal est :

```text
Continuer
```

Il doit être désactivé si le panier est vide.

---

# 9. Validation des produits

Lorsque l’utilisateur valide les produits :

- le panier reste conservé ;
- l’écran Produits disparaît ;
- le moteur simule les créneaux ;
- l’étape de choix du créneau s’ouvre.

La commande ne doit pas encore être enregistrée dans la base comme commande définitive.

---

# 10. Étape 2 — Choix du créneau

Cette étape présente les heures de remise encore proposées.

Les créneaux doivent couvrir toute la plage restante du service.

## Midi

```text
12 h 00 → 14 h 00
```

## Soir

```text
19 h 00 → 22 h 30
```

Ils sont généralement espacés de cinq minutes.

L’interface ne doit jamais limiter artificiellement la liste à une heure après l’instant actuel.

---

# 11. Créneaux recommandés et autres créneaux

Les créneaux peuvent être organisés en deux groupes.

```text
Créneaux recommandés

Autres créneaux
```

À l’intérieur de chaque groupe, conserver l’ordre chronologique.

Tous les créneaux restent sélectionnables sauf blocage métier réel.

Un créneau dense ou très chargé peut être choisi volontairement après avertissement.

---

# 12. Contenu minimal d’un créneau

Chaque ligne ou tuile doit afficher uniquement les informations nécessaires à la décision.

Exemple :

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

L’interface doit mettre en avant :

1. l’heure ;
2. la charge résiduelle actuelle ;
3. l’impact du panier ;
4. la recommandation.

---

# 13. Informations à ne pas afficher par défaut

Ne pas afficher par défaut :

- le détail complet du score ;
- toutes les commandes du créneau ;
- les pondérations ;
- toutes les ressources ;
- les données des postes non concernés ;
- les statistiques historiques ;
- les informations techniques de planification.

Ces informations peuvent être accessibles dans un volet de détail.

---

# 14. Ne pas afficher de faux créneau chargé

Un créneau vide ou faiblement chargé ne doit jamais être considéré comme dense en raison de la seule réserve.

Exemple :

```text
1 pizza restante
+ 3 pizzas du panier
= 4 pizzas
```

Résultat attendu :

```text
Fournée complète
Recommandé ou Fluide
```

La réserve restante peut être nulle.

Cela ne constitue pas une surcharge.

---

# 15. Charge résiduelle affichée

La Caisse doit afficher le travail restant, pas uniquement le volume historique.

Exemple :

```text
12 pizzas prévues
8 déjà prêtes
4 restent à produire
```

Pour la recommandation, la charge pertinente est :

```text
4
```

Une commande prête reste visible dans le suivi client, mais ne charge plus la production.

---

# 16. Détail facultatif d’un créneau

Un bouton ou une zone discrète peut ouvrir le détail.

Exemple :

```text
Voir le détail
```

Le détail peut afficher :

- les commandes déjà présentes ;
- le nombre de pizzas par commande ;
- les fournées projetées ;
- la charge des postes concernés ;
- les raisons de la recommandation ;
- le score en mode test.

Exemple :

```text
19 h 25 : 4/4
19 h 30 : 2/4

Paul : 1 pizza
Marie : 3 pizzas
Nouvelle commande : 2 pizzas
```

Les numéros de téléphone ne doivent pas apparaître dans ce détail.

---

# 17. Sélection du créneau

La totalité de la tuile doit être sélectionnable.

Il ne doit pas être nécessaire d’appuyer sur un petit bouton « Choisir ».

Le créneau sélectionné doit être identifiable par :

- un contour ;
- un fond discret ;
- une icône ;
- un texte.

Ne pas dépendre uniquement de la couleur.

---

# 18. Action principale toujours accessible

Le bouton principal ne doit jamais être placé uniquement en bas d’une longue liste.

Lorsqu’un créneau est sélectionné, afficher une barre d’action fixe.

Exemple :

```text
19 h 30 sélectionné

Continuer
```

Cette barre doit rester visible pendant le défilement.

Elle doit respecter :

- la safe area iOS ;
- la barre système Android ;
- les claviers virtuels ;
- les écrans tactiles.

---

# 19. Choix volontaire d’un créneau difficile

Un créneau défavorable reste sélectionnable sauf impossibilité réelle.

Lorsqu’il est choisi, afficher un avertissement clair.

Exemple :

```text
Ce créneau présente un risque de retard estimé à 10 minutes.

Le créneau de 19 h 50 est plus favorable.
```

Actions :

```text
Choisir quand même 19 h 30
Choisir 19 h 50
Annuler
```

La décision finale appartient à l’utilisateur.

---

# 20. Mise à jour en temps réel

Pendant la consultation des créneaux, la situation peut évoluer.

Exemples :

- une autre caisse crée une commande ;
- une pizza devient prête ;
- une fournée commence ;
- une commande est annulée ;
- le retard change.

Les créneaux doivent être recalculés en temps réel.

Si le créneau sélectionné évolue :

- conserver le panier ;
- conserver la sélection si elle reste valide ;
- actualiser les données ;
- avertir uniquement si le changement est significatif.

---

# 21. Vérification avant validation finale

Avant la création définitive de la commande, vérifier à nouveau le créneau.

Si la charge a changé :

- ne pas perdre le brouillon ;
- afficher les nouvelles informations ;
- demander confirmation si nécessaire.

Exemple :

```text
La situation de 19 h 30 a changé.

Ancienne projection :
4 pizzas

Nouvelle projection :
8 pizzas

Souhaitez-vous conserver ce créneau ?
```

---

# 22. Retour aux produits

L’utilisateur peut revenir aux produits.

Le panier doit rester intact.

Si les produits sont modifiés :

- invalider l’ancienne simulation ;
- recalculer les créneaux ;
- demander une nouvelle validation du créneau.

Le nom et le téléphone peuvent rester conservés dans le brouillon.

---

# 23. Étape 3 — Identification du client

Après validation du créneau, afficher uniquement :

- le nom de la commande ;
- le numéro de téléphone facultatif.

Le nom est obligatoire.

Le téléphone reste optionnel.

Exemple :

```text
Nom de la commande
[ Paul ]

Téléphone facultatif
[ 06 ... ]
```

Le champ principal doit recevoir le focus lorsque cela ne gêne pas l’usage tactile.

---

# 24. Résumé à l’étape Client

Afficher un résumé compact.

Exemple :

```text
3 pizzas · 1 Pani’NO
Remise : 19 h 30
```

Le détail complet reste accessible sans réafficher la grille des produits.

---

# 25. Validation finale

Le bouton principal est :

```text
Créer et envoyer la commande
```

Au clic :

1. désactiver le bouton ;
2. passer l’état du brouillon à `submitting` ;
3. vérifier le créneau ;
4. créer la commande ;
5. créer les articles ;
6. créer les unités de production ;
7. générer les Work Units ;
8. envoyer les événements nécessaires ;
9. ajouter la commande dans « À enregistrer dans L’Addition » ;
10. confirmer la création ;
11. réinitialiser le brouillon.

---

# 26. Protection contre les doublons

La création doit être idempotente.

Prévoir un identifiant unique de soumission.

```ts
type OrderSubmission = {
  draftId: string
  idempotencyKey: string
}
```

Un double clic ou une nouvelle tentative après une coupure réseau ne doit pas créer deux commandes.

Pendant l’enregistrement :

- désactiver le bouton ;
- afficher un chargement ;
- empêcher une nouvelle soumission concurrente.

---

# 27. Erreur réseau

En cas d’échec :

- conserver le brouillon ;
- conserver le créneau ;
- conserver le nom ;
- conserver le téléphone ;
- afficher une erreur claire ;
- permettre une nouvelle tentative.

Ne jamais effacer silencieusement une commande non enregistrée.

---

# 28. Commandes créées depuis le KDS

Toute commande créée depuis le poste Caisse KDS doit :

- partir immédiatement vers les postes de production ;
- être identifiée avec `source = "kds"` ;
- apparaître dans une rubrique :

```text
À enregistrer dans L’Addition
```

Cette rubrique remplace les prises de commandes sur papier.

---

# 29. À enregistrer dans L’Addition

Cette rubrique doit afficher les commandes KDS qui n’ont pas encore été ressaisies dans L’Addition.

Informations minimales :

- nom ;
- heure ;
- produits ;
- total des quantités ;
- heure de création ;
- état de production ;
- action « Marquer comme enregistré ».

Le marquage ne doit pas supprimer la commande du KDS.

Il doit uniquement mettre à jour son état de synchronisation commerciale.

---

# 30. État d’enregistrement L’Addition

```ts
type AdditionRegistrationStatus =
  | "not_required"
  | "pending"
  | "registered"
  | "failed"
```

Une commande provenant directement de L’Addition utilise :

```text
not_required
```

Une commande créée dans le KDS utilise d’abord :

```text
pending
```

---

# 31. Commandes provenant de L’Addition

Les commandes reçues via le proxy ne doivent pas être ressaisies dans le KDS.

Elles doivent :

- être créées automatiquement ;
- générer leurs unités de production ;
- générer leurs Work Units ;
- apparaître sur les postes concernés ;
- alimenter immédiatement le moteur de planification.

La Caisse KDS peut les consulter et suivre leur état.

---

# 32. Vue de suivi de production

La Caisse doit pouvoir répondre rapidement au client.

Pour chaque commande, afficher un état global compréhensible.

Exemples :

```text
Pas encore commencée
```

```text
En préparation
```

```text
Au four
```

```text
Post-cuisson
```

```text
Prête
```

```text
Remise
```

L’état global doit être dérivé des états réels.

L’interface ne doit pas le recalculer avec une logique différente.

---

# 33. Suivi détaillé

Le détail d’une commande peut montrer :

- pizzas en attente ;
- pizzas en préparation ;
- pizzas prêtes à enfourner ;
- pizzas au four ;
- pizzas en post-cuisson ;
- pizzas prêtes ;
- Pani’NO ;
- Fish&NO ;
- frites.

La Caisse doit ainsi pouvoir informer le client sans demander systématiquement aux autres postes.

---

# 34. Commandes mixtes

Une commande peut contenir plusieurs familles de produits.

Exemple :

```text
2 pizzas
1 Pani’NO
1 Fish&NO
1 frite
```

La commande ne devient prête que lorsque tous ses produits sont prêts.

L’interface doit néanmoins montrer la progression par poste.

Exemple :

```text
Pizzas : prêtes
Pani’NO : en préparation
Fish&NO : prêt
Frites : en attente
```

---

# 35. Commandes importantes

Le poste doit supporter :

- les commandes habituelles de 1 à 4 pizzas ;
- les commandes de 10 à 15 pizzas ;
- exceptionnellement les commandes d’environ 30 pizzas.

Une grosse commande ne doit pas monopoliser tout l’écran.

Dans les vues de suivi, elle doit pouvoir être :

- repliée ;
- développée ;
- accompagnée d’une progression.

Exemple :

```text
Entreprise X
15 pizzas
9/15 prêtes
```

---

# 36. Interface compacte

Supprimer ou masquer les éléments qui n’aident pas directement à :

- créer la commande ;
- choisir un créneau ;
- identifier le client ;
- suivre la production.

Éléments à éviter dans le flux principal :

- grands blocs descriptifs ;
- statistiques générales ;
- longs textes d’aide ;
- cartes imbriquées ;
- informations répétées ;
- grosses marges verticales.

---

# 37. Barre de progression

Afficher une progression discrète.

Exemple :

```text
✓ Produits   ● Créneau   ○ Client
```

Elle ne doit pas occuper une hauteur importante.

Elle indique uniquement l’étape actuelle.

Les boutons « Retour » restent le moyen principal de navigation.

---

# 38. Une seule action principale

Chaque étape possède une seule action principale.

## Produits

```text
Continuer
```

## Créneau

```text
Continuer avec 19 h 30
```

## Client

```text
Créer et envoyer la commande
```

Éviter plusieurs boutons principaux concurrents.

---

# 39. Boutons secondaires

Les actions secondaires doivent être plus discrètes.

Exemples :

```text
← Retour aux produits
```

```text
Annuler la commande
```

```text
Voir le détail
```

Elles ne doivent pas rivaliser visuellement avec l’action principale.

---

# 40. Annulation du brouillon

Prévoir une action :

```text
Annuler la commande
```

Si le panier n’est pas vide, demander confirmation.

Après confirmation :

- supprimer le brouillon local ;
- ne rien envoyer aux postes ;
- ne rien enregistrer comme commande ;
- revenir à l’étape Produits.

---

# 41. Persistance temporaire du brouillon

Le brouillon peut être conservé localement afin de résister :

- à un changement de route ;
- à une actualisation accidentelle ;
- à une brève perte de connexion.

Il ne doit pas être confondu avec une commande confirmée.

Prévoir une date d’expiration et une action permettant de reprendre ou supprimer le brouillon.

---

# 42. Ergonomie tablette

L’interface est conçue en priorité pour tablette.

Contraintes :

- éléments tactiles suffisamment grands ;
- aucune action principale dépendante du survol ;
- pas de défilement horizontal ;
- peu de défilement vertical ;
- actions principales fixes ou immédiatement accessibles ;
- support du paysage ;
- support du portrait si nécessaire ;
- aucune animation longue.

---

# 43. Ergonomie smartphone

La création depuis smartphone doit rester possible pour une seconde personne venant aider la Caisse.

Chaque étape doit occuper l’écran disponible.

Ne pas afficher les trois étapes les unes sous les autres.

Le bouton principal doit rester accessible au pouce.

---

# 44. Safe areas et en-tête

Le poste doit respecter les safe areas.

Exemple CSS :

```css
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}
```

Le bandeau supérieur ne doit pas entrer en conflit avec :

- la barre d’état iOS ;
- l’heure ;
- le Wi-Fi ;
- la batterie ;
- les encoches Android.

Les barres d’action fixes doivent respecter `safe-area-inset-bottom`.

---

# 45. En-tête compact

Le bandeau principal doit pouvoir être replié pendant le travail.

Le logo peut servir de bouton d’accueil.

Le poste actif doit rester identifiable.

Éviter de dupliquer dans l’application :

- l’heure système ;
- la date système ;
- le Wi-Fi ;
- la batterie,

lorsque le système d’exploitation les affiche déjà.

---

# 46. PWA

Le poste Caisse doit pouvoir fonctionner comme une Progressive Web App.

Attendus :

- installation Android ;
- ajout à l’écran d’accueil iOS ;
- ouverture en mode `standalone` ;
- orientation adaptée ;
- conservation de session ;
- support des safe areas ;
- absence de mise en cache agressive des commandes.

Les données temps réel ne doivent jamais être remplacées par une version périmée issue du cache.

---

# 47. Accessibilité

Ne pas transmettre une information uniquement par la couleur.

Exemple :

```text
Dense
```

doit rester lisible même sans distinction de couleur.

Les boutons doivent disposer :

- d’un libellé ;
- d’un état actif ;
- d’un focus visible ;
- d’une zone tactile suffisante.

---

# 48. Données sensibles

Le numéro de téléphone est facultatif.

Il ne doit apparaître que dans les vues qui en ont réellement besoin.

Il ne doit pas être affiché :

- dans le détail public d’un créneau ;
- sur le poste Pizzaiolo ;
- sur le poste Four ;
- sur le poste Pani’NO.

---

# 49. États de chargement

Chaque opération asynchrone doit avoir un état explicite.

Exemples :

```text
Calcul des créneaux…
```

```text
Création de la commande…
```

```text
Mise à jour de la production…
```

Éviter les écrans figés sans indication.

---

# 50. États vides

Prévoir des états vides clairs.

Exemples :

```text
Aucun produit dans le panier
```

```text
Aucun créneau disponible pour ce service
```

```text
Aucune commande à enregistrer dans L’Addition
```

```text
Aucune commande en cours
```

---

# 51. Mode test

En mode test, permettre l’affichage facultatif :

- du score ;
- des raisons ;
- des projections de fournées ;
- de la charge résiduelle ;
- de la réserve ;
- des avertissements.

Ces informations doivent être cachées par défaut en production.

---

# 52. Ce que le poste Caisse ne doit jamais faire

Le poste Caisse ne doit jamais :

- recalculer lui-même le score ;
- décider qu’un créneau est dense ;
- ajouter la réserve à la charge ;
- compter une pizza prête comme restant à produire ;
- créer des fournées réelles ;
- modifier une fournée verrouillée ;
- imposer un créneau ;
- perdre un brouillon après une erreur réseau ;
- créer deux commandes après un double clic.

---

# 53. Tests d’acceptation — Parcours simple

## Précondition

Panier vide.

## Actions

1. ajouter une Regina ;
2. continuer ;
3. sélectionner 19 h 30 ;
4. saisir « Paul » ;
5. laisser le téléphone vide ;
6. créer la commande.

## Résultat attendu

- une seule commande est créée ;
- la pizza est envoyée au Pizzaiolo ;
- la commande apparaît dans « À enregistrer dans L’Addition » ;
- le brouillon est réinitialisé.

---

# 54. Tests d’acceptation — Commande mixte

## Panier

- 2 pizzas ;
- 1 Pani’NO ;
- 1 Fish&NO ;
- 1 frite.

## Résultat attendu

- simulation de tous les postes concernés ;
- création d’une seule commande ;
- articles envoyés aux bons postes ;
- commande prête uniquement lorsque tous les produits sont prêts.

---

# 55. Tests d’acceptation — Retour en arrière

1. créer un panier ;
2. choisir un créneau ;
3. revenir aux produits ;
4. ajouter deux pizzas.

Résultat attendu :

- panier conservé ;
- ancien créneau invalidé ;
- nouvelle simulation ;
- nom et téléphone conservés si déjà saisis.

---

# 56. Tests d’acceptation — Mise à jour temps réel

Pendant le choix du créneau, une autre caisse ajoute une commande.

Résultat attendu :

- recalcul des créneaux ;
- panier conservé ;
- sélection conservée si possible ;
- avertissement si la charge change significativement.

---

# 57. Tests d’acceptation — Double validation

Appuyer plusieurs fois sur :

```text
Créer et envoyer la commande
```

Résultat attendu :

- une seule commande ;
- aucun doublon ;
- bouton désactivé pendant la soumission.

---

# 58. Tests d’acceptation — Erreur réseau

Simuler une erreur lors de la création.

Résultat attendu :

- brouillon conservé ;
- aucune commande partielle dupliquée ;
- message d’erreur ;
- possibilité de réessayer.

---

# 59. Tests d’acceptation — Charge résiduelle

Une commande de quatre pizzas pour 19 h 30 est déjà prête.

Créer un nouveau panier de quatre pizzas pour 19 h 30.

Résultat attendu :

- charge actuelle affichée : 0 ;
- charge projetée : 4 ;
- les huit pizzas historiques ne sont pas présentées comme restant à produire.

---

# 60. Tests d’acceptation — Réserve consommée

Situation :

```text
1 pizza restante
+3 pizzas panier
=4
```

Résultat attendu :

- fournée complète ;
- recommandé ou fluide ;
- jamais dense uniquement parce que la réserve restante vaut zéro.

---

# 61. Tests d’acceptation — Grosse commande

Panier :

```text
15 pizzas
```

Résultat attendu :

- projection sur plusieurs fournées ;
- interface toujours lisible ;
- détail repliable ;
- bouton de validation accessible ;
- aucune limite artificielle à quatre pizzas.

---

# 62. Contraintes d’implémentation

- Réutiliser les moteurs existants lorsqu’ils sont fiables.
- Ne pas dupliquer les règles métier dans les composants.
- Conserver temporairement l’ancienne Caisse derrière une route ou un indicateur de fonctionnalité.
- Tester la nouvelle interface avant suppression de l’ancienne.
- Centraliser l’état du brouillon.
- Utiliser des opérations idempotentes.
- Conserver la compatibilité avec les commandes du proxy.
- Ne pas mélanger dans un même commit une refonte complète du moteur et de l’interface.
- Documenter les écarts entre spécification et code existant.

---

# 63. Livrable attendu

Toute refonte importante du poste Caisse doit fournir :

- les composants ajoutés ou modifiés ;
- la structure du brouillon ;
- les appels aux moteurs ;
- les flux de création ;
- les protections contre les doublons ;
- les tests ajoutés ;
- les résultats de lint et build ;
- les migrations éventuelles ;
- la procédure de retour arrière ;
- les captures avant et après ;
- les points restant à valider en service réel.

---

# Principe fondamental

> Le poste Caisse n’est pas un formulaire unique et n’est pas un moteur de planification. Il guide l’utilisateur à travers une succession de décisions simples, en affichant les résultats calculés par les moteurs et en conservant toujours la décision finale humaine.

Son efficacité se mesure à la rapidité de prise de commande, à la clarté des créneaux et à la réduction des interruptions entre la Caisse et les postes de production.