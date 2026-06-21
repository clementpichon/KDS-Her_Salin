## Vue d'ensemble

Ajout d'un poste **Pani'NO** entièrement intégré : produits configurables à la caisse, routage automatique des commandes vers un KDS dédié, déduction de pâtons pour les Pani'NO uniquement, statuts de préparation indépendants des pizzas, architecture évolutive.

## Architecture technique

### Base de données (migration)

Nouvelles tables (configuration évolutive, gérable depuis Réglages plus tard) :

- `panino_products` — catalogue (`id`, `key` [`panino`/`fishno`/`cornet_frites`], `name`, `sort_order`, `active`)
- `panino_options` — options génériques d'un produit (`id`, `product_key`, `kind` [`base`/`fries_mode`/`side`/`sauce`/`removable`/`extra`], `name`, `required`, `multi` [bool], `sort_order`, `active`)
- `panino_order_items` — lignes de commande Pani'NO (`id`, `order_id`, `product_key`, `product_name`, `base`, `fries_mode`, `side`, `sauces` text[], `removed` text[], `extras` text[], `status` [`pending`/`in_progress`/`done`], `done_at` timestamptz, `created_at`)

Seed initial (via INSERT) avec les options décrites par l'utilisateur.

Le stock pâtons existant : modifier `computeStock` pour compter `pizzas + panino_products.where(key='panino')` (1 pâton par Pani'NO uniquement, jamais Fish&NO ni cornet).

### Routage

Pas de routage à inventer : les pizzas restent dans `order_items`, les produits Pani'NO vont dans `panino_order_items`. Chaque KDS lit sa propre table → routage naturel. La caisse peut créer une commande "mixte" (pizzas + paninos) avec un seul `orders.id`.

### Front-end

1. **Caisse** (`src/routes/_kds/caisse.tsx`)
   - Onglets de catalogue : `Pizzas` | `Pani'NO`
   - Nouveau `PaninoCustomizer` (Dialog) : sélection base, mode frites, sauces (jusqu'à 2 → moitié/moitié auto), retraits, suppléments
   - `FishNoCustomizer` : accompagnement, sauce tartare on/off, suppléments
   - `CornetCustomizer` : produit simple (architecture prête pour options futures)
   - Panier unifié, validation crée `orders` + `order_items` (pizzas) + `panino_order_items` (paninos)
   - Affichage clair frites : "FRITES : DANS LE PANI'NO" ou "FRITES : CORNET SÉPARÉ"

2. **Nouveau route** `src/routes/_kds/panino.tsx`
   - KDS dédié : cartes triées par `requested_time` ASC
   - Statuts `pending` / `in_progress` / `done`
   - Auto-suppression visuelle 30 s après `done` (filtre côté client : `done_at < now() - 30s` → exclu)
   - Affichage complet selon les exemples (base, frites, sauces moitié/moitié, suppléments, retraits)

3. **Navigation** (`src/routes/_kds.tsx`) : ajouter `<NavLink to="/panino">Pani'NO</NavLink>` entre Four et Prêtes.

4. **Hooks** : `usePaninoOrders()` dans `src/hooks/use-kds-data.ts` (realtime sur `panino_order_items`).

5. **Types** (`src/lib/kds-types.ts`) : ajouter `PaninoProduct`, `PaninoOption`, `PaninoOrderItem`, `DraftPaninoItem`.

### Sauces moitié/moitié

Stocké comme `sauces: text[]` (1 ou 2 entrées). L'UI rend "MOITIÉ X / MOITIÉ Y" automatiquement quand `sauces.length === 2`. Aucun supplément n'est ajouté.

### Évolutivité

- Toute sauce/supplément/retrait/accompagnement nouveau = simple INSERT dans `panino_options`
- Nouveau produit = ajout dans `panino_products` + ses options (et UI auto-générée par `kind`)
- Une future page Réglages > Pani'NO permettra l'édition sans code (hors scope de ce ticket)

## Étapes d'implémentation

1. Migration DB (tables + GRANTs + RLS + seed des options par défaut)
2. Régénération types Supabase (auto)
3. Types métier + hooks
4. UI Caisse (onglets catalogue + 3 customizers + soumission mixte)
5. Route + KDS `/panino`
6. Nav `_kds.tsx`
7. Stock pâtons : ajustement de `computeStock`
8. Affichage notes/frites côté Four (déjà OK pour pizzas, rien à toucher)

## Hors scope (proposable plus tard)

- Page Réglages dédiée pour gérer `panino_products` / `panino_options` en UI
- OCR ticket pour les produits Pani'NO
- Alerte stock pâtons (déjà visuel "rouge si < 20", suffisant pour l'instant — sauf si tu veux une vraie notif)