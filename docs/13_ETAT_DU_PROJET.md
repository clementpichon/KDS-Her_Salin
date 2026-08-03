# 13_ETAT_DU_PROJET.md

# État actuel du projet KDS

> Version : 1.0  
> Statut : Document vivant à compléter après audit du dépôt  
> Dernière mise à jour : 2026-08-02 - audit ProductionUnit / WorkUnit
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
Diagnostic des Work Units.
```

## Objectifs

- comparer les `ProductionUnit[]` aux `WorkUnit[]` générées en mémoire ;
- vérifier que chaque unité physique supportée produit le workflow attendu ;
- détecter les unités sans workflow, notamment `other` ;
- détecter les dépendances manquantes ou incohérentes ;
- détecter les statuts projetés suspects sans corriger les données ;
- conserver `ProductionUnit` et `WorkUnit` comme projections en lecture seule ;
- ne modifier aucune table Supabase ;
- ne modifier aucun poste ;
- ne créer ni Scheduler, ni Dispatcher, ni ProductionPlan ;
- rester déterministe et sans effet de bord ;
- ajouter les tests unitaires du diagnostic ;
- préparer la validation terrain avant toute intégration dans les postes.

## Cas obligatoires

```text
ProductionUnit pizza avec et sans post-cuisson -> workflow WorkUnit attendu
```

```text
ProductionUnit Pani'NO -> pain et garniture parallèles, puis assemblage
```

```text
ProductionUnit Fish & NO -> poisson et accompagnement parallèles, puis assemblage
```

```text
ProductionUnit frites ou grenailles -> cuisson puis packaging
```

```text
ProductionUnit other -> absence de workflow signalée
```

```text
statuts cancelled, failed, ready et delivered -> cohérence globale des Work Units
```

```text
dépendances WorkUnit -> toutes résolues vers une WorkUnit existante
```

```text
aucune mutation des données d'entrée
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

### Étape 4 - Premier lecteur Pizzaiolo, sans changement visuel majeur

Objectif :

- migrer seulement la lecture du poste Pizzaiolo vers une projection issue des unités, après validation des diagnostics.

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
refactor/production-units-adapter
```

Objectif unique :

- produire une représentation `ProductionUnit[]` en mémoire, testée, sans migration, sans écran modifié, sans Scheduler.
