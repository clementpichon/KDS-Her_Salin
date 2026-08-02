# 07_POSTE_FOUR.md

# Poste Four

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

---

# 1. Objectif

Le poste Four représente la cuisson réelle des pizzas et la fin de leur production.

Il doit permettre à l’opérateur de :

- visualiser immédiatement les pizzas envoyées par le Pizzaiolo ;
- connaître la composition réelle de chaque fournée ;
- suivre les commandes dans leur intégralité ;
- distinguer les pizzas non encore envoyées, en cuisson, sorties et prêtes ;
- exécuter les opérations de post-cuisson ;
- valider une commande uniquement lorsque tous ses produits sont prêts ;
- anticiper les prochaines arrivées du poste Pizzaiolo ;
- limiter au maximum les vérifications mentales.

Le poste Four ne doit pas recalculer :

- la composition d’une fournée ;
- la charge résiduelle ;
- les priorités ;
- les bases réelles ;
- les états globaux des commandes.

Il affiche et exécute les décisions issues des moteurs et des actions réelles du Pizzaiolo.

---

# 2. Philosophie du poste

Le poste Four travaille sur deux niveaux simultanés.

## Niveau physique

L’opérateur doit savoir :

- quelles pizzas sont réellement au four ;
- où elles se trouvent ;
- quand elles doivent sortir ;
- quelles opérations effectuer ensuite.

## Niveau commande

L’opérateur doit également savoir :

- à quelles commandes appartiennent les pizzas ;
- quelles pizzas de ces commandes ne sont pas encore arrivées ;
- quelles commandes sont encore incomplètes ;
- quand une commande peut être déclarée prête.

Le poste ne doit donc être ni une simple vue de fournée, ni une simple pile de commandes.

Il doit relier les deux.

---

# 3. Organisation générale de l’écran

L’écran peut être organisé en trois zones fonctionnelles.

## Zone principale

Fournées et pizzas actuellement prises en charge par le Four.

## Zone commandes

Commandes concernées par les pizzas reçues, avec leur progression complète.

## Zone de prévisualisation

Trois prochaines commandes ou groupes de pizzas que le Pizzaiolo prévoit d’envoyer.

L’interface doit rester compacte et adaptée à une consultation immédiate pendant le rush.

---

# 4. Suppression du bloc « Four — En cuisson »

Le grand bloc ou titre :

```text
Four — En cuisson (...)
```

doit être supprimé lorsqu’il n’apporte aucune information supplémentaire.

Le poste actif est déjà identifiable par :

- la navigation ;
- le contexte de l’écran ;
- le contenu affiché.

Cette suppression permet de récupérer de la hauteur utile.

---

# 5. Représentation de la capacité du four

Le four possède quatre places.

La capacité doit être représentée de manière compacte.

Exemple :

```text
● ● ● ○
```

ou :

```text
3/4
```

La représentation doit permettre de comprendre immédiatement :

- combien de places sont occupées ;
- combien sont libres ;
- quelles pizzas sont présentes.

Il n’est pas nécessaire d’afficher une grande carte par emplacement si une représentation plus compacte reste lisible.

---

# 6. Pizzas symbolisées par des idéogrammes

Dans la zone de cuisson, les pizzas doivent être représentées principalement par des idéogrammes ou tuiles très compactes.

Chaque idéogramme doit permettre d’identifier au minimum :

- la pizza ;
- la commande ;
- sa position ;
- son état ;
- une éventuelle alerte de post-cuisson.

Exemple conceptuel :

```text
[R] [R] [F] [CM]
```

avec une légende ou un libellé court accessible.

Les abréviations doivent rester non ambiguës.

---

# 7. Ne pas dépendre uniquement des abréviations

Une lettre seule peut devenir ambiguë.

Exemple :

```text
R
```

peut signifier Regina ou autre chose.

Chaque idéogramme doit donc disposer au minimum :

- d’un nom court ;
- d’une infobulle sur ordinateur ;
- d’un détail accessible au toucher ;
- d’un attribut d’accessibilité.

Sur tablette, un appui peut ouvrir un détail compact.

---

# 8. Composition réelle d’une fournée

Le poste Four reçoit uniquement les fournées réellement validées ou envoyées par le Pizzaiolo.

Une fournée projetée ne doit pas être présentée comme déjà engagée.

Le poste doit distinguer :

```text
Prévisualisation
```

de :

```text
Fournée reçue
```

et de :

```text
Fournée en cuisson
```

---

# 9. Fournée reçue

Lorsqu’une fournée est envoyée par le Pizzaiolo, elle doit apparaître immédiatement.

Elle contient :

- l’identifiant de la fournée ;
- les pizzas ;
- les commandes d’origine ;
- l’heure d’envoi ;
- la capacité utilisée ;
- son état.

Exemple :

```text
Fournée 42 · 4/4

Paul
- Regina
- Regina

Marie
- Fromages

Luc
- Chèvre miel
```

---

# 10. Fournée incomplète

Une fournée peut contenir moins de quatre pizzas.

Exemple :

```text
2/4
```

Le poste Four doit l’accepter si elle a été validée par le Pizzaiolo.

Il ne doit pas ajouter automatiquement des pizzas.

Une éventuelle alerte :

```text
Fournée incomplète
```

doit rester discrète.

---

# 11. Enfournement

L’action :

```text
Enfourner
```

doit :

- enregistrer l’heure réelle de début ;
- faire passer la fournée à `baking` ;
- faire passer les pizzas à `baking` ;
- démarrer le suivi de cuisson ;
- synchroniser tous les postes.

Une double validation ne doit pas lancer deux fois la même fournée.

---

# 12. Minuteur de cuisson

Le temps théorique de cuisson est d’environ :

```text
90 secondes
```

Cette valeur doit être configurable.

Le minuteur doit afficher :

- le temps écoulé ;
- le temps théorique restant ;
- une alerte de dépassement.

Le minuteur constitue une aide.

Il ne remplace pas l’observation de l’opérateur.

---

# 13. Cuisson manuelle

L’opérateur doit pouvoir sortir une pizza ou une fournée :

- avant le temps théorique ;
- après le temps théorique.

Le KDS enregistre le temps réel.

Il ne doit pas bloquer l’action en fonction du minuteur.

---

# 14. Sortie du four

L’action :

```text
Sortir du four
```

doit pouvoir s’appliquer :

- à toute la fournée ;
- éventuellement à une pizza individuelle si la réalité l’exige.

Après sortie :

- la pizza passe à `post_bake` si une opération reste à effectuer ;
- elle passe à `ready` si aucune post-cuisson n’est nécessaire.

La fournée peut rester partiellement active si toutes les pizzas ne sont pas sorties simultanément.

---

# 15. Post-cuisson

Le poste Four prend en charge les garnitures ou opérations réalisées après cuisson.

Exemples connus :

- parmesan ;
- miel ;
- jambon de Parme ;
- stracciatella ;
- anchois ;
- origan ;
- saumon ;
- roquette ;
- tomate.

Chaque pizza nécessitant une post-cuisson doit générer une Work Unit dédiée.

---

# 16. Affichage de la post-cuisson

Lorsqu’une pizza sort du four, afficher immédiatement les actions restantes.

Exemple :

```text
TRUFFE PARME

+ Jambon de Parme
+ 4 c. à soupe de stracciatella
```

ou :

```text
VÉGÉTARIENNE

+ Roquette
+ Tomate
```

La consigne doit être lisible sans ouvrir plusieurs écrans.

---

# 17. Suppléments pertinents pour le Four

Le poste Four ne doit afficher que les modifications qui concernent réellement son travail.

Exemples :

```text
Chèvre miel
+ Parme
```

```text
Fromages
+ Saumon
```

Un supplément relevant uniquement du Pizzaiolo ne doit pas alourdir inutilement le poste Four.

La responsabilité de chaque ingrédient doit être définie dans `09_REGLES_METIER.md`.

---

# 18. Retraits pertinents pour le Four

Un retrait doit être affiché au Four uniquement s’il concerne une opération effectuée à ce poste.

Exemple :

```text
Truffe Parme
- Parme
```

Le poste doit alors éviter l’ajout correspondant.

Les retraits déjà appliqués avant cuisson et sans conséquence au Four ne doivent pas être répétés inutilement.

---

# 19. Durées de post-cuisson

Les temps initiaux connus sont notamment :

```text
Napolitaine : environ 1 min
Saumon : environ 1 min
Spéciale : environ 1 min
Truffe Parme : environ 1 min
Végétarienne : environ 1 min 30
Carbonara : environ 20 s
Fromages : environ 20 s
Chèvre miel : environ 20 s
```

Ces valeurs doivent être configurables et pourront être remplacées par les temps observés.

Le moteur de décision doit utiliser cette charge pour évaluer le poste Four.

---

# 20. Validation de la post-cuisson

Une pizza ne devient `ready` qu’après validation de toutes ses Work Units de post-cuisson obligatoires.

L’action de validation doit :

- terminer la Work Unit ;
- faire passer la pizza à `ready` ;
- recalculer l’état de la commande ;
- libérer la charge résiduelle correspondante ;
- synchroniser la Caisse et le poste Prêtes.

---

# 21. Commandes affichées dans leur intégralité

Lorsqu’au moins une pizza d’une commande arrive au Four, le poste doit afficher toute la commande pizza.

Exemple :

Commande Paul :

```text
4 pizzas
```

Le Pizzaiolo n’envoie d’abord qu’une pizza.

Le poste Four doit afficher :

```text
Regina      → au Four
Piccante    → grisée
Fromages    → grisée
Chèvre miel → grisée
```

Les pizzas non encore reçues restent visibles mais grisées.

---

# 22. Signification des pizzas grisées

Une pizza grisée signifie :

```text
Cette pizza appartient à la commande,
mais n’a pas encore été envoyée au Four.
```

Elle ne signifie pas :

- annulée ;
- prête ;
- indisponible ;
- oubliée.

Un libellé accessible doit préciser cet état.

---

# 23. Progression d’une commande au Four

Chaque commande doit afficher une progression compacte.

Exemple :

```text
Paul · 4 pizzas

1 au four
1 prête
2 pas encore reçues
```

L’objectif est de permettre à l’opérateur de comprendre immédiatement pourquoi la commande reste incomplète.

---

# 24. Validation d’une commande

Une commande ne peut être déclarée prête que lorsque :

- toutes ses pizzas sont `ready` ;
- tous ses autres produits sont prêts si le poste utilise l’état global ;
- aucune Work Unit obligatoire ne reste active.

Le poste Four ne doit pas valider une commande après la première pizza prête.

---

# 25. Commandes mixtes

Une commande peut contenir :

- pizzas ;
- Pani’NO ;
- Fish&NO ;
- frites.

Le poste Four peut afficher l’état global de la commande, mais ne valide que ses propres Work Units.

Exemple :

```text
Pizzas : prêtes
Pani’NO : en cours
Fish&NO : prêt
```

La commande globale reste non prête tant que tous les postes n’ont pas terminé.

---

# 26. Commandes partiellement prêtes

Une commande contenant plusieurs fournées doit rester visible jusqu’à la fin.

Exemple :

```text
Commande de 6 pizzas

4 prêtes
2 pas encore reçues
```

Elle ne doit pas disparaître après la première fournée.

---

# 27. Prévisualisation des trois prochaines commandes

Le poste Four doit disposer d’un onglet ou volet dépliant permettant de prévisualiser les trois prochaines commandes que le Pizzaiolo prévoit de préparer.

Cette prévisualisation doit aider l’opérateur à anticiper :

- les quantités ;
- les types de pizzas ;
- les post-cuissons ;
- les commandes importantes ;
- les changements de rythme.

---

# 28. Source de la prévisualisation

La prévisualisation provient :

- des sélections du Pizzaiolo ;
- des fournées projetées ;
- des priorités validées ;
- des Work Units planifiées.

Elle ne doit pas être recalculée localement par le poste Four.

---

# 29. Contenu de la prévisualisation

Pour chaque commande ou groupe à venir, afficher au minimum :

- nom du client ;
- heure de remise ;
- nombre de pizzas ;
- pizzas concernées ;
- principales post-cuissons ;
- état de certitude.

Exemple :

```text
1. Marie · 20 h 00 · 4 pizzas
   2 Regina
   1 Végétarienne
   1 Truffe Parme
```

---

# 30. Prévisualisation provisoire

Les éléments projetés doivent être visuellement distincts des pizzas réellement reçues.

Exemples de libellés :

```text
Prévu
```

```text
Sélectionné par le Pizzaiolo
```

```text
Fournée confirmée
```

Le poste Four ne doit pas agir sur une projection comme si elle était déjà au four.

---

# 31. Volet repliable

La prévisualisation doit être repliable.

Lorsqu’elle est fermée, elle ne doit occuper qu’une petite zone.

Exemple :

```text
Prochaines commandes (3) ▼
```

L’état ouvert ou fermé peut être conservé localement sur l’appareil.

---

# 32. Interface compacte

Le poste Four doit afficher un maximum d’informations utiles sans surcharge.

Supprimer ou réduire :

- grands titres ;
- doubles cartes ;
- marges excessives ;
- libellés répétés ;
- informations non actionnables ;
- décorations sans valeur métier.

Les commandes doivent être disposées côte à côte lorsque la largeur le permet, même si leurs créneaux diffèrent.

---

# 33. Cartes côte à côte

Les commandes ne doivent pas être obligatoirement empilées verticalement.

Sur tablette paysage ou écran large, utiliser une grille compacte.

Objectif :

- voir plusieurs commandes simultanément ;
- réduire le défilement ;
- comparer rapidement leur progression.

---

# 34. Quantité de pâtons

Le poste Four ne doit pas afficher le stock complet de pâtons si cette information n’est pas nécessaire à son activité.

La quantité peut être supprimée de son interface.

Si une trace minimale est utile, conserver uniquement une indication discrète lors d’un événement, par exemple :

```text
-1 pâton
```

Cette indication ne doit pas occuper une grande zone permanente.

---

# 35. Ligne téléphone et charge Caisse

Les fonctions métier :

- Ligne téléphone libre ;
- Charge Caisse,

peuvent rester actives dans le système.

Elles ne doivent pas être affichées sur le poste Four si elles alourdissent l’interface.

La suppression visuelle ne doit pas supprimer la logique ou les données.

---

# 36. Banderole « À REMETTRE MAINTENANT »

La banderole :

```text
À REMETTRE MAINTENANT
```

doit être retirée.

L’urgence doit être exprimée par des éléments plus compacts :

- ordre des commandes ;
- minuteur ;
- indicateur de retard ;
- mise en évidence ciblée.

Une grande banderole permanente réduit la lisibilité globale.

---

# 37. Priorités visuelles

L’œil doit trouver en premier :

1. les pizzas réellement au four ;
2. le temps de cuisson ;
3. les post-cuissons à effectuer ;
4. les commandes incomplètes ;
5. les prochaines arrivées.

Les informations secondaires doivent être repliées ou réduites.

---

# 38. Recommandations du moteur

Le moteur de décision peut classer :

- les fournées prêtes à enfourner ;
- les sorties urgentes ;
- les post-cuissons ;
- les commandes nécessitant une attention.

Le poste affiche ces recommandations sans les confondre avec les actions réelles.

Exemple :

```text
Priorité suggérée
```

---

# 39. Choix humain

L’opérateur doit pouvoir :

- enfourner une autre fournée ;
- sortir une pizza manuellement ;
- traiter une autre post-cuisson ;
- ignorer une suggestion ;
- déclarer un problème.

Le KDS enregistre l’action réelle et recalcule ensuite.

---

# 40. Cuisson trop anticipée

Une pizza peut être préparée trente minutes en avance sans devoir être cuite aussi tôt.

Le poste Four doit pouvoir signaler :

```text
Cuisson très anticipée
```

si la fenêtre recommandée n’est pas atteinte.

L’action peut rester autorisée selon les règles métier.

---

# 41. Retard

Une commande ou une fournée en retard doit être identifiable par un indicateur compact.

Exemple :

```text
+ 6 min
```

Ne pas utiliser une animation agressive permanente.

Le retard doit être calculé par les moteurs.

---

# 42. Risque de refroidissement

Une pizza sortie du four mais non terminée doit être surveillée.

Le moteur peut signaler :

- post-cuisson trop longue ;
- pizza prête depuis longtemps ;
- attente d’autres pizzas de la commande.

Cette information peut alimenter une alerte ciblée.

---

# 43. Commande prête en avance

Une commande prête avant son heure de remise :

- quitte la charge de production ;
- reste visible dans le poste Prêtes ;
- peut rester accessible dans le suivi du Four ;
- ne doit plus encombrer la zone principale active.

---

# 44. Passage au poste Prêtes

Lorsque la commande globale devient prête, elle doit apparaître automatiquement dans le poste Prêtes.

Le poste Four ne doit pas avoir à la recréer ou la ressaisir.

Un événement métier unique doit déclencher ce changement.

---

# 45. Correction d’état

L’opérateur doit pouvoir corriger une erreur.

Exemples :

- pizza déclarée prête trop tôt ;
- post-cuisson oubliée ;
- mauvaise pizza sortie ;
- pizza à refaire.

La correction doit :

- être tracée ;
- recalculer la charge ;
- ne pas effacer l’historique ;
- prévenir les autres postes.

---

# 46. Pizza à refaire

Une pizza ratée ou incorrecte peut nécessiter une nouvelle Production Unit ou une reprise de cycle.

Le poste doit disposer d’une action :

```text
À refaire
```

Cette action doit :

- conserver la pizza initiale dans l’historique ;
- créer ou réactiver le travail nécessaire ;
- informer le Pizzaiolo ;
- recalculer le retard ;
- enregistrer éventuellement une perte de pâton.

La stratégie exacte est définie dans les règles métier.

---

# 47. Annulation

Une pizza annulée ne doit plus apparaître comme restant à produire.

Si elle est déjà au four, l’action doit demander confirmation et conserver une trace.

Une commande annulée doit être signalée immédiatement.

---

# 48. En-tête repliable

Le bandeau supérieur doit pouvoir être masqué ou réduit pendant le travail.

Il doit respecter :

- la safe area iOS ;
- les barres système Android ;
- le mode PWA ;
- la navigation tactile.

Le logo peut servir de bouton d’accueil.

---

# 49. Safe areas

Le header ne doit pas entrer en conflit avec :

- l’heure système ;
- le Wi-Fi ;
- la batterie ;
- les encoches ;
- la barre système.

Exemple CSS :

```css
.app-header {
  padding-top: env(safe-area-inset-top, 0px);
}
```

Une barre d’action basse doit également utiliser :

```css
padding-bottom: env(safe-area-inset-bottom, 0px);
```

---

# 50. PWA et plein écran

Le poste doit fonctionner comme PWA sur Android et iOS.

Attendus :

- mode `standalone` ;
- orientation paysage privilégiée ;
- absence de barre d’adresse ;
- session conservée ;
- interface utilisable malgré la barre système ;
- aucun cache de données temps réel périmées.

---

# 51. Défilement

Éviter le défilement de toute la page.

Préférer :

- zones internes scrollables ;
- hauteur d’application fixe ;
- header stable ou repliable ;
- contenu principal adaptatif.

Cela limite les sorties involontaires du plein écran sur tablette.

---

# 52. Actions tactiles

Les actions essentielles doivent avoir de grandes zones tactiles.

Exemples :

- Enfourner ;
- Sortir ;
- Post-cuisson terminée ;
- Pizza prête ;
- À refaire.

Éviter les petites icônes isolées sans libellé accessible.

---

# 53. Couleurs et accessibilité

Les états peuvent utiliser des couleurs, mais doivent aussi être accompagnés :

- d’un texte ;
- d’une icône ;
- d’une forme ;
- d’un motif.

Exemples :

```text
Grisée · Pas encore reçue
```

```text
Au four · Minuteur actif
```

```text
Prête · Validation terminée
```

---

# 54. Synchronisation temps réel

Le poste doit recevoir immédiatement :

- les fournées envoyées ;
- les changements de composition avant verrouillage ;
- les annulations ;
- les priorités ;
- les nouvelles commandes ;
- les états des autres produits de la commande.

Ses propres actions doivent être propagées immédiatement.

---

# 55. Conflits temps réel

Deux appareils ne doivent pas pouvoir :

- enfourner deux fois la même fournée ;
- valider deux fois la même post-cuisson ;
- sortir deux fois la même pizza ;
- créer deux reprises identiques.

Utiliser :

- vérification de version ;
- opérations idempotentes ;
- identifiants uniques ;
- verrouillage transactionnel si nécessaire.

---

# 56. Mode hors connexion

En cas de perte de connexion :

- afficher clairement l’état hors ligne ;
- ne pas prétendre que les validations sont synchronisées ;
- éviter les actions créant des doublons ;
- conserver les actions locales uniquement si leur resynchronisation est sûre.

Les règles précises sont définies dans `10_SYNCHRONISATION.md`.

---

# 57. Mode test

En mode test, permettre l’affichage facultatif :

- identifiants de fournée ;
- Work Units ;
- temps théoriques ;
- temps réels ;
- raisons de priorité ;
- score ;
- état de verrouillage ;
- charge résiduelle.

Ces informations doivent être masquées en production.

---

# 58. Ce que le poste Four ne doit jamais faire

Le poste Four ne doit jamais :

- recalculer les bases réelles ;
- recomposer automatiquement une fournée verrouillée ;
- déclarer une commande prête après une seule pizza ;
- masquer les pizzas non encore reçues d’une commande commencée ;
- compter une pizza prête comme charge active ;
- afficher une projection comme une fournée réelle ;
- imposer un ordre de traitement sans possibilité humaine ;
- dupliquer les actions après un double clic ;
- supprimer silencieusement une pizza ratée ;
- afficher inutilement la charge Caisse ou le stock complet de pâtons.

---

# 59. Tests d’acceptation — Commande partielle

Commande :

```text
4 pizzas
```

Le Pizzaiolo envoie une seule pizza.

Résultat attendu :

- commande complète visible ;
- une pizza active ;
- trois pizzas grisées ;
- commande non validable comme prête.

---

# 60. Tests d’acceptation — Plusieurs fournées

Commande :

```text
6 pizzas
```

Première fournée :

```text
4 pizzas
```

Résultat attendu :

- quatre pizzas suivies au Four ;
- deux pizzas encore grisées ;
- commande maintenue jusqu’à la seconde fournée.

---

# 61. Tests d’acceptation — Fournée multi-commandes

Fournée :

```text
2 pizzas Paul
1 pizza Marie
1 pizza Luc
```

Résultat attendu :

- quatre pizzas visibles ;
- trois commandes associées ;
- progression indépendante de chaque commande.

---

# 62. Tests d’acceptation — Post-cuisson

Pizza :

```text
Végétarienne
```

Après sortie :

- état `post_bake` ;
- consignes roquette et tomate visibles ;
- pizza non prête avant validation ;
- durée suivie.

---

# 63. Tests d’acceptation — Sans post-cuisson

Pizza :

```text
Regina
```

Après sortie :

- passage direct à `ready` si aucune autre action n’est requise ;
- commande recalculée immédiatement.

---

# 64. Tests d’acceptation — Supplément Four

Pizza :

```text
Fromages
+ Saumon
```

Résultat attendu :

- supplément visible au Four ;
- Work Unit de post-cuisson générée ;
- pizza non prête avant ajout et validation.

---

# 65. Tests d’acceptation — Prévisualisation

Le Pizzaiolo prévoit trois prochaines commandes.

Résultat attendu :

- volet affichant les trois commandes ;
- statut prévisionnel clair ;
- aucune possibilité de les déclarer en cuisson avant réception réelle.

---

# 66. Tests d’acceptation — Fournée incomplète

Fournée réelle :

```text
2/4
```

Résultat attendu :

- acceptée ;
- alerte discrète éventuelle ;
- cuisson autorisée ;
- aucun ajout automatique.

---

# 67. Tests d’acceptation — Double clic

Appuyer deux fois sur :

```text
Enfourner
```

Résultat attendu :

- un seul événement de début ;
- un seul minuteur ;
- aucune duplication.

---

# 68. Tests d’acceptation — Commande prête en avance

Commande de quatre pizzas pour 19 h 30 terminée à 19 h 05.

Résultat attendu :

- charge de production résiduelle nulle ;
- commande visible dans Prêtes ;
- capacité libérée à la Caisse ;
- commande absente de la zone active principale du Four.

---

# 69. Tests d’acceptation — Pizza à refaire

Pizza déclarée ratée.

Résultat attendu :

- pizza initiale conservée dans l’historique ;
- nouvelle charge créée ;
- Pizzaiolo informé ;
- commande à nouveau incomplète ;
- retard recalculé.

---

# 70. Tests d’acceptation — Conflit

Deux appareils valident la même post-cuisson.

Résultat attendu :

- une seule validation acceptée ;
- second appareil actualisé ;
- aucun événement dupliqué.

---

# 71. Contraintes d’implémentation

- Réutiliser les états et événements existants lorsqu’ils sont fiables.
- Ne pas refaire simultanément le moteur et toute l’interface.
- Développer derrière une route ou un feature flag si nécessaire.
- Conserver temporairement l’ancien poste Four.
- Ajouter le suivi individuel avant de dépendre totalement de la nouvelle vue.
- Tester sur tablette réelle.
- Tester les fournées de 1, 2, 3 et 4 pizzas.
- Tester les commandes multi-fournées.
- Tester les commandes mixtes.
- Tester les post-cuissons longues.
- Documenter les écarts avec le code existant.

---

# 72. Livrable attendu

Toute refonte importante du poste Four doit fournir :

- les composants modifiés ;
- le modèle de fournée utilisé ;
- les états de cuisson ;
- les Work Units de post-cuisson ;
- la progression complète des commandes ;
- la prévisualisation des trois prochaines commandes ;
- les protections contre les doublons ;
- les tests ajoutés ;
- les résultats de lint et build ;
- les captures sur tablette ;
- la procédure de retour arrière ;
- les points à valider en service réel.

---

# Principe fondamental

> Le poste Four représente à la fois la réalité physique de la cuisson et la progression complète des commandes.

Il doit permettre à l’opérateur de savoir immédiatement ce qui est au four, ce qui reste à faire après cuisson, quelles pizzas manquent encore et quand une commande peut réellement être déclarée prête.