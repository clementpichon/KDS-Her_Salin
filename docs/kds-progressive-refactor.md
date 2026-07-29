# Refonte progressive du KDS

## Étape 1 - Base pizza réellement demandée

Objectif : les postes qui affichent une pizza doivent utiliser la base demandée par le client quand elle existe, et non uniquement la base par défaut de la recette.

Changements :

- ajout du champ `order_items.base` ;
- sélection de la base dans la caisse pour chaque pizza ;
- lecture OCR des bases indiquées sur les bons ;
- affichage de la base sur le poste Pizzaiolo, la prévisualisation Four, le poste Four et les commandes prêtes ;
- compatibilité temporaire : si la migration Supabase n'est pas encore appliquée, la commande reste enregistrable sans bloquer le service.

Migration à appliquer :

```sql
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS base TEXT;
```

Validation attendue :

- créer une pizza avec sa base par défaut ;
- créer une pizza avec base modifiée, par exemple Fromage avec base Tomate ;
- vérifier que le disque du Pizzaiolo affiche bien `Tomate` ;
- envoyer au Four puis vérifier que la commande conserve la même base ;
- rafraîchir la page et vérifier que la base reste mémorisée après application de la migration.
