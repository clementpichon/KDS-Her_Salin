# 12_ROADMAP.md

# Roadmap du KDS

> Version : 2.1  
> Statut : Document de référence évolutif  
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

---

# 1. Objectif

Ce document organise l’évolution progressive du KDS.

Il permet de distinguer :

- ce qui existe déjà ;
- ce qui doit être stabilisé ;
- ce qui doit être développé ensuite ;
- ce qui relève d’une évolution future ;
- ce qui ne doit pas encore être entrepris.

La roadmap ne remplace pas les spécifications fonctionnelles.

Elle définit l’ordre de mise en œuvre.

---

# 2. Principe général de développement

Le KDS doit évoluer par étapes courtes et validables.

Chaque étape doit respecter l’ordre suivant :

```text
Analyse de l’existant
        ↓
Règles métier
        ↓
Modèle de données
        ↓
Moteur
        ↓
Tests
        ↓
Interface
        ↓
Validation terrain
```

Ne jamais commencer une refonte majeure uniquement par l’interface.

---

# 3. Priorité absolue : préserver la stabilité

La stabilité actuelle reste prioritaire.

Chaque évolution doit :

- conserver les fonctionnalités déjà opérationnelles ;
- éviter les migrations destructrices ;
- conserver les anciennes commandes lisibles ;
- permettre un retour arrière ;
- être développée sur une branche dédiée ;
- être validée avant suppression de l’ancien système.

Une nouvelle fonctionnalité incomplète ne doit pas remplacer prématurément une fonctionnalité stable.

---

# 4. Méthode de migration

Pour chaque grande fonctionnalité :

1. analyser le code actuel ;
2. identifier les fonctions réutilisables ;
3. isoler les règles métier ;
4. ajouter les nouvelles structures sans supprimer les anciennes ;
5. écrire les tests ;
6. développer derrière un feature flag ou une route distincte ;
7. comparer l’ancien et le nouveau résultat ;
8. tester hors service ;
9. tester en service contrôlé ;
10. supprimer l’ancien comportement uniquement après validation.

---

# 5. Statuts de roadmap

Chaque chantier utilise l’un des statuts suivants :

```text
À analyser
```

```text
Spécifié
```

```text
En développement
```

```text
En test
```

```text
Validé
```

```text
Déployé
```

```text
Suspendu
```

```text
Reporté
```

---

# 6. État général actuel

Le projet dispose déjà de plusieurs fondations fonctionnelles.

Éléments connus comme déjà présents ou partiellement présents :

- application KDS déployée ;
- synchronisation Supabase ;
- postes Caisse, Pizzaiolo, Four, Pani’NO et Prêtes ;
- modes test, apprentissage ou normal selon l’état du projet ;
- génération de créneaux ;
- premières projections de production ;
- prise en charge des horaires après minuit ;
- gestion partielle des bases de pizzas ;
- affichage des bases sur plusieurs postes ;
- début de moteur dans `cashier-flow.ts` ;
- flux de commandes interne ;
- premières vues tablette ;
- stock de pâtons ;
- communication téléphone ou événements associés ;
- déploiement Vercel ;
- projet de proxy pour L’Addition.

Ces éléments doivent être audités avant toute réécriture.

---

# 7. Phase 0 — Consolidation documentaire

## Statut

```text
En cours
```

## Objectif

Créer une documentation officielle cohérente dans `/docs`.

## Livrables

```text
00_ARCHITECTURE_GLOBALE.md
01_VISION_GENERALE.md
02_MODELE_DE_DONNEES.md
03_MOTEUR_PLANIFICATION.md
04_MOTEUR_DECISION.md
05_POSTE_CAISSE.md
06_POSTE_PIZZAIOLO.md
07_POSTE_FOUR.md
08_POSTE_PANINO.md
09_REGLES_METIER.md
10_SYNCHRONISATION.md
11_TESTS_ACCEPTATION.md
12_ROADMAP.md
```

## Critères de validation

- documents présents dans le dépôt ;
- responsabilités non contradictoires ;
- vocabulaire homogène ;
- documents lisibles intégralement par Codex ;
- règles métier centralisées ;
- liens entre documents cohérents.

---

# 8. Phase 1 — Audit de l’existant

## Statut

```text
À faire
```

## Objectif

Comparer la documentation au code réel avant toute modification importante.

## Travaux

- inventorier les routes ;
- inventorier les composants ;
- inventorier les tables Supabase ;
- inventorier les états de commande ;
- inventorier les fonctions de planification ;
- inventorier les abonnements temps réel ;
- identifier les règles métier actuellement présentes dans les composants ;
- identifier les doublons de calcul ;
- identifier les migrations déjà appliquées ;
- identifier les tests existants.

## Livrable

Créer ou mettre à jour :

```text
/docs/ETAT_DU_PROJET.md
```

Ce document doit indiquer :

- ce qui est conforme ;
- ce qui est partiel ;
- ce qui manque ;
- ce qui contredit la documentation ;
- ce qui ne doit pas être touché immédiatement.

---

# 9. Phase 2 — Stabilisation du moteur Caisse actuel

## Statut

```text
Priorité immédiate
```

## Objectif

Corriger les faux classements de créneaux sans refaire immédiatement toute l’interface.

## Problèmes à résoudre

- créneaux tous classés comme chargés ;
- réserve assimilée à une charge ;
- créneau vide considéré comme dense ;
- `1 + 3 = 4` mal classé ;
- charge historique utilisée à la place de la charge résiduelle ;
- projection limitée ou incorrecte selon le service ;
- absence de score explicite ;
- tests métier non branchés dans `package.json`.

## Travaux

- analyser `cashier-flow.ts` ;
- conserver les fonctions existantes fiables ;
- stabiliser les constantes ;
- introduire `feasibilityScore` ;
- dériver les libellés depuis le score ;
- transformer la réserve en bonus ou malus léger ;
- calculer la charge à partir du travail restant ;
- conserver l’interface actuelle compatible ;
- ajouter un script de test dédié.

## Tests prioritaires

```text
1 + 3 = 4
```

```text
3 + 1 = 4
```

```text
7 + 1 = 8
```

```text
4 + 1 = 5
```

```text
commande prête = charge 0
```

```text
réserve consommée ≠ surcharge
```

## Critère de validation

Le cas suivant doit être correctement classé :

```text
Paul : 1 pizza restante
Panier : 3 pizzas
Projection : 4 pizzas
Réserve restante : 0
```

Résultat :

```text
Recommandé ou Fluide
```

Jamais :

```text
Très chargé
```

pour la seule consommation de la réserve.

---

# 10. Phase 3 — Créneaux sur toute la durée du service

## Statut

```text
Priorité immédiate
```

## Objectif

Garantir une projection complète des créneaux.

## Plages

```text
Midi : 12 h 00 → 14 h 00
Soir : 19 h 00 → 22 h 30
```

## Travaux

- fiabiliser `generateServiceSlots()` ;
- arrondir au prochain intervalle de cinq minutes ;
- proposer toute la plage restante ;
- gérer l’avant-service ;
- gérer l’entre-deux services ;
- gérer l’après-service ;
- tester les changements de jour.

## Tests

```text
11 h 30 → 12 h 00 à 14 h 00
```

```text
12 h 37 → prochain créneau jusqu’à 14 h 00
```

```text
17 h 14 → 19 h 00 à 22 h 30
```

```text
20 h 10 → jusqu’à 22 h 30
```

---

# 11. Phase 4 — Modèle individuel des produits

## Statut

```text
À planifier
```

## Objectif

Passer progressivement des quantités agrégées à des unités physiques suivies individuellement.

## Travaux

- introduire `ProductionUnit` ;
- créer une unité par pizza ;
- créer une unité par Pani’NO ;
- créer une unité par Fish&NO ;
- créer une unité par portion de frites ;
- conserver les lignes commerciales agrégées ;
- ajouter les états individuels ;
- prévoir les replis pour les anciennes commandes.

## Dépendance

Cette phase est nécessaire avant de fiabiliser complètement :

- les quatre disques ;
- les fournées multi-commandes ;
- les commandes partiellement prêtes ;
- les reprises individuelles ;
- la charge résiduelle précise.

## Critère de validation

Une ligne :

```text
Regina × 4
```

doit pouvoir représenter simultanément :

- une pizza prête ;
- une pizza au four ;
- une pizza en préparation ;
- une pizza en attente.

---

# 12. Phase 5 — Moteur de décomposition en Work Units

## Statut

```text
À planifier
```

## Objectif

Transformer les commandes en tâches de production explicites.

## Travaux

- définir les types de Work Units ;
- générer les Work Units à la création d’une commande ;
- générer les dépendances ;
- générer les tâches de post-cuisson ;
- générer les OF Pain ;
- générer les tâches Pani’NO ;
- générer les tâches Fish&NO et frites ;
- rendre la génération idempotente ;
- conserver la compatibilité avec les commandes existantes.

## Première version minimale

La première version peut commencer par :

```text
prepare_pizza
post_bake
prepare_panino_bread
assemble_panino
prepare_fish_and_no
fry_fries
```

Les Work Units purement techniques de chargement et déchargement du four peuvent être introduites progressivement.

## Critère de validation

Une Chèvre miel doit générer une tâche de miel après cuisson.

Une Regina simple ne doit pas générer de post-cuisson inutile.

---

# 13. Phase 6 — Moteur de planification Work Units

## Statut

```text
À planifier après la phase 5
```

## Objectif

Construire une planification cohérente à partir des tâches, dépendances, ressources et échéances.

## Travaux

- calculer les tâches disponibles ;
- calculer les tâches bloquées ;
- calculer les débuts au plus tôt ;
- calculer les débuts au plus tard ;
- calculer la charge résiduelle par poste ;
- projeter les ressources ;
- projeter les fournées ;
- préserver les tâches verrouillées ;
- produire des avertissements explicites.

## Première stratégie

Utiliser une stratégie déterministe simple :

1. conserver le verrouillé ;
2. retirer le terminé ;
3. résoudre les dépendances ;
4. trier par échéance ;
5. favoriser les commandes commencées ;
6. compléter les fournées ;
7. regrouper les bases en critère secondaire ;
8. affecter les ressources ;
9. calculer la réserve.

## Critère de validation

Le moteur doit produire le même résultat pour le même état d’entrée.

---

# 14. Phase 7 — Moteur de décision unifié

## Statut

```text
À planifier
```

## Objectif

Créer un noyau de décision utilisable par tous les postes.

## Questions prises en charge

### Caisse

```text
Quel créneau perturbe le moins la production ?
```

### Pizzaiolo

```text
Quelles pizzas préparer maintenant ?
```

### Four

```text
Quelle fournée ou post-cuisson traiter ?
```

### Pani’NO

```text
Quelle tâche est prioritaire ?
```

## Travaux

- créer `evaluateDecision()` ;
- centraliser les seuils ;
- centraliser les pondérations ;
- créer les raisons structurées ;
- créer les règles prioritaires ;
- conserver les décisions humaines ;
- ajouter le détail de score en mode test.

## Critère de validation

Aucune interface ne doit calculer localement son propre classement.

---

# 15. Phase 8 — Refonte progressive de la Caisse

## Statut

```text
À commencer après stabilisation du moteur
```

## Objectif

Passer à un parcours en trois étapes compactes.

## Étapes

```text
Produits
→ Créneau
→ Client
```

## Travaux

- créer un brouillon central ;
- séparer les écrans ;
- rendre le bouton principal toujours accessible ;
- afficher les créneaux recommandés ;
- afficher la charge résiduelle ;
- masquer les informations secondaires ;
- conserver le panier lors des retours ;
- revérifier le créneau avant soumission ;
- protéger contre les doublons ;
- ajouter « À enregistrer dans L’Addition ».

## Non-objectifs immédiats

Ne pas :

- remplacer L’Addition ;
- intégrer les paiements en ligne ;
- créer une comptabilité ;
- créer un système complet de facturation.

---

# 16. Phase 9 — Refonte du poste Pizzaiolo

## Statut

```text
Priorité fonctionnelle majeure
```

## Objectif

Remplacer progressivement la logique de tickets par un plan de travail à quatre disques.

## Sous-phases

### 9.1 — Affichage des quatre disques

- positions toujours visibles ;
- état vide ou occupé ;
- aucun changement automatique de production.

### 9.2 — Sélection individuelle

- sélectionner une pizza ;
- sélectionner plusieurs commandes ;
- éviter les doublons ;
- synchroniser les positions.

### 9.3 — Sélection de commande entière

- remplir les places libres ;
- gérer les commandes supérieures à quatre pizzas ;
- conserver le reste en attente.

### 9.4 — Bases et modifications

- afficher la base réelle ;
- afficher les suppléments ;
- afficher les retraits ;
- distinguer supplément et remplacement.

### 9.5 — Fournées suggérées

- proposer quatre pizzas ;
- respecter les échéances ;
- terminer les commandes commencées ;
- regrouper les bases en secondaire.

### 9.6 — Organisation manuelle

- glisser-déposer ;
- menu contextuel ;
- priorité ;
- retrait ;
- lancement anticipé.

### 9.7 — OF Pain

- génération ;
- apparition trente minutes avant ;
- priorité élevée ;
- validation ;
- déblocage Pani’NO.

## Critère de validation terrain

Le pizzaiolo doit pouvoir préparer plusieurs commandes simultanément sans devoir mémoriser leur composition hors écran.

---

# 17. Phase 10 — Refonte du poste Four

## Statut

```text
Après stabilisation du poste Pizzaiolo
```

## Objectif

Relier clairement les fournées physiques à la progression complète des commandes.

## Sous-phases

### 10.1 — Fournées réelles

- réception ;
- verrouillage ;
- enfournement ;
- minuteur ;
- sortie.

### 10.2 — Commandes complètes

- toute la commande visible ;
- pizzas non reçues grisées ;
- progression multi-fournées ;
- validation finale correcte.

### 10.3 — Post-cuisson

- Work Units dédiées ;
- suppléments pertinents ;
- retraits pertinents ;
- temps observés ;
- validation individuelle.

### 10.4 — Prévisualisation

- volet repliable ;
- trois prochaines commandes ;
- distinction prévisionnel/réel.

### 10.5 — Compacité

- suppression du grand bloc « Four — En cuisson » ;
- commandes côte à côte ;
- retrait du stock complet de pâtons ;
- retrait de la banderole « À REMETTRE MAINTENANT » ;
- header repliable.

---

# 18. Phase 11 — Refonte du poste Pani’NO

## Statut

```text
Après introduction des Work Units
```

## Objectif

Passer d’une logique de tickets à une logique de chaînes de tâches dépendantes.

## Travaux

- afficher les Work Units disponibles ;
- afficher les blocages ;
- gérer les pains ;
- gérer les regroupements d’OF ;
- suivre l’assemblage ;
- suivre la cuisson ;
- suivre Fish&NO ;
- suivre frites et friteuse ;
- coordonner les commandes mixtes ;
- gérer les ruptures ;
- gérer les produits à refaire.

## Critère de validation

L’opérateur doit voir immédiatement :

- ce qui peut être commencé ;
- ce qui attend un pain ;
- ce qui utilise la friteuse ;
- ce qui appartient à une commande déjà commencée.

---

# 19. Phase 12 — Synchronisation robuste

## Statut

```text
Transversal
```

## Objectif

Garantir la cohérence entre tous les postes.

## Travaux

- ajouter des clés d’idempotence ;
- ajouter les versions d’entités ;
- centraliser les abonnements Realtime ;
- gérer les conflits ;
- gérer les reconnexions ;
- distinguer état optimiste et état confirmé ;
- protéger les actions critiques ;
- journaliser les événements ;
- éviter les doubles consommations de stock.

## Actions prioritaires à sécuriser

- création de commande ;
- sélection d’une pizza ;
- validation d’un OF ;
- verrouillage de fournée ;
- enfournement ;
- sortie du four ;
- validation post-cuisson ;
- passage à prêt ;
- consommation de pâton ;
- réinitialisation du stock.

---

# 20. Phase 13 — Proxy L’Addition

## Statut

```text
Préparation documentaire et technique
```

## Objectif

Recevoir automatiquement les commandes de L’Addition.

## Étapes

### 13.1 — Capturer les tickets

- identifier le flux disponible ;
- conserver le brut ;
- générer un `sourceId`.

### 13.2 — Parser les commandes

- nom ;
- heure ;
- produits ;
- quantités ;
- modifications ;
- bases ;
- suppléments ;
- retraits.

### 13.3 — Importer dans le KDS

- valider ;
- normaliser ;
- dédupliquer ;
- décomposer ;
- synchroniser.

### 13.4 — Gérer les modifications

- ajout ;
- retrait ;
- changement d’heure ;
- annulation.

## Non-objectifs immédiats

Ne pas dépendre d’une API L’Addition non disponible.

Ne pas développer immédiatement un flux retour complet vers L’Addition.

---

# 21. Phase 14 — Rapprochement KDS et L’Addition

## Statut

```text
Après le proxy entrant
```

## Objectif

Éviter qu’une commande créée dans le KDS puis saisie dans L’Addition soit produite deux fois.

## Travaux

- stocker les références externes ;
- proposer des rapprochements ;
- utiliser le nom, l’heure et le contenu ;
- définir un niveau de confiance ;
- demander validation en cas d’ambiguïté ;
- fermer l’état « À enregistrer dans L’Addition ».

---

# 22. Phase 15 — Stock de pâtons fiabilisé

## Statut

```text
À intégrer progressivement
```

## Objectif

Fiabiliser la consommation et les pertes.

## Travaux

- définir le moment exact de consommation ;
- protéger l’idempotence ;
- lier la consommation à une Production Unit ;
- gérer les pertes ;
- gérer les corrections ;
- auditer les réinitialisations ;
- réinitialiser initial, restant et pertes ensemble.

## Critère de validation

Un événement rejoué ne doit jamais consommer un second pâton.

---

# 23. Phase 16 — PWA et tablettes

## Statut

```text
Transversal
```

## Objectif

Garantir une utilisation fiable sur tablette et smartphone.

## Travaux

- mode `standalone` ;
- installation Android ;
- ajout iOS ;
- safe areas ;
- header repliable ;
- zones de défilement internes ;
- orientation paysage ;
- prévention des zooms accidentels ;
- bouton principal accessible ;
- mise à jour contrôlée de la PWA ;
- cache limité aux ressources statiques.

## Validation matérielle

Tester au minimum sur :

- tablette Android ;
- iPad ;
- smartphone Android ;
- iPhone si utilisé ;
- écran tactile du mini-PC.

---

# 24. Phase 17 — Mesure des temps réels

## Statut

```text
Après stabilisation des états`
```

## Objectif

Apprendre les durées réelles des Work Units.

## Mesures

- préparation par pizza ;
- préparation selon modifications ;
- cuisson réelle ;
- post-cuisson ;
- assemblage Pani’NO ;
- friture ;
- temps d’attente ;
- temps de remise.

## Prérequis

Les états doivent être fiables.

Un temps mesuré à partir d’états imprécis ne doit pas être utilisé comme vérité.

---

# 25. Phase 18 — Mode apprentissage

## Statut

```text
Prévu
```

## Objectif

Collecter des données sans influencer fortement les décisions.

## Fonctionnement

Pendant une période de basse saison ou de test :

- observer les temps ;
- comparer estimations et réalité ;
- détecter les écarts ;
- ne pas automatiser immédiatement les décisions ;
- conserver un contrôle humain complet.

## Durée initiale envisagée

Environ un mois sur les services représentatifs, notamment :

```text
vendredi
samedi
dimanche
18 h 30 → 21 h 00
```

Cette durée reste à ajuster.

---

# 26. Phase 19 — Ajustement automatique des estimations

## Statut

```text
Futur
```

## Objectif

Utiliser les observations pour améliorer :

- durées ;
- difficultés ;
- coefficients ;
- seuils ;
- risques de retard.

## Contraintes

- modifications explicables ;
- valeurs réversibles ;
- limites minimales et maximales ;
- possibilité de désactiver l’apprentissage ;
- pas de modification automatique des règles fondamentales.

---

# 27. Phase 20 — Prévision de l’activité

## Statut

```text
Futur
```

## Données possibles

- jour de la semaine ;
- saison ;
- vacances scolaires ;
- jours fériés ;
- météo ;
- événements locaux ;
- fréquentation touristique ;
- historique des commandes ;
- charge téléphone.

## Objectif

Anticiper :

- les pics ;
- les créneaux à protéger ;
- les besoins de stock ;
- le personnel ;
- les commandes spontanées probables.

Cette phase ne doit être abordée qu’après fiabilisation des données internes.

---

# 28. Phase 21 — Commandes en ligne

## Statut

```text
Futur
```

## Objectif

Recevoir des commandes depuis le site Internet.

## Principes

Les commandes en ligne doivent utiliser le même pipeline :

```text
Commande
→ Production Units
→ Work Units
→ Planification
→ Décision
→ Postes
```

Elles ne doivent pas disposer d’un moteur séparé.

## Paiement

Le paiement en ligne pourra être intégré ultérieurement.

Il ne doit pas être un prérequis pour concevoir le flux de production.

---

# 29. Phase 22 — Plusieurs opérateurs et ressources

## Statut

```text
Futur
```

## Objectif

Permettre :

- plusieurs pizzaiolos ;
- plusieurs fours ;
- plusieurs friteuses ;
- plusieurs postes Pani’NO ;
- plusieurs caisses.

La notion de Work Unit et de ressource doit permettre cette évolution sans refonte fondamentale.

---

# 30. Phase 23 — Statistiques et pilotage

## Statut

```text
Futur
```

## Indicateurs possibles

- pizzas par heure ;
- temps moyen par recette ;
- temps de post-cuisson ;
- taux de fournées complètes ;
- retards ;
- reprises ;
- pertes ;
- créneaux refusés ou décalés ;
- commandes spontanées absorbées ;
- utilisation des ressources ;
- charge mentale déclarée ou incidents de rush.

Les statistiques ne doivent pas alourdir les postes de production.

Elles doivent être accessibles dans une interface dédiée.

---

# 31. Phase 24 — Multi-établissement

## Statut

```text
Très futur
```

## Objectif

Permettre l’utilisation du même système dans plusieurs restaurants.

## Prérequis

- `restaurantId` sur les données ;
- permissions ;
- configuration par établissement ;
- recettes par établissement ;
- ressources par établissement ;
- isolation Realtime ;
- statistiques séparées.

Cette phase ne doit pas complexifier inutilement la première version opérationnelle.

---

# 32. Ordre recommandé des prochains travaux

Ordre concret recommandé à partir de l’état actuel :

```text
1. Ajouter toute la documentation au dépôt
2. Auditer le code existant
3. Corriger le moteur de créneaux actuel
4. Ajouter le score sans refaire la Caisse
5. Ajouter les tests de non-régression
6. Fiabiliser les bases réelles
7. Introduire les Production Units
8. Introduire les Work Units minimales
9. Refaire progressivement le poste Pizzaiolo
10. Adapter le poste Four
11. Adapter le poste Pani’NO
12. Renforcer la synchronisation
13. Intégrer le proxy L’Addition
14. Activer le mode apprentissage
```

---

# 33. Ce qui ne doit pas être fait immédiatement

Ne pas entreprendre maintenant :

- une réécriture complète du KDS ;
- une migration massive non testée ;
- un moteur d’IA opaque ;
- une automatisation complète sans données fiables ;
- une intégration de paiement complexe ;
- un système multi-restaurant ;
- une suppression immédiate des anciennes interfaces ;
- une refonte simultanée de tous les postes ;
- une dépendance critique à une API externe non garantie.

---

# 34. Règles de branchement Git

Chaque chantier important doit utiliser une branche dédiée.

Exemples :

```text
fix/cashier-slot-scoring
```

```text
feat/production-units
```

```text
feat/work-unit-decomposition
```

```text
refactor/pizzaiolo-worktop
```

```text
refactor/oven-order-progress
```

Éviter les branches regroupant plusieurs refontes sans rapport direct.

---

# 35. Règles de commits

Les commits doivent rester lisibles et limités à une responsabilité.

Exemples :

```text
Add residual load calculation
```

```text
Fix reserve scoring for full batches
```

```text
Add individual pizza production units
```

```text
Add Panino bread work unit
```

Éviter un seul commit massif pour une refonte entière.

---

# 36. Validation avant fusion

Avant une fusion importante :

- relire les documents concernés ;
- exécuter les tests ;
- exécuter le lint ;
- exécuter le build ;
- vérifier les migrations ;
- tester le retour arrière ;
- fournir les captures ;
- signaler les écarts ;
- valider sur appareil réel si l’interface est concernée.

---

# 37. Déploiement progressif

Utiliser lorsque possible :

- feature flags ;
- routes alternatives ;
- mode test ;
- activation par poste ;
- activation par appareil ;
- comparaison ancien/nouveau moteur.

Exemple :

```text
ancienne Caisse active en production
nouveau moteur visible uniquement en mode test
```

Puis :

```text
nouveau moteur actif
ancienne Caisse encore disponible en secours
```

---

# 38. Retour arrière

Chaque phase doit prévoir :

- comment désactiver la fonctionnalité ;
- comment revenir à l’ancien moteur ;
- comment restaurer la base ;
- comment conserver les nouvelles données ;
- comment éviter une interruption du service.

Un retour arrière ne doit pas supprimer automatiquement les données créées par la nouvelle version.

---

# 39. Validation terrain

Une fonctionnalité doit être testée progressivement.

## Niveau 1

Test local avec données fictives.

## Niveau 2

Test sur appareil réel hors service.

## Niveau 3

Test pendant un service calme.

## Niveau 4

Test pendant un service chargé avec solution de secours.

## Niveau 5

Validation après plusieurs services sans incident critique.

---

# 40. Indicateurs de réussite

La roadmap doit contribuer à améliorer les indicateurs suivants :

- baisse des oublis ;
- baisse des erreurs de commande ;
- baisse des doublons ;
- meilleur remplissage du four ;
- meilleure visibilité entre les postes ;
- moins de questions entre Caisse et production ;
- meilleure absorption des commandes spontanées ;
- réduction du retard ;
- réduction de la charge mentale ;
- stabilité pendant les rushs.

---

# 41. Critères de suspension d’un chantier

Un chantier doit être suspendu si :

- il provoque des pertes de commandes ;
- il crée des doublons ;
- il rend l’interface plus lente pendant le rush ;
- il augmente la charge mentale ;
- il nécessite trop de corrections manuelles ;
- les données nécessaires ne sont pas assez fiables ;
- son retour arrière n’est pas possible ;
- il dépend d’une autre phase non terminée.

---

# 42. Mise à jour de la roadmap

Après chaque étape importante, mettre à jour :

- statut ;
- date ;
- branche ;
- commits ;
- fonctionnalités terminées ;
- tests exécutés ;
- anomalies restantes ;
- prochaine action recommandée.

Exemple :

```md
## Phase 2 — Stabilisation du moteur Caisse

Statut : En test  
Branche : `fix/cashier-slot-scoring`  
Commit : `abc1234`  
Tests : 18/18 réussis  
Reste à faire : test tablette pendant service calme
```

---

# 43. Responsabilité de Codex

Lorsqu’une tâche est confiée à Codex, il doit :

1. lire les documents concernés ;
2. analyser le code existant ;
3. éviter une réécriture inutile ;
4. signaler les contradictions bloquantes ;
5. proposer un plan court ;
6. implémenter progressivement ;
7. ajouter les tests ;
8. fournir les résultats ;
9. créer des commits séparés ;
10. ne pas déclarer la tâche terminée sans preuve.

---

# 44. Consigne recommandée pour Codex

```text
Lis les documents concernés dans /docs avant de modifier le code.

Analyse d’abord l’existant et indique ce qui est déjà présent, partiel ou absent.

Implémente uniquement la prochaine phase de la roadmap.

Ne refais pas les interfaces ou moteurs non concernés.

Conserve l’ancien comportement derrière un mécanisme de retour arrière jusqu’à validation.

Ajoute les tests applicables de 11_TESTS_ACCEPTATION.md.

À la fin, fournis les fichiers modifiés, les tests exécutés, les résultats, les migrations, les commits et les écarts restants.
```

---

# 45. Prochaine étape officielle recommandée

La prochaine étape officielle est :

```text
Stabiliser le moteur actuel de recommandation des créneaux de la Caisse.
```

Objectifs immédiats :

- vérifier toute la plage du service ;
- corriger la confusion entre réserve et charge ;
- introduire un score de faisabilité ;
- conserver l’interface actuelle ;
- brancher les tests ;
- verrouiller les cas `1 + 3`, `3 + 1`, `6`, `6 + 2` et charge prête égale à zéro.

Cette étape doit être terminée et validée avant de commencer une refonte visuelle importante de la Caisse.

---

# Principe fondamental

> La roadmap doit faire évoluer le KDS du système actuel vers une architecture plus intelligente sans sacrifier la stabilité opérationnelle.

Chaque phase doit apporter une amélioration observable, rester réversible et préparer la suivante sans imposer une réécriture complète du projet.