# 00_ARCHITECTURE_GLOBALE.md

# Architecture globale du KDS

> Version : 2.0
> Statut : Document de référence
> Dépendances : Aucune

---

# 1. Présentation

Le KDS (Kitchen Display System) est un système d'orchestration de la production destiné à assister les employés d'une pizzeria.

Contrairement à un KDS traditionnel qui se contente d'afficher des tickets de commande, le KDS a pour mission de comprendre l'état réel de la production, de planifier le travail et d'aider chaque poste à prendre les meilleures décisions.

Le KDS ne remplace jamais les employés.

Il agit comme un copilote capable d'analyser la situation en temps réel et de proposer les actions les plus pertinentes.

---

# 2. Philosophie de l'architecture

L'architecture repose sur plusieurs principes fondamentaux.

## 2.1 Le moteur décide, les interfaces affichent

Les interfaces utilisateur ne prennent jamais de décision métier.

Elles affichent uniquement les informations produites par les moteurs.

Aucune règle métier ne doit être codée dans un composant graphique.

---

## 2.2 Une seule source de vérité

Chaque information est calculée une seule fois.

Exemples :

- charge résiduelle ;
- score de faisabilité ;
- capacité restante ;
- fournées projetées.

Tous les postes utilisent exactement ces mêmes informations.

---

## 2.3 Le terrain avant la théorie

Les règles métier représentent le fonctionnement réel de la pizzeria.

Si la réalité évolue, le moteur doit évoluer.

Jamais l'inverse.

---

## 2.4 Les décisions restent humaines

Le KDS recommande.

Les employés décident.

Le système ne bloque jamais volontairement une action parce qu'elle n'est pas optimale.

---

# 3. Les grandes couches du système

Le système est organisé en couches indépendantes.

```
                    L'Addition
                         │
                         ▼
                      Proxy
                         │
                         ▼
              Couche Synchronisation
                         │
                         ▼
                 Base de données
                         │
                         ▼
             Moteur de Décomposition
                         │
                         ▼
             Moteur de Planification
                         │
                         ▼
               Moteur de Décision
        ┌─────────┬─────────┬─────────┬─────────┐
        ▼         ▼         ▼         ▼
      Caisse  Pizzaiolo    Four    Pani'NO
                         │
                         ▼
                   Commandes prêtes
```

Chaque couche possède une responsabilité unique.

---

# 4. Les couches

## 4.1 Proxy

Le proxy constitue la passerelle entre le KDS et les systèmes externes.

Il est notamment chargé de recevoir :

- les commandes de L'Addition ;
- les futures commandes Internet ;
- les futurs paiements ;
- les futurs services tiers.

Le proxy ne contient aucune logique métier.

---

## 4.2 Couche de synchronisation

Cette couche garantit que tous les postes travaillent sur exactement le même état de production.

Elle diffuse en temps réel :

- les nouvelles commandes ;
- les changements d'état ;
- les validations ;
- les annulations.

---

## 4.3 Base de données

La base de données représente uniquement l'état courant du restaurant.

Elle stocke notamment :

- les commandes ;
- les pizzas ;
- les Work Units ;
- les fournées ;
- les créneaux ;
- les utilisateurs ;
- les statistiques.

La logique métier ne doit jamais être dispersée dans la base.

---

# 5. Le Moteur de Décomposition

Le moteur de décomposition constitue la première étape métier.

Son rôle est de transformer une commande en unités de travail.

Une commande n'est jamais directement planifiée.

Elle est d'abord découpée en Work Units.

Exemple :

Commande :

```
2 Regina

1 Fromages

1 Chèvre miel
```

↓

Work Units :

```
Étaler Regina

Étaler Regina

Étaler Fromages

Étaler Chèvre miel

Constituer une fournée

Post-cuisson Chèvre miel
```

Le moteur ne réfléchit jamais directement en commandes.

Il réfléchit en tâches.

---

# 6. Les Work Units

La Work Unit est l'unité fondamentale du KDS.

Elle représente une tâche concrète.

Exemples :

- préparer une pizza ;
- préparer quatre pains à Pani'NO ;
- enfourner une fournée ;
- réaliser une post-cuisson ;
- préparer une commande Fish&NO.

Toutes les décisions du moteur portent sur ces Work Units.

Les interfaces, elles, continuent d'afficher des commandes.

---

# 7. Moteur de Planification

Le moteur de planification organise les Work Units.

Il calcule notamment :

- les créneaux de production ;
- la charge résiduelle ;
- les capacités restantes ;
- les fournées projetées ;
- l'anticipation des commandes.

Il ne prend aucune décision utilisateur.

Il prépare uniquement les données.

---

# 8. Moteur de Décision

Le moteur de décision est le cerveau du KDS.

Chaque poste lui pose une question.

Exemples :

## Caisse

Quel est le meilleur créneau ?

---

## Pizzaiolo

Quelle est la prochaine Work Unit à préparer ?

---

## Four

Quelle est la meilleure fournée à cuire maintenant ?

---

## Pani'NO

Quelle est la prochaine tâche prioritaire ?

---

Le moteur répond grâce aux mêmes règles métier.

Il garantit ainsi la cohérence de tout le système.

---

# 9. Les postes

Les postes ne communiquent jamais directement entre eux.

Ils communiquent uniquement via les moteurs.

```
Pizzaiolo

↓

Moteurs

↓

Four
```

Jamais :

```
Pizzaiolo

↓

Four
```

Cela évite les incohérences.

---

# 10. Les flux

Une commande suit toujours le même cycle.

```
Commande reçue

↓

Décomposition

↓

Work Units

↓

Planification

↓

Décision

↓

Préparation

↓

Cuisson

↓

Post-cuisson

↓

Commande prête

↓

Remise client
```

Chaque étape produit un événement.

---

# 11. Les événements

Tout changement important génère un événement.

Exemples :

- commande créée ;
- pizza sélectionnée ;
- Work Unit commencée ;
- Work Unit terminée ;
- fournée verrouillée ;
- pizza prête ;
- commande remise.

Ces événements déclenchent automatiquement les recalculs nécessaires.

---

# 12. Les interfaces

Les interfaces ne possèdent aucune intelligence métier.

Elles sont uniquement responsables :

- d'afficher les données ;
- de recueillir les actions de l'utilisateur.

Toutes les décisions proviennent des moteurs.

---

# 13. Évolutivité

Cette architecture est conçue pour fonctionner aussi bien avec :

- un pizzaiolo ;
- deux pizzaiolos ;
- plusieurs fours ;
- plusieurs postes Pani'NO ;
- plusieurs caisses ;
- plusieurs restaurants.

Les moteurs ne dépendent jamais du nombre de postes physiques.

---

# 14. Intelligence artificielle

À terme, le moteur de décision pourra intégrer un module d'apprentissage.

Ce module pourra apprendre :

- les temps réels de préparation ;
- les habitudes des pizzaiolos ;
- les temps de post-cuisson ;
- les pics d'activité ;
- les performances du restaurant.

Cette évolution ne nécessitera aucune modification de l'architecture générale.

---

# 15. Organisation de la documentation

La documentation officielle est organisée comme suit :

```
/docs

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

Chaque document possède une responsabilité unique.

Aucune règle métier ne doit être dupliquée entre plusieurs documents.

---

# 16. Principe fondamental

Le KDS ne cherche pas à gérer des commandes.

Il cherche à organiser des unités de travail.

Les commandes sont une vue destinée aux utilisateurs.

Les Work Units sont la réalité utilisée par les moteurs.

Cette distinction constitue le fondement de toute l'architecture du projet et garantit sa capacité à évoluer sans remise en cause de ses principes fondamentaux.