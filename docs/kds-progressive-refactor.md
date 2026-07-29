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

## Étape 1.1 - Résolution métier des bases depuis L'Addition

Objectif : une base pizza n'est pas seulement une valeur saisie explicitement. Elle peut être déduite des ajouts et retraits imprimés sur un ticket L'Addition.

Règles :

- `Regina` : base finale `tomato`, résolution `default` ;
- `Regina + crème` : base finale `tomato`, la crème reste un supplément ;
- `Regina - sauce tomate + crème` : base finale `cream`, résolution `inferred_replacement`, les deux lignes ne sont plus réaffichées comme supplément/retrait ;
- `Regina - sauce tomate` : base finale `none`, affichage `Sans base` ;
- `Fromages + sauce tomate` : base finale `goat_cream`, la tomate reste un supplément ;
- `Regina - sauce tomate + crème + crème de chèvre` : résolution `ambiguous`, affichage `Base à vérifier`.

Champs utilisés :

- `order_items.base` : base finale calculée ;
- `order_items.default_base_snapshot` : base recette au moment de la commande ;
- `order_items.explicit_base_snapshot` : base explicitement saisie ou lue, si elle existe ;
- `order_items.base_resolution` : méthode de résolution ;
- `order_items.base_confidence` : niveau de confiance.

Les tableaux bruts `extras` et `removed` restent conservés en base. L'interface filtre seulement les lignes consommées par une résolution de remplacement.
