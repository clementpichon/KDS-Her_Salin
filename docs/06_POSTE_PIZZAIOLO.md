# 06_POSTE_PIZZAIOLO.md

# Poste Pizzaiolo

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

---

# 1. Objectif

Le poste Pizzaiolo doit représenter le travail réel de préparation.

Il ne doit plus fonctionner comme une simple pile de tickets numériques.

Son objectif est de :

- réduire la charge mentale du pizzaiolo ;
- représenter physiquement son plan de travail ;
- lui permettre de préparer plusieurs commandes simultanément ;
- l’aider à constituer des fournées complètes de quatre pizzas ;
- afficher clairement les bases, suppléments et retraits ;
- permettre une organisation manuelle lorsque la situation réelle l’exige ;
- anticiper les commandes suffisamment tôt ;
- rappeler les tâches annexes importantes, notamment les pains Pani’NO.

Le moteur propose.

Le pizzaiolo garde la maîtrise du plan de travail.

---

# 2. Philosophie du poste

Le pizzaiolo ne travaille pas réellement commande par commande.

Il travaille sur des pizzas individuelles qu’il peut regrouper selon :

- les heures de remise ;
- l’ordre des commandes ;
- les commandes déjà commencées ;
- les bases ;
- la capacité du plan de travail ;
- la capacité du four ;
- la situation réelle du service.

L’interface doit donc être centrée sur :

```text
les pizzas en cours de préparation
```

et non sur :

```text
les tickets de commande
```

---

# 3. Organisation générale de l’écran

L’écran doit être divisé en deux zones principales.

## Zone gauche

Le plan de travail.

Il occupe la majeure partie de l’écran.

## Zone droite

La liste compacte des commandes et Work Units disponibles.

Exemple de répartition initiale :

```text
Plan de travail : environ 70 %

Commandes : environ 30 %
```

La proportion exacte peut être adaptée selon la taille de l’écran.

---

# 4. Plan de travail à quatre disques

Le plan de travail doit toujours afficher quatre disques.

```text
○   ○

○   ○
```

Chaque disque représente une position physique réelle du plan de travail.

Les quatre disques doivent rester visibles :

- lorsqu’ils sont vides ;
- lorsqu’une seule pizza est préparée ;
- lorsqu’une commande dépasse quatre pizzas ;
- lorsqu’une fournée est incomplète.

Ils servent de repère spatial au pizzaiolo.

---

# 5. Signification des disques

Les disques ne représentent pas :

- quatre commandes ;
- quatre tickets ;
- quatre créneaux ;
- quatre places théoriques.

Ils représentent :

```text
quatre pizzas physiquement présentes sur le plan de travail
```

Une position ne doit être occupée que lorsqu’une Production Unit réelle y est affectée.

---

# 6. Contenu d’un disque

Chaque disque occupé doit afficher au minimum :

- le nom de la pizza ;
- le nom du client ou un identifiant compact de commande ;
- la base réelle lorsqu’elle est modifiée ou utile à la distinction ;
- les suppléments ;
- les retraits ;
- l’état de préparation ;
- éventuellement l’heure de remise.

Exemple :

```text
Paul

FROMAGES

BASE TOMATE

+ Saumon
- Oignons
```

L’information doit rester lisible en quelques secondes.

---

# 7. Affichage de la base

La base affichée doit toujours être la base principale réellement utilisée.

Exemple :

```text
Fromages
Base par défaut : crème de chèvre
Base demandée : tomate
```

Affichage attendu :

```text
BASE TOMATE
```

Ne jamais afficher comme information principale :

```text
CRÈME DE CHÈVRE
```

dans ce cas.

---

# 8. Base non modifiée

Lorsque la base réelle est identique à la base habituelle, il n’est pas obligatoire d’afficher un grand tag.

L’information peut rester :

- implicite ;
- discrète ;
- visible seulement si elle aide à différencier les pizzas.

Cela est particulièrement important pour distinguer :

- crème fraîche ;
- crème de chèvre ;
- crème de truffe.

---

# 9. Suppléments et retraits

Les suppléments et retraits doivent apparaître directement dans le disque.

Exemple :

```text
Regina

+ Crème
- Champignons
```

Le pizzaiolo ne doit pas devoir rouvrir la commande ou consulter une autre vue.

---

# 10. Modifications consommées par la résolution de base

Lorsqu’un ajout et un retrait ont servi à déterminer un remplacement de base, ils ne doivent pas être affichés deux fois.

Exemple source :

```text
Regina
- sauce tomate
+ crème
```

Affichage attendu :

```text
Regina

BASE CRÈME
```

Affichage incorrect :

```text
Regina

BASE CRÈME
- sauce tomate
+ crème
```

En revanche :

```text
Regina
+ crème
```

doit afficher :

```text
Regina

+ crème
```

La base tomate reste la base principale.

---

# 11. Cas sans base

Exemple :

```text
Regina
- sauce tomate
```

Affichage attendu :

```text
SANS BASE
```

Cette information doit être particulièrement visible.

---

# 12. Liste des commandes

La colonne de droite affiche les commandes disponibles.

Chaque commande doit être compacte.

Informations minimales :

- nom du client ;
- heure de remise ;
- nombre de pizzas ;
- progression ;
- pizzas disponibles à la sélection.

Exemple :

```text
Paul · 19 h 30 · 3 pizzas

0/3 préparées
```

---

# 13. Commandes repliables

Les commandes doivent pouvoir être repliées ou développées.

Vue repliée :

```text
Entreprise X

15 pizzas

7/15 avancées
```

Vue développée :

```text
Regina × 6
Piccante × 4
Fromages × 5
```

Une grosse commande ne doit pas monopoliser toute la colonne.

---

# 14. Commandes jusqu’à trente pizzas

Le poste doit supporter :

- les commandes habituelles de 1 à 4 pizzas ;
- les commandes de 10 à 15 pizzas ;
- exceptionnellement les commandes d’environ 30 pizzas.

Une grosse commande doit pouvoir être répartie sur plusieurs fournées et plusieurs sélections successives.

---

# 15. Sélection d’une pizza

Un appui sur une pizza disponible doit :

- l’ajouter au premier disque libre ;
- affecter la Production Unit correspondante ;
- sélectionner la Work Unit de préparation ;
- mettre à jour l’état métier ;
- synchroniser le changement.

La pizza ne doit plus apparaître comme librement sélectionnable sur un autre appareil.

---

# 16. Sélection d’une commande complète

L’utilisateur doit pouvoir sélectionner une commande entière.

Action possible :

```text
Tout sélectionner
```

ou appui sur l’en-tête de la commande selon l’ergonomie retenue.

Si la commande contient quatre pizzas ou moins :

- remplir les positions disponibles ;
- sélectionner toutes les pizzas compatibles avec la capacité.

Si elle contient plus de quatre pizzas :

- remplir uniquement les places disponibles ;
- laisser les autres pizzas en attente ;
- afficher le nombre restant.

---

# 17. Sélection sur plusieurs commandes

Le pizzaiolo doit pouvoir sélectionner des pizzas provenant de plusieurs commandes.

Exemple :

```text
Commande A
2 pizzas

Commande B
1 pizza

Commande C
1 pizza
```

Les quatre pizzas peuvent occuper simultanément les quatre disques.

Le lien avec chaque commande d’origine doit être conservé.

---

# 18. Constitution de fournées complètes

Le poste doit favoriser des groupes de quatre pizzas.

Exemple :

```text
Commande A : 3 pizzas
Commande B : 1 pizza
```

Le moteur peut proposer :

```text
3 pizzas A
1 pizza B
```

Le pizzaiolo peut accepter ou modifier cette proposition.

---

# 19. Ordre métier de constitution des fournées

Appliquer les priorités définies dans `09_REGLES_METIER.md`.

Résumé opérationnel :

1. éviter les retards ;
2. remplir les quatre places ;
3. terminer les commandes déjà commencées ;
4. respecter autant que possible l’ordre des commandes ;
5. éviter une pizza isolée plus tard ;
6. regrouper les bases ;
7. limiter les changements inutiles.

Le regroupement des bases reste secondaire au remplissage.

---

# 20. Regroupement des bases

Le moteur peut proposer des pizzas ayant des bases identiques ou proches.

Exemple :

Commande A :

```text
2 Regina
1 Fromages
1 Chèvre miel
```

Commande B :

```text
1 Regina
1 Piccante
1 Fromages
```

Une organisation possible :

```text
Fournée 1
3 Regina
1 Piccante

Fournée 2
2 Fromages
1 Chèvre miel
```

Cette proposition reste modifiable.

---

# 21. Aucune interdiction liée à l’heure

Le pizzaiolo doit pouvoir lancer une commande même si son heure de remise est éloignée.

Une commande de 19 h 30 peut être commencée à 19 h 00.

Le système peut signaler :

```text
Commande en avance
```

mais ne doit pas bloquer l’action.

---

# 22. Anticipation

Les commandes planifiées peuvent être anticipées afin de :

- lisser la charge ;
- prendre de l’avance ;
- créer une capacité pour les commandes spontanées ;
- éviter une accumulation autour d’un même créneau.

Le moteur de décision peut proposer des Work Units anticipables.

---

# 23. Préparation et cuisson distinctes

Préparer une pizza en avance ne signifie pas qu’elle doit être immédiatement cuite.

Une pizza peut passer par :

```text
preparing
↓
ready_for_oven
```

puis attendre la meilleure fenêtre de cuisson.

Le poste Pizzaiolo doit distinguer clairement :

- préparation autorisée ;
- cuisson recommandée ;
- cuisson encore trop anticipée.

---

# 24. Envoi au Four

Lorsque les pizzas du plan de travail sont prêtes, l’utilisateur peut les envoyer au Four.

Action principale :

```text
Envoyer au Four
```

Cette action doit :

- verrouiller la composition réelle ;
- créer ou confirmer la fournée ;
- faire passer les pizzas à `ready_for_oven` ou à l’état approprié ;
- transmettre la fournée au poste Four ;
- libérer les disques selon le flux retenu.

---

# 25. Fournée incomplète

Une fournée de moins de quatre pizzas doit rester possible.

Cas légitimes :

- aucune pizza compatible disponible ;
- risque de retard ;
- fin de service ;
- décision manuelle ;
- contrainte réelle de production.

Le KDS peut afficher :

```text
2/4 pizzas
```

et suggérer de compléter, sans bloquer l’envoi.

---

# 26. Verrouillage

Une pizza devient verrouillée lorsque son affectation correspond à une action physique réelle.

Exemples :

- placée sur un disque ;
- préparation commencée ;
- fournée confirmée ;
- envoyée au Four.

Le moteur ne doit pas déplacer automatiquement une pizza verrouillée.

---

# 27. Retirer une pizza d’un disque

Le pizzaiolo doit pouvoir retirer une pizza d’un disque tant que l’action reste réversible.

Cette action doit :

- libérer la position ;
- remettre la Work Unit dans un état cohérent ;
- ne pas annuler la commande ;
- ne pas supprimer la Production Unit.

Si la préparation a déjà commencé, demander confirmation ou appliquer une règle métier explicite.

---

# 28. Réorganisation manuelle

Le pizzaiolo doit pouvoir déplacer les pizzas entre les quatre positions.

Le déplacement change uniquement :

- la représentation physique ;
- l’ordre visuel ;
- éventuellement la position de préparation.

Il ne doit pas modifier la commande d’origine.

---

# 29. Glisser-déposer

Le glisser-déposer doit être adapté au tactile.

Il peut servir à :

- réordonner les tuiles de commande ;
- déplacer une pizza entre les disques ;
- modifier la priorité visuelle.

Prévoir une alternative tactile claire si le glisser-déposer est imprécis.

---

# 30. Menu contextuel des commandes

Chaque tuile de commande peut posséder un petit bouton menu.

Exemple :

```text
⋮
```

Ce menu remplace l’équivalent d’un clic droit.

Actions possibles :

- augmenter la priorité ;
- diminuer la priorité ;
- déplacer la commande ;
- masquer temporairement ;
- supprimer ou annuler selon les permissions ;
- ouvrir le détail.

Aucune action essentielle ne doit dépendre d’un clic droit réel.

---

# 31. Suppression d’une commande

L’action de suppression doit être distinguée de l’annulation commerciale.

Le poste Pizzaiolo ne doit pas supprimer silencieusement une commande confirmée.

Selon les permissions, il peut :

- masquer une commande de sa file ;
- demander son annulation ;
- annuler une erreur de saisie ;
- exclure une commande du plan courant.

Une confirmation est obligatoire pour toute action destructive.

---

# 32. Priorité manuelle

Le pizzaiolo doit pouvoir favoriser une commande ou une pizza.

Exemple :

```text
Prioritaire
```

La priorité manuelle doit être transmise au moteur de décision.

Elle ne doit pas être immédiatement écrasée par le recalcul automatique.

---

# 33. Recommandations du moteur

Le moteur peut proposer :

- les quatre prochaines pizzas ;
- une composition de fournée ;
- une commande à commencer ;
- une commande à terminer ;
- un groupe de bases ;
- une Work Unit urgente.

L’affichage doit distinguer :

```text
proposé
```

de :

```text
sélectionné réellement
```

---

# 34. Suggestion non imposée

Une proposition du moteur ne doit jamais remplir automatiquement les disques sans validation si cela risque de surprendre l’utilisateur.

Approches possibles :

- bouton « Utiliser la suggestion » ;
- prévisualisation translucide ;
- encart « Fournée suggérée » ;
- sélection semi-automatique confirmée par l’utilisateur.

---

# 35. Prévisualisation du poste Four

Le poste Pizzaiolo peut afficher une prévisualisation compacte des fournées ou commandes à venir.

Le poste Four doit pouvoir prévisualiser les trois prochaines commandes que le pizzaiolo prévoit de traiter.

Le Pizzaiolo doit donc fournir une projection exploitable.

Cette projection doit rester distincte des fournées verrouillées.

---

# 36. OF Pain Pani’NO

Lorsqu’une commande contient des Pani’NO, le système doit générer une Work Unit :

```text
Préparer X pains Pani’NO
```

Cette Work Unit est destinée au Pizzaiolo.

---

# 37. Déclenchement de l’OF Pain

L’OF doit devenir visible :

```text
30 minutes avant l’heure de remise
```

Si la commande est reçue moins de trente minutes avant :

```text
affichage immédiat
```

La valeur doit être configurable.

---

# 38. Position de l’OF Pain

Lorsqu’il devient dû, l’OF doit apparaître en tête de liste.

Son oubli bloque la suite de la production Pani’NO.

Il doit donc recevoir des raisons de priorité telles que :

```text
panino_bread_due
blocking_other_work
pickup_deadline_near
```

---

# 39. Contenu de l’OF Pain

Afficher au minimum :

- nombre de pains ;
- heure de remise concernée ;
- commandes concernées ;
- état ;
- action de début ;
- action de fin.

Exemple :

```text
OF PAINS PANI’NO

Préparer 6 pains

Pour 20 h 00
```

---

# 40. Validation de l’OF Pain

Une fois les pains préparés, le pizzaiolo valide la Work Unit.

Cette validation doit :

- passer l’OF à `completed` ;
- débloquer les Work Units Pani’NO dépendantes ;
- synchroniser le poste Pani’NO ;
- conserver l’historique.

---

# 41. Plusieurs commandes Pani’NO proches

Le moteur peut regrouper plusieurs besoins de pains dans un même OF si cela est pertinent.

Exemple :

```text
Commande A : 2 pains pour 20 h 00
Commande B : 3 pains pour 20 h 05
```

Proposition possible :

```text
Préparer 5 pains
```

Le regroupement doit respecter :

- les échéances ;
- la fraîcheur ;
- la capacité réelle ;
- les règles métier.

---

# 42. États visibles

Le poste doit afficher des états simples.

Exemples :

```text
En attente
```

```text
Sélectionnée
```

```text
En préparation
```

```text
Prête pour le Four
```

```text
Envoyée au Four
```

Les libellés techniques ne doivent pas nécessairement être affichés tels quels.

---

# 43. Commande déjà commencée

Une commande dont au moins une pizza a été engagée doit être identifiable.

Exemple :

```text
Commande commencée
```

Le moteur doit généralement favoriser sa progression, sans empêcher les chevauchements nécessaires.

---

# 44. Progression des commandes

La colonne latérale doit afficher une progression compacte.

Exemple :

```text
Paul

2/5 préparées
1 au four
2 en attente
```

Ne pas transformer ce résumé en une grande carte.

---

# 45. Commandes terminées côté Pizzaiolo

Une commande dont toutes les pizzas ont quitté le poste Pizzaiolo ne doit plus encombrer sa liste principale.

Elle peut rester accessible dans :

- l’historique ;
- une vue secondaire ;
- le suivi global.

---

# 46. Interaction avec le Four

Le poste Pizzaiolo ne doit pas déclarer une pizza prête pour le client.

Il déclare uniquement :

- préparation terminée ;
- pizza envoyée au Four.

Le poste Four valide :

- cuisson ;
- post-cuisson ;
- état prêt.

---

# 47. Stock de pâtons

Le poste Pizzaiolo peut afficher et modifier le stock de pâtons si cette responsabilité lui appartient.

Une pizza et un Pani’NO consomment chacun un pâton.

Le bouton :

```text
Réinitialiser stock pâtons
```

doit réinitialiser :

- le stock initial ;
- le stock restant ;
- les pertes.

La réinitialisation doit demander confirmation.

---

# 48. Stock restant

Le stock restant doit être calculé à partir :

- du stock initial ;
- des consommations ;
- des pertes ;
- des corrections manuelles.

Éviter les doubles décrémentations lors des synchronisations ou nouvelles tentatives.

---

# 49. Pertes

Les pertes doivent être enregistrées séparément.

Exemples :

- pâton déchiré ;
- erreur de préparation ;
- pâton inutilisable.

Une perte ne doit pas être confondue avec une pizza vendue.

---

# 50. Ligne téléphone et charge Caisse

Les fonctions métier :

- Ligne téléphone libre ;
- Charge Caisse,

doivent rester présentes dans le système si elles alimentent le moteur.

Elles ne doivent cependant pas être affichées par défaut sur le poste Pizzaiolo si elles alourdissent l’interface.

La suppression visuelle ne doit pas supprimer la donnée ou la logique.

---

# 51. Banderole « À REMETTRE MAINTENANT »

La banderole :

```text
À REMETTRE MAINTENANT
```

doit être retirée de l’interface du poste Pizzaiolo.

Elle crée une surcharge visuelle et ne correspond pas directement à son rôle.

L’urgence doit être représentée par :

- l’ordre ;
- le score ;
- un indicateur compact ;
- une alerte ciblée.

---

# 52. En-tête

Le bandeau supérieur doit pouvoir être replié afin de maximiser l’espace de travail.

Il doit :

- respecter la safe area ;
- ne pas entrer en conflit avec la barre système ;
- conserver un moyen clair de réapparition ;
- ne pas dupliquer inutilement l’heure, la batterie ou le Wi-Fi.

Le logo peut servir de bouton d’accueil.

---

# 53. Mode plein écran

Sur tablette, le poste doit fonctionner correctement comme PWA en mode `standalone`.

Le système ne peut pas toujours empêcher totalement les gestes système, mais l’application doit :

- limiter le défilement de page ;
- utiliser des zones internes scrollables ;
- éviter les gestes qui font disparaître le plein écran ;
- prévenir les zooms accidentels ;
- respecter les safe areas.

---

# 54. Densité d’information

Le plan de travail doit rester visuellement dominant.

La colonne des commandes doit être dense mais lisible.

Éviter :

- les doubles cartes ;
- les longs textes ;
- les marges excessives ;
- les gros badges décoratifs ;
- les informations non actionnables.

---

# 55. Couleurs

Les couleurs doivent aider à différencier :

- les états ;
- les bases modifiées ;
- les alertes ;
- la sélection.

Ne pas dépendre uniquement de la couleur.

Une base doit aussi posséder :

- un texte ;
- un pictogramme ;
- ou une forme identifiable.

---

# 56. Accessibilité tactile

Les actions essentielles doivent disposer d’une zone tactile suffisante.

Éviter :

- les menus trop petits ;
- les icônes sans libellé accessible ;
- les actions dépendantes du survol ;
- les glisser-déposer sans alternative.

---

# 57. Synchronisation temps réel

Toute action doit être synchronisée :

- sélection d’une pizza ;
- déplacement ;
- début de préparation ;
- retrait ;
- envoi au Four ;
- validation d’un OF ;
- priorité manuelle.

Le poste doit gérer les conflits proprement.

Exemple :

une pizza sélectionnée simultanément sur deux appareils ne doit pas être dupliquée.

---

# 58. Gestion des conflits

Si une action ne peut plus être appliquée car l’état a changé :

- ne pas écraser silencieusement la modification distante ;
- actualiser l’interface ;
- afficher un message court ;
- conserver les autres sélections valides.

Exemple :

```text
Cette pizza a déjà été sélectionnée sur un autre poste.
```

---

# 59. Mode hors connexion

Le poste ne doit pas prétendre être synchronisé lorsqu’il ne l’est pas.

En cas de coupure :

- afficher un indicateur clair ;
- éviter les actions risquant de créer des doublons ;
- conserver les actions locales si une stratégie de resynchronisation sûre existe ;
- ne jamais afficher des données périmées comme certaines.

Le comportement exact sera défini dans `10_SYNCHRONISATION.md`.

---

# 60. Mode test

En mode test, permettre l’affichage facultatif :

- score de priorité ;
- raisons ;
- Work Units ;
- dépendances ;
- fournées projetées ;
- identifiants ;
- timings estimés.

Ces données restent cachées en production.

---

# 61. Ce que le poste Pizzaiolo ne doit jamais faire

Le poste ne doit jamais :

- recalculer lui-même le score ;
- déduire seul la base réelle ;
- compter une pizza prête comme charge restante ;
- modifier une fournée verrouillée ;
- forcer une commande à rester indivisible ;
- empêcher une préparation en avance ;
- imposer le regroupement des bases ;
- supprimer silencieusement une commande confirmée ;
- afficher une suggestion comme une action déjà engagée ;
- considérer les quatre disques comme quatre commandes.

---

# 62. Tests d’acceptation — Quatre disques

## Action

Ouvrir le poste avec zéro pizza sélectionnée.

## Résultat attendu

- quatre disques visibles ;
- quatre positions vides ;
- positions stables.

---

# 63. Tests d’acceptation — Sélection multi-commandes

Commandes :

```text
A : 2 pizzas
B : 1 pizza
C : 1 pizza
```

Action :

sélectionner les quatre pizzas.

Résultat attendu :

- quatre disques occupés ;
- trois commandes représentées ;
- liens d’origine conservés.

---

# 64. Tests d’acceptation — Base modifiée

Pizza :

```text
Fromages
- crème de chèvre
+ sauce tomate
```

Résultat attendu :

```text
BASE TOMATE
```

Les deux modifications consommées ne sont pas dupliquées.

---

# 65. Tests d’acceptation — Supplément crème

Pizza :

```text
Regina
+ crème
```

Résultat attendu :

- base principale tomate ;
- `+ crème` affiché ;
- aucun tag `BASE CRÈME`.

---

# 66. Tests d’acceptation — Grosse commande

Commande :

```text
15 pizzas
```

Résultat attendu :

- commande repliable ;
- progression visible ;
- sélection de quatre pizzas maximum sur le plan ;
- reste de la commande conservé.

---

# 67. Tests d’acceptation — Anticipation

Heure actuelle :

```text
19 h 00
```

Commande :

```text
6 pizzas pour 19 h 30
```

Résultat attendu :

- commande disponible ;
- sélection possible ;
- aucun blocage lié à l’avance ;
- éventuel indicateur discret.

---

# 68. Tests d’acceptation — Fournée complète

Situation :

```text
Commande A : 3 pizzas
Commande B : 1 pizza
```

Résultat attendu :

- suggestion de quatre pizzas ;
- fournée complète identifiable ;
- composition modifiable.

---

# 69. Tests d’acceptation — Fournée manuelle incomplète

Sélection :

```text
2 pizzas
```

Action :

envoyer au Four.

Résultat attendu :

- avertissement éventuel ;
- action autorisée ;
- fournée réelle de deux pizzas créée ;
- aucun ajout automatique non confirmé.

---

# 70. Tests d’acceptation — Fournée verrouillée

Une fournée est confirmée.

Une nouvelle commande arrive.

Résultat attendu :

- fournée verrouillée inchangée ;
- nouvelle commande intégrée uniquement aux projections futures.

---

# 71. Tests d’acceptation — OF Pain

Commande :

```text
3 Pani’NO pour 20 h 00
```

À 19 h 29 :

- OF non nécessairement visible selon l’arrondi.

À 19 h 30 :

```text
Préparer 3 pains
```

doit apparaître en tête de liste.

Après validation :

- OF terminé ;
- poste Pani’NO débloqué.

---

# 72. Tests d’acceptation — Réorganisation

Déplacer une pizza du disque 1 au disque 3.

Résultat attendu :

- positions mises à jour ;
- aucune modification de commande ;
- synchronisation immédiate.

---

# 73. Tests d’acceptation — Conflit temps réel

Deux appareils sélectionnent la même pizza.

Résultat attendu :

- une seule sélection confirmée ;
- second appareil actualisé ;
- aucun doublon de Production Unit ;
- message clair.

---

# 74. Tests d’acceptation — Réinitialisation des pâtons

Avant :

```text
Stock initial : 100
Restant : 43
Pertes : 5
```

Action :

```text
Réinitialiser stock pâtons
```

Après confirmation :

- stock initial réinitialisé selon la valeur demandée ;
- stock restant cohérent avec le nouveau stock initial ;
- pertes remises à zéro ;
- événement enregistré.

---

# 75. Contraintes d’implémentation

- Ne pas réécrire toute l’application en une fois.
- Construire le plan de travail derrière une route ou un feature flag.
- Conserver temporairement l’ancienne interface.
- Réutiliser les fonctions métier existantes lorsqu’elles sont fiables.
- Ne pas développer le moteur directement dans les composants.
- Ajouter les états individuels avant de dépendre totalement des disques.
- Tester le tactile sur tablette réelle.
- Tester les commandes de 1, 4, 15 et 30 pizzas.
- Conserver la compatibilité avec le proxy L’Addition.
- Documenter tout écart avec la spécification.

---

# 76. Livrable attendu

Toute refonte importante du poste Pizzaiolo doit fournir :

- les composants ajoutés ;
- le modèle des quatre positions ;
- les appels au moteur de décision ;
- les flux de sélection ;
- les flux d’envoi au Four ;
- la gestion des conflits ;
- la gestion de l’OF Pain ;
- les tests ;
- les résultats de lint et build ;
- les captures tablette ;
- la procédure de retour arrière ;
- les points à valider en service réel.

---

# Principe fondamental

> Le poste Pizzaiolo représente un plan de travail physique, pas une pile de commandes.

Les quatre disques doivent permettre au pizzaiolo de savoir immédiatement quelles pizzas sont réellement devant lui, tout en conservant la liberté de chevaucher les commandes, d’anticiper la production et de modifier les suggestions du moteur.