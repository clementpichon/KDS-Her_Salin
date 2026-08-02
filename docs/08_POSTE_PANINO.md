# 08_POSTE_PANINO.md

# Poste Pani’NO

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

---

# 1. Objectif

Le poste Pani’NO organise la production des produits ne relevant pas directement du poste Pizza ou du poste Four.

Il prend notamment en charge :

- les Pani’NO ;
- les Fish&NO ;
- les frites ;
- les éventuels futurs produits préparés sur ce poste.

Son objectif est de :

- afficher uniquement les tâches utiles à l’opérateur ;
- coordonner les commandes mixtes ;
- suivre les dépendances, notamment la disponibilité des pains ;
- regrouper les tâches compatibles ;
- éviter les oublis ;
- limiter la surcharge visuelle ;
- informer les autres postes de l’avancement réel.

Le poste ne doit pas recalculer :

- les priorités ;
- les dépendances ;
- la charge ;
- les créneaux ;
- l’état global d’une commande.

Il affiche et exécute les Work Units préparées par les moteurs.

---

# 2. Produits concernés

Le poste prend en charge au minimum les catégories suivantes.

## Pani’NO

Produit préparé à partir d’un pain panuozzo.

Composition actuelle de référence :

- pain ;
- base crème ou sauce tomate ;
- steak haché ;
- deux tranches de cheddar ;
- roquette ;
- tomate ;
- oignon rouge ;
- sauces au choix.

Sauces actuellement proposées :

- burger ;
- samouraï ;
- algérienne ;
- barbecue ;
- mayonnaise ;
- ketchup ;
- moutarde ;
- sauce blanche ou autre sauce configurée.

Deux sauces peuvent être incluses sans supplément selon la règle commerciale en vigueur.

## Fish&NO

Produit composé notamment de :

- julienne frite sans panure ;
- grenailles ou frites ;
- sauce tartare.

Le poisson est issu de la criée de l’Herbaudière selon l’approvisionnement réel.

## Frites

Produit simple pouvant être vendu :

- seul ;
- avec un Pani’NO ;
- avec un Fish&NO ;
- dans une commande mixte.

---

# 3. Philosophie du poste

Le poste Pani’NO ne doit pas fonctionner comme une simple liste chronologique de tickets.

Il doit représenter :

- les tâches réellement disponibles ;
- les dépendances ;
- les commandes commencées ;
- les ressources occupées ;
- les produits urgents ;
- les produits pouvant être regroupés.

L’opérateur doit pouvoir comprendre immédiatement :

```text
Que dois-je commencer maintenant ?
```

```text
Qu’est-ce qui est bloqué ?
```

```text
Qu’est-ce qui appartient à la même commande ?
```

```text
Qu’est-ce qui doit être remis prochainement ?
```

---

# 4. Organisation générale de l’écran

L’écran peut être organisé en trois zones.

## Zone principale

Work Units disponibles ou en cours.

## Zone commandes

Vue compacte des commandes concernées.

## Zone ressources

État du poste :

- pains disponibles ;
- friteuse ;
- produits en cuisson ;
- produits prêts ;
- éventuels blocages.

La disposition exacte peut évoluer selon la taille de l’écran.

---

# 5. Types de Work Units du poste

Le poste peut recevoir notamment les Work Units suivantes :

```ts
type PaninoWorkUnitType =
  | "prepare_panino_bread"
  | "assemble_panino"
  | "cook_panino"
  | "prepare_fish_and_no"
  | "fry_fish"
  | "fry_fries"
  | "assemble_fish_and_no"
  | "assemble_order"
```

Toutes les Work Units doivent respecter les dépendances définies dans le modèle métier.

---

# 6. Dépendances d’un Pani’NO

Flux général :

```text
Pain disponible
        ↓
Assembler le Pani’NO
        ↓
Cuire ou griller
        ↓
Ajouter les éléments finaux
        ↓
Produit prêt
```

L’assemblage ne doit pas être présenté comme immédiatement disponible si le pain requis n’est pas prêt.

---

# 7. OF Pain Pani’NO

Le pain est préparé par le Pizzaiolo.

Le poste Pani’NO doit recevoir l’information liée à l’OF :

```text
Préparer X pains Pani’NO
```

Le poste Pani’NO ne réalise pas cette Work Unit si cette responsabilité reste attribuée au Pizzaiolo.

Il doit cependant voir son état.

Exemple :

```text
Pains nécessaires : 4

État :
En attente du Pizzaiolo
```

---

# 8. Déblocage après préparation des pains

Lorsque l’OF Pain passe à `completed` :

- les Work Units d’assemblage concernées deviennent disponibles ;
- le poste Pani’NO reçoit la mise à jour en temps réel ;
- le blocage visuel disparaît ;
- les produits concernés peuvent être commencés.

Le poste ne doit pas obliger l’utilisateur à actualiser manuellement la page.

---

# 9. Commande reçue à moins de trente minutes

Si une commande Pani’NO est reçue moins de trente minutes avant sa remise :

- l’OF Pain doit être généré immédiatement ;
- le poste Pani’NO doit afficher le blocage immédiatement ;
- le moteur doit augmenter la priorité de la chaîne de tâches ;
- l’urgence doit rester compréhensible sans grande banderole.

---

# 10. Regroupement des besoins de pain

Plusieurs commandes proches peuvent partager un même OF Pain.

Exemple :

```text
Commande A
2 Pani’NO pour 20 h 00

Commande B
3 Pani’NO pour 20 h 05
```

Le moteur peut générer :

```text
Préparer 5 pains
```

Le regroupement doit rester traçable.

Le poste Pani’NO doit pouvoir connaître :

- le nombre total ;
- les commandes concernées ;
- les heures de remise ;
- le nombre déjà utilisé ;
- le nombre encore disponible.

---

# 11. Stock logique de pains préparés

Le système doit pouvoir distinguer :

- pains nécessaires ;
- pains demandés ;
- pains préparés ;
- pains utilisés ;
- pains restants ;
- pains perdus ou inutilisables.

Exemple :

```ts
type PaninoBreadState = {
  required: number
  requested: number
  prepared: number
  used: number
  remaining: number
  losses: number
}
```

Le système doit éviter les doubles consommations lors des mises à jour temps réel.

---

# 12. Assemblage d’un Pani’NO

Une Work Unit d’assemblage doit afficher au minimum :

- nom de la commande ;
- heure de remise ;
- base choisie ;
- sauces ;
- suppléments ;
- retraits ;
- quantité ;
- état du pain.

Exemple :

```text
Paul · 20 h 00

Pani’NO

Base tomate
Sauces : burger, samouraï
- Oignon rouge
+ Cheddar
```

---

# 13. Bases du Pani’NO

Le Pani’NO peut utiliser notamment :

- sauce tomate ;
- crème.

La base réelle doit être enregistrée explicitement.

Elle ne doit pas être déduite uniquement de l’affichage.

---

# 14. Sauces

Les sauces doivent apparaître clairement.

Éviter les abréviations ambiguës.

Exemple :

```text
Burger
Samouraï
```

plutôt que :

```text
B
S
```

si le contexte ne permet pas une lecture sûre.

Le nombre de sauces incluses et les éventuels suppléments doivent relever des règles commerciales, sans perturber la production.

---

# 15. Suppléments et retraits

Les modifications doivent apparaître directement dans la Work Unit.

Exemple :

```text
- Tomate
- Oignon rouge
+ Cheddar
```

L’opérateur ne doit pas ouvrir un second écran pour consulter les modifications essentielles.

---

# 16. Cuisson ou grillage du Pani’NO

La Work Unit de cuisson doit être distincte de l’assemblage.

Elle doit permettre de suivre :

- début réel ;
- durée théorique ;
- durée observée ;
- fin réelle ;
- ressource utilisée.

Le système ne doit pas supposer que tous les Pani’NO ont toujours la même durée si les observations montrent le contraire.

---

# 17. Regroupement de Pani’NO

Le moteur peut proposer de regrouper plusieurs Pani’NO si :

- la ressource le permet ;
- les échéances sont compatibles ;
- cela n’augmente pas le retard ;
- les produits peuvent être manipulés sans confusion.

Le regroupement reste une recommandation.

L’opérateur peut choisir une autre organisation.

---

# 18. Fish&NO

Le Fish&NO doit être représenté comme une chaîne de Work Units distinctes.

Exemple :

```text
Préparer la portion
        ↓
Frire le poisson
        ↓
Préparer les grenailles ou frites
        ↓
Ajouter la sauce tartare
        ↓
Assembler le bol
        ↓
Produit prêt
```

Les étapes exactes doivent refléter le fonctionnement réel du poste.

---

# 19. Friture du poisson

La Work Unit doit afficher :

- quantité ;
- heure de remise ;
- commande ;
- durée estimée ;
- état de la friteuse ;
- éventuelles autres cuissons en cours.

Le moteur doit tenir compte de la capacité réelle de la friteuse.

---

# 20. Frites et grenailles

Les produits frits doivent être modélisés séparément lorsque leur préparation peut être indépendante.

Exemples :

```text
Frites seules
```

```text
Grenailles pour Fish&NO
```

```text
Frites d’une commande mixte
```

Le poste doit éviter de préparer trop tôt lorsque cela dégrade la qualité.

---

# 21. Regroupement des fritures

Le moteur peut proposer de regrouper plusieurs portions si :

- la capacité le permet ;
- les heures de remise sont proches ;
- la qualité reste acceptable ;
- les commandes restent identifiables.

Le système doit conserver la traçabilité de chaque portion.

---

# 22. Capacité de la friteuse

La capacité ne doit pas être codée uniquement comme un nombre de commandes.

Elle peut être exprimée en :

- portions ;
- paniers ;
- poids ;
- unités de Work Units simultanées.

Exemple :

```ts
type FryerCapacity = {
  maxConcurrentBaskets: number
  maxPortionsPerBasket: number
}
```

La valeur réelle doit être configurable.

---

# 23. Charge de la friteuse

Le moteur doit distinguer :

- friteuse libre ;
- friteuse partiellement occupée ;
- friteuse saturée ;
- cuisson terminée mais non sortie ;
- ressource indisponible.

La Caisse peut utiliser cette charge pour évaluer une commande mixte.

---

# 24. Commandes mixtes

Une même commande peut contenir :

- pizza ;
- Pani’NO ;
- Fish&NO ;
- frites.

Le poste Pani’NO doit afficher l’état des autres postes de manière compacte lorsqu’il est nécessaire de coordonner la remise.

Exemple :

```text
Paul · 20 h 00

Pizzas : au Four
Pani’NO : prêt
Fish&NO : en cuisson
```

---

# 25. Fin simultanée des produits

Le moteur de décision doit essayer de rapprocher la fin des différents produits d’une même commande.

L’objectif est d’éviter :

- un Pani’NO prêt trop tôt ;
- des frites froides ;
- un Fish&NO attendant longtemps les pizzas ;
- une commande partiellement terminée sans visibilité.

Cette coordination ne doit pas provoquer le retard d’autres commandes plus urgentes.

---

# 26. Commande partiellement prête

Le poste doit conserver la commande visible tant que tous ses produits relevant du poste ne sont pas prêts.

Exemple :

```text
2 Pani’NO prêts
1 Fish&NO en cuisson
1 frite en attente
```

Le produit individuel peut être prêt sans que la commande complète le soit.

---

# 27. Validation d’un produit

Lorsqu’une Work Unit finale est validée :

- la Production Unit passe à `ready` ;
- la charge résiduelle diminue ;
- la Caisse est actualisée ;
- le poste Prêtes est recalculé ;
- la commande globale peut éventuellement devenir prête.

---

# 28. Produits prêts

Les produits prêts doivent quitter la zone principale active.

Ils peuvent apparaître dans :

- une zone « Prêts » ;
- le suivi de commande ;
- l’historique récent.

Ils ne doivent plus encombrer la liste des tâches à faire.

---

# 29. Priorités du moteur

Le moteur de décision doit classer les Work Units selon notamment :

1. échéance de remise ;
2. dépendances libérées ;
3. commande déjà commencée ;
4. produit bloquant d’autres tâches ;
5. durée restante ;
6. ressource disponible ;
7. regroupement compatible ;
8. coordination avec les autres postes ;
9. priorité manuelle.

---

# 30. Tâches bloquantes

Certaines Work Units peuvent bloquer toute une chaîne.

Exemple :

```text
Pain non préparé
```

bloque :

```text
Assemblage Pani’NO
```

puis :

```text
Cuisson
```

puis :

```text
Commande prête
```

Le moteur doit donner une priorité importante aux tâches réellement bloquantes.

---

# 31. Affichage d’un blocage

Exemple :

```text
EN ATTENTE DU PAIN

3 Pani’NO · Paul · 20 h 00
```

Le message doit préciser :

- ce qui manque ;
- quel poste en est responsable ;
- depuis combien de temps ;
- l’impact éventuel.

Éviter les messages techniques comme :

```text
dependency_not_completed
```

dans l’interface de production.

---

# 32. Commande déjà commencée

Une commande commencée doit être identifiable.

Exemple :

```text
Commande commencée
```

Le moteur doit généralement favoriser sa progression, en particulier si des produits chauds sont déjà prêts ou en cuisson.

---

# 33. Réorganisation manuelle

L’opérateur doit pouvoir :

- changer l’ordre visuel ;
- augmenter la priorité ;
- diminuer la priorité ;
- commencer une autre tâche ;
- ignorer une suggestion ;
- déclarer une ressource indisponible.

La décision réelle doit être enregistrée et transmise aux moteurs.

---

# 34. Priorité manuelle

Une priorité manuelle doit avoir une durée ou une portée explicite.

Exemples :

```text
Prioritaire jusqu’à la fin
```

```text
Traiter maintenant
```

```text
Reporter temporairement
```

Le recalcul automatique ne doit pas annuler immédiatement le choix humain.

---

# 35. Commencer une commande en avance

Les commandes Pani’NO ou Fish&NO peuvent être commencées en avance lorsque cela est compatible avec :

- la qualité ;
- la disponibilité des ressources ;
- l’heure de remise ;
- le stockage temporaire ;
- les règles métier.

Le système peut signaler une avance importante sans interdire l’action.

---

# 36. Ne pas préparer trop tôt les produits sensibles

Les frites, le poisson frit et certains Pani’NO peuvent perdre rapidement en qualité.

Le moteur doit pouvoir définir une fenêtre maximale d’anticipation par type de Work Unit.

Exemple :

```ts
type ProductTimingPolicy = {
  maxPreparationLeadMinutes: number
  maxCookingLeadMinutes: number
  maxReadyWaitingMinutes: number
}
```

Les valeurs doivent être configurables.

---

# 37. Attente excessive d’un produit prêt

Un produit prêt depuis trop longtemps doit être signalé.

Exemple :

```text
Prêt depuis 8 min
```

L’alerte doit être ciblée.

Elle ne doit pas transformer tout l’écran en alerte permanente.

---

# 38. Produit à refaire

Une action :

```text
À refaire
```

doit être disponible lorsqu’un produit est incorrect ou raté.

Cette action doit :

- conserver l’historique ;
- créer une nouvelle charge ;
- recalculer le retard ;
- informer la Caisse ;
- enregistrer une perte si nécessaire.

---

# 39. Pertes

Le poste peut enregistrer des pertes telles que :

- pain inutilisable ;
- portion de poisson ratée ;
- frites perdues ;
- ingrédient gaspillé ;
- produit renversé.

Les pertes doivent être séparées des ventes et de la production normale.

---

# 40. Rupture produit

L’opérateur doit pouvoir signaler une rupture ou une indisponibilité.

Exemples :

```text
Plus de poisson
```

```text
Sauce tartare indisponible
```

```text
Friteuse hors service
```

Cette information doit :

- remonter à la Caisse ;
- bloquer ou avertir les nouvelles commandes concernées ;
- recalculer les décisions ;
- rester traçable.

---

# 41. Ressource indisponible

Une ressource peut être déclarée :

```text
Indisponible
```

Exemples :

- friteuse en panne ;
- grill indisponible ;
- poste temporairement sans opérateur.

Le moteur doit alors :

- bloquer les Work Units concernées ;
- recalculer les créneaux ;
- avertir la Caisse ;
- ne pas affecter de nouvelles tâches irréalisables.

---

# 42. Vue compacte des ressources

Afficher uniquement les états utiles.

Exemple :

```text
Pains : 6 disponibles

Friteuse : 1/2 paniers occupés

Grill : libre
```

Éviter les grandes cartes permanentes si une ligne compacte suffit.

---

# 43. Interface principale

Les tâches peuvent être présentées sous forme de tuiles compactes.

Chaque tuile doit afficher au minimum :

- client ;
- heure ;
- produit ;
- quantité ;
- modifications ;
- état ;
- dépendance éventuelle ;
- action principale.

Exemple :

```text
Paul · 20 h 00

2 Pani’NO

Pain disponible

[ Commencer ]
```

---

# 44. Une seule action principale par tuile

Selon l’état :

```text
Commencer
```

```text
Terminer assemblage
```

```text
Lancer cuisson
```

```text
Sortir
```

```text
Prêt
```

Éviter plusieurs gros boutons concurrents.

Les actions secondaires peuvent être placées dans un menu.

---

# 45. Menu contextuel

Chaque tuile peut disposer d’un menu :

```text
⋮
```

Actions possibles :

- priorité ;
- détail ;
- reporter ;
- annuler selon permissions ;
- à refaire ;
- signaler un problème.

Aucune action essentielle ne doit dépendre d’un clic droit.

---

# 46. Groupement visuel

Les Work Units d’une même commande peuvent partager un encadrement ou un identifiant commun.

Il doit rester possible de distinguer chaque produit.

Ne pas fusionner plusieurs produits au point de perdre leur traçabilité individuelle.

---

# 47. Grandes commandes

Le poste doit supporter :

- plusieurs Pani’NO ;
- plusieurs Fish&NO ;
- plusieurs portions de frites ;
- des commandes mixtes importantes.

Une commande importante doit être repliable.

Exemple :

```text
Entreprise X

8 Pani’NO
5 Fish&NO
10 frites

12/23 produits prêts
```

---

# 48. En-tête compact

L’en-tête doit pouvoir être replié pendant le service.

Il doit respecter les safe areas.

Le poste ne doit pas afficher inutilement :

- l’heure système ;
- la batterie ;
- le Wi-Fi ;
- la charge Caisse ;
- des statistiques générales.

---

# 49. Suppression des informations non utiles

Les fonctions métier peuvent rester actives sans être visibles.

Exemple :

- Ligne téléphone libre ;
- Charge Caisse.

Elles ne doivent pas apparaître sur le poste Pani’NO si elles ne modifient pas son action immédiate.

---

# 50. Banderoles

Éviter les grandes banderoles permanentes.

Une urgence doit être affichée de manière ciblée sur la tâche concernée.

Exemple :

```text
+ 5 min de retard
```

plutôt que :

```text
À FAIRE IMMÉDIATEMENT
```

sur toute la largeur de l’écran.

---

# 51. Safe areas

Le poste doit respecter :

```css
env(safe-area-inset-top, 0px)
```

et :

```css
env(safe-area-inset-bottom, 0px)
```

afin d’éviter les conflits avec les barres système.

---

# 52. PWA

Le poste doit fonctionner comme PWA :

- Android ;
- iOS ;
- tablette ;
- smartphone de secours.

Les données temps réel ne doivent pas être mises en cache de manière agressive.

---

# 53. Synchronisation temps réel

Le poste doit recevoir immédiatement :

- les commandes ;
- la validation des pains ;
- les annulations ;
- les changements de créneau ;
- les états des autres produits ;
- les ruptures ;
- les priorités.

Ses actions doivent être propagées immédiatement.

---

# 54. Conflits

Deux appareils ne doivent pas pouvoir :

- commencer deux fois la même Work Unit ;
- consommer deux fois le même pain ;
- valider deux fois le même produit ;
- créer deux reprises identiques.

Utiliser des opérations idempotentes et une vérification de version.

---

# 55. Mode hors connexion

En cas de perte de connexion :

- afficher clairement l’état hors ligne ;
- ne pas prétendre que les validations sont enregistrées ;
- limiter les actions risquées ;
- conserver localement uniquement les actions pouvant être rejouées sans doublon.

Le comportement détaillé relève de `10_SYNCHRONISATION.md`.

---

# 56. Mode test

En mode test, permettre l’affichage facultatif :

- identifiant de Work Unit ;
- dépendances ;
- score ;
- raisons de priorité ;
- durées estimées ;
- durées réelles ;
- ressources ;
- blocages.

Ces informations restent cachées en production.

---

# 57. Ce que le poste Pani’NO ne doit jamais faire

Le poste ne doit jamais :

- recalculer lui-même la priorité ;
- créer localement des dépendances différentes ;
- considérer un produit prêt comme charge active ;
- commencer un assemblage sans pain si le pain est obligatoire ;
- valider toute une commande après un seul produit ;
- masquer la progression des autres produits d’une commande mixte ;
- dupliquer une consommation de pain ;
- ignorer une ressource indisponible ;
- afficher la réserve comme une charge ;
- perdre une action après une erreur réseau sans avertissement.

---

# 58. Tests d’acceptation — OF Pain

Commande :

```text
3 Pani’NO pour 20 h 00
```

Résultat attendu :

- OF Pain visible au Pizzaiolo à partir de 19 h 30 ;
- poste Pani’NO affiche « En attente du pain » ;
- assemblage bloqué ;
- après validation des pains, assemblage disponible.

---

# 59. Tests d’acceptation — Commande reçue tardivement

Commande reçue à :

```text
19 h 45
```

pour :

```text
20 h 00
```

Résultat attendu :

- OF Pain généré immédiatement ;
- priorité élevée ;
- blocage visible ;
- recalcul du risque de retard.

---

# 60. Tests d’acceptation — Regroupement des pains

Commandes :

```text
2 Pani’NO à 20 h 00
3 Pani’NO à 20 h 05
```

Résultat attendu :

- regroupement possible en OF de 5 pains ;
- traçabilité des deux commandes ;
- aucun double comptage.

---

# 61. Tests d’acceptation — Pani’NO simple

Commande :

```text
1 Pani’NO
```

Résultat attendu :

- assemblage disponible après pain ;
- modifications visibles ;
- cuisson suivie ;
- produit prêt après validation finale.

---

# 62. Tests d’acceptation — Fish&NO

Commande :

```text
1 Fish&NO
```

Résultat attendu :

- Work Units de friture et assemblage créées ;
- friteuse réservée ;
- sauce tartare visible ;
- produit prêt uniquement après assemblage complet.

---

# 63. Tests d’acceptation — Frites seules

Commande :

```text
2 portions de frites
```

Résultat attendu :

- deux Production Units ;
- regroupement possible ;
- suivi individuel conservé ;
- validation unique ou groupée sans doublon.

---

# 64. Tests d’acceptation — Commande mixte

Commande :

```text
2 pizzas
1 Pani’NO
1 Fish&NO
1 frite
```

Résultat attendu :

- progression par poste ;
- produit Pani’NO prêt sans déclarer toute la commande prête ;
- commande globale prête uniquement après tous les postes.

---

# 65. Tests d’acceptation — Friteuse saturée

Friteuse à capacité maximale.

Nouvelle Work Unit de friture.

Résultat attendu :

- tâche bloquée ou planifiée plus tard ;
- Caisse recalculée ;
- aucune affectation irréalisable ;
- raison visible en mode test.

---

# 66. Tests d’acceptation — Rupture poisson

Action :

```text
Déclarer le poisson indisponible
```

Résultat attendu :

- nouvelles commandes Fish&NO averties ou bloquées ;
- Caisse informée ;
- Work Units existantes signalées ;
- historique conservé.

---

# 67. Tests d’acceptation — Double validation

Deux appareils valident le même Pani’NO.

Résultat attendu :

- une seule validation ;
- aucun doublon ;
- second appareil actualisé.

---

# 68. Tests d’acceptation — Produit à refaire

Fish&NO déclaré raté.

Résultat attendu :

- produit initial conservé ;
- nouvelle charge créée ;
- commande redevenue incomplète ;
- perte enregistrable ;
- retard recalculé.

---

# 69. Tests d’acceptation — Produit prêt trop tôt

Frites prêtes longtemps avant les pizzas.

Résultat attendu :

- attente excessive signalée ;
- commande globale toujours suivie ;
- moteur capable d’ajuster les recommandations futures.

---

# 70. Contraintes d’implémentation

- Ne pas réécrire simultanément le moteur et toute l’interface.
- Utiliser les Work Units existantes lorsqu’elles sont fiables.
- Ajouter progressivement les dépendances.
- Conserver temporairement l’ancienne vue derrière un feature flag.
- Tester sur tablette réelle.
- Tester la friteuse avec plusieurs commandes.
- Tester les commandes mixtes.
- Tester les regroupements d’OF Pain.
- Tester les conflits entre appareils.
- Documenter les écarts entre les règles et le code existant.

---

# 71. Livrable attendu

Toute refonte importante du poste Pani’NO doit fournir :

- les composants modifiés ;
- les Work Units prises en charge ;
- les dépendances ;
- la gestion des pains ;
- la gestion de la friteuse ;
- la progression des commandes mixtes ;
- les protections contre les doublons ;
- les tests ajoutés ;
- les résultats de lint et build ;
- les captures sur tablette ;
- la procédure de retour arrière ;
- les points à valider en service réel.

---

# Principe fondamental

> Le poste Pani’NO organise des chaînes de tâches dépendantes, et non de simples tickets.

Il doit permettre à l’opérateur de savoir immédiatement ce qui peut être commencé, ce qui est bloqué, quelle ressource est nécessaire et comment son travail s’intègre à la progression globale de la commande.