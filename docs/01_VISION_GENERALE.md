# 01_VISION_GENERALE.md

# Vision générale du KDS

> Version : 2.0
> Statut : Document de référence
> Dépendances :
> - 00_ARCHITECTURE_GLOBALE.md

---

# 1. Pourquoi le KDS existe

Le KDS est né d'un constat observé quotidiennement en production.

Pendant les périodes de forte activité, le principal problème d'une pizzeria n'est pas la fabrication des pizzas.

Le principal problème est l'organisation du travail.

Les employés doivent simultanément :

- mémoriser plusieurs commandes ;
- anticiper les commandes suivantes ;
- organiser les fournées ;
- communiquer entre eux ;
- répondre au téléphone ;
- répondre aux clients présents ;
- surveiller le four ;
- réaliser les post-cuissons ;
- préparer les Pani'NO ;
- éviter les oublis.

Une grande partie de ces décisions repose uniquement sur l'expérience et la mémoire.

Lorsque la charge augmente, cette organisation devient extrêmement coûteuse mentalement.

Le KDS a pour objectif de prendre en charge cette organisation afin que les employés puissent se concentrer sur leur métier.

---

# 2. Mission du KDS

Le KDS est un assistant de production.

Il ne remplace pas les employés.

Il leur fournit une vision globale de la production afin qu'ils puissent prendre les meilleures décisions avec le minimum d'effort mental.

Sa mission est de :

- réduire la charge mentale ;
- améliorer la communication entre les postes ;
- diminuer les erreurs ;
- augmenter le débit de production ;
- rendre la production plus prévisible.

---

# 3. Ce que le KDS n'est pas

Le KDS n'est pas :

- un logiciel de caisse ;
- un logiciel de gestion commerciale ;
- un simple écran de tickets ;
- un logiciel imposant une organisation rigide.

Le KDS conseille.

Il n'impose jamais.

---

# 4. Les objectifs du projet

## 4.1 Réduire la charge mentale

Chaque poste doit recevoir uniquement les informations utiles.

Le système doit rappeler automatiquement ce qui mérite l'attention.

Les employés ne doivent plus avoir à mémoriser plusieurs dizaines d'informations simultanément.

---

## 4.2 Réduire les erreurs

Le système doit limiter :

- les oublis ;
- les doublons ;
- les erreurs de priorité ;
- les erreurs de préparation ;
- les erreurs de communication.

---

## 4.3 Optimiser la production

Le moteur doit chercher à optimiser :

- les fournées ;
- les déplacements ;
- les changements de base ;
- les temps morts ;
- les ressources disponibles.

L'objectif est d'améliorer le débit sans augmenter la charge de travail.

---

## 4.4 Préserver la flexibilité

Chaque service est différent.

Le logiciel doit s'adapter au fonctionnement réel de la pizzeria.

Les recommandations ne doivent jamais empêcher les employés d'agir selon leur expérience.

---

## 4.5 Construire un système évolutif

Le KDS doit pouvoir évoluer progressivement.

Les futures fonctionnalités ne doivent pas nécessiter une réécriture complète du moteur.

---

# 5. Les principes fondamentaux

Toutes les évolutions du projet doivent respecter les principes suivants.

---

## Le terrain a toujours raison

Les règles métier doivent toujours représenter le fonctionnement réel du restaurant.

Si une règle informatique devient incompatible avec la réalité du terrain, c'est cette règle qui doit être revue.

---

## Une seule source de vérité

Une même information ne doit jamais être calculée à plusieurs endroits.

Exemples :

- charge résiduelle ;
- score de faisabilité ;
- capacité restante ;
- état d'une pizza.

Toutes ces informations doivent être produites une seule fois puis partagées par tous les postes.

---

## Les moteurs avant les interfaces

Toute nouvelle fonctionnalité suit toujours le même ordre :

1. définir la règle métier ;
2. développer le moteur ;
3. écrire les tests ;
4. adapter l'interface.

Les interfaces ne doivent jamais contenir de logique métier.

---

## Une évolution progressive

Le projet évolue par petites étapes.

Chaque étape doit :

- être indépendante ;
- être testable ;
- ne pas casser les fonctionnalités existantes.

---

## Le KDS apprend du restaurant

Le logiciel doit progressivement devenir capable d'utiliser les données réelles de production afin d'améliorer ses recommandations.

Les temps théoriques pourront être remplacés progressivement par des temps réellement observés.

---

# 6. Les postes

Le KDS accompagne plusieurs métiers différents.

Chaque poste possède des besoins spécifiques.

## Caisse

Objectif :

Faciliter la prise de commande et proposer les meilleurs créneaux.

---

## Pizzaiolo

Objectif :

Organiser efficacement le plan de travail.

Le pizzaiolo ne doit plus travailler à partir d'une pile de tickets.

Il travaille sur un véritable plan de production.

---

## Four

Objectif :

Visualiser immédiatement :

- les pizzas en cuisson ;
- les commandes incomplètes ;
- les post-cuissons ;
- les commandes prêtes.

---

## Pani'NO

Objectif :

Organiser la production des Pani'NO, Fish&NO et frites sans perturber la production des pizzas.

---

## Commandes prêtes

Objectif :

Séparer clairement :

- la production ;
- la remise au client.

Une commande prête ne doit plus mobiliser les ressources de production.

---

# 7. La Work Unit

Le KDS ne raisonne pas directement sur les commandes.

Il raisonne sur des unités de travail.

Une Work Unit représente une tâche concrète.

Exemples :

- préparer une pizza ;
- préparer quatre pains à Pani'NO ;
- cuire une fournée ;
- effectuer une post-cuisson.

Cette approche permet au moteur de planifier le travail indépendamment du nombre de commandes.

---

# 8. Les moteurs

Le projet repose sur trois moteurs complémentaires.

## Décomposition

Transforme les commandes en Work Units.

---

## Planification

Organise les Work Units.

---

## Décision

Choisit les meilleures actions à proposer aux utilisateurs.

---

# 9. Vision à long terme

Le KDS devra progressivement devenir capable de :

- prévoir les pics d'activité ;
- proposer automatiquement les meilleurs créneaux ;
- apprendre les habitudes des équipes ;
- adapter ses recommandations selon les performances observées ;
- optimiser les ressources disponibles.

À terme, le KDS devra devenir un véritable copilote de production.

---

# 10. Critère de réussite

Le succès du KDS ne se mesure pas au nombre de fonctionnalités.

Il se mesure à des résultats concrets :

- moins d'erreurs ;
- moins de stress ;
- moins de charge mentale ;
- une meilleure communication ;
- des fournées mieux remplies ;
- un meilleur débit ;
- une meilleure satisfaction des employés.

Chaque nouvelle fonctionnalité devra répondre à cette question :

> Cette évolution aide-t-elle réellement l'équipe à produire plus sereinement et plus efficacement ?

Si la réponse est non, cette évolution doit être remise en question.