# 13_ETAT_DU_PROJET.md

# État actuel du projet KDS

> Version : 1.0  
> Statut : Document vivant à compléter après audit du dépôt  
> Dernière mise à jour : 2026-08-06 - Panneau debug Pizzaiolo Shadow Comparison
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
> - `11_TESTS_ACCEPTATION.md`
> - `12_ROADMAP.md`
> - `14_ARCHITECTURE_WORK_UNITS.md`
> - `15_ARCHITECTURE_SCHEDULER.md`
> - `16_ARCHITECTURE_PRODUCTION_PLAN.md`
> - `17_ARCHITECTURE_RECIPES.md`
> - `18_ARCHITECTURE_RESOURCES.md`
> - `19_ARCHITECTURE_EVENTS.md`
> - `20_ARCHITECTURE_LEARNING.md`

---

# 1. Objectif

Ce document décrit l’état réel du code à un instant donné.

Il ne constitue pas une spécification théorique.

Il sert à comparer :

```text
Ce qui est demandé dans /docs
```

avec :

```text
Ce qui existe réellement dans le dépôt
```

Il doit permettre de répondre rapidement aux questions suivantes :

- quelles fonctionnalités sont déjà opérationnelles ?
- quelles fonctionnalités sont seulement partielles ?
- quelles fonctionnalités sont absentes ?
- quelles règles métier sont déjà implémentées ?
- quelles règles sont dupliquées dans plusieurs composants ?
- quelles migrations Supabase ont été appliquées ?
- quels tests existent réellement ?
- quelles parties sont suffisamment stables pour être conservées ?
- quelles parties doivent être refactorisées progressivement ?
- quelle est la prochaine action technique recommandée ?

Ce document doit être mis à jour après chaque phase importante de la roadmap.

---

# 2. Règle de sincérité

Ne jamais marquer une fonctionnalité comme terminée uniquement parce que :

- une interface existe ;
- un composant porte le bon nom ;
- une fonction retourne une valeur ;
- le projet compile ;
- un comportement semble fonctionner dans un seul cas.

Une fonctionnalité est considérée comme validée uniquement si :

- son comportement correspond aux règles métier ;
- les cas principaux sont testés ;
- les états sont synchronisés ;
- aucune régression connue ne subsiste ;
- son fonctionnement a été vérifié sur l’appareil concerné.

En cas de doute, utiliser :

```text
Partiel
```

ou :

```text
À vérifier
```

---

# 3. Statuts utilisés

Chaque élément doit recevoir un statut parmi les suivants.

## `Absent`

La fonctionnalité n’existe pas.

## `Prototype`

Une première version existe, mais elle ne doit pas être considérée comme stable.

## `Partiel`

Une partie importante fonctionne, mais plusieurs règles ou cas manquent.

## `À vérifier`

Le code semble exister, mais son comportement n’a pas été confirmé.

## `Fonctionnel`

Le comportement principal fonctionne.

## `Testé`

Le comportement est couvert par des tests pertinents.

## `Validé terrain`

Le comportement a été utilisé pendant plusieurs services représentatifs sans incident majeur.

## `À refactoriser`

Le comportement fonctionne, mais son architecture doit évoluer.

## `Obsolète`

Le code existe encore, mais il est destiné à être supprimé après validation de son remplacement.

---

# 4. Informations générales du dépôt

À compléter après audit.

```text
Nom du projet :
Chemin local :
Dépôt Git :
Branche principale :
Branche de travail actuelle :
Dernier commit :
Version Node :
Gestionnaire de paquets :
Framework :
Version React :
Version TanStack :
Version Supabase :
URL de développement :
URL de production :
```

---

# 5. Architecture technique actuelle

## 5.1 Frontend

À documenter :

- framework réellement utilisé ;
- routes principales ;
- organisation des composants ;
- gestion de l’état ;
- gestion des formulaires ;
- PWA ;
- service worker ;
- responsive ;
- gestion tablette.

### État

```text
Statut : À auditer
```

### Fichiers principaux

```text
À compléter après inspection du dépôt.
```

### Écarts connus avec la documentation

```text
À compléter.
```

---

## 5.2 Backend et fonctions serveur

À documenter :

- routes API ;
- fonctions serveur TanStack ;
- endpoints Node ou Express ;
- fonctions Supabase ;
- traitements OCR ;
- imports proxy ;
- authentification.

### État

```text
Statut : À auditer
```

---

## 5.3 Base Supabase

À documenter :

- tables ;
- vues ;
- fonctions ;
- triggers ;
- politiques RLS ;
- abonnements Realtime ;
- migrations appliquées ;
- migrations présentes mais non appliquées.

### État

```text
Statut : À auditer
```

---

## 5.4 Synchronisation

À documenter :

- canaux Realtime ;
- hooks d’abonnement ;
- reconnexion ;
- nettoyage des abonnements ;
- gestion des conflits ;
- gestion hors ligne ;
- clés d’idempotence.

### État

```text
Statut : Partiel ou à confirmer
```

---

# 6. Postes actuellement présents

## 6.1 Poste Caisse

### Présence

```text
Statut : Fonctionnel partiel
```

### Fonctions déjà connues

- création de commandes dans le KDS ;
- sélection de produits ;
- choix d’un créneau ;
- premières projections de charge ;
- affichage des créneaux recommandés et autres créneaux ;
- prise en compte des plages de service dans une première version ;
- moteur présent au moins partiellement dans `cashier-flow.ts`.

### Points à auditer

- parcours exact de saisie ;
- séparation Produits / Créneau / Client ;
- persistance du brouillon ;
- protection contre les doublons ;
- calcul de la charge résiduelle ;
- calcul de la réserve ;
- formule de classement actuelle ;
- prise en compte des produits déjà prêts ;
- prise en compte des commandes mixtes ;
- script de test existant ;
- comportement sur smartphone ;
- comportement sur tablette.

### Anomalies actuellement connues

- certains créneaux sont tous considérés comme chargés ;
- la réserve peut être confondue avec une charge ;
- le cas `1 + 3 = 4` peut être classé trop défavorablement ;
- des informations affichées sur les tuiles sont incohérentes ou excessives ;
- le bouton de validation peut être trop éloigné ;
- certains créneaux vides ont pu être considérés comme chargés.

### Prochaine action recommandée

```text
Auditer puis stabiliser le moteur actuel sans refaire immédiatement toute l’interface.
```

---

## 6.2 Poste Pizzaiolo

### Présence

```text
Statut : Fonctionnel, architecture actuelle à refactoriser
```

### Fonctions déjà connues

- affichage des commandes ;
- actions de début de préparation ;
- envoi vers le Four ;
- synchronisation Supabase ;
- affichage de la base réelle au moins partiellement ;
- prise en charge des commandes en avance selon les évolutions récentes ;
- gestion du stock de pâtons ;
- premières prévisualisations.

### Architecture actuelle probable

Le poste semble encore reposer principalement sur une logique de tickets ou de tuiles de commande.

La nouvelle logique de plan de travail à quatre disques n’est pas encore considérée comme pleinement implémentée.

### Points à auditer

- structure exacte des tuiles ;
- états individuels des pizzas ;
- possibilité de sélection multi-commandes ;
- sélection de commande complète ;
- glisser-déposer ;
- priorité manuelle ;
- suppression ou annulation ;
- fonctionnement des quatre disques ;
- verrouillage des pizzas engagées ;
- gestion de l’OF Pain Pani’NO ;
- compatibilité des commandes de plus de quatre pizzas ;
- affichage des suppléments et retraits ;
- affichage correct des bases remplacées.

### Prochaine action recommandée

```text
Ne pas commencer la refonte complète avant la stabilisation des Production Units et du moteur Caisse.
```

---

## 6.3 Poste Four

### Présence

```text
Statut : Fonctionnel partiel
```

### Fonctions déjà connues

- réception des pizzas depuis le Pizzaiolo ;
- suivi de cuisson ;
- validation de production ;
- affichage de la base réelle ;
- premières prévisualisations ;
- gestion de certaines post-cuissons ;
- synchronisation avec les autres postes.

### Points à auditer

- composition réelle des fournées ;
- verrouillage ;
- minuteur ;
- gestion individuelle des pizzas ;
- affichage de toute la commande ;
- pizzas non encore reçues grisées ;
- commande multi-fournées ;
- validation finale correcte ;
- Work Units de post-cuisson ;
- trois prochaines commandes ;
- état de commande mixte ;
- action « À refaire » ;
- double validation ;
- compacité de l’écran.

### Nettoyages visuels spécifiés

- supprimer le grand bloc `Four — En cuisson` ;
- masquer le stock complet de pâtons ;
- conserver uniquement une éventuelle indication discrète ;
- supprimer la banderole `À REMETTRE MAINTENANT` ;
- masquer Ligne téléphone et Charge Caisse sur ce poste ;
- rendre le header repliable ;
- disposer les commandes côte à côte lorsque possible.

---

## 6.4 Poste Pani’NO

### Présence

```text
Statut : Fonctionnel partiel
```

### Produits concernés

- Pani’NO ;
- Fish&NO ;
- frites.

### Points à auditer

- état actuel des tickets ;
- Work Units ;
- dépendance au pain ;
- OF Pain ;
- gestion de la friteuse ;
- suivi Fish&NO ;
- suivi des frites ;
- commandes mixtes ;
- validation individuelle ;
- état prêt ;
- gestion des ruptures ;
- produits à refaire ;
- synchronisation avec Pizzaiolo.

### Prochaine action recommandée

```text
Reporter la refonte structurelle après l’introduction des Work Units minimales.
```

---

## 6.5 Poste Prêtes

### Présence

```text
Statut : À auditer
```

### Responsabilités attendues

- afficher les commandes entièrement prêtes ;
- conserver les commandes jusqu’à leur remise ;
- distinguer prêt et remis ;
- permettre à la Caisse de suivre la remise ;
- ne pas conserver de charge de production.

### Points à vérifier

- calcul de l’état prêt ;
- commandes mixtes ;
- remise client ;
- commandes préparées très en avance ;
- retrait de la charge du moteur ;
- conservation de l’historique.

---

# 7. Modèle de données actuel

## 7.1 Commandes

À vérifier :

- structure de `orders` ;
- statuts ;
- heure de remise ;
- source ;
- nom ;
- téléphone ;
- état L’Addition ;
- commandes mixtes.

```text
Statut : À auditer
```

---

## 7.2 Articles de commande

À vérifier :

- table `order_items` ;
- quantités agrégées ;
- catégories ;
- modifications ;
- base ;
- suppléments ;
- retraits ;
- états individuels ou agrégés.

```text
Statut : Partiel
```

---

## 7.3 Champ `base`

Une première migration a été créée afin d’ajouter :

```text
order_items.base
```

Travail déjà annoncé :

- choix de la base à la Caisse ;
- lecture par OCR ;
- affichage Pizzaiolo ;
- affichage Four ;
- affichage prévisualisation ;
- affichage Prêtes ;
- repli en cas de migration non appliquée.

Branche annoncée :

```text
refactor-pizza-real-base
```

Commit annoncé :

```text
0eebec4 Track requested pizza bases
```

### À vérifier

- migration réellement appliquée dans Supabase ;
- valeurs normalisées ou simples chaînes ;
- distinction base réelle / base par défaut ;
- cas supplément crème sans remplacement ;
- cas remplacement inféré ;
- compatibilité anciennes commandes ;
- stockage de la méthode de résolution ;
- affichage non dupliqué.

```text
Statut : Fonctionnel partiel
```

---

## 7.4 Production Units

Le modèle cible prévoit une Production Unit par produit physique.

### État probable

```text
Statut : Implémenté et testé en mémoire
```

### État actuel vérifié

- `src/lib/production-units.ts` définit le type métier minimal `ProductionUnit` ;
- `buildProductionUnits()` projette `orders`, `order_items` et `panino_order_items` en unités physiques ;
- les identifiants source sont conservés ;
- les états globaux sont résolus sans modifier la base Supabase ;
- `src/lib/production-units.test.ts` couvre la décomposition et les compatibilités legacy.

---

## 7.5 Work Units

### État probable

```text
Statut : Projection minimale implémentée et testée en mémoire
```

État actuel vérifié :

- `src/lib/work-units.ts` définit le type métier minimal `WorkUnit` ;
- `buildWorkUnits()` projette des `ProductionUnit[]` en tâches élémentaires déterministes ;
- les dépendances entre tâches sont explicites via `dependsOn` ;
- la projection reste en lecture seule et ne modifie aucun poste ;
- `src/lib/work-units.test.ts` couvre les workflows pizza, Pani'NO, Fish & NO, frites, grenailles et les statuts globaux.

### Objectif restant

Valider la projection sur des données réelles avant d’introduire une persistance ou une consommation par les postes.

---

## 7.6 Fournées

### État probable

```text
Statut : Projection partielle existante
```

### À vérifier

- distinction projetée / verrouillée ;
- composition multi-commandes ;
- capacité de quatre ;
- identifiant stable ;
- historique ;
- état de cuisson ;
- modification automatique ;
- prise en charge des fournées incomplètes.

---

# 8. Moteur de planification actuel

Un moteur existe déjà au moins partiellement dans :

```text
src/lib/cashier-flow.ts
```

Fonctions annoncées comme présentes :

- `generateServiceSlots()` ;
- `planProduction()` ;
- distinction remise / production ;
- exclusion des pizzas `ready` de la charge ;
- projection de fournées ;
- réserve ;
- niveaux de charge.

### Statut

```text
Partiel, à consolider
```

### Audit à réaliser

Pour chaque fonction :

```text
Nom :
Fichier :
Entrées :
Sorties :
Règles métier :
Tests :
Composants utilisateurs :
Problèmes connus :
À conserver :
À refactoriser :
```

### Risques identifiés

- réserve utilisée comme critère de surcharge trop fort ;
- libellé calculé directement sans score explicite ;
- règles dispersées entre moteur et interface ;
- pondérations non centralisées ;
- tests non branchés dans `package.json` ;
- notions de créneau et de fournée potentiellement mélangées.

---

# 9. Moteur de décision actuel

### État probable

```text
Statut : Partiel et spécialisé Caisse
```

Le système utilise actuellement des libellés proches de :

```text
calme
actif
charge
tendu
```

### Objectif cible

Introduire progressivement :

```ts
feasibilityScore: number
```

compris entre :

```text
0 et 100
```

Puis dériver les libellés actuels depuis ce score.

### À vérifier

- seuils actuels ;
- critères ;
- importance de la réserve ;
- prise en compte du retard ;
- prise en compte des difficultés ;
- prise en compte du Four ;
- raisons structurées ;
- classement des créneaux ;
- ordre chronologique après classement.

---

# 10. Moteur de décomposition actuel

### État probable

```text
Statut : Absent comme composant central
```

La création d’une commande produit probablement directement :

- des lignes ;
- des états ;
- des tickets par poste.

### Audit attendu

Identifier :

- où les commandes sont réparties par poste ;
- où les post-cuissons sont déterminées ;
- où le besoin de pain Pani’NO est calculé ;
- où la consommation de pâton est déclenchée ;
- où les bases sont normalisées ;
- où les suppléments sont affectés à un poste.

---

# 11. Stock de pâtons

### Présence

```text
Statut : Fonctionnel partiel
```

### Règle attendue

Le bouton :

```text
Réinitialiser stock pâtons
```

doit réinitialiser :

- stock initial ;
- stock restant ;
- pertes.

### Points à auditer

- emplacement du calcul ;
- moment de décrémentation ;
- consommation pizza ;
- consommation Pani’NO ;
- doubles événements ;
- pertes ;
- corrections ;
- audit ;
- concurrence ;
- réinitialisation actuelle.

### Risque principal

Une action rejouée ou synchronisée plusieurs fois ne doit pas consommer plusieurs pâtons.

---

# 12. Synchronisation actuelle

## Supabase Realtime

### Présence

```text
Statut : Fonctionnel, robustesse à auditer
```

### À vérifier

- nombre d’abonnements ;
- nettoyage ;
- conflits ;
- opérations idempotentes ;
- reconnexion ;
- cache local ;
- états optimistes ;
- version des entités.

---

## Événements téléphone

Des tables ou flux ont été évoqués :

```text
phone_events
orders
```

ainsi que des secrets :

```text
PHONE_EVENTS_TOKEN
PHONE_HASH_PEPPER
```

### À vérifier

- usage actuel ;
- sécurité ;
- dépendance au moteur ;
- affichage supprimé ou conservé ;
- compatibilité avec Ligne téléphone libre ;
- charge Caisse.

---

## Proxy L’Addition

### État

```text
Statut : Prévu, pas encore priorité d’implémentation complète
```

### Architecture envisagée

```text
L’Addition
→ impression
→ proxy local
→ KDS
```

### À documenter lors de l’audit

- code existant ;
- tests OCR ;
- format des tickets ;
- environnement local ;
- déduplication ;
- stockage brut ;
- intégration future.

---

# 13. PWA et appareils

### Éléments déjà présents ou envisagés

- installation iOS ;
- installation Android ;
- mode web app ;
- utilisation tablette ;
- plein écran ;
- safe areas ;
- header repliable.

### Statut

```text
Partiel
```

### Problèmes connus

- conflit entre header KDS et barre système iOS ;
- sortie du plein écran lors de certains gestes ;
- interface tablette différente de l’ordinateur ;
- défilement global problématique ;
- informations système qui se chevauchent avec le bandeau.

### Audit attendu

- manifeste ;
- `display: standalone` ;
- service worker ;
- meta viewport ;
- `viewport-fit=cover` ;
- safe areas ;
- orientation ;
- cache ;
- mise à jour PWA.

---

# 14. Tests actuels

### État annoncé

Des tests métier existent au moins partiellement, mais ils ne sont peut-être pas reliés à `package.json`.

### Statut

```text
Partiel
```

### Audit attendu

```text
Framework de test :
Scripts package.json :
Nombre de tests :
Tests unitaires :
Tests d’intégration :
Tests E2E :
Tests ignorés :
Tests cassés :
Couverture :
```

### Script recommandé

```json
{
  "scripts": {
    "test:planning": "..."
  }
}
```

Le nom exact dépend de l’organisation actuelle.

---

# 15. Migrations Supabase

Créer un tableau d’audit.

| Migration | Présente dans le dépôt | Appliquée en développement | Appliquée en production | Réversible | Notes |
|---|---:|---:|---:|---:|---|
| Ajout `order_items.base` | À vérifier | À vérifier | À vérifier | À vérifier | Branche `refactor-pizza-real-base` |
| Production Units | Sans migration | Sans objet | Sans objet | — | Implémentées et testées en mémoire |
| Work Units | Sans migration | Sans objet | Sans objet | — | Projection minimale implémentée et testée en mémoire |
| Version des entités | À vérifier | À vérifier | À vérifier | À vérifier | Synchronisation |
| Clés d’idempotence | À vérifier | À vérifier | À vérifier | À vérifier | Actions critiques |

Ne jamais supposer qu’une migration locale a été appliquée dans Supabase.

---

# 16. Dette technique connue

À compléter après audit.

Exemples possibles :

- logique métier dans les composants React ;
- calcul de charge dupliqué ;
- états de pizza agrégés ;
- absence d’idempotence ;
- abonnements Realtime dispersés ;
- noms de constantes peu explicites ;
- tests non exécutables facilement ;
- interface dépendante d’un format de ticket ;
- absence de modèle individuel ;
- forte dépendance entre poste Pizzaiolo et Four ;
- données historiques incomplètes.

Pour chaque dette, indiquer :

```text
Description :
Risque :
Urgence :
Fichiers concernés :
Phase de correction :
```

---

# 17. Fonctionnalités à ne pas casser

Cette liste doit être complétée après audit.

Fonctions connues comme importantes :

- création de commande ;
- affichage en temps réel ;
- passage après minuit ;
- modes test ou apprentissage ;
- stock de pâtons ;
- affichage des bases ;
- envoi Pizzaiolo vers Four ;
- validation Four ;
- suivi Pani’NO ;
- poste Prêtes ;
- déploiement Vercel ;
- compatibilité Supabase ;
- commandes existantes sans migration complète.

Toute refonte doit préciser comment ces fonctions sont protégées.

---

# 18. Fonctionnalités obsolètes ou à masquer

Fonctions métier à conserver mais à masquer sur certains postes :

- Ligne téléphone libre ;
- Charge Caisse.

Éléments visuels à retirer :

- banderole `À REMETTRE MAINTENANT` ;
- grand titre `Four — En cuisson` ;
- stock complet de pâtons sur le poste Four ;
- informations système répétées ;
- blocs de statistiques non actionnables.

Ne pas confondre :

```text
supprimer de l’interface
```

avec :

```text
supprimer du système
```

---

# 19. Branches et commits connus

## Base réelle des pizzas

```text
Branche :
refactor-pizza-real-base
```

```text
Commit :
0eebec4 Track requested pizza bases
```

### À vérifier

- branche encore présente ;
- commit intégré ou non ;
- conflits ;
- migrations ;
- tests ;
- déploiement.

---

# 20. État par document de spécification

## `00_ARCHITECTURE_GLOBALE.md`

```text
Conformité actuelle : À auditer
```

## `01_VISION_GENERALE.md`

```text
Conformité actuelle : Vision validée, implémentation progressive
```

## `02_MODELE_DE_DONNEES.md`

```text
Conformité actuelle : Faible à partielle
```

## `03_MOTEUR_PLANIFICATION.md`

```text
Conformité actuelle : Partielle
```

## `04_MOTEUR_DECISION.md`

```text
Conformité actuelle : Prototype spécialisé
```

## `05_POSTE_CAISSE.md`

```text
Conformité actuelle : Partielle
```

## `06_POSTE_PIZZAIOLO.md`

```text
Conformité actuelle : Interface ancienne à refactoriser
```

## `07_POSTE_FOUR.md`

```text
Conformité actuelle : Partielle
```

## `08_POSTE_PANINO.md`

```text
Conformité actuelle : Partielle
```

## `09_REGLES_METIER.md`

```text
Conformité actuelle : À vérifier règle par règle
```

## `10_SYNCHRONISATION.md`

```text
Conformité actuelle : Fonctionnelle mais robustesse inconnue
```

## `11_TESTS_ACCEPTATION.md`

```text
Conformité actuelle : Faible à partielle
```

## `12_ROADMAP.md`

```text
Conformité actuelle : Document de pilotage
```

---

# 21. Tableau synthétique des chantiers

| Chantier | État actuel | Risque | Priorité | Dépendances |
|---|---|---|---|---|
| Créneaux sur tout le service | Partiel | Moyen | Immédiate | Moteur Caisse |
| Réserve ≠ charge | Implémenté et testé, validation terrain restante | Moyen | À valider | Score |
| Score de faisabilité | Implémenté et testé | Moyen | À valider | Planification actuelle |
| Charge résiduelle | Cas ready testé, couverture générale encore partielle | Élevé | Haute | États production |
| Bases réelles | Partielle | Élevé | Haute | Migration Supabase |
| Production Units | Implémentées et testées en mémoire | Moyen | À valider | Modèle de données |
| Work Units | Projection minimale implémentée et testée en mémoire | Moyen | À valider | Diagnostic |
| Diagnostic WorkUnit | Implémenté et testé en mémoire | Moyen | À valider terrain | Work Units |
| Scheduler Core | Implémenté, testé technique et validé métier en mémoire | Moyen | À valider terrain sur données réelles | Diagnostic WorkUnit |
| Batch Builder | Implémenté et testé en mémoire | Moyen | À valider terrain sur données réelles | Scheduler Core |
| ProductionPlan | Vue consolidée en mémoire implémentée et testée | Moyen | À valider terrain sur données réelles | Batch Builder |
| Quatre disques | À développer | Moyen | Haute | Production Units |
| Commande complète au Four | Partielle | Élevé | Haute | États individuels |
| OF Pain | À vérifier | Élevé | Haute | Work Units |
| Idempotence | À vérifier | Critique | Haute | Synchronisation |
| Proxy L’Addition | Prévu | Moyen | Après stabilisation | Import |
| Apprentissage | Futur | Faible maintenant | Reporté | Données fiables |

---

# 22. Prochaine tâche recommandée

La prochaine tâche doit rester limitée.

```text
Exécuter la comparaison silencieuse ProductionPlan sur un export Supabase anonymisé réel.
```

## Pourquoi

- `buildProductionPlan()` orchestre la chaîne pure en mémoire :
  `buildProductionUnits()` -> `buildWorkUnits()` -> `diagnoseWorkUnits()` -> `buildSchedulerPlan()` -> `buildBatchPlan()` ;
- le plan consolide les unités physiques, les tâches, le diagnostic, le Scheduler, les Batchs, les compteurs, les vues par poste et les anomalies bloquantes ;
- une couche de comparaison silencieuse existe désormais pour traiter un snapshot exporté sans écriture ;
- elle a été testée sur des fixtures synthétiques et un export JSON anonymisé représentatif ;
- elle n'a pas encore été exécutée sur un export terrain réel anonymisé.

## Objectifs

- construire un `ProductionPlanSnapshot` anonymisé depuis les tables `orders`, `order_items` et `panino_order_items` ;
- exécuter `compareProductionPlanWithLegacy()` localement et explicitement ;
- vérifier les compteurs produits, les statuts, les charges actives par poste et les produits sans workflow ;
- lister les divergences legacy sans modifier l'interface ni les données ;
- décider ensuite si le premier lecteur Pizzaiolo en lecture seule peut être préparé ;
- conserver `ProductionUnit`, `WorkUnit`, leur diagnostic, le Scheduler Core et le Batch Builder comme projections en lecture seule ;
- ne modifier aucune table Supabase ;
- ne modifier aucun poste ;
- ne créer aucun Dispatcher ni ProductionPlan persistant ;
- ne pas exposer le diagnostic dans l'interface de production.

## Hors périmètre

```text
persistance Supabase
```

```text
interface
```

```text
Dispatcher
```

```text
calcul d'heure de démarrage
```

```text
priorité manuelle
```

```text
apprentissage
```

## Critères de validation

```text
fournées pizza Four cohérentes
```

```text
aucune Work Unit dupliquée ou perdue
```

```text
ordre global Scheduler préservé dans batchedWorkUnitIds
```

```text
aucune dépendance violée
```

```text
aucun Batch persistant
```

```text
aucune mutation des données d'entrée
```

```text
batchs unitaires utiles ou à ajuster avant exposition terrain
```

---

# 23. Consigne d’audit pour Codex

```text
Lis intégralement les documents de /docs.

N’implémente rien dans un premier temps.

Inspecte le dépôt et complète 13_ETAT_DU_PROJET.md avec des faits vérifiables.

Pour chaque fonctionnalité, indique :
- les fichiers concernés ;
- le statut réel ;
- les tests existants ;
- les écarts avec la documentation ;
- les risques de modification ;
- les éléments à conserver.

Ne marque jamais une fonctionnalité comme terminée uniquement parce qu’un composant ou une fonction existe.

À la fin, propose une seule prochaine étape technique, suffisamment courte pour être développée et validée dans une branche dédiée.
```

---

# 24. Format de rapport après audit

Codex doit fournir un résumé de cette forme :

```md
## Audit terminé

### Fonctionnalités stables

- ...

### Fonctionnalités partielles

- ...

### Fonctionnalités absentes

- ...

### Contradictions avec /docs

- ...

### Risques principaux

- ...

### Tests disponibles

- ...

### Migrations

- ...

### Prochaine étape recommandée

- ...

### Fichiers probablement concernés

- ...
```

---

# 25. Mise à jour après chaque chantier

Après une implémentation importante, mettre à jour au minimum :

```text
Date
Branche
Commit
Fichiers
Statut avant
Statut après
Tests
Résultat terrain
Anomalies restantes
Prochaine étape
```

Exemple :

```md
## Historique — Stabilisation du score Caisse

Date : 2026-08-XX  
Branche : `fix/cashier-slot-scoring`  
Commit : `...`

Résultat :
- score interne ajouté ;
- réserve retirée de la charge ;
- cas 1 + 3 validé ;
- interface conservée.

Tests :
- 18 tests réussis ;
- lint réussi ;
- build réussi.

Reste :
- validation tablette pendant service calme.
```

---

# 26. Historique des évolutions

Cette section doit être enrichie progressivement.

## Entrée initiale

```text
Documentation d’architecture consolidée.
Audit du dépôt encore à effectuer.
```

## 2026-08-01 - Stabilisation du score Caisse

Date : 2026-08-01
Branche : `refactor/cashier-slot-scoring`  
Commit : 2530df7

Fichiers :

- `src/lib/cashier-flow.ts`
- `src/lib/cashier-flow.test.ts`
- `package.json`
- `docs/13_ETAT_DU_PROJET.md`

Statut avant :

- pas de score numérique de faisabilité ;
- libellés `calme`, `actif`, `charge`, `tendu` calculés directement ;
- réserve pouvant dégrader un créneau à elle seule ;
- test moteur existant mais non lançable via `package.json`.

Statut après :

- `feasibilityScore` interne ajouté et borné entre `0` et `100` ;
- libellés actuels dérivés du score final ;
- réserve traitée comme léger bonus/malus, jamais comme charge de production ;
- réserve seule incapable de produire `charge` ou `tendu` ;
- retard réel et timing impossible prioritaires ;
- capacité réellement dépassée dégrade le score ;
- commandes/pizzas prêtes exclues de la charge restante ;
- interface Caisse conservée sans refonte ;
- aucune migration Supabase ajoutée.

Tests :

- `npm test` : réussi ;
- `npx eslint src/lib/cashier-flow.ts src/lib/cashier-flow.test.ts` : réussi ;
- `npm run lint` : lancé deux fois, interrompu après blocage prolongé sans sortie exploitable ;
- `npm run build` : réussi avec avertissements existants de build/deprecated API.

Résultat terrain :

- À valider sur la Caisse en conditions réelles.

Anomalies restantes :

- Le lint global `eslint .` ne rend pas la main dans un délai raisonnable sur ce dépôt.
- Le moteur Caisse reste compatible avec l'interface actuelle, mais le score n'est pas affiché.
- Le moteur historique `src/lib/scheduling.ts` existe encore.

Prochaine étape :

- Valider les recommandations Caisse sur quelques commandes réalistes, puis extraire progressivement les règles restantes du composant Caisse.

---

## 2026-08-01 - Simplification UX des tuiles de créneau Caisse

Date : 2026-08-01
Branche : `refactor/cashier-slot-scoring`

Fichiers :

- `src/routes/_kds/caisse.tsx`
- `docs/13_ETAT_DU_PROJET.md`

Statut avant :

- les tuiles de créneau exposaient des données techniques du moteur ;
- la synthèse affichait `X prévues · Y restent` alors que le détail affichait les fournées projetées ;
- la ligne `+X commande · réserve +Y pizzas` était ambiguë pour la caisse ;
- les formules `0 + 1 = 1` étaient visibles dans les pastilles Pani'NO, Fish et frites.

Statut après :

- l'affichage principal de chaque tuile est orienté décision : heure, décision, raison courte et impact du panier ;
- les libellés visibles côté Caisse deviennent `À proposer`, `Bon créneau`, `Possible`, `À éviter` ;
- une seule raison courte est affichée sur la tuile ;
- les données techniques `planned`, `remaining`, réserve chiffrée et ratios ne sont plus affichés sur la tuile principale ;
- le détail est renommé `Pourquoi ce conseil ?` et conserve les explications utiles ;
- les commandes du détail sont filtrées sur les commandes réellement liées au créneau ;
- le moteur `src/lib/cashier-flow.ts`, le `feasibilityScore`, les seuils et les règles de recommandation n'ont pas été modifiés.

Tests :

- `npm test` : réussi ;
- `npx eslint src/routes/_kds/caisse.tsx` : réussi ;
- `npm run build` : réussi avec avertissements existants de build/deprecated API.

Risques restants :

- aucune couverture automatisée d'interface n'existe encore pour figer la présentation des tuiles ;
- à ce stade, les helpers de présentation restent majoritairement dans `caisse.tsx`.

---

## 2026-08-01 - Correction des raisons de fournée Caisse

Date : 2026-08-01
Branche : `refactor/cashier-slot-scoring`

Fichiers :

- `src/routes/_kds/caisse.tsx`
- `src/routes/_kds/-caisse-slot-presentation.ts`
- `src/lib/cashier-flow.test.ts`
- `docs/13_ETAT_DU_PROJET.md`

Statut avant :

- la raison courte des tuiles Caisse reconnaissait seulement les fournées complétées avec des pizzas existantes ;
- `0 déjà + 4 ajoutées = 4/4` pouvait afficher `Encore de la marge` au lieu d'une fournée complète ;
- une tuile avec une fournée pleine et une fournée partielle pouvait afficher une raison trop optimiste.

Statut après :

- la raison courte est calculée par un helper de présentation ignoré par TanStack Router via le préfixe `-` ;
- seules les fournées contenant des pizzas du panier sont classées pour la raison affichée ;
- les cas `0+4`, `1+3`, `3+1`, `4+1`, `1+3 puis 1 résiduelle` et `7+1` sont distingués ;
- `Fournée complète + fournée ouverte` est prioritaire lorsqu'une partie du panier complète une fournée mais qu'une autre ouvre une fournée partielle ;
- le moteur `src/lib/cashier-flow.ts`, le `feasibilityScore`, les seuils et les règles de classement n'ont pas été modifiés.

Tests :

- `npm test` : réussi ;
- `npx eslint src/routes/_kds/caisse.tsx src/routes/_kds/-caisse-slot-presentation.ts src/lib/cashier-flow.test.ts` : réussi ;
- `npm run build` : réussi avec avertissements existants de build/deprecated API.

Risques restants :

- la présentation des tuiles n'est pas encore couverte par un test React/E2E ;
- le détail `Marge cuisine` utilise encore une formulation séparée de la raison courte.

---

## 2026-08-02 - Audit architecture ProductionUnit / WorkUnit

Date : 2026-08-02
Branche : `refactor/production-work-units`

Fichier modifié :

- `docs/13_ETAT_DU_PROJET.md`

Documents relus avant modification :

- `docs/00_ARCHITECTURE_GLOBALE.md`
- `docs/01_VISION_GENERALE.md`
- `docs/02_MODELE_DE_DONNEES.md`
- `docs/03_MOTEUR_PLANIFICATION.md`
- `docs/04_MOTEUR_DECISION.md`
- `docs/05_POSTE_CAISSE.md`
- `docs/06_POSTE_PIZZAIOLO.md`
- `docs/07_POSTE_FOUR.md`
- `docs/08_POSTE_PANINO.md`
- `docs/09_REGLES_METIER.md`
- `docs/10_SYNCHRONISATION.md`
- `docs/11_TESTS_ACCEPTATION.md`
- `docs/12_ROADMAP.md`
- `docs/13_ETAT_DU_PROJET.md`
- `docs/14_ARCHITECTURE_WORK_UNITS.md`
- `docs/15_ARCHITECTURE_SCHEDULER.md`
- `docs/16_ARCHITECTURE_PRODUCTION_PLAN.md`
- `docs/17_ARCHITECTURE_RECIPES.md`
- `docs/18_ARCHITECTURE_RESOURCES.md`
- `docs/19_ARCHITECTURE_EVENTS.md`
- `docs/20_ARCHITECTURE_LEARNING.md`

Constat principal :

- le code actuel reste centré sur `orders`, `order_items` et `panino_order_items` ;
- aucune entité `ProductionUnit`, `WorkUnit`, `ProductionPlan`, `Scheduler` ou `Dispatcher` n'est encore implémentée ;
- plusieurs briques existantes peuvent servir d'adaptateurs de compatibilité ;
- les documents 14 à 20 sont présents localement mais non suivis par Git au moment de l'audit ;
- aucune migration Supabase ne doit être ajoutée avant validation d'un modèle en mémoire et d'un double calcul.

Prochaine étape proposée :

- créer un adaptateur pur `orders -> ProductionUnit[]` en mémoire, testé, sans modifier les postes ni Supabase.

---

## 2026-08-02 - Adaptateur ProductionUnit en mémoire

Date : 2026-08-02
Branche : `refactor/production-units-adapter`

Fichiers :

- `src/lib/production-units.ts`
- `src/lib/production-units.test.ts`
- `package.json`
- `docs/13_ETAT_DU_PROJET.md`
- `docs/14_ARCHITECTURE_WORK_UNITS.md`
- `docs/15_ARCHITECTURE_SCHEDULER.md`
- `docs/16_ARCHITECTURE_PRODUCTION_PLAN.md`
- `docs/17_ARCHITECTURE_RECIPES.md`
- `docs/18_ARCHITECTURE_RESOURCES.md`
- `docs/19_ARCHITECTURE_EVENTS.md`
- `docs/20_ARCHITECTURE_LEARNING.md`

Statut avant :

- les documents 14 à 20 étaient présents localement mais non suivis par Git ;
- la section `Prochaine tâche recommandée` restait centrée sur l'ancien chantier Caisse ;
- aucun type métier `ProductionUnit` n'existait dans `src` ;
- aucune décomposition pure `orders`, `order_items`, `panino_order_items` vers unités physiques n'était disponible.

Statut après :

- `docs/20_ARCHITECTURE_LEARNING.md` est considéré comme document officiel ;
- les documents 14 à 20 sont ajoutés au suivi Git ;
- `docs/13_ETAT_DU_PROJET.md` recommande désormais la création d'un adaptateur `orders -> ProductionUnit[]` ;
- un type minimal `ProductionUnit` existe en mémoire, sans migration Supabase ;
- les états globaux utilisés sont `created`, `in_progress`, `ready`, `delivered`, `failed`, `cancelled` ;
- `in_oven` est converti en `in_progress` et conservé uniquement dans le détail pizza ;
- `statusSource` trace l'origine de l'état calculé ;
- `customerName` et `requestedTime` peuvent être `null` pour les anciennes données ;
- les identifiants sont déterministes : `order_items:{id}` et `panino_order_items:{id}` ;
- l'adaptateur ne modifie pas les données d'entrée ;
- aucun poste, aucune table Supabase, aucun Scheduler, Dispatcher ou ProductionPlan n'a été modifié.

Tests :

- `npm test` : réussi ;
- `npx eslint src/lib/production-units.ts src/lib/production-units.test.ts` : réussi ;
- `npm run build` : réussi avec avertissements existants de build/deprecated API.

Risques restants :

- `ProductionUnit` est encore une projection en mémoire, pas une source de vérité ;
- aucun poste ne consomme encore cette projection ;
- les futures `WorkUnit` devront respecter strictement les priorités de statut validées ici.

---

## 2026-08-03 - Diagnostic ProductionUnit en lecture seule

Date : 2026-08-03
Branche : `refactor/production-units-adapter`

Fichiers :

- `src/lib/production-units-diagnostics.ts`
- `src/lib/production-units-diagnostics.test.ts`
- `package.json`
- `docs/13_ETAT_DU_PROJET.md`

Statut avant :

- l'adaptateur `ProductionUnit` produisait une projection en mémoire ;
- aucune fonction ne comparait encore les données source avec les unités générées ;
- l'étape de diagnostic décrite dans la migration progressive restait à faire.

Statut après :

- un module pur `diagnoseProductionUnits()` produit un rapport structuré ;
- le diagnostic ne modifie pas les données d'entrée ;
- aucune table Supabase, aucun poste KDS, aucun statut existant et aucune interface n'a été modifié ;
- les unités attendues sont générées par `buildProductionUnits()` puis comparées aux unités fournies, afin d'éviter toute duplication de la logique de résolution des statuts ;
- le diagnostic compte les sources pizza, sources Pani'NO et unités produites ;
- il regroupe les unités par type, état global et origine d'état ;
- il détecte les commandes manquantes, identifiants d'unités dupliqués, sources dupliquées, produits inconnus, statuts incohérents, sources orphelines et quantités agrégées non supportées ;
- il détecte les incohérences temporelles `ready_at` / `production_status` pour les pizzas et `done_at` / `status` pour les produits Pani'NO ;
- l'hypothèse actuelle est conservée : chaque `order_items` représente une pizza physique unique et chaque `panino_order_items` représente un produit physique unique.

Tests :

- cas explicites ajoutés pour commandes annulées, commandes livrées, fallback `order ready`, compatibilité `prepared`, et anomalies temporelles pizza / Pani'NO ;
- `npm test` : réussi ;
- `npx eslint src/lib/production-units.ts src/lib/production-units.test.ts src/lib/production-units-diagnostics.ts src/lib/production-units-diagnostics.test.ts` : réussi ;
- `npm run build` : réussi avec avertissements existants de build/deprecated API.

Risques restants :

- le diagnostic n'est pas encore branché sur un échantillon réel Supabase ;
- il ne doit pas être exposé en production tant que son usage n'est pas défini ;
- la prochaine étape `WorkUnit` doit rester en mémoire et testée avant toute migration.

---

## 2026-08-03 - Décomposition WorkUnit en mémoire

Date : 2026-08-03
Branche : `refactor/work-units-decomposition`

Fichiers :

- `src/lib/work-units.ts`
- `src/lib/work-units.test.ts`
- `package.json`
- `docs/13_ETAT_DU_PROJET.md`

Statut avant :

- `ProductionUnit` existait comme projection pure en mémoire ;
- aucun type `WorkUnit` n'existait dans `src` ;
- aucune décomposition `ProductionUnit -> WorkUnit[]` n'était disponible ;
- aucun poste KDS ne consommait encore le modèle cible.

Statut après :

- un type minimal `WorkUnit` existe en mémoire ;
- les états `WorkUnit` utilisés sont `blocked`, `available`, `reserved`, `in_progress`, `completed`, `failed`, `cancelled` ;
- `buildWorkUnits()` transforme des `ProductionUnit[]` en tâches élémentaires déterministes ;
- les identifiants sont déterministes : `work_unit:{productionUnit.id}:{workflowNodeId}` ;
- les dépendances sont explicites via `dependsOn` ;
- aucune table Supabase, aucun poste KDS, aucun Scheduler, Dispatcher ou ProductionPlan n'a été modifié ;
- la projection ne modifie pas les données d'entrée.

Mapping réellement implémenté :

- pizza sans post-cuisson : `pizza.preparation` au Pizzaiolo, puis `pizza.cooking` au Four, puis `pizza.packaging` au Four ;
- pizza avec post-cuisson : `pizza.preparation` au Pizzaiolo, puis `pizza.cooking` au Four, puis `pizza.finishing` au Four, puis `pizza.packaging` au Four ;
- Pani'NO : `panino.bread` au Pizzaiolo et `panino.filling` au poste Pani'NO peuvent avancer en parallèle, puis `panino.assembly`, puis `panino.packaging` ;
- Fish & NO : `fish_no.fish_cooking` et `fish_no.side_cooking` peuvent avancer en parallèle, puis `fish_no.assembly`, puis `fish_no.packaging` ;
- frites : `fries.cooking`, puis `fries.packaging` ;
- grenailles : `grenailles.cooking`, puis `grenailles.packaging` ;
- produit inconnu : aucune `WorkUnit` générée à cette étape.

Mapping d'état :

- `ProductionUnit.cancelled` -> toutes les Work Units `cancelled` ;
- `ProductionUnit.failed` -> toutes les Work Units `failed` ;
- `ProductionUnit.ready` ou `delivered` -> toutes les Work Units `completed` ;
- `ProductionUnit.created` -> tâches sans dépendance `available`, tâches dépendantes `blocked` ;
- pizza `in_progress` -> préparation `completed`, cuisson `in_progress`, suite du workflow `blocked` ;
- pizza legacy `prepared` -> préparation `completed`, cuisson `available`, suite du workflow `blocked` ;
- Pani'NO `in_progress` -> pain `available`, garniture/steak `in_progress`, assemblage et packaging `blocked` ;
- Fish & NO `in_progress` -> poisson `available`, accompagnement `available`, assemblage et packaging `blocked` ;
- frites ou grenailles `in_progress` -> cuisson `in_progress`, packaging `blocked`.

Tests :

- pizza créée, en cuisson, prête et compatibilité legacy `prepared` ;
- commande annulée avec pizza et Pani'NO ;
- Pani'NO avec pain et garniture parallèles ;
- Pani'NO en cours ;
- Fish & NO avec poisson et accompagnement parallèles ;
- Fish & NO en cours ;
- frites et grenailles ;
- produit inconnu sans workflow ;
- `ProductionUnit.delivered` -> toutes les Work Units `completed` ;
- `ProductionUnit.failed` -> toutes les Work Units `failed` ;
- identifiants et dépendances déterministes ;
- même entrée -> même sortie ;
- toutes les dépendances pointent vers une Work Unit existante ;
- absence de mutation des `ProductionUnit[]`.

Limitations documentées :

- `ProductionUnit` ne contient pas encore `orders.pains_panino_status`, donc l'état réel du pain Pani'NO reste projeté de manière prudente ;
- `PaninoOrderItem.status` reste trop global pour savoir quelle sous-tâche Pani'NO ou Fish & NO est réellement commencée ;
- les suppléments post-cuisson pizza ne sont pas encore isolés dans une Work Unit dédiée faute de responsabilité ingrédient structurée dans le modèle ;
- les durées estimées restent `null` pour éviter de créer un Scheduler implicite ;
- aucune constitution de batch ou de fournée n'est faite à cette étape.

Tests de validation :

- `npm test` : réussi ;
- `npx eslint src/lib/work-units.ts src/lib/work-units.test.ts` : réussi ;
- `npm run build` : réussi avec avertissements existants de build/deprecated API ;
- `git diff --check` : réussi.

Risques restants :

- la projection WorkUnit doit être comparée aux comportements legacy avant toute utilisation par un poste ;
- le futur diagnostic devra vérifier Pizzaiolo, Four et Pani'NO séparément ;
- il ne faut pas persister les Work Units tant que la projection n'a pas été validée terrain.

---

## 2026-08-03 - Diagnostic WorkUnit en mémoire

Date : 2026-08-03
Branche : `refactor/work-units-decomposition`

Fichiers :

- `src/lib/work-units-diagnostics.ts`
- `src/lib/work-units-diagnostics.test.ts`
- `package.json`
- `docs/13_ETAT_DU_PROJET.md`

Statut avant :

- `ProductionUnit` existait comme projection pure en mémoire ;
- `WorkUnit` existait comme projection pure en mémoire ;
- aucun module ne validait encore la cohérence du graphe `WorkUnit[]` ;
- aucun poste KDS ne consommait encore les Work Units.

Statut après :

- `diagnoseWorkUnits()` produit un rapport structuré en mémoire ;
- le diagnostic ne modifie ni les `ProductionUnit[]`, ni les `WorkUnit[]`, ni Supabase ;
- aucune table Supabase, aucun poste KDS, aucune interface, aucun Scheduler, Dispatcher ou ProductionPlan n'a été modifié ;
- le rapport compte les Production Units, les Work Units, les Work Units par type de produit et les Work Units par statut ;
- le diagnostic détecte les IDs WorkUnit dupliqués ;
- il détecte les dépendances vers une WorkUnit inexistante ;
- il détecte les cycles dans le graphe de dépendances ;
- il détecte une WorkUnit `available` alors qu'une dépendance existante n'est pas `completed` ;
- il détecte les Production Units sans WorkUnit ;
- il distingue les produits supportés sans workflow des produits non supportés comme `other`.

Tests :

- graphe valide généré depuis `buildWorkUnits()` ;
- ID WorkUnit dupliqué ;
- dépendance manquante ;
- cycle de dépendances ;
- WorkUnit `available` avec dépendance `in_progress` ;
- ProductionUnit sans WorkUnit ;
- produit supporté sans workflow ;
- produit `other` sans workflow supporté.

Tests de validation :

- `npm test` : réussi ;
- `npx eslint src/lib/work-units.ts src/lib/work-units.test.ts src/lib/work-units-diagnostics.ts src/lib/work-units-diagnostics.test.ts` : réussi ;
- `npm run build` : réussi avec avertissements existants de build/deprecated API.

Risques restants :

- le diagnostic n'a pas encore été exécuté sur des données Supabase réelles ;
- certains cas `other` doivent être qualifiés métier par métier avant de devenir bloquants ;
- le Scheduler ne doit pas démarrer tant que les anomalies du diagnostic n'ont pas été interprétées.

---

## 2026-08-03 - Scheduler Core en mémoire

Date : 2026-08-03
Branche : `refactor/scheduler-core`

Fichiers :

- `src/lib/scheduler-core.ts`
- `src/lib/scheduler-core.test.ts`
- `src/lib/scheduler-core.business.test.ts`
- `package.json`
- `docs/13_ETAT_DU_PROJET.md`

Statut avant :

- `ProductionUnit` existait comme projection pure en mémoire ;
- `WorkUnit` existait comme projection pure en mémoire ;
- `diagnoseWorkUnits()` validait déjà la cohérence du graphe `WorkUnit[]` ;
- aucun Scheduler n'existait encore dans `src`.

Statut après :

- `buildSchedulerPlan()` produit un plan d'exécution en mémoire ;
- le Scheduler Core reçoit uniquement des `WorkUnit[]` ;
- il ne modifie jamais les Work Units d'entrée ;
- il ne lit ni n'écrit Supabase ;
- aucun poste KDS, aucune interface, aucun Dispatcher, aucun Batch et aucun ProductionPlan persistant n'a été modifié ou créé.

Règles réellement implémentées :

- seules les Work Units `available` sont sélectionnées ;
- une Work Unit `available` n'est planifiée que si toutes ses dépendances existent et sont `completed` ;
- les Work Units sont regroupées par `targetStation`, dérivée de `WorkUnit.station` ;
- l'ordre des postes est déterministe : `pizzaiolo`, `four`, `panino`, `fish_fryer`, `fries_fryer`, `handover` ;
- l'ordre interne est déterministe : heure demandée, commande, ProductionUnit, noeud de workflow, identifiant WorkUnit ;
- les heures `null` sont placées après les heures connues ;
- le plan contient une séquence globale et une séquence par poste ;
- les Work Units exposées dans le plan sont copiées afin d'éviter toute mutation indirecte des entrées.

Tests :

- sélection des Work Units `available` uniquement ;
- respect des dépendances `completed` ;
- dépendance manquante ou non terminée non planifiée ;
- groupement par `targetStation` ;
- ordre déterministe même si l'entrée est inversée ;
- séquences globales et par poste ;
- absence de mutation des Work Units d'entrée.

Scénarios métier validés en chaîne complète :

- commande pizza simple -> `ProductionUnit` -> `WorkUnit` -> diagnostic -> Scheduler : seule la préparation Pizzaiolo est planifiée ;
- pizza préparée legacy (`prepared === true`) : la cuisson Four devient planifiable ;
- pizza avec post-cuisson : la finition n'est pas planifiée avant cuisson terminée ;
- Pani'NO : pain Pizzaiolo et garniture Pani'NO sont planifiés avant assemblage ;
- Fish & NO : cuisson poisson et accompagnement sont planifiés avant assemblage puis packaging ;
- frites et grenailles : les cuissons sont affectées au poste `fries_fryer` ;
- commande mixte pizza + Pani'NO : les tâches exécutables sont réparties entre `pizzaiolo` et `panino` sans perdre l'ordre déterministe ;
- plusieurs commandes au même horaire : le résultat reste stable quel que soit l'ordre des données d'entrée ;
- heure demandée absente : les Work Units sans `requestedTime` sont classées après celles qui ont une heure dans un même poste ;
- dépendance absente volontaire : le diagnostic signale l'incohérence et la Work Unit concernée n'est pas planifiée ;
- absence de mutation sur les commandes, Production Units et Work Units d'entrée.

Tests de validation :

- `npm test` : réussi ;
- `npx eslint src/lib/scheduler-core.ts src/lib/scheduler-core.test.ts src/lib/scheduler-core.business.test.ts` : réussi ;
- `npm run build` : réussi avec avertissements existants de build/deprecated API ;
- `git diff --check` : réussi.

Incohérences détectées :

- aucune incohérence structurelle sur les chaînes normales construites depuis les adaptateurs existants ;
- une dépendance absente est bien distinguée d'une tâche simplement bloquée : elle rend le diagnostic incohérent et le Scheduler ne la planifie pas.

Risques restants :

- le Scheduler Core n'a pas encore été comparé à un flux réel Supabase ;
- certains états intermédiaires métier restent simulés au niveau `WorkUnit`, car ils ne disposent pas encore tous d'une source persistée dédiée ;
- aucune constitution de Batch n'est faite ;
- aucune priorité métier fine n'est encore calculée ;
- aucun ProductionPlan public n'est encore produit.

---

## 2026-08-03 - Batch Builder en mémoire

Date : 2026-08-03
Branche : `refactor/batch-builder`

Fichiers :

- `src/lib/batch-builder.ts`
- `src/lib/batch-builder.test.ts`
- `package.json`
- `docs/13_ETAT_DU_PROJET.md`

Statut avant :

- `SchedulerExecutionPlan` existait comme plan d'exécution en mémoire ;
- les Work Units planifiées n'étaient pas encore regroupées en Batchs ;
- aucun Batch persistant n'existait dans la nouvelle architecture cible.

Statut après :

- `buildBatchPlan()` produit des Batchs projetés en mémoire ;
- le module consomme uniquement un `SchedulerExecutionPlan` ;
- il ne modifie jamais le plan Scheduler ni les Work Units d'entrée ;
- il ne lit ni n'écrit Supabase ;
- aucun poste KDS, aucune interface, aucun Dispatcher et aucun ProductionPlan persistant n'a été modifié ou créé.

Règles réellement implémentées :

- les Work Units `pizza.cooking` du poste Four sont regroupées en batchs `pizza_oven` ;
- la capacité d'un batch `pizza_oven` est fixée à 4 pizzas ;
- les Work Units à l'intérieur de chaque batch conservent leur ordre Scheduler ;
- les batchs sont ordonnés selon la première `sequence` qu'ils contiennent ;
- `batchedWorkUnitIds` conserve exactement l'ordre global `schedulerPlan.scheduledWorkUnitIds` ;
- l'aplatissement des batchs par `batch.workUnitIds` ne doit pas être interprété comme ordre global d'exécution ;
- les autres Work Units planifiées deviennent des batchs unitaires `single_work_unit` ;
- les tâches Four qui ne sont pas `pizza.cooking` ne sont pas intégrées aux fournées pizza ;
- chaque batch possède un identifiant déterministe ;
- chaque batch expose `targetStation`, `batchType`, `capacity`, `sequence`, `stationSequence`, `isFull`, `workUnitIds` et les Work Units copiées ;
- aucune Work Unit planifiée n'est perdue ou dupliquée.

Tests :

- 1 à 4 pizzas -> un batch pizza de capacité 4 ;
- 5 pizzas -> batchs 4 + 1 ;
- 8 pizzas -> batchs 4 + 4 ;
- plusieurs commandes ;
- ordre Scheduler conservé ;
- deux pizzas séparées par une tâche d'un autre poste ;
- tâches non cuisson Four exclues des fournées pizza ;
- autres postes en batch unitaire ;
- identifiants déterministes ;
- aucune Work Unit perdue ou dupliquée ;
- absence de mutation des entrées ;
- même entrée -> même sortie.

Tests de validation :

- `npm test` : réussi ;
- `npx eslint src/lib/batch-builder.ts src/lib/batch-builder.test.ts src/lib/scheduler-core.ts src/lib/scheduler-core.test.ts src/lib/scheduler-core.business.test.ts` : réussi ;
- `npm run build` : réussi avec avertissements existants de build/deprecated API ;
- `git diff --check` : réussi.

Risques restants :

- aucune comparaison avec un flux réel Supabase n'a encore été faite ;
- les batchs unitaires des autres postes sont volontairement minimalistes ;
- aucun regroupement par base, par ressource, par priorité manuelle ou par horaire de démarrage n'est encore fait ;
- aucun Dispatcher et aucun ProductionPlan persistant n'existent encore ;
- aucun poste KDS ne consomme encore les Batchs projetés.

---

## 2026-08-03 - ProductionPlan en mémoire

Date : 2026-08-03
Branche : `refactor/production-plan`

Fichiers :

- `src/lib/production-plan.ts`
- `src/lib/production-plan.test.ts`
- `src/lib/production-plan.business.test.ts`
- `package.json`
- `docs/13_ETAT_DU_PROJET.md`

Statut avant :

- `ProductionUnit`, `WorkUnit`, `WorkUnitDiagnostic`, `SchedulerExecutionPlan` et `BatchBuilderPlan` existaient comme briques séparées ;
- aucune vue unique n'assemblait encore ces projections ;
- les postes KDS ne consommaient pas encore la nouvelle architecture cible.

Statut après :

- `buildProductionPlan()` orchestre la chaîne complète en mémoire depuis les commandes legacy ;
- `assembleProductionPlan()` assemble des artefacts déjà produits afin de tester des plans volontairement incohérents sans dupliquer les règles métier ;
- le plan expose un identifiant déterministe, les Production Units, les Work Units, le diagnostic, le Scheduler, les Batchs, des compteurs globaux, des vues par poste, des anomalies bloquantes et `isUsable` ;
- aucune table Supabase, aucun poste KDS, aucune interface, aucun Dispatcher, aucune persistance et aucune écriture ne sont introduits.

Règles réellement implémentées :

- le `ProductionPlan` orchestre les modules existants, sans réimplémenter le mapping des statuts, les dépendances, le tri Scheduler ou la constitution des Batchs ;
- `isUsable` vaut `false` si le diagnostic WorkUnit remonte une anomalie ou si `batchPlan.batchedWorkUnitIds` ne conserve pas exactement l'ordre global `schedulerPlan.scheduledWorkUnitIds` ;
- les vues par poste exposent les Work Units planifiées et les Batchs par station, dans l'ordre de postes stable ;
- les compteurs couvrent les Production Units, Work Units, Work Units planifiées, Batchs, types de produits, statuts et types de Batchs ;
- les sorties sont copiées afin qu'une mutation du plan retourné ne modifie pas les entrées.

Tests :

- commande pizza simple ;
- commande mixte pizza + Pani'NO ;
- Fish & NO ;
- plusieurs commandes ;
- aucune Work Unit planifiée perdue ou dupliquée ;
- diagnostic incohérent ;
- dépendance manquante ;
- produit `other` sans workflow ;
- ordre Scheduler conservé dans `batchedWorkUnitIds` ;
- Batchs présents ;
- vues par poste cohérentes ;
- même entrée -> même sortie ;
- absence de mutation des commandes, Production Units et Work Units d'entrée.

Limites confirmées :

- le plan n'est pas persistant ;
- il n'est consommé par aucun poste ;
- il ne calcule pas encore de capacité avancée, d'heure de démarrage ou de priorité manuelle ;
- il ne remplace pas encore les moteurs legacy.

Validation locale :

- `npm test` : réussi ;
- `npx eslint src/lib/production-plan.ts src/lib/production-plan.test.ts src/lib/production-plan.business.test.ts` : réussi ;
- `npm run build` : réussi avec avertissements existants de build/deprecated API ;
- `git diff --check` : réussi.

---

## 2026-08-03 - Validation métier du ProductionPlan en mémoire

Date : 2026-08-03
Branche : `refactor/production-plan`

Fichiers :

- `src/lib/production-plan.business.test.ts`
- `package.json`
- `docs/13_ETAT_DU_PROJET.md`

Statut après validation :

- le contrat public de `buildProductionPlan()` n'a pas été sophistiqué ;
- aucune correction moteur n'a été nécessaire pendant cette passe ;
- la validation ajoute des scénarios métier réalistes construits à partir des commandes legacy et de la chaîne complète en mémoire ;
- `assembleProductionPlan()` reste utilisé uniquement pour construire des incohérences contrôlées en test.

Scénarios validés :

- commande pizza simple de quatre pizzas prêtes à enfourner : quatre Production Units, Work Units attendues, une fournée complète de quatre et plan exploitable ;
- deux commandes partageant une même fournée : deux Regina + deux Margherita, ordre global Scheduler conservé ;
- commande supérieure à quatre pizzas : six pizzas réparties en 4 + 2 sans perte ni duplication ;
- scénario documenté : deux Regina, deux Margherita, deux Fromages, une Chèvre miel et une Piccante réparties en deux fournées de quatre ;
- commande mixte pizza + Pani'NO + Fish & NO + cornet de frites ;
- pizzas sans post-cuisson et avec post-cuisson ;
- commande annulée ;
- commande prête ou livrée ;
- produit inconnu `other` ;
- dépendance manquante ;
- divergence Scheduler / Batch Builder.

Invariants validés :

- aucune Work Unit dupliquée dans les plans exploitables ;
- chaque dépendance pointe vers une Work Unit existante ;
- aucune tâche dépendante n'est planifiée tant que sa dépendance n'est pas `completed` ;
- chaque Work Unit planifiée se retrouve exactement une fois dans les batchs actifs ;
- aucune pizza n'est présente dans plusieurs fournées ;
- la capacité des batchs `pizza_oven` reste limitée à quatre pizzas ;
- `batchedWorkUnitIds` conserve l'ordre global du Scheduler ;
- les commandes `cancelled`, `ready` et `delivered` ne créent aucune charge active ;
- les vues par poste ne contiennent que des Work Units ou Batchs de leur propre poste ;
- les entrées legacy ne sont pas mutées ;
- deux exécutions avec les mêmes entrées produisent le même identifiant et le même contenu métier.

Anomalies bloquantes explicitement validées :

- produit inconnu sans workflow ;
- dépendance WorkUnit manquante ;
- diagnostic WorkUnit incohérent ;
- ordre Scheduler / BatchPlan divergent.

Limitations confirmées non bloquantes :

- les durées estimées des Work Units restent `null` ;
- la différence entre post-cuisson courte et longue n'est pas encore portée par un profil de durée, seulement par la présence d'une Work Unit `pizza.finishing` ;
- les batchs autres que `pizza_oven` restent unitaires ;
- aucun calcul de démarrage, de ressource physique, de priorité manuelle ou de Dispatcher n'est encore présent ;
- aucune donnée Supabase réelle n'a encore été comparée au plan.

Validation locale :

- `npm test` : réussi ;
- `npx eslint src/lib/production-plan.ts src/lib/production-plan.test.ts src/lib/production-plan.business.test.ts` : réussi ;
- `npm run build` : réussi avec avertissements existants de build/deprecated API ;
- `git diff --check` : réussi.

---

## 2026-08-03 - Comparaison silencieuse ProductionPlan / snapshot legacy

Date : 2026-08-03
Branche : `refactor/production-plan-shadow-validation`

Fichiers créés :

- `src/lib/production-plan-shadow-validation.ts`
- `src/lib/production-plan-shadow-validation.test.ts`
- `src/lib/fixtures/production-plan/service-shadow-snapshot.json`

Fichiers modifiés :

- `package.json`
- `docs/13_ETAT_DU_PROJET.md`

Objectif :

- exécuter le `ProductionPlan` sur un snapshot exporté ou déjà récupéré par le KDS ;
- comparer silencieusement les résultats projetés avec les compteurs et états legacy ;
- conserver cette comparaison hors interface de production ;
- ne déclencher aucune écriture Supabase, aucun changement d'état et aucune persistance.

Statut après :

- `ProductionPlanSnapshot` définit un format d'export explicite, en lecture seule ;
- `compareProductionPlanWithLegacy(snapshot)` construit le plan et retourne un rapport structuré ;
- `anonymizeProductionPlanSnapshot(snapshot)` produit un snapshot anonymisé déterministe ;
- une fixture JSON synthétique et anonymisée représente un petit service mixte ;
- aucun poste KDS ne consomme ce diagnostic ;
- aucun script Supabase, aucune clé et aucune connexion réseau ne sont introduits.

Contrat du snapshot :

- `snapshotId` : identifiant local du snapshot ;
- `capturedAt` : horodatage de capture ou `null` ;
- `source` : `kds_runtime`, `json_export`, `supabase-manual-export` ou `fixture` ;
- `orders` : commandes nécessaires au lien client/horaire/statut ;
- `orderItems` : pizzas physiques issues de `order_items` ;
- `paninoItems` : produits physiques issus de `panino_order_items` ;
- `legacy` : compteurs legacy optionnels permettant de comparer un état observé avec le plan.

Champs Supabase nécessaires :

| Table | Champ | Utilisation | Obligatoire | Valeur legacy possible | Absence |
| --- | --- | --- | --- | --- | --- |
| `orders` | `id` | Relier les produits à la commande. | Oui | Toujours présent. | Les articles liés deviennent incohérents. |
| `orders` | `customer_name` | Contexte de diagnostic, anonymisable. | Non | Nom absent ou anonymisé. | `customerName = null`. |
| `orders` | `requested_time` | Tri Scheduler et comparaison horaire. | Non | Anciennes commandes sans heure. | Tâches classées après les tâches datées. |
| `orders` | `status` | Fallback `ready`, `delivered`, `cancelled`. | Non | Statut absent ou historique. | Statut individuel puis `created`. |
| `orders` | `cancelled_at` | Annulation même si `status` est incomplet. | Non | `null` hors annulation. | Seul `orders.status` peut annuler. |
| `orders` | `pains_panino_status` / `panino_bread_status` | État global pain Pani'NO legacy. | Non | Présent sur certains exports. | Aucun cas `unsupported` ajouté. |
| `order_items` | `id` | Identifiant source de la pizza physique. | Oui | Toujours présent. | Identifiant ProductionUnit impossible. |
| `order_items` | `order_id` | Lien commande/horaire. | Oui | Peut pointer vers une commande absente d'un export incomplet. | Différence bloquante `source_item_missing_order`. |
| `order_items` | `pizza_name` | Nom produit et post-cuisson. | Oui | Nom catalogue historique. | Produit non explicable. |
| `order_items` | `pizza_id` | Lien catalogue optionnel. | Non | `null` sur anciennes commandes. | `pizzaId = null`. |
| `order_items` | `base`, `default_base_snapshot`, `explicit_base_snapshot` | Base réelle et audit des remplacements. | Non | Absents avant migration base. | Champs base à `null`. |
| `order_items` | `extras`, `removed` | Suppléments et retraits. | Non | Tableaux absents ou vides. | Listes vides. |
| `order_items` | `prepared` | Statut legacy prudent d'une pizza prête pour le four. | Non | Boolean ambigu. | Pas de `legacy_prepared`. |
| `order_items` | `production_status` | Statut pizza individuel. | Non | Absent sur anciennes commandes. | Fallback commande puis `prepared` puis `created`. |
| `order_items` | `ready_at` | Diagnostic temporel ready/non-ready. | Non | `null` hors prêt. | Un statut `ready` sans `ready_at` produit un warning. |
| `panino_order_items` | `id` | Identifiant source du produit physique. | Oui | Toujours présent. | Identifiant ProductionUnit impossible. |
| `panino_order_items` | `order_id` | Lien commande/horaire. | Oui | Peut pointer vers une commande absente. | Différence bloquante `source_item_missing_order`. |
| `panino_order_items` | `product_key` | Classement `panino`, `fish_no`, `fries`, `grenailles`, `other`. | Oui | Alias `fishno`, `fish_no`, `frites`, `fries`. | Produit `other`, sans workflow. |
| `panino_order_items` | `product_name` | Libellé de diagnostic. | Oui | Nom libre historique. | Produit peu explicable. |
| `panino_order_items` | `base`, `fries_mode`, `side` | Pain Pani'NO et accompagnement Fish & NO. | Non | `null` ou libellé historique. | Workflow conservé, profil moins précis. |
| `panino_order_items` | `sauces`, `extras`, `removed` | Modifications de préparation. | Non | Tableaux absents ou vides. | Listes vides. |
| `panino_order_items` | `status` | Statut individuel Pani'NO/Fish/frites. | Non | `pending`, `in_progress`, `done` ou absent. | Fallback commande puis `created`. |
| `panino_order_items` | `done_at` | Diagnostic temporel done/non-done. | Non | `null` hors terminé. | Un statut `done` sans `done_at` produit un warning. |

Comparaisons implémentées :

- nombre de commandes ;
- nombre de produits physiques ;
- nombre de pizzas ;
- nombre de Pani'NO ;
- nombre de Fish & NO ;
- nombre de frites ;
- nombre de grenailles ;
- produits prêts ;
- produits en cours ;
- produits annulés ;
- charge active par poste lorsque des compteurs legacy sont fournis ;
- pizzas actuellement préparables ;
- pizzas prêtes à enfourner ;
- produits sans workflow ;
- commandes mixtes ;
- Work Units avec dépendance invalide ;
- divergences de statut entre commande et article ;
- anomalies issues du diagnostic ProductionUnit ;
- anomalies bloquantes issues du ProductionPlan.

Classification des écarts :

- `match` : les compteurs source/legacy et plan sont cohérents ;
- `warning` : donnée legacy ambiguë ou incomplète, divergence prudente, commande sans produit ;
- `blocking_difference` : produit réel absent ou incohérent, identifiant dupliqué, article sans commande, plan inexploitable ;
- `unsupported` : donnée connue mais non modélisée dans cette passe, par exemple état global du pain Pani'NO ou quantité agrégée.

Scénarios testés :

- snapshot vide ;
- commande pizza simple ;
- commande de 4 pizzas ;
- commande de plus de 4 pizzas ;
- commande mixte pizza + Pani'NO ;
- commande annulée ;
- commande prête ;
- commande livrée ;
- Pani'NO avec état global pain ambigu ;
- Fish & NO avec accompagnement ;
- produit inconnu ;
- donnée legacy incomplète ;
- commande sans produit ;
- article sans commande ;
- divergence entre statut de commande et statut d'article ;
- anonymisation déterministe ;
- même snapshot -> même rapport ;
- absence de mutation des données d'entrée ;
- fixture JSON anonymisée représentative d'un petit service.

Limites confirmées :

- aucune donnée client réelle n'a été utilisée dans les tests ;
- la fixture JSON est synthétique, lisible et anonymisée ;
- la charge source par poste n'est comparée au legacy que si le snapshot fournit des compteurs legacy ;
- l'état détaillé du pain Pani'NO reste `unsupported` ;
- les quantités agrégées restent `unsupported` car chaque ligne actuelle doit représenter un produit physique ;
- aucun export Supabase réel n'est encore généré automatiquement ;
- aucun poste KDS ne consomme encore le rapport.

Validation locale :

- `npx jiti src/lib/production-plan-shadow-validation.test.ts` : réussi ;
- `npx eslint src/lib/production-plan-shadow-validation.ts src/lib/production-plan-shadow-validation.test.ts` : réussi ;
- validations complètes à relancer en fin de branche.

Prochaine étape recommandée :

```text
Exécuter compareProductionPlanWithLegacy() sur un export Supabase réel anonymisé, puis analyser les warnings avant tout branchement sur un poste.
```

---

## 2026-08-04 - Préparation export Supabase anonymisé et exécuteur local

Date : 2026-08-04
Branche : `refactor/production-plan-shadow-validation`
Commit du socle validé : `9ecb1e3`

Fichiers créés :

- `scripts/validate-production-plan.ts`

Fichiers modifiés :

- `.gitignore`
- `package.json`
- `src/lib/production-plan-shadow-validation.ts`
- `src/lib/production-plan-shadow-validation.test.ts`
- `docs/13_ETAT_DU_PROJET.md`

Fichiers locaux non suivis :

- `.local/production-plan/supabase-export.raw.json`
- `.local/production-plan/supabase-export.anonymized.json`
- `.local/production-plan/shadow-report.json` après exécution du script.

Statut :

- `.local/` est ignoré par Git ;
- aucun export Supabase réel n'est présent dans le dépôt au moment de cette passe ;
- aucun nom, téléphone ou commentaire réel n'a été ajouté ;
- l'exécuteur local anonymise le snapshot en mémoire avant comparaison ;
- le rapport JSON est écrit localement et ne doit pas être commité ;
- aucune connexion Supabase directe n'est créée dans le code.

Commande manuelle :

```bash
npm run validate:production-plan -- .local/production-plan/supabase-export.raw.json \
  --anonymized-out .local/production-plan/supabase-export.anonymized.json \
  --json-out .local/production-plan/shadow-report.json
```

Règles de sécurité du script :

- lecture fichier local uniquement ;
- aucune clé Supabase ;
- aucun appel réseau ;
- aucune écriture KDS ;
- aucune modification d'état ;
- code retour non nul uniquement si le snapshot est invalide ou si des `blocking_difference` existent.

Requête SQL de lecture par plage horaire :

```sql
WITH params AS (
  SELECT
    TIMESTAMPTZ '2026-08-04 19:00:00+02' AS start_at,
    TIMESTAMPTZ '2026-08-04 22:30:00+02' AS end_at
),
selected_orders AS (
  SELECT
    orders.id,
    orders.customer_name,
    orders.customer_phone,
    orders.customer_phone_hash,
    orders.notes,
    orders.requested_time,
    orders.status,
    orders.cancelled_at,
    orders.pains_panino_status,
    orders.pizzaiolo_queue_position,
    orders.prep_start_time,
    orders.created_at,
    orders.updated_at
  FROM public.orders AS orders
  CROSS JOIN params
  WHERE orders.requested_time >= params.start_at
    AND orders.requested_time < params.end_at
)
SELECT jsonb_build_object(
  'snapshotId', 'supabase-export-' || to_char(now(), 'YYYYMMDDHH24MISS'),
  'capturedAt', now(),
  'source', 'json_export',
  'orders', COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id::text,
        'customer_name', customer_name,
        'customer_phone', customer_phone,
        'customer_phone_hash', customer_phone_hash,
        'notes', notes,
        'requested_time', requested_time::text,
        'status', status::text,
        'cancelled_at', cancelled_at::text,
        'pains_panino_status', pains_panino_status,
        'pizzaiolo_queue_position', pizzaiolo_queue_position,
        'prep_start_time', prep_start_time::text,
        'created_at', created_at::text,
        'updated_at', updated_at::text
      )
      ORDER BY requested_time, id
    )
    FROM selected_orders
  ), '[]'::jsonb),
  'orderItems', COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', item.id::text,
        'order_id', item.order_id::text,
        'pizza_id', item.pizza_id::text,
        'pizza_name', item.pizza_name,
        'base', item.base,
        'default_base_snapshot', item.default_base_snapshot,
        'explicit_base_snapshot', item.explicit_base_snapshot,
        'base_resolution', item.base_resolution,
        'base_confidence', item.base_confidence,
        'extras', item.extras,
        'removed', item.removed,
        'prepared', item.prepared,
        'production_status', item.production_status,
        'oven_batch_id', item.oven_batch_id::text,
        'sent_to_oven_at', item.sent_to_oven_at::text,
        'ready_at', item.ready_at::text,
        'cut_into', item.cut_into,
        'created_at', item.created_at::text
      )
      ORDER BY selected_orders.requested_time, item.order_id, item.created_at, item.id
    )
    FROM public.order_items AS item
    JOIN selected_orders ON selected_orders.id = item.order_id
  ), '[]'::jsonb),
  'paninoItems', COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', item.id::text,
        'order_id', item.order_id::text,
        'product_key', item.product_key,
        'product_name', item.product_name,
        'base', item.base,
        'fries_mode', item.fries_mode,
        'side', item.side,
        'sauces', item.sauces,
        'removed', item.removed,
        'extras', item.extras,
        'status', item.status::text,
        'done_at', item.done_at::text,
        'created_at', item.created_at::text
      )
      ORDER BY selected_orders.requested_time, item.order_id, item.created_at, item.id
    )
    FROM public.panino_order_items AS item
    JOIN selected_orders ON selected_orders.id = item.order_id
  ), '[]'::jsonb)
) AS production_plan_snapshot;
```

Variante par liste explicite de commandes :

```sql
WITH selected_orders AS (
  SELECT
    orders.id,
    orders.customer_name,
    orders.customer_phone,
    orders.customer_phone_hash,
    orders.notes,
    orders.requested_time,
    orders.status,
    orders.cancelled_at,
    orders.pains_panino_status,
    orders.pizzaiolo_queue_position,
    orders.prep_start_time,
    orders.created_at,
    orders.updated_at
  FROM public.orders AS orders
  WHERE orders.id = ANY(ARRAY[
    '00000000-0000-0000-0000-000000000000'::uuid
  ])
)
-- Réutiliser ensuite le SELECT jsonb_build_object de la requête par plage horaire.
```

Anonymisation vérifiée :

- `customer_name` -> `Client 001`, `Client 002`, etc. ;
- `customer_phone` -> `null` ;
- `customer_phone_hash` -> `null` ;
- `notes`, `comment`, `comments`, `customer_notes`, `internal_notes` -> `null` ;
- identifiants externes -> `null` ;
- `orders.id`, `order_items.id`, `panino_order_items.id` -> identifiants fictifs déterministes ;
- relations `order_id` conservées avec les identifiants fictifs.

Préservation opérationnelle :

- heures demandées ;
- statuts ;
- produits ;
- bases ;
- suppléments ;
- retraits ;
- états four/Pani'NO utiles ;
- relations commande/articles.

Analyse du premier export local disponible :

- fichier brut inspecté localement : `.local/production-plan/supabase-export.raw.json` ;
- `snapshotId` brut : `local-raw-export-template` ;
- plage horaire de l'échantillon : non disponible dans le snapshot ;
- nombre de commandes analysées : 0 ;
- nombre de produits analysés : 0 ;
- pizzas analysées : 0 ;
- produits Pani'NO / Fish & NO / frites analysés : 0 ;
- matchs legacy / ProductionPlan : 15 ;
- warnings : 0 ;
- différences bloquantes : 0 ;
- cas non supportés : 0 ;
- `ProductionPlan` exploitable : oui, sur échantillon vide uniquement.

Interprétation :

- le pipeline d'anonymisation et de comparaison s'exécute correctement ;
- le fichier local actuellement présent reste un gabarit vide et ne permet pas de valider le comportement métier sur des données réelles ;
- aucun warning, aucune différence bloquante et aucun cas non supporté ne peuvent être analysés sur cet échantillon ;
- aucune donnée client n'a été ajoutée au dépôt ou à la documentation.

Écarts observés :

- erreurs métier confirmées : aucune ;
- faux positifs confirmés : aucun ;
- ambiguïtés legacy : aucune observable sur cet échantillon vide ;
- causes principales : échantillon local non peuplé, donc absence de matière métier à comparer ;
- limitations restantes : relancer la validation avec un export Supabase non vide couvrant un service réel ;
- corrections moteur : aucune correction métier appliquée.

Prochaine étape recommandée :

```text
Remplacer le gabarit `.local/production-plan/supabase-export.raw.json` par un export Supabase anonymisable non vide, relancer le script de validation, puis analyser manuellement chaque warning avant toute modification moteur.
```

---

## 2026-08-04 - Première validation terrain ProductionPlan sur export Supabase

Date : 2026-08-04
Branche : `refactor/production-plan-shadow-validation`
Commit du socle validé : `9ecb1e3`

Source :

- export Supabase réel fourni manuellement ;
- snapshot local brut : `.local/production-plan/supabase-export.raw.json` ;
- snapshot anonymisé : `.local/production-plan/supabase-export.anonymized.json` ;
- rapport local : `.local/production-plan/shadow-report.json` ;
- aucun fichier `.local` ne doit être commité.

Taille de l'échantillon :

- commandes : 3 ;
- produits physiques : 9 ;
- pizzas : 9 ;
- items Pani'NO / Fish & NO / frites : 0 ;
- ProductionUnits : 9 ;
- WorkUnits : 27 ;
- batchs : 9.

Résultat de la shadow validation :

- `planUsable` : `true` ;
- matchs : 15 ;
- warnings : 0 ;
- différences bloquantes : 0 ;
- cas non supportés : 0.

Interprétation métier :

- les 9 pizzas Supabase sont correctement projetées en 9 `ProductionUnit` de type `pizza` ;
- les 27 `WorkUnit` correspondent au workflow pizza minimal en mémoire ;
- pour cet échantillon, seules les 9 tâches de préparation Pizzaiolo sont immédiatement planifiables ;
- les tâches Four restent bloquées tant que leur dépendance de préparation Pizzaiolo n'est pas terminée ;
- aucun produit Pani'NO, Fish & NO, frite ou grenaille n'est présent dans cet échantillon, donc ces workflows ne sont pas validés par cette passe.

Contrat `source` :

- le snapshot manuel initial utilisait `source = "supabase-manual-export"` ;
- le validateur local n'acceptait auparavant que `kds_runtime`, `json_export` et `fixture` ;
- le contrat accepte désormais aussi `supabase-manual-export`, sans ajouter de logique Supabase, d'appel réseau ou d'écriture ;
- `json_export` reste compatible et reste utilisé par la requête SQL générique.

Garanties de sécurité conservées :

- aucune écriture Supabase ;
- aucune modification d'état de commande ;
- aucune migration ;
- aucun branchement sur les postes Caisse, Pizzaiolo, Four, Pani'NO ou Prêtes ;
- aucune persistance du `ProductionPlan` ;
- aucun Dispatcher ;
- aucune donnée client mentionnée dans la documentation.

Erreurs métier confirmées :

- aucune erreur métier confirmée sur cet échantillon.

Limites restantes :

- échantillon limité aux pizzas `to_prepare` ;
- aucun cas pizza préparée, en cuisson, prête, livrée ou annulée ;
- aucun cas avec post-cuisson validé sur export réel ;
- aucun produit Pani'NO, Fish & NO, frites ou grenailles ;
- aucune comparaison terrain avec des compteurs legacy fournis dans le snapshot.

Prochaine étape recommandée :

```text
Exécuter un second export réel plus riche couvrant une pizza préparée, une pizza en cuisson, une commande prête ou livrée, une commande annulée, plusieurs bases, une pizza avec post-cuisson et au moins un produit Pani'NO ou Fish & NO dès que ces données existent.
```

---

# Principe fondamental

> `13_ETAT_DU_PROJET.md` doit décrire le code réel, pas le code souhaité.

Les spécifications indiquent la destination.  
La roadmap indique le chemin.  
Ce document indique précisément le point de départ actuel.

---

# 27. Audit factuel du dépôt - 2026-08-01

## 27.1 Périmètre et méthode

Documentation officielle lue avant inspection du code :

- `docs/00_ARCHITECTURE_GLOBALE.md`
- `docs/01_VISION_GENERALE.md`
- `docs/02_MODELE_DE_DONNEES.md`
- `docs/03_MOTEUR_PLANIFICATION.md`
- `docs/04_MOTEUR_DECISION.md`
- `docs/05_POSTE_CAISSE.md`
- `docs/09_REGLES_METIER.md`
- `docs/10_SYNCHRONISATION.md`
- `docs/11_TESTS_ACCEPTATION.md`
- `docs/12_ROADMAP.md`
- `docs/13_ETAT_DU_PROJET.md`

Inspection réalisée sur le dépôt local :

```text
/Users/clementpichon/Documents/Codex/2026-06-15/con-ois-un-serveur-local-permettant/outputs 15.49.56/Bonjour-Buddies-corrige
```

Note vérifiable : les documents officiels existent maintenant sous les chemins `docs/00_...` à `docs/13_...`.

Aucun fichier de code n'a été modifié pendant cette passe. Ce document est le seul fichier complété.

## 27.2 Résumé d'audit

### Fonctionnalités stables à conserver

- Application React/TanStack avec routes KDS par poste : `caisse`, `assistant`, `pizzaiolo`, `four`, `panino`, `pretes`, `reglages`.
- Données principales synchronisées via Supabase Realtime : commandes, items pizza, items Pani'NO, réglages, ingrédients, événements, téléphone.
- Poste Pizzaiolo opérationnel avec plan de travail 4 disques, sélection de pizzas, proposition de fournée, envoi partiel au four, réorganisation manuelle et suppression logique.
- Poste Four déjà orienté commande complète : les pizzas non encore envoyées restent grisées, les pizzas au four sont actives, la validation finale refuse une commande incomplète.
- Poste Pani'NO fonctionnel avec préparation par item/groupe, gestion de l'attente du pain et possibilité de commencer certaines préparations avant que le pain soit prêt.
- Réglages fonctionnels pour stock pâtons, reset stock, reset journée, cadence pizzaiolo, catalogue Pani'NO, ingrédients, pizzas, mode système et mot de passe local.
- PWA installable déjà présente avec `manifest.webmanifest`, icônes, métadonnées iOS et service worker prudent.

### Fonctionnalités partielles

- Moteur Caisse : `src/lib/cashier-flow.ts` expose désormais un `feasibilityScore` interne borné `0..100`, dérive les libellés existants depuis ce score et empêche la réserve de devenir une charge. La validation terrain et l'extraction complète des règles hors composant restent à faire.
- Moteur de décision : `src/lib/kds-brain.ts` calcule des charges par poste, mais ce n'est pas encore le moteur de décision central décrit dans `/docs`. Il n'est pas le point de vérité unique de la Caisse.
- Modèle de production : `order_items.production_status`, `oven_batch_id`, `sent_to_oven_at` et `ready_at` permettent un suivi pizza par pizza, mais il n'existe pas encore de `ProductionUnit`, `WorkUnit`, `ProductionAllocation` ou `ProductionSlot`.
- Journalisation : `production_events` et `phone_events` existent, mais il n'y a pas encore de clef d'idempotence métier ni de modèle d'événements rejouable sans ambiguïté.
- Tests : `npm test` couvre désormais les cas critiques du scoring Caisse, mais la couverture générale multi-postes reste partielle.

### Fonctionnalités absentes par rapport aux documents

- Traduction configurable score -> libellés visuels.
- Modèle cible `ProductionUnit` / `WorkUnit`.
- Graphe explicite de dépendances entre unités de travail.
- Allocation persistée de charge de production par créneau.
- Tests d'acceptation complets décrits dans `docs/11_TESTS_ACCEPTATION.md`.
- Séparation stricte `moteur pur -> décision -> interface` : plusieurs règles restent dans les composants.

## 27.3 Socle application, navigation et PWA

### Fichiers concernés

- `src/routes/_kds.tsx`
- `src/routes/__root.tsx`
- `src/lib/pwa.ts`
- `public/manifest.webmanifest`
- `public/sw.js`
- `public/pwa/icon-192.png`
- `public/pwa/icon-512.png`
- `src/styles.css`

### Ce qui existe déjà

- Layout KDS avec authentification locale, barre supérieure repliable, navigation par poste et bouton retour accueil.
- Logo principal intégré dans la barre supérieure via `src/assets/her-salin-logo.png`.
- Gestion plein écran tactile et détection standalone.
- Manifest PWA avec `display: standalone`, `orientation: landscape`, `start_url`, `scope`, `theme_color`, `background_color` et raccourcis.
- Métadonnées iOS présentes dans `src/routes/__root.tsx`.
- `viewport-fit=cover` et prise en compte de `env(safe-area-inset-top)` dans `src/styles.css`.
- Service worker qui ne met en cache que des assets statiques sûrs et laisse les navigations ainsi que les données KDS en réseau.

### Ce qui est seulement partiel

- L'authentification reste locale au navigateur. Elle ne protège pas réellement les données Supabase.
- La préférence de bandeau replié est stockée localement, pas synchronisée entre postes.

### Ce qui est absent

- Aucun mécanisme de permissions par poste.
- Aucun contrôle serveur d'accès aux routes KDS.

### Règles métier actuellement présentes dans les composants

- Le layout décide localement du mode plein écran, de l'authentification, de la déconnexion et de l'affichage du mode système.

### Tests existants

- Aucun test automatisé identifié pour le layout, le mode PWA, le plein écran ou l'installation mobile.

### Migrations Supabase présentes ou nécessaires

- Aucune migration spécifique PWA.
- Une migration/auth serveur serait nécessaire si l'objectif devient une sécurité multi-postes réelle.

### Risques de régression

- Modifier le layout peut casser toutes les routes.
- Un service worker plus agressif pourrait afficher des commandes périmées. Le comportement réseau actuel doit être conservé.

### Parties à conserver

- La stratégie de cache minimaliste dans `public/sw.js`.
- Le header compatible safe area.
- Le bouton logo retour accueil.

## 27.4 Modèle de données et migrations Supabase

### Fichiers concernés

- `src/lib/kds-types.ts`
- `src/integrations/supabase/types.ts`
- `supabase/migrations/*.sql`

### Ce qui existe déjà

- Tables principales : `settings`, `pizzas`, `orders`, `order_items`, `ingredients`, `panino_products`, `panino_options`, `panino_order_items`.
- Tables d'événements et téléphone : `production_events`, `phone_events`, `phone_status`.
- Colonnes utiles déjà présentes :
  - `orders.status`
  - `orders.requested_time`
  - `orders.prep_start_time`
  - `orders.pains_panino_status`
  - `orders.pizzaiolo_queue_position`
  - `orders.cancelled_at`
  - `orders.customer_phone`
  - `orders.customer_phone_hash`
  - `order_items.production_status`
  - `order_items.oven_batch_id`
  - `order_items.sent_to_oven_at`
  - `order_items.ready_at`
  - `order_items.base`
  - `order_items.default_base_snapshot`
  - `order_items.base_resolution`
  - `settings.system_mode`
  - `settings.paton_stock_reset_at`

### Ce qui est seulement partiel

- Les statuts actuels ne couvrent pas le modèle cible complet. Le code utilise principalement :
  - `orders.status = to_prepare | in_oven | ready | delivered | cancelled`
  - `order_items.production_status = to_prepare | in_oven | ready`
- `oven_batch_id` existe, mais il n'y a pas de table `batches` ni de cycle de vie de fournée persisté.
- `production_events` trace des actions, mais ne constitue pas encore une source événementielle idempotente.

### Ce qui est absent

- `ProductionUnit`
- `WorkUnit`
- `ProductionSlot`
- `ProductionAllocation`
- `WorkstationLoad`
- `Batch` persistant
- Graphe de dépendances des tâches
- Clef d'idempotence pour événements métier

### Règles métier actuellement présentes dans les composants

- Les composants traduisent directement certains états Supabase en décisions métier : commande active, pizza prête, pain Pani'NO en cours, commande supprimée, stock consommé.

### Tests existants

- Aucun test de migration ou de schéma n'a été identifié.

### Migrations Supabase présentes

- `20260528220845_8b30372e-582d-441c-b07d-64c02cf9908c.sql` : socle `settings`, `pizzas`, `orders`, `order_items`, realtime et RLS publique.
- `20260531133314_5b9ed4ef-e409-4dd1-b314-2ce8d2d1645d.sql` : catalogue et items Pani'NO.
- `20260622090000_kds_brain_events.sql` : `production_events`, `phone_events`, `system_mode`, hash téléphone.
- `20260622170000_phone_bridge.sql` : `phone_status`, téléphone client, index téléphone.
- `20260727122000_paton_stock_reset_at.sql` : reset stock pâtons.
- `20260728090000_pizzaiolo_manual_queue_and_cancelled_orders.sql` : ordre manuel pizzaiolo et suppression logique.
- `20260728150000_order_item_production_status.sql` : statut de production pizza et batch de four.
- `20260729100000_order_item_requested_base.sql` : base demandée.
- `20260729113000_pizza_base_inference_metadata.sql` : métadonnées d'inférence de base.

### Migrations nécessaires

- Migration future pour les unités de travail et allocations, mais seulement après stabilisation du moteur en mémoire.
- Migration éventuelle pour une idempotence forte des événements.
- Migration éventuelle pour remplacer les politiques `public_all` si une sécurité réelle est demandée.

### Risques de régression

- Changer les statuts existants casserait les postes Pizzaiolo, Four, Pani'NO et Prêtes.
- Ajouter le modèle cible trop tôt ferait coexister deux sources de vérité.
- Les migrations présentes peuvent ne pas être appliquées sur chaque environnement Supabase.

### Parties à conserver

- Les colonnes `production_status`, `oven_batch_id`, `sent_to_oven_at`, `ready_at`.
- La suppression logique via `orders.status = cancelled`.
- `paton_stock_reset_at`, qui permet d'ignorer les anciennes commandes dans le calcul de stock.

## 27.5 Moteur Caisse, planification et recommandation

### Fichiers concernés

- `src/lib/cashier-flow.ts`
- `src/lib/cashier-flow.test.ts`
- `src/lib/scheduling.ts`
- `src/routes/_kds/caisse.tsx`
- `src/components/kds/CashierStationHeader.tsx`
- `src/components/kds/TimeSlotGroup.tsx`

### Ce qui existe déjà

- `generateServiceSlots()` génère des créneaux de service sur les fenêtres 12:00-14:00 et 19:00-22:30, par pas de 5 minutes.
- `planProduction()` projette des fournées de pizzas avec capacité four, charge restante et exclusion partielle des pizzas déjà prêtes.
- `buildCashierSlotOptions()` produit des options de créneau pour l'interface.
- `analyzeCashierSlot()` agrège pizzas, Pani'NO, Fish & NO, frites et pommes grenailles.
- La Caisse conseille mais ne bloque pas automatiquement la prise de commande.
- Le moteur cherche déjà à compléter certaines fournées.
- `analyzeCashierSlot()` expose désormais un `feasibilityScore` borné entre `0` et `100`.
- Les libellés visuels existants sont dérivés du score final : `calme`, `actif`, `charge`, `tendu`.
- La réserve ne compte plus comme charge et ne peut plus dégrader seule un créneau en `charge` ou `tendu`.
- L'interface Caisse traduit ces niveaux internes en décisions lisibles : `À proposer`, `Bon créneau`, `Possible`, `À éviter`.
- Les tuiles de créneau masquent les compteurs techniques du moteur et affichent une seule raison courte.
- La raison courte distingue désormais les fournées pleines, les fournées partielles, les fournées complétées avec des pizzas existantes et les fournées pleines constituées par le panier seul.
- Le détail `Pourquoi ce conseil ?` conserve les explications utiles : panier ajouté, pizzas à remettre, pizzas encore à produire, fournées projetées et commandes liées.

### Ce qui est seulement partiel

- Le mapping score -> libellé existe dans le moteur, mais il n'est pas encore configurable.
- Le score reste interne au moteur et n'est pas encore affiché dans l'interface.
- Les helpers de présentation des raisons de créneau sont partiellement extraits dans `src/routes/_kds/-caisse-slot-presentation.ts`.
- `src/lib/scheduling.ts` contient encore un moteur historique `computePizzaCapacity()` et `findNextPizzaCapacitySlots()` utilisé comme héritage.
- `computePrepStart()` reste utilisé lors de la création de commande, alors que la documentation demande de mieux distinguer heure de remise et charge de production.

### Ce qui est absent

- Mapping configurable score -> libellé visuel.
- Persistance du score ou des allocations de production.
- Extraction complète des règles Caisse hors composant.

### Règles métier actuellement présentes dans les composants

- `src/routes/_kds/caisse.tsx` gère encore :
  - validation taille/type image pour scan ;
  - disponibilité locale des produits Pani'NO ;
  - alerte stock négatif ;
  - alerte créneau chargé ;
  - insertion Supabase des commandes et items ;
  - logique de fallback si certaines colonnes Supabase ne sont pas encore migrées ;
  - traduction des niveaux de charge en vocabulaire de décision pour la Caisse.

### Tests existants

- `src/lib/cashier-flow.test.ts` couvre les créneaux midi/soir, les fournées complètes `0+4`, `1+3`, `3+1`, `7+1`, le cas `4+1`, le cas `1+3 puis 1 résiduelle`, la réserve consommée seule, la capacité réellement dépassée, le retard réel, la commande prête, les items prêts, la commande remise, le créneau vide et le mélange frites/grenailles.
- `package.json` expose désormais `npm test` pour lancer ce test moteur.
- Le lint ciblé `npx eslint src/routes/_kds/caisse.tsx src/routes/_kds/-caisse-slot-presentation.ts src/lib/cashier-flow.test.ts` valide la présentation Caisse modifiée.

### Migrations Supabase présentes ou nécessaires

- Le moteur actuel s'appuie sur `orders`, `order_items`, `panino_order_items`, `settings`.
- Aucune migration immédiate n'est nécessaire pour corriger le score en mémoire.
- Une migration sera nécessaire plus tard pour persister allocations et unités de production.

### Risques de régression

- Le moteur Caisse touche directement la promesse faite à la caissière : conseiller sans bloquer.
- Une correction trop large peut casser la création de commande, le stock pâtons ou le scan.
- Les libellés sont visibles en UI : il faut conserver leur compatibilité pendant l'ajout du score.

### Parties à conserver

- `generateServiceSlots()` comme base des fenêtres de service.
- `planProduction()` comme prototype de projection en mémoire.
- Les tests existants, à renforcer plutôt qu'à supprimer.
- Le principe de non-blocage côté Caisse.

## 27.6 Moteur de décision et assistant

### Fichiers concernés

- `src/lib/kds-brain.ts`
- `src/routes/_kds/assistant.tsx`
- `src/lib/cashier-activity.ts`
- `src/lib/cashier-flow.ts`

### Ce qui existe déjà

- `computeBrainSnapshot()` calcule des charges par poste : Pizzaiolo, Four, Finition, Pani'NO, friteuse frites, friteuse poisson, Caisse.
- Le poste Caisse est conservé dans la logique, mais filtré visuellement côté Assistant.
- L'assistant affiche un goulot, des conseils, des commandes à surveiller et des indicateurs de charge.
- La cadence pizzaiolo influe via `settings.prep_time_per_pizza_sec`.
- Les règles friteuse poisson et friteuse frites/grenailles existent dans la logique de charge.

### Ce qui est seulement partiel

- Le moteur assistant n'est pas le moteur de décision central unique.
- Les niveaux `calme`, `actif`, `tendu`, `sature` ne sont pas alignés avec un score `0..100`.
- La Caisse n'utilise pas directement ce moteur pour décider des créneaux.

### Ce qui est absent

- Interface métier pure entre planification et décision.
- Score numérique commun.
- Journal de justification métier exploitable par tests.

### Règles métier actuellement présentes dans les composants

- `src/routes/_kds/assistant.tsx` calcule encore une partie de l'affichage métier : étape de service, watchlist, filtrage de station, boutons de navigation.

### Tests existants

- Aucun test automatisé identifié pour `kds-brain.ts`.

### Migrations Supabase présentes ou nécessaires

- `production_events`, `phone_events`, `phone_status` sont présents.
- Une migration d'idempotence ou de version d'événement pourrait être nécessaire plus tard.

### Risques de régression

- Une unification prématurée du moteur assistant et du moteur Caisse pourrait rendre les conseils instables.
- Les seuils actuels sont utiles pour le terrain même s'ils ne sont pas encore doctrinaux.

### Parties à conserver

- La séparation visuelle qui masque `Charge caisse` tout en gardant la logique disponible.
- Les calculs friteuse poisson et frites/grenailles.
- L'utilisation de `production_events` comme historique d'apprentissage.

## 27.7 Poste Pizzaiolo

### Fichiers concernés

- `src/routes/_kds/pizzaiolo.tsx`
- `src/lib/pizzaiolo-queue.ts`
- `src/lib/pizzaiolo-batch-planner.ts`
- `src/lib/pizza-production.ts`

### Ce qui existe déjà

- Plan de travail avec 4 disques.
- File groupée par commande/créneau/client.
- Proposition intelligente de fournée via `buildSmartBatchPlan()`.
- Envoi partiel au four via `order_items.production_status = in_oven`.
- Gestion `oven_batch_id`, `sent_to_oven_at`, et mise à jour partielle du statut commande.
- Réorganisation manuelle via `orders.pizzaiolo_queue_position`.
- Suppression logique via `orders.status = cancelled`.
- Déclaration de perte pâton via `settings.paton_losses`.
- Gestion séparée des pains Pani'NO avec `orders.pains_panino_status`.

### Ce qui est seulement partiel

- L'ordre manuel est stocké au niveau commande, pas au niveau unité de travail.
- Le drag and drop est présent mais reste une implémentation UI, sans moteur métier séparé.
- Le regroupement des pizzas dépend encore directement des commandes et items existants.

### Ce qui est absent

- `WorkUnit` pizzaiolo.
- Verrouillage/version d'ordre pour éviter les conflits simultanés entre deux tablettes.
- Tests automatisés du réordonnancement, de la suppression logique et de l'envoi partiel au four.

### Règles métier actuellement présentes dans les composants

- `src/routes/_kds/pizzaiolo.tsx` contient encore :
  - règles de sélection de pizzas ;
  - envoi au four ;
  - positions de queue ;
  - suppression logique ;
  - perte pâton ;
  - pain Pani'NO ;
  - choix d'affichage des tuiles et mode réorganisation.

### Tests existants

- Aucun test automatisé identifié pour `pizzaiolo-queue.ts` ou `pizzaiolo-batch-planner.ts`.

### Migrations Supabase présentes ou nécessaires

- Migration présente : `20260728090000_pizzaiolo_manual_queue_and_cancelled_orders.sql`.
- Migration présente : `20260728150000_order_item_production_status.sql`.
- Migration future nécessaire si l'ordre doit passer de la commande vers des unités de travail.

### Risques de régression

- Modifier la file Pizzaiolo peut casser la prévisualisation Four, car elle réutilise `buildPizzaioloQueue()`.
- Modifier `production_status` peut casser Four et Prêtes.
- La suppression logique doit continuer à recréditer indirectement le stock via l'exclusion des commandes annulées.

### Parties à conserver

- `buildSmartBatchPlan()` comme aide terrain actuelle.
- `buildPizzaioloQueue()` comme source commune de file en attendant `WorkUnit`.
- La suppression logique plutôt qu'une suppression physique.
- L'envoi partiel au four.

## 27.8 Poste Four

### Fichiers concernés

- `src/routes/_kds/four.tsx`
- `src/lib/pizzaiolo-queue.ts`
- `src/lib/pizza-production.ts`

### Ce qui existe déjà

- Le poste Four travaille déjà commande par commande.
- Les pizzas non envoyées au four apparaissent grisées.
- Les pizzas en cuisson ou prêtes sont visibles dans la commande complète.
- Le Four ne valide pas individuellement les pizzas.
- La validation de commande refuse une commande tant que des pizzas restent à préparer.
- La prévisualisation des 3 prochaines commandes Pizzaiolo existe via `buildPizzaioloQueue(..., { excludeStarted: true }).slice(0, 3)`.
- Les pains Pani'NO en cours peuvent être marqués prêts côté Four.

### Ce qui est seulement partiel

- La logique Four est principalement dans le composant React.
- La prévisualisation dépend de la file Pizzaiolo actuelle, pas d'un moteur d'unités de travail.
- Le cycle exact `baking -> post_bake -> ready` n'est pas modélisé.

### Ce qui est absent

- Table `Batch`.
- Statuts post-cuisson normalisés.
- Tests automatisés de commande répartie sur plusieurs fournées.

### Règles métier actuellement présentes dans les composants

- `src/routes/_kds/four.tsx` contient :
  - filtre des commandes à afficher ;
  - validation complète ;
  - refus des commandes incomplètes ;
  - passage des pizzas à `ready` ;
  - passage des pains Pani'NO à `pret`.

### Tests existants

- Aucun test automatisé identifié pour le poste Four.

### Migrations Supabase présentes ou nécessaires

- Migration présente : `order_items.production_status`, `oven_batch_id`, `sent_to_oven_at`, `ready_at`.
- Migration future nécessaire pour une vraie table fournée/batch si demandée.

### Risques de régression

- Casser le comportement commande complète ferait perdre au Four sa vision globale.
- Modifier la prévisualisation peut désynchroniser Four et Pizzaiolo.

### Parties à conserver

- Affichage commande complète avec lignes grisées.
- Validation uniquement de la commande complète.
- Prévisualisation discrète des prochaines commandes.

## 27.9 Poste Pani'NO

### Fichiers concernés

- `src/routes/_kds/panino.tsx`
- `src/lib/kds-types.ts`
- `src/hooks/use-kds-data.ts`

### Ce qui existe déjà

- Affichage des commandes Pani'NO/Fish & NO/frites par groupe.
- Statuts `pending`, `in_progress`, `done` sur `panino_order_items`.
- Attente du pain Pani'NO sans bloquer nécessairement toute la commande.
- Possibilité de commencer certaines actions avant disponibilité du pain.
- Journalisation d'événements Pani'NO/Fish/frites.

### Ce qui est seulement partiel

- La coordination fine du temps masqué n'est pas modélisée comme unités de travail.
- Les contraintes friteuse restent surtout calculées dans les moteurs Caisse/Assistant, pas dans un moteur Pani'NO dédié.

### Ce qui est absent

- `WorkUnit` steak, pain, assemblage, poisson, frites.
- Tests automatisés sur commande mixte Fish & NO/Pani'NO.

### Règles métier actuellement présentes dans les composants

- `src/routes/_kds/panino.tsx` contient :
  - agrégation des statuts ;
  - règles d'attente du pain ;
  - autorisation ou non de terminer un item ;
  - journalisation selon type produit.

### Tests existants

- Aucun test automatisé identifié pour le poste Pani'NO.

### Migrations Supabase présentes ou nécessaires

- Migration présente : table `panino_order_items`.
- Migration présente : `orders.pains_panino_status`.
- Migration future nécessaire pour détailler les unités de préparation.

### Risques de régression

- Toucher au pain Pani'NO impacte Pizzaiolo, Four et Pani'NO.
- Les commandes mixtes sont sensibles car elles traversent plusieurs postes.

### Parties à conserver

- `panino_order_items` séparé des pizzas.
- Le statut pain sur la commande.
- Le principe de ne pas bloquer toute une commande mixte.

## 27.10 Poste Prêtes

### Fichiers concernés

- `src/routes/_kds/pretes.tsx`
- `src/lib/pizza-production.ts`
- `src/lib/order-status.ts`

### Ce qui existe déjà

- Affichage des commandes prêtes à remettre.
- Exclusion locale des commandes remises.
- Passage d'une commande en `delivered`.
- Prise en compte des pizzas prêtes et des items Pani'NO terminés.
- Utilisation du téléphone client quand disponible.

### Ce qui est seulement partiel

- La logique de "commande prête" reste dans le composant.
- Pas de moteur pur de cycle de vie complet.

### Ce qui est absent

- Tests automatisés sur la transition `ready -> delivered`.
- Historique fin de remise client.

### Règles métier actuellement présentes dans les composants

- `src/routes/_kds/pretes.tsx` décide quelles commandes sont remettables et applique la livraison.

### Tests existants

- Aucun test automatisé identifié pour le poste Prêtes.

### Migrations Supabase présentes ou nécessaires

- S'appuie sur `orders.status` et les statuts items existants.
- Aucune migration immédiate nécessaire.

### Risques de régression

- Une modification des statuts pizza ou panino peut faire disparaître des commandes prêtes.

### Parties à conserver

- L'interface simple de remise.
- La compatibilité avec les commandes mixtes.

## 27.11 Réglages, stock, catalogue et sécurité locale

### Fichiers concernés

- `src/routes/_kds/reglages.tsx`
- `src/lib/scheduling.ts`
- `src/lib/kds-auth.ts`
- `src/hooks/use-kds-data.ts`

### Ce qui existe déjà

- Stock pâtons : initial, pertes, restant.
- Reset stock pâtons avec `initial_paton_stock = 0`, `paton_losses = 0`, `paton_stock_reset_at = now`.
- Calcul de stock dans `computeStock()` en excluant les commandes annulées/livrées et en tenant compte de `paton_stock_reset_at`.
- Reset journée avec confirmation `RESET`.
- Mode système `test`, `learning`, `normal`.
- Cadence pizzaiolo.
- Mot de passe local modifiable.
- Catalogue Pani'NO avec disponibilité locale sans casser le champ technique `active`.
- Synchronisation des ingrédients natifs vers la table `ingredients`.
- Ingrédients ajoutés synchronisés vers les extras Pani'NO/Fish & NO.
- Gestion des pizzas et ingrédients.

### Ce qui est seulement partiel

- Le mot de passe est local au navigateur, pas global ni sécurisé côté serveur.
- Certaines préférences sont en `localStorage`, pas dans Supabase.
- Reset journée supprime physiquement les commandes et items, contrairement à la préférence générale de conservation d'historique pour les suppressions ordinaires.
- `useIngredients()` contient une anomalie visible : deux appels `.channel(...)` sont chaînés successivement. Cela doit être vérifié car cela peut provoquer une erreur de compilation ou d'exécution selon les types Supabase.

### Ce qui est absent

- Authentification serveur.
- Reset journée logique/historisé.
- Tests automatisés du reset stock et du reset journée.

### Règles métier actuellement présentes dans les composants

- `src/routes/_kds/reglages.tsx` contient :
  - reset stock ;
  - reset journée ;
  - changement de mode système ;
  - règles de mot de passe ;
  - réparation catalogue ;
  - synchronisation ingrédients ;
  - ajout/suppression pizzas et ingrédients.

### Tests existants

- Aucun test automatisé identifié pour les réglages.

### Migrations Supabase présentes ou nécessaires

- Migration présente : `settings.paton_stock_reset_at`.
- Migration présente : `settings.system_mode`.
- Migration future nécessaire pour une authentification serveur ou un reset journée historisé.

### Risques de régression

- Une modification de `computeStock()` impacte Caisse, Dashboard, Réglages et Pizzaiolo.
- Reset stock ne doit pas toucher aux commandes.
- Reset journée est irréversible dans son état actuel.

### Parties à conserver

- `paton_stock_reset_at`.
- Le fait que l'indisponibilité Pani'NO en caisse n'écrive pas dans `panino_products.active`.
- La liste commune d'ingrédients.

## 27.12 Synchronisation, événements et téléphone

### Fichiers concernés

- `src/hooks/use-kds-data.ts`
- `src/lib/production-events.ts`
- `src/lib/phone-bridge.server.ts`
- `src/lib/phone-utils.ts`
- `src/routes/api/phone/events.ts`
- `supabase/migrations/20260622090000_kds_brain_events.sql`
- `supabase/migrations/20260622170000_phone_bridge.sql`

### Ce qui existe déjà

- Hooks Realtime pour `settings`, `orders`, `order_items`, `ingredients`, `panino_products`, `panino_options`, `panino_order_items`, `production_events`, `phone_status`.
- Rechargement complet des données lors des changements Supabase.
- API téléphone protégée par `PHONE_EVENTS_TOKEN`.
- Normalisation téléphone et hash optionnel via `PHONE_HASH_PEPPER`.
- Association possible d'un appel à une commande par numéro.
- Statut téléphone singleton `phone_status`.
- Événements marqués `is_training_data` uniquement en mode `learning`.

### Ce qui est seulement partiel

- Les hooks rechargent largement les tables, ce qui est simple mais pas optimisé.
- La journalisation d'événements n'a pas de clef idempotente.
- Le pont téléphone dépend d'environnements serveur correctement configurés.

### Ce qui est absent

- Gestion de conflits multi-postes.
- Replay événementiel garanti sans doublon.
- Monitoring automatisé de santé Realtime.

### Règles métier actuellement présentes dans les composants

- Les composants déclenchent eux-mêmes `logProductionEvent()` selon les actions utilisateur.
- L'association téléphone est utilisée dans la Caisse et Prêtes, mais la charge téléphone est masquée visuellement côté Assistant.

### Tests existants

- Aucun test automatisé identifié pour Realtime, téléphone ou événements.

### Migrations Supabase présentes ou nécessaires

- Migrations présentes pour `production_events`, `phone_events`, `phone_status`.
- Migration future possible pour une contrainte d'idempotence.

### Risques de régression

- Une modification de `useOrders()` impacte tous les postes.
- Une stratégie de cache PWA inadaptée peut afficher des données périmées.
- Les politiques RLS `public_all` facilitent le fonctionnement local mais ne constituent pas une sécurité forte.

### Parties à conserver

- La simplicité actuelle des hooks Realtime pendant la phase de stabilisation.
- `phone_status` singleton.
- Le marquage `is_training_data`.

## 27.13 Tests et qualité

### Fichiers concernés

- `src/lib/cashier-flow.test.ts`
- `package.json`
- `docs/11_TESTS_ACCEPTATION.md`

### Ce qui existe déjà

- Un test métier ad hoc existe pour `cashier-flow`.
- Le projet contient des scripts `dev`, `build`, `build:dev`, `preview`, `test`, `lint`, `format`.

### Ce qui est seulement partiel

- Aucun framework de test dédié n'est déclaré dans les dépendances.
- Le test moteur Caisse est lançable par `npm test`, mais la couverture ne représente pas encore tous les tests d'acceptation officiels.
- Le lint ciblé des fichiers modifiés passe, mais le lint global `npm run lint` ne rend pas la main dans un délai raisonnable.

### Ce qui est absent

- Tests unitaires des moteurs Pizzaiolo, Four, Pani'NO, stock, décision.
- Tests d'intégration Supabase.
- Tests E2E tablette.
- Tests PWA installable.

### Règles métier actuellement présentes dans les composants

- Cette dispersion rend les tests difficiles car beaucoup de règles ne sont pas encore sous forme de fonctions pures.

### Tests existants

- `src/lib/cashier-flow.test.ts`, lancé via `npm test`.

### Migrations Supabase présentes ou nécessaires

- Aucune migration de test.
- Un environnement Supabase de test serait nécessaire pour les tests d'intégration.

### Risques de régression

- Sans tests standards, une évolution peut sembler fonctionner visuellement mais casser un poste secondaire.
- Les commandes mixtes sont particulièrement exposées.

### Parties à conserver

- Le fichier `cashier-flow.test.ts` comme point de départ.
- L'approche par moteurs purs pour les futures règles.

## 27.14 Contradictions ou écarts entre code et documentation

- La documentation demande que l'interface affiche et que les moteurs décident. Le code contient encore beaucoup de règles métier dans `caisse.tsx`, `pizzaiolo.tsx`, `four.tsx`, `panino.tsx`, `pretes.tsx` et `reglages.tsx`.
- La documentation cible des unités de production et unités de travail. Le dépôt utilise encore surtout `orders`, `order_items` et `panino_order_items`.
- La documentation demande des tests d'acceptation nombreux. Le dépôt contient un test moteur Caisse renforcé, mais pas encore de couverture complète multi-postes.

## 27.15 Risques principaux de régression

- Modifier les statuts `orders.status` ou `order_items.production_status` sans couche de compatibilité casserait plusieurs postes.
- Toucher à `useOrders()` peut affecter toutes les vues en temps réel.
- Toucher au calcul de stock peut recréer des stocks négatifs ou des commandes non recréditées.
- Corriger le moteur Caisse sans tests peut casser la promesse "le KDS conseille, l'équipe décide".
- Ajouter le modèle `WorkUnit` trop tôt peut créer une double source de vérité.
- Modifier le service worker peut rendre le KDS dangereux en affichant des commandes obsolètes.

## 27.16 Prochaine étape technique recommandée

Prochaine étape unique après validation terrain du scoring Caisse : introduire le modèle `ProductionUnit` en mémoire par adaptateur pur, sans modifier les postes de production.

Objectif court :

- conserver `orders`, `order_items` et `panino_order_items` comme source de vérité actuelle ;
- créer une représentation `ProductionUnit` calculée en mémoire ;
- vérifier que les counts et statuts calculés correspondent exactement au comportement actuel ;
- ne changer aucune interface et aucune migration Supabase ;
- préparer ensuite les `WorkUnit` sans créer de double source de vérité persistée.

Branche proposée pour l'étape suivante :

```text
refactor/production-units-adapter
```

Fichiers probablement concernés :

- `src/lib/kds-types.ts`
- `src/lib/production-units.ts`
- `src/lib/production-units.test.ts`
- `docs/13_ETAT_DU_PROJET.md`

---

# 28. Audit cible ProductionUnit / WorkUnit - 2026-08-02

## 28.1 Périmètre et méthode

Documents relus pour cette passe :

- documents actuels attendus : `docs/00_...` à `docs/13_...` ;
- architecture cible : `docs/14_ARCHITECTURE_WORK_UNITS.md` à `docs/19_ARCHITECTURE_EVENTS.md` ;
- document cible également présent localement : `docs/20_ARCHITECTURE_LEARNING.md`.

État Git vérifiable au moment de l'audit :

- branche locale : `refactor/production-work-units` ;
- documents `docs/14_ARCHITECTURE_WORK_UNITS.md` à `docs/20_ARCHITECTURE_LEARNING.md` présents mais non suivis par Git ;
- aucune migration Supabase ProductionUnit / WorkUnit présente ;
- aucune entité `ProductionUnit`, `WorkUnit`, `ProductionPlan`, `Scheduler` ou `Dispatcher` trouvée dans `src`.

Règle d'arbitrage retenue :

- en cas d'écart entre les documents, `docs/09_REGLES_METIER.md` reste prioritaire ;
- les documents 14 à 20 décrivent une cible et ne doivent pas déclencher une réécriture globale ;
- l'Event Store complet et le Learning Engine sont explicitement hors périmètre immédiat.

## 28.2 État réel du modèle actuel

### Fichiers concernés

- `src/lib/kds-types.ts`
- `src/integrations/supabase/types.ts`
- `src/hooks/use-kds-data.ts`
- `supabase/migrations/*.sql`

### Ce qui existe déjà

- `Order` représente encore à la fois l'engagement commercial et une partie de l'état de production global.
- `OrderItem` représente une pizza physique dans la pratique actuelle, avec :
  - `production_status` ;
  - `oven_batch_id` ;
  - `sent_to_oven_at` ;
  - `ready_at` ;
  - `base`, `extras`, `removed`, `cut_into`.
- `PaninoOrderItem` représente un produit Pani'NO / Fish & NO / cornet de frites avec statut propre.
- `production_events` trace certaines actions, mais reste un journal d'événements simple.
- `use-kds-data.ts` fournit déjà une couche commune de lecture Supabase et de synchronisation Realtime.

### Ce qui est seulement partiel

- Une ligne `OrderItem` se comporte déjà comme une future `ProductionUnit` pizza, mais le type ne l'exprime pas.
- `PaninoOrderItem` se comporte aussi comme une future `ProductionUnit` pour certains produits, mais les dépendances pain / steak / poisson / frites restent implicites dans les composants.
- `oven_batch_id` permet de grouper des pizzas envoyées au four, mais il n'existe pas de table ou type `Batch` complet.
- Les statuts actuels ne couvrent pas le cycle cible `Pending -> Ready -> Reserved -> In Progress -> Completed`.

### Ce qui est absent

- Un identifiant stable de `ProductionUnit` indépendant du stockage Supabase.
- Un type de produit physique commun entre pizza, Pani'NO, Fish & NO, frites et grenailles.
- Un graphe de dépendances entre tâches.
- Une projection unique `ProductionPlan` consommée par tous les postes.
- Une comparaison automatisée ancien moteur / nouveau moteur.

## 28.3 Services, modèles et composants réutilisables

### Modèles réutilisables

- `Order`, `OrderItem`, `PaninoOrderItem`, `Pizza`, `Settings` dans `src/lib/kds-types.ts` doivent rester la couche de compatibilité initiale.
- Les colonnes `order_items.production_status`, `oven_batch_id`, `sent_to_oven_at`, `ready_at` sont utiles pour dériver les premiers états de `ProductionUnit`.
- `orders.cancelled_at` et `orders.status = cancelled` doivent rester la base de suppression logique.

### Services réutilisables

- `src/lib/pizza-production.ts` :
  - base réelle demandée ;
  - snapshots de base ;
  - statut pizza effectif ;
  - détails d'affichage pizza.
- `src/lib/cashier-flow.ts` :
  - génération des créneaux de service ;
  - scoring Caisse ;
  - projection de fournées en mémoire ;
  - règles déjà testées sur la réserve et les fournées.
- `src/lib/pizzaiolo-queue.ts` :
  - file Pizzaiolo legacy ;
  - respect de `pizzaiolo_queue_position` ;
  - regroupement des commandes mixtes avec besoin de pain Pani'NO.
- `src/lib/pizzaiolo-batch-planner.ts` :
  - proposition de fournée de 4 pizzas ;
  - regroupement par base réelle ;
  - base utile pour une future comparaison Scheduler.
- `src/lib/scheduling.ts` :
  - fonctions historiques de stock et capacité ;
  - à conserver comme compatibilité, mais pas comme futur moteur canonique.
- `src/lib/kds-brain.ts` :
  - snapshot assistant et charge par poste ;
  - utile pour comparer les charges, mais trop spécifique pour devenir le Scheduler cible.
- `src/lib/production-events.ts` :
  - journalisation actuelle exploitable ;
  - à ne pas confondre avec l'Event Store cible.

### Composants et routes à conserver

- `src/routes/_kds/caisse.tsx` doit rester compatible avec `CashierSlotOption`.
- `src/routes/_kds/pizzaiolo.tsx` doit rester piloté par les structures actuelles jusqu'à validation d'un adaptateur.
- `src/routes/_kds/four.tsx` contient déjà une logique proche de la documentation : vision commande complète, pizzas grisées, validation commande complète.
- `src/routes/_kds/panino.tsx` contient les règles opérationnelles Pani'NO / Fish & NO à extraire plus tard.
- `src/routes/_kds/pretes.tsx` reste simple et doit être migré tardivement.

## 28.4 Écarts et contradictions entre code et documentation

### Écarts non bloquants

- Les documents demandent que les interfaces affichent une décision issue du moteur. Le code contient encore des règles métier dans les routes.
- Les documents 14 à 19 ciblent `ProductionUnit`, `WorkUnit`, `Scheduler`, `ProductionPlan`, `Resources` et `Events`. Le dépôt ne les implémente pas encore.
- Le nom `ProductionPlanResult` existe dans `src/lib/cashier-flow.ts`, mais il ne correspond pas au `ProductionPlan` cible de `docs/16_ARCHITECTURE_PRODUCTION_PLAN.md`.
- Les événements actuels sont persistés, mais ils ne sont pas encore immuables, idempotents et rejouables au sens de `docs/19_ARCHITECTURE_EVENTS.md`.
- Les ressources physiques existent seulement sous forme de règles dispersées : four, pizzaiolo, friteuse poisson, friteuse frites, plan Pani'NO.

### Contradictions fonctionnelles à surveiller

- `docs/14_ARCHITECTURE_WORK_UNITS.md` indique que le KDS ne doit jamais piloter des commandes, alors que les routes actuelles pilotent encore largement des commandes. Ce n'est pas une erreur immédiate, mais une dette d'architecture.
- `docs/16_ARCHITECTURE_PRODUCTION_PLAN.md` demande une vue publique unique du plan, alors que chaque poste reconstruit encore sa propre vision depuis Supabase.
- `docs/19_ARCHITECTURE_EVENTS.md` place les événements comme seule manière de modifier l'état. Le code actuel modifie directement Supabase depuis les postes. Cette cible ne doit pas être appliquée brutalement.
- `docs/09_REGLES_METIER.md` interdit de bloquer une action humaine pour une raison de recommandation. Toute future migration Scheduler devra conserver les actions manuelles existantes.

### Ambiguïtés à clarifier avant implémentation métier

- Les documents 14 à 19 sont demandés, mais `docs/20_ARCHITECTURE_LEARNING.md` est aussi présent localement. Il faut confirmer s'il devient document officiel au même titre que les autres.
- Le mapping exact entre les statuts actuels (`to_prepare`, `in_oven`, `ready`, `delivered`, `cancelled`) et les statuts cible des `WorkUnit` doit être fixé avant écriture d'un Scheduler.
- Le champ historique `OrderItem.prepared` existe encore. Il faut confirmer s'il doit être ignoré au profit de `production_status` ou conservé comme compatibilité.
- Une `ProductionUnit` calculée doit avoir un identifiant déterministe. Proposition : `pizza:{order_item.id}` et `panino:{panino_order_item.id}`.
- Le statut `orders.status = ready` peut rendre tous les items prêts même si certains `order_items.production_status` sont anciens. Cette règle de compatibilité doit être documentée dans l'adaptateur.

## 28.5 Migration progressive recommandée vers ProductionUnit / WorkUnit

### Étape 1 - ProductionUnit en mémoire

Objectif :

- créer un adaptateur pur qui transforme les commandes actuelles en `ProductionUnit[]`.

Statut au 2026-08-02 :

- implémenté dans `src/lib/production-units.ts` ;
- testé dans `src/lib/production-units.test.ts` ;
- non consommé par les postes ;
- non persisté en base.

Contraintes :

- aucune migration Supabase ;
- aucune route modifiée ;
- aucun changement d'interface ;
- aucune décision métier nouvelle.

Fichiers probables :

- `src/lib/kds-types.ts`
- `src/lib/production-units.ts`
- `src/lib/production-units.test.ts`
- `docs/13_ETAT_DU_PROJET.md`

Validation :

- `Regina x4` doit produire 4 unités pizza distinctes ;
- une commande `ready` ou `delivered` doit produire des unités terminées ou exclues selon le contexte testé ;
- une commande `cancelled` ne doit plus compter dans la charge active ;
- les extras, retraits, base réelle et heure demandée doivent être conservés.

### Étape 2 - WorkUnit en mémoire

Objectif :

- dériver des `WorkUnit[]` depuis les `ProductionUnit[]`, sans Scheduler.

Statut au 2026-08-03 :

- implémenté dans `src/lib/work-units.ts` ;
- testé dans `src/lib/work-units.test.ts` ;
- non consommé par les postes ;
- non persisté en base ;
- sans Scheduler, Dispatcher, ProductionPlan ni Batch.

Contraintes :

- statuts calculés depuis l'existant ;
- dépendances simples uniquement ;
- pas de table `work_units`.

Fichiers probables :

- `src/lib/work-units.ts`
- `src/lib/work-units.test.ts`
- `docs/13_ETAT_DU_PROJET.md`

Validation :

- pizza : préparation puis cuisson puis finition éventuelle ;
- Pani'NO : pain puis assemblage, avec préparation anticipable ;
- Fish & NO : poisson, pommes/frites et assemblage ;
- frites et grenailles ne doivent pas être considérées comme compatibles dans le même bain.

### Étape 3 - Double calcul de diagnostic

Objectif :

- comparer les résultats legacy avec les unités calculées en mémoire.

Statut au 2026-08-03 :

- un premier diagnostic `ProductionUnit` en lecture seule existe dans `src/lib/production-units-diagnostics.ts` ;
- il vérifie la cohérence source -> unités générées en utilisant `buildProductionUnits()` comme source de vérité ;
- il détecte aussi les incohérences temporelles `ready_at` / `done_at` ;
- il n'est pas intégré aux postes ni à l'interface de production ;
- le double calcul par poste reste à faire avant toute migration d'écran.

Contraintes :

- comparaison en tests ou diagnostic interne uniquement ;
- aucun poste ne consomme encore le nouveau modèle ;
- aucune bascule utilisateur.

Fichiers probables :

- `src/lib/production-diagnostics.ts`
- `src/lib/production-diagnostics.test.ts`
- `docs/13_ETAT_DU_PROJET.md`

Validation :

- même nombre de pizzas actives que `buildPizzaioloQueue()`;
- mêmes exclusions que `cashier-flow`;
- même stock pâtons attendu que `computeStock()`;
- différences explicitement listées au lieu d'être masquées.

### Étape 3bis - Scheduler Core en mémoire

Objectif :

- ordonner les `WorkUnit[]` déjà validées, sans Batch, sans Dispatcher et sans ProductionPlan persistant.

Statut au 2026-08-03 :

- implémenté dans `src/lib/scheduler-core.ts` ;
- testé dans `src/lib/scheduler-core.test.ts` ;
- validé métier dans `src/lib/scheduler-core.business.test.ts` ;
- non consommé par les postes ;
- non persisté en base ;
- sans Batch, Dispatcher ni ProductionPlan.

Contraintes :

- Work Units `available` uniquement ;
- dépendances `completed` obligatoires ;
- groupement par `targetStation` ;
- ordre déterministe ;
- aucune mutation des entrées.

Validation :

- les Work Units non disponibles sont ignorées ;
- les Work Units dont une dépendance manque ou n'est pas terminée sont ignorées ;
- les postes sont groupés dans un ordre stable ;
- deux entrées équivalentes produisent le même plan.
- les chaînes pizza, pizza préparée, pizza avec post-cuisson, Pani'NO, Fish & NO, frites, grenailles et commande mixte produisent les postes attendus.

### Étape 3ter - Batch Builder en mémoire

Objectif :

- regrouper les Work Units déjà planifiées en Batchs projetés, sans Dispatcher et sans ProductionPlan persistant.

Statut au 2026-08-03 :

- implémenté dans `src/lib/batch-builder.ts` ;
- testé dans `src/lib/batch-builder.test.ts` ;
- non consommé par les postes ;
- non persisté en base ;
- sans Dispatcher ni ProductionPlan.

Contraintes :

- entrée unique : `SchedulerExecutionPlan` ;
- fournées pizza Four limitées à `pizza.cooking` ;
- capacité pizza Four : 4 ;
- autres postes en batch unitaire ;
- ordre Scheduler conservé dans chaque batch et dans `batchedWorkUnitIds` ;
- `batches.flatMap(batch.workUnitIds)` n'est pas l'ordre global d'exécution ;
- aucune mutation des entrées.

Validation :

- 1 à 4 pizzas créent une seule fournée projetée ;
- 5 pizzas créent 4 + 1 ;
- 8 pizzas créent 4 + 4 ;
- deux cuissons pizza séparées par une tâche Pani'NO restent regroupables physiquement sans modifier `batchedWorkUnitIds` ;
- les autres postes restent unitaires ;
- aucune Work Unit planifiée n'est perdue ou dupliquée.

### Étape 3quater - ProductionPlan consolidé en mémoire

Objectif :

- assembler les projections existantes dans une vue unique de production projetée, sans Dispatcher et sans persistance.

Statut au 2026-08-03 :

- implémenté dans `src/lib/production-plan.ts` ;
- testé dans `src/lib/production-plan.test.ts` et `src/lib/production-plan.business.test.ts` ;
- non consommé par les postes ;
- non persisté en base ;
- sans Dispatcher.

Contraintes :

- chaîne orchestrée : `buildProductionUnits()` -> `buildWorkUnits()` -> `diagnoseWorkUnits()` -> `buildSchedulerPlan()` -> `buildBatchPlan()` ;
- aucune duplication des règles déjà présentes dans les briques existantes ;
- `isUsable` dépend des anomalies bloquantes issues du diagnostic et de la cohérence Scheduler/BatchPlan ;
- vues par poste calculées depuis le Scheduler et les Batchs ;
- aucune mutation des entrées.

Validation :

- commandes pizza, mixte pizza + Pani'NO, Fish & NO et multi-commandes ;
- produit `other` sans workflow ;
- dépendance manquante ;
- diagnostic incohérent ;
- ordre Scheduler conservé ;
- Batchs présents ;
- vues par poste cohérentes ;
- même entrée -> même sortie ;
- absence de mutation des entrées.

### Étape 4 - Premier lecteur Pizzaiolo, sans changement visuel majeur

Objectif :

- migrer seulement la lecture du poste Pizzaiolo vers une projection issue du `ProductionPlan`, après validation terrain en lecture seule.

Contraintes :

- aucune suppression du moteur legacy ;
- aucun changement de comportement manuel ;
- le pizzaiolo peut toujours lancer, réorganiser et supprimer.

Validation :

- même file visible qu'avant migration ;
- même comportement de fournée ;
- l'ordre manuel reste prioritaire.

### Étape 5 - Four puis Pani'NO puis Prêtes

Ordre recommandé conforme à `docs/14_ARCHITECTURE_WORK_UNITS.md` :

```text
Pizzaiolo -> Four -> Pani'NO -> Prêtes
```

Chaque poste doit être migré seul, validé, puis seulement ensuite le poste suivant peut démarrer.

### Étape 6 - Persistance future

À ne commencer qu'après validation terrain :

- tables `production_units` ;
- tables `work_units` ;
- batches persistants ;
- événements idempotents ;
- publication de `ProductionPlan`.

Cette étape nécessite une migration Supabase et ne fait pas partie de la prochaine implémentation.

## 28.6 Petites étapes testables proposées

1. Créer uniquement les types `ProductionUnit` et l'adaptateur legacy.
2. Tester l'adaptateur sur pizzas simples, pizzas multiples, commandes prêtes, livrées et annulées.
3. Ajouter les produits Pani'NO / Fish & NO / frites dans le même adaptateur.
4. Ajouter un rapport de diagnostic comparant les counts legacy et `ProductionUnit`.
5. Créer seulement ensuite les `WorkUnit` calculées en mémoire.
6. Ajouter des tests de dépendances WorkUnit sans modifier les postes.
7. Comparer Pizzaiolo legacy et Pizzaiolo projeté avant toute bascule.
8. Migrer un seul poste à la fois, en commençant par Pizzaiolo.

## 28.7 Risques de régression

- Créer trop tôt une persistance `ProductionUnit` produirait une double source de vérité.
- Modifier les routes avant l'adaptateur rendrait impossible de comparer ancien et nouveau comportement.
- Confondre `OrderItem` commercial et `ProductionUnit` physique casserait le cas `Regina x4`.
- Interpréter les événements actuels comme un Event Store complet ferait croire à une garantie d'idempotence inexistante.
- Introduire `Scheduler` avant `WorkUnit` imposerait une architecture trop abstraite et difficile à tester.

## 28.8 Parties à conserver absolument

- Le moteur Caisse actuel et ses tests pendant la phase d'adaptateur.
- Les actions manuelles Pizzaiolo existantes.
- La vision commande complète du Four.
- La logique Pani'NO permettant du temps masqué.
- La suppression logique `cancelled`.
- Le reset stock pâtons basé sur `paton_stock_reset_at`.
- Le service worker prudent qui ne cache pas les données KDS.

## 28.9 Prochaine branche recommandée

```text
refactor/production-plan-shadow-validation
```

Objectif unique :

- comparer le `ProductionPlan` en mémoire avec des données réelles/exportées anonymisées, sans migration, sans écran modifié et sans Dispatcher.

---

# 29. Shadow Production silencieux

## 29.1 Statut au 2026-08-05

Branche : `feature/shadow-production`

Objectif :

- exécuter le `ProductionPlan` en continu en parallèle du KDS existant ;
- observer uniquement les résultats en mémoire ;
- ne modifier aucun comportement opérateur.

Statut :

- implémenté en mémoire dans `src/lib/shadow-production.ts` ;
- testé dans `src/lib/shadow-production.test.ts` ;
- déclenché discrètement après le rechargement normal des commandes dans `src/hooks/use-kds-data.ts` ;
- non branché aux postes comme source de décision ;
- non visible dans l'interface.

## 29.2 Architecture retenue

Le runner Shadow Production orchestre les briques déjà validées :

```text
orders deja chargees par le KDS
-> buildProductionUnits()
-> buildWorkUnits()
-> diagnoseWorkUnits()
-> buildSchedulerPlan()
-> buildBatchPlan()
-> assembleProductionPlan()
-> ShadowProductionReport en memoire
```

Le module ne réimplémente pas les règles métier du `ProductionPlan`.
Il mesure uniquement les phases et transforme le résultat en rapport observable.

Rapport produit :

- date de démarrage ;
- durée totale ;
- temps `ProductionUnits`, `WorkUnits`, diagnostic, Scheduler, BatchBuilder et assemblage ;
- exploitabilité du plan ;
- nombre de commandes ;
- nombre de `ProductionUnits` ;
- nombre de `WorkUnits` ;
- nombre de batchs ;
- couverture des donnees (`orders`, `orderItems`, `paninoItems`) ;
- statut de performance `ok` ou `slow` ;
- nombre de warnings non bloquants ;
- nombre d'anomalies bloquantes ;
- diagnostics texte non bloquants et bloquants ;
- dernier rapport conservé uniquement en mémoire du navigateur.

Seuil de performance :

- constante : `SHADOW_PRODUCTION_SLOW_THRESHOLD_MS = 100` ;
- un dépassement produit le warning non bloquant `shadow_production_slow` ;
- ce warning ne rend pas le plan inutilisable et ne bloque jamais le KDS.

## 29.3 Point d'intégration

Point actuel :

- `src/hooks/use-kds-data.ts`, dans `useOrders()`, juste après `setOrders(ordersWithItems)`.

Raison :

- c'est l'endroit où le KDS recharge déjà `orders` et `order_items` ;
- aucune requête Supabase supplémentaire n'est ajoutée ;
- aucune valeur du rapport n'est retournée aux composants ;
- les écrans continuent à consommer exclusivement `orders` comme avant.

Limitation volontaire :

- `useOrders()` ne charge pas `panino_order_items` ;
- le branchement actuel passe donc `paninoItems: []` avec `coverage.paninoItems = false` pour ne pas modifier le comportement réseau ;
- le rapport ajoute le warning non bloquant `panino_items_not_included` ;
- ce warning ne rend pas le plan inutilisable ;
- les produits Pani'NO, Fish & NO, frites et grenailles devront être observés dans une passe ultérieure à partir des données déjà chargées par leur hook dédié ou via un collecteur unifié explicitement validé.

Déclenchements rapprochés :

- `scheduleShadowProductionRun()` coalesce les executions programmees ;
- si plusieurs reloads Realtime arrivent avant l'execution differee, seul le dernier snapshot est calcule ;
- la mise a jour React normale via `setOrders()` n'est pas retardee.

Limite thread principal :

- le calcul est differé avec `queueMicrotask` ou `setTimeout(0)` selon l'environnement ;
- il n'est pas parallelise ;
- il reste execute sur le thread principal du navigateur ;
- un Web Worker ne doit etre envisage que si les mesures terrain montrent un cout CPU significatif.

## 29.4 Garanties de sécurité

Garanties confirmées par conception :

- aucune écriture Supabase ;
- aucune migration ;
- aucune modification visible de l'interface ;
- aucun Dispatcher ;
- aucune persistance du `ProductionPlan` ;
- aucun remplacement des calculs legacy ;
- aucune décision métier prise depuis le nouveau moteur ;
- aucune donnée `.local` utilisée ou commitée ;
- aucune nouvelle requête Supabase dédiée au Shadow Production ;
- les erreurs du `ProductionPlan` sont capturées et transformées en rapport d'échec ;
- une erreur Shadow Production ne doit jamais interrompre le KDS.
- en cas d'erreur Supabase pendant le chargement `orders` ou `order_items`, le comportement legacy est conserve autant que possible, mais le Shadow Production n'est pas lance sur des donnees potentiellement incompletes ;
- l'erreur de chargement est seulement journalisee par un avertissement developpeur non intrusif.

Mode debug :

- désactivé par défaut ;
- sortie console uniquement ;
- activable par `window.__KDS_SHADOW_PRODUCTION_DEBUG__ = true`, par `localStorage["kds.shadowProduction.debug"] = "1"` ou par le paramètre `?shadowProductionDebug=1` ;
- aucun affichage React n'est créé.

## 29.5 Tests ajoutés

Fichier :

- `src/lib/shadow-production.test.ts`

Cas couverts :

- rapport exploitable avec compteurs cohérents ;
- couverture `paninoItems` absente signalee comme warning non bloquant ;
- couverture complete sans warning de couverture ;
- mesure des performances Scheduler et BatchBuilder ;
- duree normale avec `performanceStatus = ok` ;
- duree superieure au seuil avec `performanceStatus = slow` et warning non bloquant ;
- coalescence des executions rapprochees, seul le snapshot le plus recent est publie ;
- exception capturée sans interruption ;
- plan inutilisable transformé en rapport cohérent ;
- separation entre warnings non bloquants et anomalies bloquantes ;
- même entrée et même horloge -> même rapport ;
- absence de mutation des données source ;
- sortie console limitée au mode debug.

## 29.6 Limitations restantes

- Le rapport Shadow Production reste local au navigateur et non historisé.
- Aucune comparaison automatique avec les vues legacy de production n'est encore faite en continu.
- Les données Pani'NO/Fish & NO ne sont pas encore injectées dans le déclenchement runtime de `useOrders()`.
- Aucune métrique de service réel n'est persistée.
- Les performances sont mesurées côté navigateur, sans agrégation multi-postes.
- Warning ESLint connu hors chantier : `react-hooks/exhaustive-deps` signale `reload` dans `useProductionEvents()` de `src/hooks/use-kds-data.ts`. Ce warning existait déjà avant le branchement Shadow Production, ne concerne pas `useOrders()` et n'est pas corrigé dans cette branche pour éviter un refactor de hook non lié.
- Toute utilisation opérationnelle du `ProductionPlan` par les postes doit attendre une observation terrain explicite et documentée.

## 29.7 Prochaine étape recommandée

Objectif unique :

- effectuer une observation Shadow Production sur un second export réel plus riche puis sur un service réel avec mode debug ponctuel, sans brancher les postes.

Échantillon à couvrir :

- une pizza préparée ;
- une pizza en cuisson ;
- une commande prête ou livrée ;
- une commande annulée ;
- plusieurs bases ;
- une pizza avec post-cuisson ;
- un produit Pani'NO ou Fish & NO dès que des données existent.

---

# 30. ViewModel Pizzaiolo issu du ProductionPlan

## 30.1 Statut au 2026-08-05

Branche : `feature/production-plan-view-model`

Objectif :

- préparer le remplacement futur du poste Pizzaiolo sans modifier l'interface actuelle ;
- exposer une projection simple du `ProductionPlan`, consommable plus tard par une interface ;
- conserver le KDS existant comme seule source opérationnelle visible pour les postes.

Statut :

- implémenté en mémoire dans `src/lib/view-models/pizzaiolo-view-model.ts` ;
- testé dans `src/lib/view-models/pizzaiolo-view-model.test.ts` ;
- commit : `c8b16cf Add scheduler-backed pizzaiolo view model` ;
- non branché à React ;
- non utilisé par les postes ;
- sans requête Supabase, sans migration, sans Dispatcher et sans persistance.

## 30.2 Rôle du ViewModel

Le ViewModel transforme uniquement un `ProductionPlan` déjà calculé.

Il ne reconstruit pas :

- les `ProductionUnit` ;
- les `WorkUnit` ;
- le Scheduler ;
- les batchs ;
- les diagnostics.

Il ne prend pas de décision métier.
Il expose seulement les données déjà validées sous une forme plus facile à consommer par une future interface Pizzaiolo.

API actuelle :

- `buildPizzaioloViewModel(plan)` ;
- `availableWorkUnits` : tâches Pizzaiolo planifiables dans l'ordre du Scheduler ;
- `pizzasReadyToPrepare` : sous-ensemble des pizzas dont la préparation Pizzaiolo est disponible ;
- `groupedOrders` : regroupement par commande des tâches Pizzaiolo et des produits physiques associés ;
- `blockedWorkUnits` : tâches Pizzaiolo bloquées avec dépendances visibles ;
- `completedDependencies` : dépendances déjà terminées, utiles pour afficher les déblocages futurs ;
- `selection` : données préparant la sélection unitaire, multi-commandes et "tout sélectionner" ;
- `recommendations` : indication strictement descriptive de suivre l'ordre Scheduler ;
- `diagnostics` : résumé texte des anomalies bloquantes du `ProductionPlan`.

Données pizza déjà exposées par le ViewModel :

- identifiant `ProductionUnit` ;
- identifiant source de l'article ;
- heure demandée ;
- nom client ;
- base réelle si connue ;
- suppléments ;
- retraits ;
- découpe.

## 30.3 Séparation moteur / interface

Garantie de séparation :

- aucun composant React modifié ;
- aucun hook de chargement modifié ;
- aucune route KDS modifiée ;
- aucun comportement Pizzaiolo legacy remplacé ;
- aucune logique d'ordre manuel ajoutée ;
- aucune action de sélection ou d'envoi au four implémentée.

Le ViewModel prépare seulement les futures vues :

- plan de travail Pizzaiolo ;
- regroupement par commande ;
- sélection d'une commande complète ;
- sélection de plusieurs commandes ;
- bouton "Tout sélectionner" ;
- futurs écrans de supervision.

Le contrat de sélection est volontairement strict :

- `selectableWorkUnitIds` est dérivé uniquement des Work Units Pizzaiolo réellement planifiées par le Scheduler ;
- `selectableOrderIds` est dérivé des mêmes Work Units et respecte leur ordre Scheduler ;
- une Work Unit absente du Scheduler n'est jamais sélectionnable, même si son statut brut vaut `available` ;
- un `ProductionPlan` non exploitable ne produit aucune sélection ;
- `hasSelectableWorkUnits` indique seulement qu'au moins une Work Unit peut être sélectionnée, sans décider si l'interface doit afficher ou non un bouton "Tout sélectionner".

Périmètre des groupes :

- `workUnitIds`, `availableWorkUnitIds`, `blockedWorkUnitIds` et `completedWorkUnitIds` ne contiennent que des Work Units du poste Pizzaiolo ;
- les Work Units Four, Pani'NO, friteuse poisson, friteuse frites et remise ne sont pas incluses dans ces listes ;
- `productKinds` et `productNames` représentent en revanche toute la commande afin de conserver le contexte des commandes mixtes.

## 30.4 Garanties d'immutabilité

Le module est pur et déterministe :

- il reçoit un `ProductionPlan` ;
- il retourne un objet de présentation ;
- il ne modifie pas le plan d'entrée ;
- il clone les tableaux exposés ;
- deux appels avec le même plan produisent le même résultat.

Cette garantie permet de comparer plus tard le poste Pizzaiolo legacy et le futur poste basé sur `ProductionPlan` sans perturber le service.

## 30.5 Tests ajoutés

Fichier :

- `src/lib/view-models/pizzaiolo-view-model.test.ts`

Cas couverts :

- `ProductionPlan` vide ;
- pizza simple disponible au poste Pizzaiolo ;
- regroupement d'une commande mixte pizza + Pani'NO ;
- dépendance bloquée et diagnostic associé ;
- Work Unit `available` mais non planifiée, donc non sélectionnable ;
- plan non exploitable avec sélection vide ;
- commande sans Work Unit Pizzaiolo planifiée, donc non sélectionnable ;
- ordre de `selectableOrderIds` conforme au Scheduler ;
- exclusion des Work Units hors poste Pizzaiolo dans les groupes ;
- commande livrée avec tâche Pizzaiolo terminée ;
- ordre déterministe des groupes ;
- même entrée -> même sortie ;
- absence de mutation du `ProductionPlan`.

## 30.6 Limitations restantes

- Le ViewModel ne pilote encore aucune interface.
- La recommandation actuelle expose seulement l'ordre Scheduler, sans arbitrage métier supplémentaire.
- Les actions futures de sélection, réservation, déplacement ou envoi au four ne sont pas implémentées.
- Les données Pani'NO/Fish & NO dépendront toujours de la couverture runtime réelle du `ProductionPlan`.
- Aucun comparateur silencieux avec le poste Pizzaiolo legacy n'existe encore.
- Les futurs emplacements des quatre disques de préparation ne sont pas encore représentés.
- Aucun état de sélection utilisateur, de réservation opérateur ou de verrouillage tactile n'existe encore.
- Les regroupements métier par base, par fournée ou par stratégie de fatigue ne sont pas exposés par ce ViewModel.

## 30.7 Prochaine étape recommandée

Objectif unique :

- valider ce ViewModel sur des snapshots `ProductionPlan` plus riches, puis créer une comparaison silencieuse avec les données actuellement affichées par le poste Pizzaiolo legacy, sans brancher l'interface.

---

# 31. Comparaison silencieuse Pizzaiolo legacy

## 31.1 Statut au 2026-08-06

Branche : `feature/pizzaiolo-legacy-shadow-comparison`

Objectif :

- comparer en lecture seule le `PizzaioloViewModel` issu du `ProductionPlan` avec les données que le poste Pizzaiolo legacy rend visibles ou actionnables ;
- détecter les écarts avant tout branchement d'interface ;
- ne corriger automatiquement ni le legacy, ni le `ProductionPlan`, ni le ViewModel.

Statut :

- implémenté en mémoire dans `src/lib/view-models/pizzaiolo-legacy-shadow-comparison.ts` ;
- testé dans `src/lib/view-models/pizzaiolo-legacy-shadow-comparison.test.ts` ;
- non branché à React ;
- sans hook modifié ;
- sans requête Supabase supplémentaire ;
- sans écriture, migration, Dispatcher ou persistance.

## 31.2 Poste legacy audité

Fichiers concernés :

- `src/routes/_kds/pizzaiolo.tsx` ;
- `src/hooks/use-kds-data.ts` ;
- `src/lib/pizzaiolo-queue.ts` ;
- `src/lib/pizza-production.ts` ;
- `src/lib/pizzaiolo-batch-planner.ts`.

Fonctionnement legacy observé :

- la route utilise `useOrders()`, `usePaninoOrderItems()`, `usePizzas()` et `useSettings()` ;
- la file affichée est construite avec `buildPizzaioloQueue(orders, paninoItems)` ;
- seules les commandes actives sont prises en compte ;
- les pizzas affichées/actionnables sont celles dont `pizzaProductionStatus(item, order) === "to_prepare"` ;
- les commandes `delivered` et `cancelled` sont exclues de la file ;
- les pizzas `in_oven` ou `ready` ne sont plus actionnables au poste Pizzaiolo ;
- les commandes sont triées par position manuelle `pizzaiolo_queue_position`, puis par heure demandée, puis par nom client ;
- les commandes d'un même client, même jour et même heure sont regroupées dans un `PizzaioloQueueJob` ;
- les détails affichés utilisent `getPizzaDisplayDetails()` : base, suppléments restants, retraits restants et découpe ;
- les commandes mixtes conservent un contexte Pani'NO/Fish/frites via les `panino_order_items` non terminés ;
- le plan de travail à quatre disques, la sélection tactile et la suggestion intelligente restent des états React locaux et ne sont pas modélisés dans ce comparateur.

## 31.3 Snapshot legacy pur

Le type `LegacyPizzaioloSnapshot` représente uniquement la projection legacy visible/actionnable :

- commandes visibles ;
- commandes actionnables ;
- pizzas visibles ;
- pizzas actionnables ;
- jobs Pizzaiolo ;
- contexte produits par commande ;
- pizzas avec base, suppléments, retraits, découpe et statut ;
- pizzas dont la base legacy reste ambiguë.

Contrat explicite :

- `visibleOrderIds` : commandes conservées par la file legacy comme contexte affichable au poste Pizzaiolo ;
- `actionableOrderIds` : commandes pour lesquelles le poste Pizzaiolo a une action réelle à effectuer ;
- `visiblePizzaItemIds` : pizzas présentes dans la file legacy ;
- `actionablePizzaItemIds` : pizzas encore préparables par le pizzaiolo.

Construction :

- fonction `buildLegacyPizzaioloSnapshot({ orders, paninoItems, pizzas })` ;
- aucune référence React ;
- aucune requête Supabase ;
- aucune mutation des données d'entrée ;
- réutilisation des helpers legacy purs déjà existants.

## 31.4 Comparateur

Fonction :

- `comparePizzaioloViewModelWithLegacy({ legacy, viewModel })`.

Rapport :

- `matches` ;
- `warnings` ;
- `blockingDifferences` ;
- `unsupported` ;
- `summary`.

Comparaisons actuellement implémentées :

- commandes visibles legacy vs commandes de contexte encore pertinentes dans `viewModel.groupedOrders` ;
- commandes actionnables legacy vs commandes sélectionnables dans `viewModel.selection.selectableOrderIds` ;
- pizzas actionnables legacy vs pizzas prêtes à préparer du ViewModel ;
- ordre des commandes ;
- ordre des pizzas ;
- statut actionnable ;
- base ;
- suppléments ;
- retraits ;
- découpe ;
- contexte de commande mixte ;
- éléments présents dans le legacy mais absents du ViewModel ;
- éléments présents dans le ViewModel mais absents du legacy ;
- bases ambiguës non comparables avec certitude.

La comparaison ne mélange plus visibilité et actionnabilité :

- `visible_order_set_matches` / `visible_order_set_differs` portent sur le contexte visible ;
- `actionable_order_set_matches` / `actionable_order_set_differs` portent sur la sélection possible ;
- `actionable_pizza_set_matches` / `actionable_pizza_set_differs` portent sur les pizzas réellement préparables.

Cas Pani'NO sans pizza :

- une commande Pani'NO sans pizza peut rester visible au Pizzaiolo pour le pain ;
- elle est actionnable seulement si une Work Unit Pizzaiolo planifiée existe ;
- l'absence de pizza ne crée pas automatiquement de différence bloquante ;
- la couverture runtime incomplète des `panino_order_items` reste suivie séparément dans Shadow Production.

Regroupement legacy :

- le legacy peut regrouper plusieurs commandes dans un même `PizzaioloQueueJob` lorsqu'elles partagent client, jour et heure ;
- le ViewModel reste groupé par `orderId` ;
- le comparateur compare les ensembles par identifiant de commande et l'ordre séparément ;
- cette différence structurelle ne doit pas faire perdre une commande ni devenir une erreur métier automatique.

Portée des statuts :

- approche minimale retenue ;
- les statuts non actionnables (`in_oven`, `ready`, `delivered`, `cancelled`) sont validés par leur exclusion des ensembles visibles/actionnables ;
- leurs détails internes ne sont pas encore comparés article par article ;
- cette limite est acceptable avant tout branchement runtime.

Classification :

- `match` : contenu cohérent ;
- `warning` : écart non bloquant, notamment ordre legacy manuel différent de l'ordre Scheduler ;
- `blocking_difference` : écart pouvant modifier ce qui est visible ou actionnable ;
- `unsupported` : donnée ambiguë ou interaction UI locale non modélisée.

Un `pizza_details_match` n'est produit que lorsque tous les détails comparables ont été vérifiés avec certitude : statut, base, suppléments, retraits et découpe. Si au moins un détail est `unsupported`, par exemple une base ambiguë, aucun match global de détail n'est ajouté pour cette pizza.

Résumé du rapport :

- `legacyVisibleOrders` et `viewModelVisibleOrders` comparent les commandes visibles/contextuelles ;
- `legacyActionableOrders` et `viewModelSelectableOrders` comparent les commandes actionnables/sélectionnables ;
- `legacyVisiblePizzas`, `legacyActionablePizzas` et `viewModelActionablePizzas` distinguent visibilité legacy et action réelle ;
- `isConsistent` reste fondé sur l'absence de `blockingDifferences`, même si des `warning` ou `unsupported` peuvent subsister.

Les compteurs `matches`, `warnings`, `blockingDifferences` et `unsupported` représentent des nombres de diagnostics émis. Ils ne doivent pas être lus comme un nombre d'entités distinctes : un même écart d'ensemble peut produire à la fois un diagnostic agrégé `*_set_differs` et un ou plusieurs diagnostics par identifiant absent. Aucun consommateur opérationnel ne dépend encore de ces compteurs.

## 31.5 Tests ajoutés

Fichier :

- `src/lib/view-models/pizzaiolo-legacy-shadow-comparison.test.ts`

Cas couverts :

- même contenu et même ordre ;
- commandes visibles identiques ;
- commandes actionnables identiques ;
- commande visible mais non actionnable ;
- même contenu mais ordre différent ;
- pizza visible legacy absente du ViewModel ;
- pizza ViewModel absente du legacy ;
- commande annulée ;
- commande terminée ;
- pizza déjà en cuisson ;
- commande mixte ;
- commande Pani'NO sans pizza ;
- deux commandes regroupées dans un même job legacy ;
- base modifiée ;
- suppléments et retraits ;
- découpe ;
- données legacy ambiguës ;
- base ambiguë sans faux `pizza_details_match` ;
- déterminisme ;
- absence de mutation.

## 31.6 Limitations restantes

- Le comparateur n'est pas encore exécuté automatiquement en Shadow Production.
- Les quatre disques de préparation restent hors modèle.
- Les sélections utilisateur en cours ne sont pas comparées.
- Les actions de réorganisation et suppression restent hors périmètre de comparaison.
- Les écarts ne déclenchent aucune correction automatique.

## 31.7 Prochaine étape recommandée

Objectif unique :

- brancher ce comparateur en mode Shadow Production développeur uniquement, avec rapport console/debug ou rapport en mémoire, sans modifier l'interface Pizzaiolo et sans changer les décisions opérationnelles.

---

# 32. Branchement développeur Pizzaiolo Shadow Comparison

## 32.1 Statut au 2026-08-06

Branche : `feature/pizzaiolo-runtime-shadow-comparison`

Commits de base :

- `239ec30 Add resilient shadow production runtime` ;
- `c8b16cf Add scheduler-backed pizzaiolo view model` ;
- `8d39484 Add pizzaiolo legacy shadow comparison`.

Objectif :

- exécuter silencieusement le comparateur Pizzaiolo legacy / `PizzaioloViewModel` pendant l'utilisation du poste Pizzaiolo ;
- limiter l'affichage aux développeurs lorsque le debug Shadow Production est activé ;
- observer les écarts sans changer le comportement opérationnel.

Ce branchement n'est pas une validation terrain. Il prépare seulement l'observation contrôlée sur service réel.

## 32.2 Point de collecte runtime

Point d'intégration minimal :

- `src/routes/_kds/pizzaiolo.tsx`.

Données utilisées :

- `orders` déjà fournis par `useOrders()` ;
- `paninoItems` déjà fournis par `usePaninoOrderItems()` ;
- `pizzas` déjà fournies par `usePizzas()`.

Le branchement se limite à un `useEffect()` non rendu. Il vérifie d'abord l'interrupteur debug Shadow Production, puis appelle `schedulePizzaioloRuntimeShadowComparison(...)` uniquement si le debug est activé.

Aucune nouvelle requête Supabase n'est ajoutée pour cette comparaison. Aucun état d'interface n'est ajouté. Aucun rendu, toast, badge ou action utilisateur n'est modifié.

Debug désactivé :

- aucune comparaison n'est programmée ;
- aucun `ProductionPlan` n'est construit pour ce comparateur Pizzaiolo ;
- aucun `PizzaioloViewModel`, snapshot legacy ou rapport de comparaison n'est produit ;
- aucun coût de calcul supplémentaire n'est ajouté au poste Pizzaiolo.

Debug activé :

- la comparaison complète est programmée de manière différée et coalescée ;
- le calcul reste exécuté sur le thread principal ;
- le rapport reste uniquement en mémoire navigateur ;
- aucun poste ne consomme le résultat.

## 32.3 Runner Runtime

Module :

- `src/lib/view-models/pizzaiolo-runtime-shadow.ts`.

Chaîne exécutée :

```text
orders / paninoItems / pizzas déjà chargés
-> buildProductionPlan()
-> buildPizzaioloViewModel()
-> buildLegacyPizzaioloSnapshot()
-> comparePizzaioloViewModelWithLegacy()
-> PizzaioloRuntimeShadowReport en mémoire
```

Le runner orchestre les briques existantes. Il ne réimplémente ni le Scheduler, ni le comparateur, ni les règles legacy.

## 32.4 Couverture des Données

Le rapport expose :

- `coverage.orders` ;
- `coverage.orderItems` ;
- `coverage.paninoItems` ;
- `coverage.pizzas`.

Le comparateur complet ne s'exécute que si les données nécessaires sont disponibles pour les deux projections.

Comportement attendu :

- si `paninoItems` manque, statut `skipped` avec diagnostic `pizzaiolo_comparison_panino_data_missing` ;
- si le catalogue pizzas manque, statut `skipped` avec diagnostic `pizzaiolo_comparison_pizza_catalog_missing` ;
- ces absences ne deviennent pas des `blocking_difference`.

## 32.5 Mode Debug

Le debug réutilise les mêmes interrupteurs que Shadow Production :

- `window.__KDS_SHADOW_PRODUCTION_DEBUG__ = true` ;
- `localStorage["kds.shadowProduction.debug"] = "1"` ;
- `?shadowProductionDebug=1`.

En mode normal :

- aucune comparaison runtime n'est programmée ;
- aucun rapport Pizzaiolo Shadow Comparison n'est calculé ;
- aucun log détaillé ;
- aucune interface ;
- aucun toast ;
- aucune persistance.

En mode debug :

- comparaison runtime complète ;
- synthèse console `PIZZAIOLO SHADOW COMPARISON` ;
- compteurs legacy / ViewModel alignés ;
- durée totale ;
- diagnostics détaillés uniquement s'il existe warning, différence bloquante ou unsupported.

La synthèse console ne contient pas de nom client ni de téléphone. Les identifiants techniques peuvent apparaître dans les diagnostics développeur lorsque cela aide à localiser un écart.

## 32.6 Coalescence

Le runner fournit `createPizzaioloRuntimeShadowScheduler()` et `schedulePizzaioloRuntimeShadowComparison()`.

Garanties :

- plusieurs programmations rapprochées ne déclenchent qu'un calcul sur le dernier snapshot reçu ;
- le dernier rapport publié correspond au snapshot le plus récent dans la file ;
- la mise à jour React normale n'est pas retardée ;
- le calcul différé et coalescé reste sur le thread principal ;
- aucun Web Worker n'est introduit dans cette branche.

## 32.7 Résilience

Si une étape échoue :

- l'exception est capturée ;
- un rapport `failed` est publié en mémoire ;
- le KDS continue normalement ;
- aucune donnée n'est écrite ;
- aucune action Pizzaiolo n'est empêchée.

Si le `ProductionPlan` est non exploitable :

- la comparaison peut produire un rapport `success` avec `planUsable: false` ;
- un warning `pizzaiolo_comparison_plan_unusable` est ajouté ;
- aucune correction automatique n'est tentée.

## 32.8 Performance

Le rapport mesure :

- `productionPlanMs` ;
- `viewModelMs` ;
- `legacySnapshotMs` ;
- `comparisonMs` ;
- `totalMs`.

Le seuil non bloquant réutilise `SHADOW_PRODUCTION_SLOW_THRESHOLD_MS = 100`.

Un dépassement ajoute le warning `pizzaiolo_comparison_slow`, sans rendre le plan inutilisable et sans modifier l'interface.

## 32.9 Garanties De Non-Régression

Cette étape ne modifie pas :

- l'interface Pizzaiolo ;
- les actions du poste ;
- `buildPizzaioloQueue()` ;
- les décisions opérationnelles ;
- le Scheduler legacy ;
- Supabase ;
- les statuts ;
- les migrations ;
- les données persistées.

Le KDS legacy reste l'unique comportement visible et opérationnel.

## 32.10 Tests Ajoutés

Fichier :

- `src/lib/view-models/pizzaiolo-runtime-shadow.test.ts`.

Cas couverts :

- règle pure de déclenchement runtime : debug désactivé -> non programmé, debug activé -> programmé ;
- comparaison réussie avec données complètes ;
- absence de `paninoItems` -> `skipped` ;
- absence de catalogue pizzas -> `skipped` ;
- `ProductionPlan` non exploitable ;
- comparaison avec warnings ;
- comparaison avec différences bloquantes ;
- données ambiguës produisant `unsupported` ;
- exception capturée sans propagation ;
- coalescence de plusieurs programmations rapprochées ;
- seul le dernier rapport est publié ;
- sortie console uniquement en mode debug ;
- absence de nom client et téléphone dans la synthèse console ;
- absence de mutation ;
- déterminisme avec horloge injectée.

## 32.11 Limites Restantes

- Le rapport reste local en mémoire navigateur.
- Aucun historique de comparaison n'est conservé.
- Aucun poste ne consomme encore le résultat.
- Les diagnostics ne doivent pas encore déclencher de correction automatique.
- L'observation terrain doit porter sur plusieurs services représentatifs avant toute bascule.

## 32.12 Prochaine Étape Recommandée

Objectif unique :

- observer en environnement réel le rapport debug Pizzaiolo Shadow Comparison sur plusieurs services, sans modifier l'interface Pizzaiolo ni les décisions opérationnelles.

---

# 33. Procédure d’observation terrain Pizzaiolo Shadow Comparison

## 33.1 Objectif

Cette procédure sert à observer le comparateur Pizzaiolo legacy / `PizzaioloViewModel` sur un navigateur ou une tablette de test.

Elle ne valide pas encore le poste Pizzaiolo en production.

Elle ne doit entraîner :

- aucune modification de l’interface ;
- aucune action opérationnelle issue du `ProductionPlan` ;
- aucune écriture Supabase ;
- aucune correction automatique ;
- aucune persistance des rapports ;
- aucun envoi réseau supplémentaire.

## 33.2 Activation Du Debug

Le comparateur runtime Pizzaiolo n’est programmé que lorsque le debug Shadow Production est activé.

Méthodes supportées :

| Méthode | Commande ou URL | Rechargement nécessaire | Persistance | Désactivation | Périmètre |
| --- | --- | --- | --- | --- | --- |
| Variable fenêtre | `window.__KDS_SHADOW_PRODUCTION_DEBUG__ = true` | Pas obligatoire si une mise à jour Realtime arrive ensuite, mais recommandé pour capturer immédiatement un premier snapshot. | Non. Perdue au rechargement et à la fermeture de l’onglet. | `window.__KDS_SHADOW_PRODUCTION_DEBUG__ = false` ou recharger la page. | Onglet courant uniquement. |
| LocalStorage | `localStorage.setItem("kds.shadowProduction.debug", "1")` | Recommandé après activation pour lancer la comparaison dès le chargement du poste. | Oui, pour ce navigateur, ce profil et ce domaine. | `localStorage.removeItem("kds.shadowProduction.debug")`, puis recharger. | Navigateur/profil courant sur le même domaine. |
| Paramètre URL | Ajouter `?shadowProductionDebug=1` à l’URL | La page doit être chargée avec ce paramètre. | Non comme réglage global, mais reste actif tant que l’URL contient le paramètre. | Retirer le paramètre de l’URL et recharger. | Onglet ou lien concerné. |

Recommandation terrain :

- utiliser `localStorage.setItem("kds.shadowProduction.debug", "1")` sur un appareil de test ;
- recharger le poste Pizzaiolo ;
- retirer la clé après observation avec `localStorage.removeItem("kds.shadowProduction.debug")`.

Ces activations concernent uniquement le navigateur ou l’appareil utilisé. Elles ne changent pas le comportement des autres postes.

## 33.3 Procédure Courte D’Observation

1. Ouvrir le poste Pizzaiolo sur un navigateur ou une tablette de test.
2. Ouvrir la console développeur.
3. Activer le debug avec l’une des méthodes de la section 33.2.
4. Recharger la page du poste Pizzaiolo.
5. Créer ou charger quelques commandes représentatives.
6. Attendre les mises à jour Realtime normales.
7. Repérer dans la console les rapports commençant par :

```text
PIZZAIOLO SHADOW COMPARISON
```

8. Relever uniquement les compteurs et codes de diagnostics définis ci-dessous.
9. Désactiver le debug après observation.

L’opérateur ne doit pas modifier sa manière normale d’utiliser le poste.

## 33.4 Scénarios Recommandés

### Scénario A — Pizza Simple

Préparer :

- une commande ;
- une pizza ;
- statut `to_prepare`.

Attendu :

- une commande visible ;
- une commande actionnable ;
- une pizza actionnable ;
- aucune différence bloquante.

### Scénario B — Fournée Complète

Préparer :

- une ou plusieurs commandes ;
- quatre pizzas `to_prepare`.

Observer :

- ordre legacy ;
- ordre ViewModel ;
- pizzas actionnables ;
- durée totale.

### Scénario C — Commandes Multiples

Préparer :

- plusieurs commandes proches ;
- éventuellement même horaire ;
- éventuellement position manuelle legacy.

Observer :

- warnings d’ordre ;
- égalité des ensembles ;
- absence de perte ou duplication.

### Scénario D — Pizza En Cuisson

Préparer :

- une pizza passée en `in_oven`.

Attendu :

- la pizza ne doit plus être actionnable au Pizzaiolo ;
- aucune fausse différence bloquante.

### Scénario E — Commande Annulée Ou Livrée

Attendu :

- exclusion cohérente des ensembles visibles/actionnables.

### Scénario F — Base Et Modifications

Inclure :

- base remplacée ;
- supplément ;
- retrait ;
- découpe.

Observer :

- détails cohérents ;
- aucun faux `pizza_details_match` si une donnée est ambiguë.

### Scénario G — Commande Mixte

Inclure si possible :

- pizza ;
- Pani’NO ;
- Fish & NO ou frites.

Observer :

- commandes visibles ;
- besoin de pain Pani’NO ;
- contexte mixte ;
- absence de faux écart pizza.

## 33.5 Informations À Relever

Pour chaque rapport, relever uniquement :

```text
Date et heure :
Scénario :
Nombre de commandes :
Nombre de pizzas :
Nombre d’items Pani’NO :
Status :
Plan usable :
Legacy visible orders :
ViewModel visible orders :
Legacy actionable orders :
ViewModel selectable orders :
Legacy actionable pizzas :
ViewModel actionable pizzas :
Matches :
Warnings :
Blocking diagnostics :
Unsupported :
Duration :
Codes des diagnostics :
Contexte opérationnel :
```

Ne recopier aucun nom client, téléphone, note libre, commentaire client ou hash téléphone.

Les identifiants techniques peuvent être conservés uniquement s’ils sont nécessaires pour retrouver une entité pendant l’analyse.

## 33.6 Classification Des Diagnostics

Pour chaque diagnostic observé, utiliser ce format :

```text
Code :
Classification :
Commande ou article technique :
Comportement legacy :
Comportement ViewModel :
Cause probable :
Risque terrain :
Erreur métier démontrée :
Correction nécessaire :
Module potentiellement concerné :
```

Classifications possibles :

```text
comportement legacy volontaire
ordre manuel legacy
donnée source ambiguë
couverture incomplète
limitation documentée
erreur du snapshot legacy
erreur du ViewModel
erreur du ProductionPlan
erreur du Scheduler
faux positif du comparateur
à confirmer
```

## 33.7 Règles De Décision

- Un `warning` ne justifie pas automatiquement une correction.
- Un `unsupported` ne doit pas devenir automatiquement bloquant.
- Une différence d’ordre liée à `pizzaiolo_queue_position` peut être volontaire.
- Une correction du moteur nécessite une erreur métier démontrable.
- Un seul rapport isolé ne suffit pas pour déclarer un comportement validé terrain.
- Plusieurs services représentatifs sans anomalie majeure sont nécessaires avant toute bascule d’interface.

## 33.8 Confidentialité Console

Audit réalisé sur :

- `src/lib/view-models/pizzaiolo-runtime-shadow.ts` ;
- `src/lib/view-models/pizzaiolo-legacy-shadow-comparison.ts` ;
- `src/lib/view-models/pizzaiolo-runtime-shadow.test.ts`.

Constat :

- la synthèse console affiche uniquement des compteurs, statuts et durées ;
- le test existant vérifie l’absence de nom client et téléphone dans la synthèse console ;
- les diagnostics détaillés affichent des identifiants techniques, statuts, bases, suppléments, retraits et découpes lorsqu’ils sont nécessaires ;
- les diagnostics détaillés ne transportent pas `customer_name`, `customer_phone`, `customer_phone_hash`, `notes` ou commentaire client.

Règle terrain :

- ne jamais copier de donnée personnelle dans le rapport d’observation ;
- conserver les identifiants techniques uniquement lorsqu’ils sont indispensables à l’analyse.

## 33.9 Critères Avant Toute Migration Du Poste

Avant d’envisager une bascule du poste Pizzaiolo vers le nouveau moteur, il faudra disposer :

- de plusieurs observations sur services représentatifs ;
- d’une absence répétée de différences bloquantes non expliquées ;
- d’une analyse claire des warnings d’ordre ;
- d’une couverture réelle de commandes simples, fournées complètes, commandes multiples, pizzas en cuisson, commandes annulées/livrées, bases/modifications et commandes mixtes ;
- d’une décision explicite validant que le `PizzaioloViewModel` peut remplacer progressivement les vues legacy.

## 33.10 Prochaine Étape Recommandée

Objectif unique :

- exécuter manuellement cette procédure sur un navigateur de test avec le debug activé, puis analyser le premier rapport réel sans correction automatique.

---

# 34. Panneau Debug Pizzaiolo Shadow Comparison

## 34.1 Statut Au 2026-08-06

Branche : `feature/pizzaiolo-shadow-debug-panel`

Objectif :

- observer le dernier `PizzaioloRuntimeShadowReport` sans ouvrir la console navigateur ;
- conserver un panneau strictement développeur ;
- ne pas modifier le comportement opérationnel du poste Pizzaiolo.

Cette étape ne constitue pas une validation terrain.

## 34.2 Conditions D’Affichage

Debug désactivé :

- aucun panneau n’est rendu ;
- le panneau est absent du DOM ;
- aucune comparaison runtime Pizzaiolo n’est programmée ;
- aucun calcul supplémentaire n’est déclenché pour l’affichage.

Debug activé :

- le comparateur runtime fonctionne selon le branchement existant ;
- le panneau lit le dernier rapport mémoire publié ;
- le panneau s’abonne aux nouveaux rapports ;
- le panneau ne relance pas `ProductionPlan`, `PizzaioloViewModel`, le snapshot legacy ou la comparaison.

## 34.3 Fichiers Concernés

- `src/routes/_kds/pizzaiolo.tsx` : affichage conditionnel du panneau et abonnement au rapport mémoire.
- `src/lib/view-models/pizzaiolo-runtime-shadow.ts` : abonnement local aux rapports déjà publiés.
- `src/lib/view-models/pizzaiolo-shadow-debug-panel.ts` : helper pur de présentation.
- `src/lib/view-models/pizzaiolo-shadow-debug-panel.test.ts` : tests du panneau et des garanties.

## 34.4 Contenu Affiché

Le panneau affiche uniquement :

- `Status` ;
- `Plan usable` ;
- `Legacy visible orders` ;
- `ViewModel visible orders` ;
- `Legacy actionable orders` ;
- `ViewModel selectable orders` ;
- `Legacy actionable pizzas` ;
- `ViewModel actionable pizzas` ;
- `Matches` ;
- `Warnings` ;
- `Blocking diagnostics` ;
- `Unsupported` ;
- `Duration`.

Les codes diagnostics sont affichés uniquement lorsqu’un warning, une différence bloquante ou un cas unsupported existe.

## 34.5 Confidentialité

Le panneau n’affiche jamais :

- nom client ;
- téléphone ;
- notes ;
- commentaires ;
- hash téléphone.

Les tests vérifient que la vue du panneau ne contient pas de nom, téléphone, note confidentielle ou hash issus des données source.

## 34.6 Limites

- Le panneau reste temporaire et réservé au debug.
- Le rapport n’est pas persisté.
- Aucun historique n’est conservé.
- Aucun poste ne consomme ce rapport pour décider.
- L’observation terrain reste nécessaire avant toute migration d’interface.

## 34.7 Prochaine Étape Recommandée

Objectif unique :

- ouvrir le poste Pizzaiolo sur un navigateur de test avec le debug activé, observer le panneau pendant quelques scénarios réels, puis analyser les diagnostics sans correction automatique.
