# 09_REGLES_METIER.md

# Règles métier du KDS

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

---

# 1. Objectif

Ce document constitue la référence officielle des règles métier du KDS.

Il décrit le fonctionnement réel de la pizzeria indépendamment :

- de l’interface ;
- de React ;
- de Supabase ;
- du proxy ;
- de l’implémentation actuelle.

Les autres documents peuvent citer ces règles, mais ne doivent pas les redéfinir avec une logique différente.

En cas de contradiction entre une interface et ce document, ce document prévaut, sauf validation explicite d’une nouvelle règle métier.

---

# 2. Principes fondamentaux

## Règle 2.1 — Le KDS conseille

Le KDS produit :

- des projections ;
- des scores ;
- des recommandations ;
- des avertissements.

La décision finale reste humaine.

Une action réalisable dans la réalité ne doit pas être bloquée uniquement parce qu’elle n’est pas optimale.

---

## Règle 2.2 — La réalité prévaut sur la projection

Une projection n’est jamais une vérité définitive.

Dès qu’une action physique réelle commence :

- la Production Unit concernée ;
- la Work Unit concernée ;
- la fournée concernée ;

doivent être considérées comme engagées.

Le moteur doit ensuite recalculer autour de cet état réel.

---

## Règle 2.3 — Les interfaces ne créent pas leurs propres règles

La Caisse, le Pizzaiolo, le Four et le poste Pani’NO doivent utiliser les mêmes résultats métier.

Une même notion ne doit pas être calculée différemment selon le poste.

Exemples :

- base réelle ;
- charge résiduelle ;
- état global d’une commande ;
- score de faisabilité ;
- retard.

---

# 3. Horaires de service

## Règle 3.1 — Service du midi

La plage normale de remise du midi est :

```text
12 h 00 → 14 h 00
```

---

## Règle 3.2 — Service du soir

La plage normale de remise du soir est :

```text
19 h 00 → 22 h 30
```

---

## Règle 3.3 — Intervalle des créneaux

Les créneaux sont proposés par défaut avec un pas de :

```text
5 minutes
```

Cette valeur doit rester configurable.

---

## Règle 3.4 — Projection sur tout le service

La Caisse doit proposer les créneaux jusqu’à la fin du service concerné.

Elle ne doit pas limiter la projection à une heure après l’heure actuelle.

Exemple à 19 h 10 :

```text
19 h 10
19 h 15
19 h 20
...
22 h 30
```

---

## Règle 3.5 — Créneaux passés

Un créneau antérieur à l’heure actuelle ne doit pas être proposé comme nouveau créneau de remise, sauf fonctionnalité explicite de correction ou de saisie rétroactive.

---

# 4. Commandes et heures de remise

## Règle 4.1 — Heure de remise

L’heure associée à une commande est l’heure annoncée au client.

Elle ne représente pas :

- le début de préparation ;
- l’enfournement ;
- la fin de cuisson ;
- une fournée physique.

---

## Règle 4.2 — Une commande peut être commencée en avance

Une commande peut être commencée bien avant son heure de remise.

Exemple :

```text
Commande pour 19 h 30
Début possible à 19 h 00
```

Le système ne doit pas bloquer cette anticipation.

---

## Règle 4.3 — Anticipation initiale

La fenêtre initiale recommandée pour la préparation pizza est :

```text
30 minutes
```

Cette valeur doit rester configurable.

---

## Règle 4.4 — Préparation et cuisson distinctes

Une pizza préparée en avance n’a pas besoin d’être cuite immédiatement.

Elle peut rester :

```text
ready_for_oven
```

jusqu’à une fenêtre de cuisson plus adaptée.

---

## Règle 4.5 — Cuisson anticipée

La cuisson doit généralement rester plus proche de l’heure de remise que la préparation.

Une valeur initiale peut être :

```text
10 minutes avant la remise
```

Cette valeur est une recommandation configurable, pas une interdiction absolue.

---

# 5. Commandes planifiées et spontanées

## Règle 5.1 — Commande planifiée

Une commande est considérée comme planifiée lorsqu’elle est connue suffisamment tôt pour être anticipée.

Exemples :

- commande prise avant le service ;
- commande enregistrée longtemps avant son heure ;
- commande prévue pour un événement ou un groupe.

---

## Règle 5.2 — Commande spontanée

Une commande est considérée comme spontanée lorsqu’elle est ajoutée pendant le service avec une échéance relativement proche.

Exemples :

- appel téléphonique ;
- client au comptoir ;
- commande créée rapidement depuis le KDS ;
- future commande en ligne immédiate.

---

## Règle 5.3 — Objectif de l’anticipation

Prendre de l’avance sur les commandes planifiées sert à :

- éviter le retard ;
- lisser la charge ;
- libérer de la capacité future ;
- permettre l’acceptation de commandes spontanées.

---

## Règle 5.4 — La réserve n’est pas une interdiction

La réserve destinée aux commandes spontanées est une marge souhaitée.

Elle ne doit pas provoquer à elle seule :

- le refus d’une commande ;
- un classement « Dense » ;
- un classement « Très chargé ».

---

# 6. Charge de production

## Règle 6.1 — Charge résiduelle

La charge correspond au travail restant réellement à effectuer.

Elle ne correspond pas au volume historique de la commande.

---

## Règle 6.2 — Produit prêt

Une Production Unit à l’état :

```text
ready
```

ne charge plus :

- le poste Pizzaiolo ;
- le Four ;
- la projection des fournées ;
- la capacité de production du créneau.

Elle peut encore mobiliser une zone de stockage ou de remise, mais cette charge doit être séparée.

---

## Règle 6.3 — Produit remis

Une Production Unit à l’état :

```text
handed_over
```

est sortie du flux de production et de remise active.

---

## Règle 6.4 — Produit annulé

Une Production Unit à l’état :

```text
cancelled
```

ne doit plus être comptée dans la charge restante.

---

## Règle 6.5 — Exemple de libération dynamique

Commande :

```text
4 pizzas pour 19 h 30
```

Toutes prêtes à :

```text
19 h 05
```

À partir de 19 h 05 :

```text
charge résiduelle = 0
```

Le créneau de 19 h 30 peut de nouveau recevoir une charge de production.

---

## Règle 6.6 — États encore actifs

Les états suivants continuent de mobiliser la production :

```text
waiting
selected
preparing
ready_for_oven
baking
post_bake
```

Le type et l’intensité de cette charge peuvent varier selon le poste.

---

# 7. Capacité du four

## Règle 7.1 — Capacité physique

Le four possède :

```text
4 places
```

Cette valeur doit être centralisée.

---

## Règle 7.2 — Une fournée peut mélanger les commandes

Une fournée peut contenir des pizzas de :

- plusieurs commandes ;
- plusieurs clients ;
- plusieurs heures de remise proches.

---

## Règle 7.3 — Une commande n’est pas indivisible

Les pizzas d’une même commande peuvent être réparties sur plusieurs fournées.

Exemple :

```text
Commande de 6 pizzas
```

peut devenir :

```text
4 + 2
```

---

## Règle 7.4 — Objectif de remplissage

Lorsqu’au moins quatre pizzas compatibles sont disponibles, le moteur doit chercher à constituer une fournée complète.

---

## Règle 7.5 — Une fournée complète n’est pas une surcharge

Les situations suivantes sont efficaces :

```text
3 + 1 = 4
```

```text
1 + 3 = 4
```

```text
7 + 1 = 8
```

Elles doivent être reconnues favorablement, sauf autre problème réel.

---

## Règle 7.6 — Exemple obligatoire

Situation :

```text
1 pizza reste à produire
3 pizzas sont ajoutées
```

Résultat :

```text
4 pizzas
1 fournée complète
```

Même si la réserve restante devient nulle, le créneau doit rester :

```text
Recommandé
```

ou :

```text
Fluide
```

si aucun retard ou blocage réel n’existe.

---

# 8. Priorités de constitution des fournées

## Règle 8.1 — Ordre de priorité

Appliquer l’ordre suivant :

1. respecter les heures de remise ;
2. éviter les retards ;
3. remplir les quatre places ;
4. terminer autant que possible les commandes déjà commencées ;
5. respecter autant que possible l’ordre des commandes ;
6. compléter les fournées partielles ;
7. éviter de laisser une pizza isolée plus tard ;
8. regrouper les bases ;
9. limiter les changements de préparation.

---

## Règle 8.2 — Remplissage avant regroupement des bases

La similitude des bases est secondaire.

Elle ne doit jamais conduire à laisser volontairement une place vide lorsqu’une pizza compatible est disponible.

---

## Règle 8.3 — Commande commencée

Une commande dont au moins une pizza est engagée doit généralement être favorisée.

Cette règle ne doit toutefois pas empêcher de compléter une fournée avec une commande voisine.

---

## Règle 8.4 — Pizza isolée

Le moteur doit éviter, lorsque cela est possible, une organisation produisant :

```text
4 pizzas
puis
1 pizza seule
```

si une organisation du type :

```text
3 + 1
puis
4
```

respecte mieux les échéances.

---

## Règle 8.5 — Fournée incomplète autorisée

Une fournée de moins de quatre pizzas reste autorisée lorsque :

- aucune autre pizza compatible n’est disponible ;
- attendre créerait un retard ;
- la qualité serait menacée ;
- le service touche à sa fin ;
- l’opérateur la lance manuellement.

---

# 9. Répartition des grosses commandes

## Règle 9.1 — Commande de 6 pizzas

Une commande de six pizzas pour 19 h 30 peut être projetée ainsi :

```text
19 h 25 : 4
19 h 30 : 2
```

Le moteur doit ensuite chercher deux pizzas compatibles pour compléter la seconde fournée.

---

## Règle 9.2 — Commande de 10 pizzas

Exemple :

```text
19 h 20 : 4
19 h 25 : 4
19 h 30 : 2
```

La projection peut évoluer selon les autres commandes.

---

## Règle 9.3 — Chevauchement normal

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

---

## Règle 9.4 — Taille des commandes

Le système doit supporter :

- les commandes courantes de 1 à 4 pizzas ;
- les commandes jusqu’à environ 15 pizzas ;
- exceptionnellement des commandes proches de 30 pizzas.

Aucune règle de production ne doit supposer qu’une commande tient sur un seul écran ou dans une seule fournée.

---

# 10. Plan de travail du Pizzaiolo

## Règle 10.1 — Quatre positions

Le plan de travail possède quatre positions visuelles et physiques.

---

## Règle 10.2 — Une position représente une pizza réelle

Un disque occupé correspond à une Production Unit réellement sélectionnée et engagée sur le plan.

---

## Règle 10.3 — Plusieurs commandes simultanées

Les quatre positions peuvent contenir des pizzas de plusieurs commandes.

Exemples possibles :

```text
2 + 1 + 1
```

```text
2 + 2
```

```text
1 + 1 + 1 + 1
```

---

## Règle 10.4 — Sélection d’une commande complète

L’utilisateur peut sélectionner une commande complète.

Si la commande dépasse la capacité disponible :

- seules les pizzas pouvant tenir sur le plan sont sélectionnées ;
- le reste demeure en attente.

---

## Règle 10.5 — Préparation anticipée autorisée

Aucune commande ne doit être bloquée au Pizzaiolo simplement parce que son heure de remise est éloignée.

---

## Règle 10.6 — Verrouillage physique

Une pizza déjà placée sur un disque ou réellement commencée ne doit plus être déplacée automatiquement par le moteur.

---

# 11. Regroupement par bases

## Règle 11.1 — Bases normalisées

Les principales bases internes sont :

```text
tomato
cream
goat_cream
truffle_cream
none
unknown
```

---

## Règle 11.2 — Base réelle

La base utilisée pour la production est la base réellement demandée, et non forcément la base par défaut de la recette.

---

## Règle 11.3 — Base modifiée

Exemple :

```text
Fromages
- crème de chèvre
+ sauce tomate
```

Résultat :

```text
requestedBase = tomato
```

Affichage attendu :

```text
BASE TOMATE
```

---

## Règle 11.4 — Supplément sans remplacement

Exemple :

```text
Regina
+ crème
```

Résultat :

```text
requestedBase = tomato
```

La crème reste un supplément.

---

## Règle 11.5 — Remplacement inféré

Un remplacement peut être inféré lorsqu’on détecte :

- le retrait de la base par défaut ;
- l’ajout d’une autre base.

---

## Règle 11.6 — Suppression sans remplacement

Exemple :

```text
Regina
- sauce tomate
```

Résultat :

```text
requestedBase = none
```

Affichage :

```text
SANS BASE
```

---

## Règle 11.7 — Cas ambigu

Si plusieurs bases sont ajoutées après retrait de la base initiale, sans indication suffisante, le résultat doit être :

```text
ambiguous
```

Le système ne doit pas inventer une base unique.

---

## Règle 11.8 — Ne pas dupliquer l’affichage

Les modifications consommées pour déduire le remplacement de base ne doivent pas être réaffichées comme suppléments et retraits ordinaires.

---

# 12. Bases par défaut connues

Les bases par défaut doivent être définies dans les recettes.

Informations actuellement établies :

```text
Chèvre miel
→ crème de chèvre
```

```text
Truffe Parme
→ crème de truffe
```

Les autres recettes doivent également disposer d’une base configurée et normalisée.

---

# 13. Difficulté des pizzas

## Règle 13.1 — La difficulté n’est pas uniforme

Deux pizzas peuvent solliciter différemment :

- le Pizzaiolo ;
- le Four ;
- la post-cuisson ;
- l’attention.

---

## Règle 13.2 — Profil multidimensionnel

La difficulté doit pouvoir distinguer :

```text
préparation
four
post-cuisson
attention
```

---

## Règle 13.3 — Ajustement futur

Les valeurs initiales sont théoriques.

Elles pourront être remplacées progressivement par les temps et difficultés réellement observés.

---

## Règle 13.4 — Nombre de pizzas insuffisant

Un créneau de quatre pizzas complexes peut être plus chargé qu’un créneau de quatre pizzas simples.

Le moteur ne doit donc pas se limiter au nombre de pizzas.

---

# 14. Temps de cuisson

## Règle 14.1 — Temps théorique

Le temps théorique actuel du four est d’environ :

```text
90 secondes
```

---

## Règle 14.2 — Temps réel

L’opérateur peut sortir la pizza avant ou après le temps théorique.

Le temps réel doit être enregistré.

---

## Règle 14.3 — Le minuteur n’est pas bloquant

Le minuteur aide l’opérateur.

Il ne doit pas empêcher une sortie manuelle.

---

# 15. Post-cuisson des pizzas

Les temps indiqués sont des valeurs initiales à configurer et mesurer.

## Règle 15.1 — Napolitaine

Post-cuisson approximative :

```text
1 minute
```

Actions connues :

- anchois ;
- origan.

---

## Règle 15.2 — Saumon

Post-cuisson approximative :

```text
1 minute
```

Action principale :

- ajout des tranches de saumon.

---

## Règle 15.3 — Spéciale

Post-cuisson approximative :

```text
1 minute
```

La recette détaillée doit être configurée séparément.

---

## Règle 15.4 — Truffe Parme

Post-cuisson approximative :

```text
1 minute
```

Actions connues :

- jambon de Parme ;
- environ quatre cuillères à soupe de stracciatella.

---

## Règle 15.5 — Végétarienne

Post-cuisson approximative :

```text
1 minute 30
```

Actions connues :

- roquette ;
- tomate.

---

## Règle 15.6 — Carbonara

Post-cuisson approximative :

```text
20 secondes
```

Action connue :

- parmesan.

---

## Règle 15.7 — Fromages

Post-cuisson approximative :

```text
20 secondes
```

Action connue :

- parmesan.

---

## Règle 15.8 — Chèvre miel

Post-cuisson approximative :

```text
20 secondes
```

Action connue :

- miel.

---

## Règle 15.9 — Margherita

Aucune post-cuisson habituelle.

---

## Règle 15.10 — Regina

Aucune post-cuisson habituelle.

---

## Règle 15.11 — Piccante

Aucune post-cuisson habituelle, sauf modification.

---

## Règle 15.12 — Savoyarde

Pas de post-cuisson habituelle importante au Four, mais charge de préparation élevée au Pizzaiolo.

---

## Règle 15.13 — Calzone

Aucune post-cuisson habituelle connue.

---

# 16. Suppléments relevant du Four

## Règle 16.1 — Responsabilité explicite

Chaque ingrédient doit être associé à un poste de responsabilité.

Exemples :

- ingrédient avant cuisson : Pizzaiolo ;
- ingrédient après cuisson : Four ;
- sauce finale d’un Pani’NO : Pani’NO.

---

## Règle 16.2 — Supplément post-cuisson

Un supplément relevant du Four doit générer une Work Unit ou une action visible au Four.

Exemples :

```text
Chèvre miel + Parme
```

```text
Fromages + Saumon
```

---

## Règle 16.3 — Retrait post-cuisson

Un retrait concernant une garniture du Four doit empêcher la création ou l’exécution de l’action correspondante.

---

# 17. État prêt et commande prête

## Règle 17.1 — Pizza prête

Une pizza devient prête lorsque :

- la cuisson est terminée ;
- toutes les post-cuissons obligatoires sont terminées ;
- aucune reprise n’est nécessaire.

---

## Règle 17.2 — Commande pizza prête

Une commande contenant plusieurs pizzas n’est prête que lorsque toutes ses pizzas sont prêtes.

---

## Règle 17.3 — Commande mixte prête

Une commande mixte n’est prête que lorsque tous ses produits sont prêts :

- pizzas ;
- Pani’NO ;
- Fish&NO ;
- frites ;
- autres produits de production.

---

## Règle 17.4 — Commande partiellement prête

Une commande partiellement prête doit rester visible avec sa progression.

Elle ne doit pas être déclarée prête prématurément.

---

# 18. Poste Four et commandes complètes

## Règle 18.1 — Vue complète

Dès qu’une pizza d’une commande arrive au Four, l’ensemble des pizzas de cette commande doit être visible.

---

## Règle 18.2 — Pizza grisée

Une pizza de la commande non encore reçue doit rester grisée.

La couleur grisée signifie :

```text
Pas encore reçue au Four
```

---

## Règle 18.3 — Validation finale

Le poste Four ne valide pas la commande complète avant que toutes les pizzas soient prêtes.

---

# 19. Prévisualisation du Four

## Règle 19.1 — Trois prochaines commandes

Le Four doit pouvoir consulter les trois prochaines commandes ou groupes que le Pizzaiolo prévoit de traiter.

---

## Règle 19.2 — Projection distincte

La prévisualisation doit être clairement distincte :

- d’une fournée reçue ;
- d’une fournée verrouillée ;
- d’une cuisson réelle.

---

# 20. Pani’NO et consommation de pâton

## Règle 20.1 — Consommation

Une pizza consomme :

```text
1 pâton
```

Un Pani’NO consomme également :

```text
1 pâton
```

---

## Règle 20.2 — OF Pain

Toute commande comportant des Pani’NO doit générer un besoin de pain au Pizzaiolo.

---

## Règle 20.3 — Délai de l’OF Pain

L’OF Pain devient dû :

```text
30 minutes avant la remise
```

ou immédiatement si la commande est reçue plus tard.

---

## Règle 20.4 — Priorité de l’OF

Lorsqu’il devient dû, l’OF doit être placé en priorité élevée car il bloque la chaîne Pani’NO.

---

## Règle 20.5 — Regroupement

Plusieurs besoins proches peuvent être regroupés dans un OF commun lorsque cela reste compatible avec la qualité et les échéances.

---

# 21. Composition actuelle du Pani’NO

La composition de référence actuelle comprend :

- pain ;
- base crème ou tomate ;
- steak haché ;
- deux tranches de cheddar ;
- roquette ;
- tomate ;
- oignon rouge ;
- sauces choisies.

Les modifications demandées doivent rester visibles au poste Pani’NO.

---

# 22. Sauces Pani’NO

Sauces actuellement connues :

- burger ;
- samouraï ;
- algérienne ;
- barbecue ;
- mayonnaise ;
- ketchup ;
- moutarde ;
- sauce blanche selon la configuration.

La règle commerciale actuelle autorise jusqu’à deux sauces sans supplément, sous réserve de confirmation dans la configuration commerciale.

---

# 23. Fish&NO

## Règle 23.1 — Composition

Le Fish&NO comprend notamment :

- julienne frite sans panure ;
- grenailles ou frites ;
- sauce tartare.

---

## Règle 23.2 — Étapes distinctes

La friture, l’accompagnement et l’assemblage doivent pouvoir être suivis séparément si cela reflète la production réelle.

---

## Règle 23.3 — Produit sensible

Le poisson frit et l’accompagnement ne doivent pas être préparés excessivement tôt.

Une fenêtre d’anticipation spécifique doit pouvoir être configurée.

---

# 24. Frites

## Règle 24.1 — Produit individuel

Une portion de frites est une Production Unit distincte.

---

## Règle 24.2 — Regroupement autorisé

Plusieurs portions peuvent être regroupées dans une cuisson si la capacité de la friteuse et les échéances le permettent.

---

## Règle 24.3 — Traçabilité

Même regroupées, les portions doivent rester rattachées à leurs commandes d’origine.

---

# 25. Coordination des commandes mixtes

## Règle 25.1 — Progression par poste

Chaque poste valide uniquement ses propres Work Units.

---

## Règle 25.2 — Fin rapprochée

Le moteur doit essayer de rapprocher la fin des différents produits d’une même commande afin d’éviter une attente excessive.

---

## Règle 25.3 — Pas au détriment du service

La coordination d’une commande mixte ne doit pas créer un retard plus important sur d’autres commandes urgentes.

---

# 26. Stock de pâtons

## Règle 26.1 — Données distinctes

Le stock doit distinguer :

- stock initial ;
- stock restant ;
- pertes ;
- consommation normale ;
- corrections manuelles.

---

## Règle 26.2 — Réinitialisation

Le bouton :

```text
Réinitialiser stock pâtons
```

doit réinitialiser :

- le stock initial ;
- le stock restant ;
- les pertes.

L’action doit demander confirmation.

---

## Règle 26.3 — Pas de double consommation

Une commande ou un événement traité plusieurs fois ne doit pas décrémenter plusieurs fois le stock.

---

## Règle 26.4 — Pertes séparées

Une perte de pâton ne doit pas être enregistrée comme une vente ou une consommation commerciale.

---

# 27. Produit à refaire

## Règle 27.1 — Conservation de l’historique

Une pizza ou un produit raté ne doit pas être supprimé silencieusement.

---

## Règle 27.2 — Nouvelle charge

L’action :

```text
À refaire
```

doit créer ou réactiver les Work Units nécessaires.

---

## Règle 27.3 — État de la commande

Une commande déjà considérée comme prête doit redevenir incomplète si un produit doit être refait avant remise.

---

## Règle 27.4 — Retard

Le retard projeté doit être recalculé.

---

## Règle 27.5 — Perte

Une perte de matière ou de pâton peut être enregistrée séparément.

---

# 28. Annulation

## Règle 28.1 — Annulation avant production

Les Work Units non commencées sont annulées.

Elles ne chargent plus le système.

---

## Règle 28.2 — Annulation après engagement

Si un produit est déjà en préparation ou en cuisson :

- demander confirmation ;
- conserver l’historique ;
- enregistrer éventuellement une perte.

---

## Règle 28.3 — Annulation commerciale et masquage

Masquer une commande d’un poste n’est pas équivalent à l’annuler.

Ces actions doivent rester distinctes.

---

# 29. Priorité manuelle

## Règle 29.1 — Choix humain conservé

Une priorité manuelle ne doit pas être immédiatement annulée par un recalcul automatique.

---

## Règle 29.2 — Portée

La priorité peut cibler :

- une commande ;
- une Production Unit ;
- une Work Unit ;
- une fournée ;
- un créneau.

---

## Règle 29.3 — Expiration

Une priorité manuelle peut avoir :

- une durée ;
- une échéance ;
- une suppression manuelle ;
- une fin après exécution.

---

# 30. Score et recommandation

## Règle 30.1 — Score interne

Le score est compris entre :

```text
0 et 100
```

---

## Règle 30.2 — Libellés

Les libellés initiaux sont :

```text
Recommandé
Fluide
Dense
Très chargé
```

---

## Règle 30.3 — La réserve a un faible poids

La réserve peut apporter :

- un petit bonus si elle est préservée ;
- un léger malus si elle est consommée.

Elle ne doit jamais dominer le résultat.

---

## Règle 30.4 — Retard réel prioritaire

Le retard et la capacité réellement dépassée doivent peser davantage que la réserve.

---

## Règle 30.5 — Fournée complétée

Une commande qui complète une fournée sans risque réel doit recevoir un classement favorable.

---

## Règle 30.6 — Créneau vide

Un créneau sans charge réelle ne doit jamais être classé chargé.

---

# 31. Ligne téléphone et charge Caisse

## Règle 31.1 — Fonctions conservées

Les fonctions :

- Ligne téléphone libre ;
- Charge Caisse,

peuvent continuer à alimenter le système.

---

## Règle 31.2 — Affichage facultatif

Elles ne doivent pas être affichées sur tous les postes si elles alourdissent l’interface.

La suppression visuelle ne doit pas supprimer la logique métier.

---

# 32. Éléments visuels à supprimer

Les éléments suivants doivent être retirés lorsqu’ils encombrent les interfaces sans aider à l’action immédiate :

- grande banderole « À REMETTRE MAINTENANT » ;
- grands blocs de présentation ;
- statistiques répétées ;
- informations système déjà affichées par l’appareil ;
- données d’autres postes sans utilité opérationnelle directe.

---

# 33. En-tête et safe areas

## Règle 33.1 — Safe area

Les interfaces doivent respecter :

```css
env(safe-area-inset-top, 0px)
```

et :

```css
env(safe-area-inset-bottom, 0px)
```

---

## Règle 33.2 — En-tête repliable

Le bandeau supérieur doit pouvoir être réduit pendant le travail.

---

## Règle 33.3 — Informations système

Le KDS ne doit pas nécessairement dupliquer :

- l’heure ;
- la date ;
- le Wi-Fi ;
- la batterie,

lorsque l’appareil les affiche déjà.

---

# 34. Synchronisation

## Règle 34.1 — État partagé

Tous les postes doivent partager le même état métier.

---

## Règle 34.2 — Actions idempotentes

Une même action reçue plusieurs fois ne doit pas produire plusieurs effets.

Exemples :

- double création de commande ;
- double enfournement ;
- double validation de post-cuisson ;
- double consommation de pâton.

---

## Règle 34.3 — Conflit

En cas de modification concurrente :

- ne pas écraser silencieusement ;
- actualiser l’état ;
- afficher une information courte ;
- conserver les actions encore valides.

---

# 35. Commandes créées dans le KDS

## Règle 35.1 — Envoi immédiat

Une commande créée dans le KDS doit partir immédiatement vers les postes concernés après validation finale.

---

## Règle 35.2 — Enregistrement L’Addition

Elle doit apparaître dans :

```text
À enregistrer dans L’Addition
```

jusqu’à confirmation de ressaisie.

---

## Règle 35.3 — Pas de doublon

La ressaisie dans L’Addition ne doit pas recréer une seconde commande de production dans le KDS.

Un mécanisme de rapprochement sera nécessaire.

---

# 36. Commandes venant de L’Addition

## Règle 36.1 — Import automatique

Les commandes reçues via le proxy doivent être intégrées automatiquement.

---

## Règle 36.2 — Décomposition

Elles doivent générer :

- articles ;
- Production Units ;
- Work Units ;
- états de synchronisation.

---

## Règle 36.3 — Conservation du brut

Le texte ou contenu original du ticket doit être conservé lorsque disponible.

---

# 37. Compatibilité avec les anciennes données

## Règle 37.1 — Replis explicites

Une donnée absente doit utiliser un repli documenté.

---

## Règle 37.2 — Pas de certitude inventée

Une information reconstruite doit être marquée comme :

```text
reconstructed
legacy
partial
unknown
```

selon le cas.

---

## Règle 37.3 — Lisibilité

Une ancienne commande doit rester affichable même si toutes les nouvelles données métier ne sont pas disponibles.

---

# 38. Données et confidentialité

## Règle 38.1 — Téléphone facultatif

Le numéro de téléphone n’est pas obligatoire.

---

## Règle 38.2 — Affichage limité

Le téléphone ne doit pas être visible sur :

- le poste Pizzaiolo ;
- le poste Four ;
- le poste Pani’NO ;
- le détail public d’un créneau.

---

## Règle 38.3 — Accès nécessaire uniquement

Seules les interfaces ayant un besoin réel doivent afficher les données personnelles.

---

# 39. Principes de développement

## Règle 39.1 — Migration progressive

Une nouvelle architecture doit être introduite progressivement.

---

## Règle 39.2 — Ancien système temporairement conservé

L’ancienne fonctionnalité peut rester disponible derrière :

- une route ;
- un feature flag ;
- une configuration.

---

## Règle 39.3 — Tests avant suppression

L’ancien système ne doit pas être supprimé avant validation du nouveau.

---

## Règle 39.4 — Une évolution à la fois

Éviter de refondre simultanément :

- le moteur ;
- toutes les interfaces ;
- le modèle de données ;
- la synchronisation.

---

## Règle 39.5 — Documentation des écarts

Tout écart entre cette spécification et le code doit être documenté.

---

# 40. Règles fondamentales résumées

> Une commande n’est pas une fournée.

> Un créneau de remise n’est pas un créneau de production.

> Une pizza prête ne charge plus la production.

> La réserve est une marge consommable, pas une charge.

> Une fournée complète de quatre pizzas est une utilisation optimale, pas une saturation.

> Les commandes peuvent être chevauchées et réparties sur plusieurs fournées.

> Le regroupement des bases est secondaire au respect des échéances et au remplissage du four.

> Une commande peut être préparée largement en avance.

> Une préparation anticipée n’impose pas une cuisson anticipée.

> Les actions réelles et verrouillées ne doivent plus être déplacées automatiquement.

> Le KDS recommande, l’opérateur décide.

---

# Principe fondamental

> Toute règle du KDS doit représenter une réalité observable du restaurant et produire un comportement compréhensible par l’équipe.

Une optimisation qui contredit le fonctionnement réel, augmente la charge mentale ou masque l’état véritable de la production doit être corrigée, même si elle paraît théoriquement plus élégante.