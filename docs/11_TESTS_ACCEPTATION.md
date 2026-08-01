# 11_TESTS_ACCEPTATION.md

# Tests d’acceptation du KDS

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
> - `10_SYNCHRONISATION.md`

---

# 1. Objectif

Ce document définit les tests d’acceptation fonctionnels du KDS.

Il permet de vérifier que le système respecte :

- les règles métier ;
- les comportements attendus des moteurs ;
- les parcours des postes ;
- la synchronisation ;
- les contraintes de stabilité ;
- les cas limites observés dans la pizzeria.

Un développement ne doit pas être considéré comme terminé uniquement parce qu’il compile.

Il doit également satisfaire les scénarios applicables de ce document.

---

# 2. Types de tests

Les tests doivent être répartis en plusieurs niveaux.

## 2.1 Tests unitaires

Ils vérifient une fonction métier isolée.

Exemples :

- calcul de charge résiduelle ;
- résolution d’une base ;
- score de faisabilité ;
- génération des créneaux ;
- détection d’une dépendance bloquée.

## 2.2 Tests d’intégration

Ils vérifient la collaboration de plusieurs composants métier.

Exemples :

- création d’une commande et génération des Work Units ;
- passage d’une pizza à `ready` et recalcul du créneau ;
- envoi d’une fournée au Four ;
- déblocage du poste Pani’NO après validation des pains.

## 2.3 Tests d’interface

Ils vérifient :

- le parcours utilisateur ;
- la lisibilité ;
- les états visibles ;
- l’accessibilité des actions ;
- l’absence de perte de données.

## 2.4 Tests de synchronisation

Ils vérifient :

- les conflits ;
- les doublons ;
- la reconnexion ;
- les événements temps réel ;
- l’idempotence.

## 2.5 Tests en conditions réelles

Ils sont réalisés :

- sur tablette ;
- sur smartphone ;
- pendant un service de test ;
- puis pendant des services réels contrôlés.

---

# 3. Règle de validation

Chaque test doit préciser :

- la précondition ;
- les données d’entrée ;
- l’action ;
- le résultat attendu ;
- les événements attendus ;
- les états finaux ;
- les éventuelles données à ne pas modifier.

Un test est échoué si le résultat fonctionnel est correct mais que le système crée :

- un doublon ;
- une donnée incohérente ;
- une perte de traçabilité ;
- une régression sur un autre poste.

---

# 4. Convention de nommage

Les tests peuvent utiliser un identifiant stable.

Exemple :

```text
PLN-SLOT-001
```

Préfixes recommandés :

```text
DAT  Modèle de données
DEC  Décomposition
PLN  Planification
DCS  Décision
CAI  Caisse
PIZ  Pizzaiolo
FOU  Four
PAN  Pani’NO
SYN  Synchronisation
STK  Stock
SEC  Sécurité
PWA  PWA et appareils
E2E  Parcours de bout en bout
```

---

# 5. Données de référence

Les tests doivent utiliser des données explicites.

Exemple de commande simple :

```text
Commande Paul
Remise : 19 h 30
1 Regina
```

Exemple de commande complexe :

```text
Commande Marie
Remise : 20 h 00
1 Truffe Parme
1 Végétarienne
1 Napolitaine
```

Exemple de commande mixte :

```text
Commande Luc
Remise : 20 h 15
2 pizzas
1 Pani’NO
1 Fish&NO
1 portion de frites
```

---

# 6. Tests du modèle de données

## DAT-001 — Ligne de quantité supérieure à un

### Entrée

```text
Regina × 4
```

### Résultat attendu

- un `OrderItem` ;
- quatre `ProductionUnit` ;
- quatre identifiants distincts ;
- quatre états de production indépendants.

---

## DAT-002 — Suivi individuel

### Précondition

Quatre Regina issues de la même ligne.

### Action

Faire évoluer leurs états vers :

```text
ready
baking
preparing
waiting
```

### Résultat attendu

Les quatre états sont conservés indépendamment.

La quantité agrégée ne doit pas écraser ce suivi.

---

## DAT-003 — Commande prête

### Précondition

Commande de quatre pizzas.

### Action

Passer trois pizzas à `ready`.

### Résultat attendu

La commande reste non prête.

Après la quatrième pizza à `ready`, la commande pizza devient prête.

---

## DAT-004 — Commande mixte

### Précondition

Commande avec :

- une pizza ;
- un Pani’NO ;
- une portion de frites.

### Action

Passer uniquement la pizza à `ready`.

### Résultat attendu

La commande globale reste non prête.

---

## DAT-005 — Identifiants stables

### Action

Recharger les données ou recalculer les projections.

### Résultat attendu

Les identifiants des commandes, Production Units et Work Units confirmées ne changent pas.

---

# 7. Tests de résolution des bases

## DAT-BASE-001 — Base par défaut

### Entrée

```text
Regina
```

### Résultat attendu

```text
requestedBase = tomato
baseResolution = default
```

---

## DAT-BASE-002 — Remplacement explicite

### Entrée

```text
Fromages
Base choisie : tomate
```

### Résultat attendu

```text
requestedBase = tomato
baseResolution = explicit
```

---

## DAT-BASE-003 — Remplacement inféré

### Entrée

```text
Fromages
- crème de chèvre
+ sauce tomate
```

### Résultat attendu

```text
requestedBase = tomato
baseResolution = inferred_replacement
```

Les deux modifications utilisées par la résolution sont marquées comme consommées.

---

## DAT-BASE-004 — Supplément sans remplacement

### Entrée

```text
Regina
+ crème
```

### Résultat attendu

```text
requestedBase = tomato
baseResolution = default_with_extra_base_ingredient
```

La crème reste visible comme supplément.

---

## DAT-BASE-005 — Sans base

### Entrée

```text
Regina
- sauce tomate
```

### Résultat attendu

```text
requestedBase = none
baseResolution = removed_without_replacement
```

---

## DAT-BASE-006 — Ambiguïté

### Entrée

```text
Regina
- sauce tomate
+ crème
+ crème de truffe
```

### Résultat attendu

```text
baseResolution = ambiguous
```

Le système ne choisit pas arbitrairement une base.

---

## DAT-BASE-007 — Ancienne commande

### Précondition

Commande sans champ `requestedBase`.

### Résultat attendu

- repli sur la base par défaut ;
- données marquées comme héritées ou reconstruites ;
- commande toujours affichable.

---

# 8. Tests de décomposition en Work Units

## DEC-001 — Pizza sans post-cuisson

### Entrée

```text
1 Regina
```

### Résultat attendu

Chaîne minimale :

```text
prepare_pizza
load_oven
bake_batch
unload_oven
assemble_order
```

Aucune Work Unit `post_bake` inutile.

---

## DEC-002 — Pizza avec post-cuisson

### Entrée

```text
1 Chèvre miel
```

### Résultat attendu

Chaîne comportant une Work Unit :

```text
post_bake
```

pour le miel.

---

## DEC-003 — Supplément Four

### Entrée

```text
Fromages
+ Saumon
```

### Résultat attendu

- Work Unit de post-cuisson saumon ;
- pizza non prête avant validation de cette tâche.

---

## DEC-004 — Pani’NO

### Entrée

```text
2 Pani’NO
```

### Résultat attendu

- besoin de deux pains ;
- Work Unit d’OF Pain ;
- deux Production Units Pani’NO ;
- dépendances d’assemblage après disponibilité des pains.

---

## DEC-005 — Fish&NO

### Entrée

```text
1 Fish&NO
```

### Résultat attendu

Work Units distinctes pour :

- préparation ;
- friture ;
- accompagnement ;
- assemblage final.

---

## DEC-006 — Idempotence de la décomposition

### Action

Exécuter deux fois la décomposition de la même commande avec les mêmes identifiants.

### Résultat attendu

- aucune Production Unit dupliquée ;
- aucune Work Unit dupliquée ;
- mêmes identifiants retournés.

---

# 9. Tests de génération des créneaux

## PLN-SLOT-001 — Avant le service du midi

### Heure actuelle

```text
11 h 30
```

### Résultat attendu

Créneaux de :

```text
12 h 00 à 14 h 00
```

---

## PLN-SLOT-002 — Pendant le midi

### Heure actuelle

```text
12 h 37
```

### Résultat attendu

Premier créneau arrondi au prochain pas valide, puis génération jusqu’à 14 h 00.

---

## PLN-SLOT-003 — Entre les services

### Heure actuelle

```text
17 h 14
```

### Résultat attendu

Créneaux de :

```text
19 h 00 à 22 h 30
```

---

## PLN-SLOT-004 — Pendant le soir

### Heure actuelle

```text
20 h 10
```

### Résultat attendu

Créneaux restants jusqu’à 22 h 30.

---

## PLN-SLOT-005 — Après le service

### Heure actuelle

```text
22 h 35
```

### Résultat attendu

Aucun créneau passé du service du soir.

---

## PLN-SLOT-006 — Aucun horizon artificiel d’une heure

### Heure actuelle

```text
19 h 05
```

### Résultat attendu

La liste ne s’arrête pas à 20 h 05.

Elle continue jusqu’à 22 h 30.

---

# 10. Tests de dépendances

## PLN-DEP-001 — Post-cuisson bloquée

### Précondition

Pizza encore au four.

### Résultat attendu

La Work Unit de post-cuisson reste bloquée.

---

## PLN-DEP-002 — Post-cuisson libérée

### Action

Passer la cuisson à terminée.

### Résultat attendu

La Work Unit de post-cuisson devient disponible.

---

## PLN-DEP-003 — Assemblage Pani’NO bloqué

### Précondition

Pain non préparé.

### Résultat attendu

L’assemblage reste bloqué avec une raison explicite.

---

## PLN-DEP-004 — Validation des pains

### Action

Terminer l’OF Pain.

### Résultat attendu

Les assemblages concernés deviennent disponibles.

---

## PLN-DEP-005 — Cycle de dépendance

### Entrée

Créer artificiellement :

```text
A dépend de B
B dépend de A
```

### Résultat attendu

- cycle détecté ;
- avertissement métier ;
- aucune boucle infinie ;
- plan partiel retourné si possible.

---

# 11. Tests de charge résiduelle

## PLN-LOAD-001 — Pizza en attente

### État

```text
waiting
```

### Résultat attendu

La pizza contribue à la charge résiduelle.

---

## PLN-LOAD-002 — Pizza en préparation

### État

```text
preparing
```

### Résultat attendu

Charge active sur le poste Pizzaiolo.

---

## PLN-LOAD-003 — Pizza prête à enfourner

### État

```text
ready_for_oven
```

### Résultat attendu

- plus de charge de préparation principale ;
- charge active sur le flux Four ;
- Production Unit toujours non terminée.

---

## PLN-LOAD-004 — Pizza au four

### État

```text
baking
```

### Résultat attendu

Charge active au Four.

---

## PLN-LOAD-005 — Post-cuisson

### État

```text
post_bake
```

### Résultat attendu

Charge active au Four.

---

## PLN-LOAD-006 — Pizza prête

### État

```text
ready
```

### Résultat attendu

- charge de production nulle ;
- commande toujours visible dans le suivi et le poste Prêtes.

---

## PLN-LOAD-007 — Pizza annulée

### État

```text
cancelled
```

### Résultat attendu

Charge résiduelle nulle.

---

## PLN-LOAD-008 — Commande terminée en avance

### Données

```text
4 pizzas pour 19 h 30
4 pizzas prêtes à 19 h 05
```

### Résultat attendu

```text
charge résiduelle de production = 0
```

Le créneau de 19 h 30 redevient disponible pour une nouvelle charge.

---

# 12. Tests de constitution des fournées

## PLN-BATCH-001 — Trois plus une

### Charge existante

```text
3 pizzas
```

### Nouvelle charge

```text
1 pizza
```

### Résultat attendu

```text
4/4
```

Une fournée complète.

---

## PLN-BATCH-002 — Une plus trois

### Charge existante

```text
1 pizza
```

### Panier

```text
3 pizzas
```

### Résultat attendu

```text
4/4
```

Une fournée complète.

---

## PLN-BATCH-003 — Sept plus une

### Résultat attendu

```text
8 pizzas
2 fournées complètes
```

---

## PLN-BATCH-004 — Quatre plus une

### Résultat attendu

```text
1 fournée complète
1 fournée partielle de 1
```

Le cas doit être moins favorable que `3 + 1`, sans être automatiquement impossible.

---

## PLN-BATCH-005 — Six pizzas

### Commande

```text
6 pizzas à 19 h 30
```

### Résultat attendu

Projection possible :

```text
19 h 25 : 4
19 h 30 : 2
```

---

## PLN-BATCH-006 — Six plus deux

### Commande A

```text
6 pizzas à 19 h 30
```

### Commande B

```text
2 pizzas à 19 h 35
```

### Résultat attendu

Projection permettant :

```text
4 + 4
```

si les échéances sont compatibles.

---

## PLN-BATCH-007 — Trois plus cinq

### Commande A

```text
3 pizzas à 19 h 25
```

### Commande B

```text
5 pizzas à 19 h 30
```

### Résultat attendu

```text
Fournée 1 : 3 A + 1 B
Fournée 2 : 4 B
```

---

## PLN-BATCH-008 — Bases secondaires

### Données

Quatre pizzas disponibles, dont trois de même base et une différente.

### Résultat attendu

La fournée de quatre est privilégiée.

La quatrième place ne reste pas vide au seul motif de la base différente.

---

## PLN-BATCH-009 — Fournée incomplète nécessaire

### Données

Deux pizzas urgentes, aucune autre pizza compatible.

### Résultat attendu

- fournée de deux autorisée ;
- éventuel avertissement ;
- aucune création automatique d’une pizza inexistante.

---

## PLN-BATCH-010 — Fournée verrouillée

### Précondition

Fournée verrouillée de quatre pizzas.

### Action

Ajouter une nouvelle commande.

### Résultat attendu

La composition verrouillée ne change pas.

---

# 13. Tests d’anticipation

## PLN-ANT-001 — Préparation trente minutes avant

### Heure actuelle

```text
19 h 00
```

### Commande

```text
6 pizzas pour 19 h 30
```

### Résultat attendu

- Work Units de préparation disponibles ou planifiables ;
- aucun blocage lié à l’avance.

---

## PLN-ANT-002 — Cuisson encore trop tôt

### Même situation

### Résultat attendu

- préparation possible ;
- cuisson signalée comme anticipée selon la configuration ;
- action humaine éventuellement autorisée.

---

## PLN-ANT-003 — Libération de capacité

### Précondition

Commande planifiée terminée en avance.

### Résultat attendu

La capacité future est recalculée et peut absorber une commande spontanée.

---

## PLN-ANT-004 — Encombrement du plan de travail

### Précondition

Quatre disques déjà occupés.

### Résultat attendu

Aucune cinquième pizza affectée physiquement au plan.

Elle reste projetée ou en attente.

---

# 14. Tests de réserve

## PLN-RES-001 — Réserve préservée

### Résultat attendu

La réserve peut produire un petit bonus, sans modifier la charge physique.

---

## PLN-RES-002 — Réserve consommée

### Situation

Capacité compatible, réserve finale nulle.

### Résultat attendu

- statut de réserve : consommée ;
- aucune charge artificielle ajoutée.

---

## PLN-RES-003 — Réserve seule et classement

### Situation

```text
1 pizza restante
+3 pizzas du panier
=4
réserve restante = 0
```

### Résultat attendu

- recommandé ou fluide ;
- jamais dense ou très chargé pour la réserve seule.

---

## PLN-RES-004 — Capacité réellement dépassée

### Résultat attendu

La pénalité provient :

- du dépassement de capacité ;
- du retard ;
- de la saturation réelle.

Elle ne doit pas être attribuée artificiellement à la réserve.

---

# 15. Tests du moteur de décision Caisse

## DCS-CAI-001 — Créneau idéal

### Données

```text
0 pizza restante
4 pizzas du panier
aucun retard
```

### Résultat attendu

- fournée complète ;
- score élevé ;
- classement recommandé ou fluide.

---

## DCS-CAI-002 — Cas Paul

### Données

Commande existante Paul :

```text
1 pizza
```

Panier :

```text
3 pizzas
```

### Résultat attendu

```text
1 + 3 = 4
```

- score élevé ;
- fournée complète ;
- jamais très chargé.

---

## DCS-CAI-003 — Charge historique prête

### Données

Huit pizzas historiquement associées au créneau, toutes prêtes.

Panier :

```text
4 pizzas
```

### Résultat attendu

- charge actuelle affichée : 0 ;
- charge projetée : 4 ;
- ne pas afficher 12 pizzas restant à produire.

---

## DCS-CAI-004 — Retard réel

### Données

Même cas que `1 + 3`, mais :

- Pizzaiolo en retard ;
- Four chargé.

### Résultat attendu

- score réduit ;
- classement potentiellement dense ;
- raisons liées au retard et aux ressources.

---

## DCS-CAI-005 — Commande complexe

### Panier

Quatre pizzas à post-cuisson lourde.

### Résultat attendu

Score inférieur à quatre Margherita, même si les deux cas forment une fournée complète.

---

## DCS-CAI-006 — Commande mixte

### Panier

- deux pizzas ;
- un Pani’NO ;
- un Fish&NO.

### Résultat attendu

Prise en compte :

- du Pizzaiolo ;
- du Four ;
- du poste Pani’NO ;
- de la friteuse.

Aucun impact d’un poste non concerné.

---

## DCS-CAI-007 — Créneau toujours sélectionnable

### Données

Créneau très chargé mais pas techniquement impossible.

### Résultat attendu

- classement défavorable ;
- avertissement ;
- sélection encore possible ;
- alternative proposée.

---

# 16. Tests du parcours Caisse

## CAI-001 — Commande simple

### Actions

1. ajouter une Regina ;
2. continuer ;
3. choisir un créneau ;
4. saisir « Paul » ;
5. créer la commande.

### Résultat attendu

- une seule commande ;
- une seule Production Unit ;
- Work Units générées ;
- commande envoyée au Pizzaiolo ;
- commande ajoutée à « À enregistrer dans L’Addition ».

---

## CAI-002 — Téléphone facultatif

### Action

Laisser le téléphone vide.

### Résultat attendu

La commande est créée sans erreur.

---

## CAI-003 — Nom obligatoire

### Action

Laisser le nom vide.

### Résultat attendu

La validation finale reste impossible avec une indication claire.

---

## CAI-004 — Retour en arrière

### Actions

1. créer un panier ;
2. choisir un créneau ;
3. revenir aux produits ;
4. modifier le panier.

### Résultat attendu

- panier conservé ;
- créneau recalculé ;
- ancien résultat invalidé ;
- aucune commande définitive créée.

---

## CAI-005 — Bouton principal accessible

### Précondition

Longue liste de créneaux.

### Résultat attendu

Le bouton de continuation reste accessible sans atteindre le bas de la liste.

---

## CAI-006 — Double clic

### Action

Appuyer plusieurs fois sur la validation finale.

### Résultat attendu

Une seule commande créée.

---

## CAI-007 — Erreur réseau

### Action

Faire échouer la création.

### Résultat attendu

- brouillon conservé ;
- message clair ;
- nouvelle tentative possible ;
- aucun doublon après reprise.

---

## CAI-008 — Mise à jour temps réel

### Action

Une autre caisse ajoute une commande pendant le choix du créneau.

### Résultat attendu

- créneaux recalculés ;
- panier conservé ;
- changement significatif signalé.

---

## CAI-009 — Créneau devenu plus chargé avant soumission

### Résultat attendu

Une nouvelle vérification est effectuée.

L’utilisateur peut confirmer ou changer de créneau.

---

## CAI-010 — Commande de quinze pizzas

### Résultat attendu

- interface lisible ;
- projection multi-fournées ;
- aucune limite à quatre pizzas ;
- détail repliable.

---

# 17. Tests du poste Pizzaiolo

## PIZ-001 — Quatre disques vides

### Résultat attendu

Quatre positions visibles et stables.

---

## PIZ-002 — Sélection multi-commandes

### Commandes

```text
A : 2 pizzas
B : 1 pizza
C : 1 pizza
```

### Résultat attendu

Quatre disques occupés avec liens de commande conservés.

---

## PIZ-003 — Commande complète de trois pizzas

### Action

Sélectionner toute la commande.

### Résultat attendu

Trois disques occupés, quatrième libre.

---

## PIZ-004 — Commande complète de six pizzas

### Résultat attendu

- quatre pizzas sélectionnées au maximum ;
- deux restent en attente ;
- progression visible.

---

## PIZ-005 — Base modifiée

### Pizza

```text
Fromages
- crème de chèvre
+ sauce tomate
```

### Résultat attendu

Affichage :

```text
BASE TOMATE
```

Sans duplication des modifications consommées.

---

## PIZ-006 — Supplément crème

### Pizza

```text
Regina
+ crème
```

### Résultat attendu

- base tomate ;
- supplément crème visible ;
- aucun faux tag `BASE CRÈME`.

---

## PIZ-007 — Sans base

### Pizza

```text
Regina
- sauce tomate
```

### Résultat attendu

Indication visible :

```text
SANS BASE
```

---

## PIZ-008 — Anticipation libre

### Données

Commande de 19 h 30, heure actuelle 19 h 00.

### Résultat attendu

Commande sélectionnable.

---

## PIZ-009 — Fournée suggérée

### Données

Trois pizzas A et une pizza B.

### Résultat attendu

Suggestion de fournée complète, sans sélection physique automatique non confirmée.

---

## PIZ-010 — Fournée incomplète manuelle

### Action

Envoyer deux pizzas au Four.

### Résultat attendu

- action autorisée ;
- éventuel avertissement ;
- fournée réelle de deux.

---

## PIZ-011 — Retrait d’un disque

### Action

Retirer une pizza non verrouillée.

### Résultat attendu

- disque libéré ;
- Production Unit conservée ;
- Work Unit remise dans un état cohérent.

---

## PIZ-012 — Déplacement tactile

### Action

Déplacer une pizza entre deux positions.

### Résultat attendu

- positions actualisées ;
- aucune modification de commande ;
- synchronisation correcte.

---

## PIZ-013 — Conflit de sélection

Deux appareils sélectionnent la même pizza.

### Résultat attendu

Une seule sélection confirmée.

---

## PIZ-014 — OF Pain

### Données

Trois Pani’NO pour 20 h 00.

### Résultat attendu

À 19 h 30 :

```text
Préparer 3 pains
```

apparaît en priorité.

---

## PIZ-015 — Validation OF Pain

### Résultat attendu

- Work Unit terminée ;
- poste Pani’NO débloqué ;
- synchronisation immédiate.

---

## PIZ-016 — Réinitialisation du stock

### Avant

```text
Initial : 100
Restant : 43
Pertes : 5
```

### Action

Réinitialiser le stock avec confirmation.

### Résultat attendu

- nouveau stock initial appliqué ;
- stock restant cohérent ;
- pertes à zéro ;
- audit enregistré.

---

# 18. Tests du poste Four

## FOU-001 — Réception d’une fournée

### Résultat attendu

- composition réelle visible ;
- commandes d’origine visibles ;
- état `received` ou équivalent.

---

## FOU-002 — Commande complète visible

### Données

Commande de quatre pizzas, une seule reçue.

### Résultat attendu

- une pizza active ;
- trois pizzas grisées ;
- commande non prête.

---

## FOU-003 — Fournée multi-commandes

### Données

Deux pizzas Paul, une Marie, une Luc.

### Résultat attendu

Progression indépendante des trois commandes.

---

## FOU-004 — Enfournement idempotent

### Action

Double clic sur `Enfourner`.

### Résultat attendu

Un seul événement de début.

---

## FOU-005 — Minuteur

### Résultat attendu

Le minuteur part de l’heure serveur confirmée.

---

## FOU-006 — Sortie anticipée

### Action

Sortir une pizza avant 90 secondes.

### Résultat attendu

Action autorisée et durée réelle enregistrée.

---

## FOU-007 — Post-cuisson Végétarienne

### Résultat attendu

- roquette et tomate visibles ;
- état `post_bake` ;
- pizza non prête avant validation.

---

## FOU-008 — Pizza sans post-cuisson

### Pizza

```text
Regina
```

### Résultat attendu

Passage à `ready` après sortie si aucune modification supplémentaire ne l’empêche.

---

## FOU-009 — Supplément Saumon

### Pizza

```text
Fromages
+ Saumon
```

### Résultat attendu

Work Unit visible et obligatoire avant `ready`.

---

## FOU-010 — Commande de six pizzas

### Après première fournée

Résultat attendu :

- quatre pizzas avancées ;
- deux encore grisées ;
- commande maintenue.

---

## FOU-011 — Prévisualisation

### Résultat attendu

Trois prochaines commandes visibles dans un volet distinct des fournées réelles.

---

## FOU-012 — Commande prête en avance

### Résultat attendu

- charge libérée ;
- commande envoyée vers Prêtes ;
- capacité Caisse actualisée.

---

## FOU-013 — Produit à refaire

### Action

Déclarer une pizza ratée.

### Résultat attendu

- historique conservé ;
- nouvelle charge ;
- Pizzaiolo informé ;
- commande redevenue incomplète.

---

## FOU-014 — Validation concurrente

Deux appareils valident la même post-cuisson.

### Résultat attendu

Une seule validation enregistrée.

---

# 19. Tests du poste Pani’NO

## PAN-001 — Blocage par le pain

### Précondition

Pain non prêt.

### Résultat attendu

Assemblage non disponible.

---

## PAN-002 — Déblocage temps réel

### Action

Le Pizzaiolo termine l’OF Pain.

### Résultat attendu

L’assemblage devient disponible sans actualisation manuelle.

---

## PAN-003 — Commande tardive

### Données

Commande reçue à 19 h 45 pour 20 h 00.

### Résultat attendu

OF Pain généré immédiatement avec priorité élevée.

---

## PAN-004 — Regroupement de pains

### Données

Deux Pani’NO à 20 h 00 et trois à 20 h 05.

### Résultat attendu

OF regroupé possible de cinq pains, sans double comptage.

---

## PAN-005 — Consommation individuelle

### Résultat attendu

Chaque Pani’NO consomme exactement un pain.

---

## PAN-006 — Double consommation

### Action

Rejouer le même événement.

### Résultat attendu

Un seul pain consommé.

---

## PAN-007 — Fish&NO

### Résultat attendu

- friture ;
- accompagnement ;
- sauce tartare ;
- assemblage ;
- validation finale.

---

## PAN-008 — Friteuse saturée

### Résultat attendu

- nouvelle tâche bloquée ou différée ;
- raison explicite ;
- Caisse recalculée.

---

## PAN-009 — Commande mixte

### Résultat attendu

La fin du Pani’NO ne déclare pas toute la commande prête tant que les autres postes n’ont pas terminé.

---

## PAN-010 — Rupture de poisson

### Résultat attendu

- Caisse informée ;
- nouvelles commandes concernées averties ;
- tâches existantes signalées ;
- historique conservé.

---

## PAN-011 — Produit à refaire

### Résultat attendu

Nouvelle charge créée sans suppression de l’historique.

---

# 20. Tests de synchronisation

## SYN-001 — Import proxy dupliqué

### Action

Envoyer deux fois le même `sourceId`.

### Résultat attendu

Une seule commande créée.

---

## SYN-002 — Soumission Caisse dupliquée

### Action

Envoyer deux fois la même clé d’idempotence.

### Résultat attendu

Même commande retournée, aucun doublon.

---

## SYN-003 — Sélection concurrente

### Résultat attendu

- première sélection confirmée ;
- seconde refusée ou résolue ;
- aucune double affectation.

---

## SYN-004 — Double enfournement

### Résultat attendu

Un seul événement `batch.started`.

---

## SYN-005 — Reconnexion

### Étapes

1. couper un appareil ;
2. modifier l’état depuis un autre ;
3. reconnecter.

### Résultat attendu

- état central rechargé ;
- cache local non prioritaire ;
- conflits signalés.

---

## SYN-006 — Action hors ligne risquée

### Action

Tenter de déclarer une pizza prête hors ligne.

### Résultat attendu

Selon la stratégie :

- action bloquée ;
- ou clairement mise en attente.

Elle ne doit jamais apparaître comme synchronisée sans confirmation.

---

## SYN-007 — Événement ancien

### Action

Envoyer un événement dont la version est inférieure à l’état courant.

### Résultat attendu

L’état récent n’est pas écrasé.

---

## SYN-008 — Rejeu d’événements

### Résultat attendu

Aucun effet doublé.

---

## SYN-009 — Abonnement nettoyé

### Action

Naviguer plusieurs fois entre les postes.

### Résultat attendu

Aucun abonnement temps réel dupliqué.

---

## SYN-010 — Modification après production

### Données

Trois pizzas prêtes, une nouvelle pizza ajoutée.

### Résultat attendu

- trois restent prêtes ;
- une nouvelle charge créée ;
- commande globale incomplète.

---

# 21. Tests du stock de pâtons

## STK-001 — Consommation pizza

### Résultat attendu

Une pizza confirmée consomme un pâton selon le moment métier retenu.

---

## STK-002 — Consommation Pani’NO

### Résultat attendu

Un Pani’NO consomme un pâton.

---

## STK-003 — Événement dupliqué

### Résultat attendu

Une seule consommation.

---

## STK-004 — Perte

### Action

Enregistrer un pâton déchiré.

### Résultat attendu

- pertes +1 ;
- stock restant mis à jour ;
- aucune vente créée.

---

## STK-005 — Correction manuelle

### Résultat attendu

- ancienne et nouvelle valeurs conservées ;
- auteur enregistré ;
- cohérence du solde.

---

## STK-006 — Réinitialisation complète

### Résultat attendu

Réinitialisation simultanée de :

- stock initial ;
- stock restant ;
- pertes.

---

## STK-007 — Concurrence

Deux appareils modifient le stock simultanément.

### Résultat attendu

- conflit ou ordre transactionnel ;
- aucune valeur intermédiaire incohérente.

---

# 22. Tests PWA et appareils

## PWA-001 — Installation Android

### Résultat attendu

- application installable ;
- icône présente ;
- ouverture sans barre d’adresse en mode `standalone`.

---

## PWA-002 — Ajout iOS

### Résultat attendu

Application utilisable depuis l’écran d’accueil.

---

## PWA-003 — Safe area iOS

### Résultat attendu

Le header ne chevauche pas :

- l’heure ;
- le Wi-Fi ;
- la batterie.

---

## PWA-004 — Safe area inférieure

### Résultat attendu

Les barres d’action ne sont pas masquées par l’indicateur d’accueil.

---

## PWA-005 — Tablette Android paysage

### Résultat attendu

- interface stable ;
- aucun défilement horizontal ;
- actions principales visibles.

---

## PWA-006 — Rotation

### Résultat attendu

Aucune perte d’état ou de brouillon lors d’une rotation autorisée.

---

## PWA-007 — Cache

### Résultat attendu

Les fichiers statiques peuvent être mis en cache.

Les commandes et états de production sont actualisés depuis la source réelle.

---

## PWA-008 — Mise à jour

### Résultat attendu

Une nouvelle version ne recharge pas brutalement l’application au milieu d’une action critique.

---

# 23. Tests d’accessibilité et d’ergonomie

## E2E-UX-001 — Information non transmise uniquement par couleur

### Résultat attendu

Chaque état possède également :

- un texte ;
- une icône ;
- ou une forme.

---

## E2E-UX-002 — Zone tactile

### Résultat attendu

Les actions essentielles sont utilisables facilement sur tablette.

---

## E2E-UX-003 — Action principale unique

### Résultat attendu

Chaque étape Caisse possède un seul bouton principal dominant.

---

## E2E-UX-004 — Interface compacte

### Résultat attendu

Aucun grand bloc descriptif inutile dans les zones de production.

---

## E2E-UX-005 — En-tête repliable

### Résultat attendu

Le contenu gagne de la hauteur sans perdre la possibilité de rouvrir la navigation.

---

## E2E-UX-006 — Données personnelles

### Résultat attendu

Le numéro de téléphone n’apparaît pas aux postes de production.

---

# 24. Tests de bout en bout

## E2E-001 — Commande pizza depuis la Caisse KDS

### Scénario

1. créer une commande Regina pour Paul ;
2. choisir 19 h 30 ;
3. valider ;
4. sélectionner la pizza au Pizzaiolo ;
5. la préparer ;
6. l’envoyer au Four ;
7. l’enfourner ;
8. la sortir ;
9. la déclarer prête ;
10. la remettre au client.

### Résultat attendu

- un seul cycle complet ;
- états cohérents ;
- commande visible sur les bons postes ;
- stock décrémenté une seule fois ;
- historique complet.

---

## E2E-002 — Commande mixte

### Scénario

Commande :

- deux pizzas ;
- un Pani’NO ;
- un Fish&NO ;
- une frite.

### Résultat attendu

- Work Units envoyées aux bons postes ;
- progression indépendante ;
- commande prête uniquement après tous les produits ;
- Caisse informée en temps réel.

---

## E2E-003 — Commande venant du proxy

### Scénario

Importer une commande L’Addition.

### Résultat attendu

- commande créée une seule fois ;
- brut conservé ;
- données normalisées ;
- production lancée ;
- pas de rubrique « À enregistrer dans L’Addition ».

---

## E2E-004 — Commande KDS puis rapprochement L’Addition

### Résultat attendu

- commande KDS produite immédiatement ;
- marquée en attente de saisie ;
- rapprochement ultérieur ;
- aucune seconde commande de production.

---

## E2E-005 — Commande terminée en avance puis nouvelle commande

### Scénario

1. quatre pizzas de 19 h 30 prêtes à 19 h 05 ;
2. nouvelle commande de quatre pizzas pour 19 h 30.

### Résultat attendu

- ancienne charge résiduelle nulle ;
- nouvelle charge de quatre ;
- créneau favorable si aucune autre surcharge ;
- anciennes pizzas toujours dans Prêtes.

---

## E2E-006 — Grosse commande et commande spontanée

### Scénario

1. huit pizzas planifiées pour 19 h 30 ;
2. une partie préparée en avance ;
3. commande spontanée de quatre pizzas à 19 h 10.

### Résultat attendu

Le moteur utilise la charge réellement restante et la capacité libérée pour recalculer les possibilités.

---

## E2E-007 — Pizza à refaire

### Scénario

1. pizza terminée ;
2. défaut détecté avant remise ;
3. action « À refaire ».

### Résultat attendu

- nouvelle charge ;
- commande incomplète ;
- historique conservé ;
- stock ou perte mis à jour ;
- tous les postes informés.

---

# 25. Tests de performance

## PERF-001 — Service chargé

### Données

- nombreuses commandes ;
- plusieurs commandes de 15 pizzas ;
- plusieurs centaines de Work Units.

### Résultat attendu

- calcul sans blocage perceptible ;
- interface toujours interactive ;
- aucun appel réseau dans les fonctions pures.

---

## PERF-002 — Recalculs successifs

### Action

Déclencher de nombreux événements rapprochés.

### Résultat attendu

- pas de boucle de recalcul infinie ;
- résultat final cohérent ;
- éventuel regroupement technique des recalculs.

---

## PERF-003 — Plusieurs appareils

### Données

Plusieurs tablettes et smartphones connectés.

### Résultat attendu

Propagation stable sans explosion du nombre d’abonnements ou d’événements.

---

# 26. Tests de non-régression obligatoires

Avant toute livraison importante, vérifier au minimum :

```text
3 + 1 = 4 favorable
```

```text
1 + 3 = 4 favorable
```

```text
6 pizzas = 4 + 2
```

```text
6 + 2 = 4 + 4 lorsque compatible
```

```text
pizza prête = charge de production nulle
```

```text
réserve consommée ≠ surcharge automatique
```

```text
commande de 19 h 30 préparée à 19 h 00 autorisée
```

```text
fournée verrouillée non réorganisée
```

```text
commande partielle visible entièrement au Four
```

```text
OF Pain visible trente minutes avant
```

```text
double clic ≠ double action
```

```text
réinitialisation pâtons = initial + restant + pertes
```

---

# 27. Données de test et production

Les tests automatisés ne doivent pas polluer les données de production.

Utiliser :

- environnement de test ;
- restaurant fictif ;
- commandes marquées comme test ;
- nettoyage contrôlé.

Le mode test ne doit jamais être ambigu pendant un service réel.

---

# 28. Preuves de validation

Pour une fonctionnalité importante, fournir :

- résultat des tests unitaires ;
- résultat des tests d’intégration ;
- résultat de lint ;
- résultat de build ;
- captures d’écran ;
- appareil testé ;
- scénario manuel exécuté ;
- anomalies connues ;
- paramètres utilisés.

---

# 29. Critères de blocage d’une mise en production

Une mise en production doit être bloquée si elle provoque notamment :

- création de commandes en double ;
- perte d’un brouillon ;
- double consommation de stock ;
- impossibilité de suivre une pizza individuellement ;
- disparition d’une commande active ;
- modification automatique d’une fournée verrouillée ;
- incohérence entre Caisse et production ;
- absence d’information claire en cas de perte réseau ;
- faux classement massif des créneaux ;
- régression sur la validation des commandes complètes.

---

# 30. Critères de validation en service réel

Une fonctionnalité est considérée comme validée en service réel lorsqu’elle :

- reste compréhensible pendant le rush ;
- réduit ou ne dégrade pas la charge mentale ;
- ne ralentit pas l’action ;
- ne crée pas d’erreurs supplémentaires ;
- reflète correctement la réalité ;
- peut être corrigée ou contournée par l’utilisateur ;
- reste stable pendant plusieurs services représentatifs.

---

# 31. Rapport d’anomalie

Toute anomalie doit inclure si possible :

```text
Date et heure
Poste
Commande concernée
État attendu
État observé
Actions précédentes
Connexion réseau
Version de l’application
Capture
Identifiants techniques en mode test
```

Éviter les rapports limités à :

```text
Ça ne marche pas
```

---

# 32. Priorité des anomalies

## Critique

- perte de commande ;
- doublon ;
- état impossible ;
- stock incohérent ;
- production bloquée ;
- données d’un autre établissement.

## Haute

- mauvaise priorité fréquente ;
- commande déclarée prête trop tôt ;
- conflit non géré ;
- interface essentielle inutilisable.

## Moyenne

- information secondaire incorrecte ;
- mauvaise mise en page ;
- explication insuffisante.

## Faible

- détail visuel ;
- texte perfectible ;
- amélioration de confort.

---

# 33. Responsabilité de Codex lors d’une implémentation

Avant de déclarer une tâche terminée, Codex doit :

1. identifier les tests applicables ;
2. ajouter les tests manquants ;
3. exécuter les tests ;
4. exécuter le lint ;
5. exécuter le build ;
6. signaler clairement les tests non exécutables ;
7. documenter les écarts ;
8. ne pas affirmer qu’un comportement est validé sans preuve.

---

# 34. Livrable attendu

À la fin d’une étape, fournir :

- les fichiers modifiés ;
- les tests ajoutés ;
- les scénarios couverts ;
- les commandes exécutées ;
- les résultats ;
- les tests non exécutés ;
- les éventuelles migrations ;
- les risques restants ;
- la procédure de retour arrière ;
- le commit créé.

---

# Principe fondamental

> Une fonctionnalité n’est pas validée parce que son interface paraît correcte. Elle est validée lorsque les états métier, les événements, la synchronisation et les résultats visibles restent cohérents dans les cas normaux, les cas limites et les situations concurrentes.

Les tests doivent reproduire le fonctionnement réel du restaurant et protéger en priorité les règles qui réduisent la charge mentale et empêchent les erreurs de production.