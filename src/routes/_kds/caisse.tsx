import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus,
  Minus,
  Trash2,
  Check,
  ScanLine,
  Loader2,
  Pizza as PizzaIcon,
  Sandwich,
  Search,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { usePizzas, useOrders, useSettings, useIngredients, usePaninoCatalog, usePaninoOrderItems } from "@/hooks/use-kds-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CashierStationHeader } from "@/components/kds/CashierStationHeader";
import { getPizzaImage } from "@/lib/pizza-images";
import {
  computeStock,
  computePrepStart,
  computePizzaCapacity,
  findNextPizzaCapacitySlots,
  formatTime,
  isLate,
  minutesUntil,
  type PizzaCapacityResult,
} from "@/lib/scheduling";
import { friesLabel, paninoDisplayName } from "@/lib/kds-formatting";
import { scanOrderTicket } from "@/lib/api/ocr.functions";
import type { DraftItem, Pizza, PaninoProduct, PaninoOption, DraftPaninoItem, Order } from "@/lib/kds-types";

const LOCAL_CONTROL_KEY = "hersalin_control_settings_v1";

export const Route = createFileRoute("/_kds/caisse")({
  head: () => ({
    meta: [
      { title: "Caisse — Prise de commande — Her Salin" },
      { name: "description", content: "Écran caisse Her Salin : saisie des commandes, scan de bons, choix du créneau et envoi en préparation." },
      { property: "og:title", content: "Caisse — Prise de commande" },
      { property: "og:description", content: "Saisie de commandes, scan de bons et choix du créneau de four." },
    ],
    links: [{ rel: "canonical", href: "/caisse" }],
  }),
  component: Caisse,
});

function Caisse() {
  const pizzas = usePizzas();
  const { orders, reload } = useOrders();
  const settings = useSettings();
  const { products: paninoProducts, options: paninoOptions } = usePaninoCatalog();
  const { items: paninoItems, reload: reloadPanino } = usePaninoOrderItems();

  const [customerName, setCustomerName] = useState("");
  const [requestedTime, setRequestedTime] = useState(defaultTime());
  const [cart, setCart] = useState<DraftItem[]>([]);
  const [paninoCart, setPaninoCart] = useState<DraftPaninoItem[]>([]);
  const [orderNotes, setOrderNotes] = useState("");
  const [editing, setEditing] = useState<{ pizza: Pizza } | null>(null);
  const [editingPanino, setEditingPanino] = useState<PaninoProduct | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [scanning, setScanning] = useState(false);
  const [catalogTab, setCatalogTab] = useState<"pizzas" | "panino">("pizzas");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [showTodayOrders, setShowTodayOrders] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const runOcr = useServerFn(scanOrderTicket);

  const stock = settings ? computeStock(orders, settings, paninoItems) : 0;
  const pendingPaninoDoughs = paninoCart.filter((p) => p.product_key === "panino").length;
  const paninoByOrder = useMemo(() => {
    const m = new Map<string, typeof paninoItems[0][] >();
    for (const it of paninoItems) {
      const arr = m.get(it.order_id) ?? [];
      arr.push(it);
      m.set(it.order_id, arr);
    }
    return m;
  }, [paninoItems]);

  const handleScanFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Fichier image requis");
    if (file.size > 6 * 1024 * 1024) return toast.error("Image trop volumineuse (max 6 Mo)");
    if (pizzas.length === 0) return toast.error("Catalogue non chargé");
    setScanning(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      const paninoCatalog = availablePaninoProducts.map((p) => {
        const opts = paninoOptions.filter((o) => o.product_key === p.key);
        const byKind = (k: string) => opts.filter((o) => o.kind === k).map((o) => o.name);
        return {
          key: p.key,
          name: p.name,
          bases: byKind("base"),
          fries_modes: byKind("fries_mode"),
          sides: byKind("side"),
          sauces: byKind("sauce"),
          removables: byKind("removable"),
          extras: byKind("extra"),
        };
      });
      const result = await runOcr({
        data: { imageDataUrl: dataUrl, pizzaNames: pizzas.map((p) => p.name), paninoProducts: paninoCatalog },
      });
      if (!result.ok) return toast.error(result.error);
      const { parsed } = result;
      const byName = new Map(pizzas.map((p) => [p.name.toLowerCase(), p]));
      const added: DraftItem[] = [];
      const unknown: string[] = [];
      for (const it of parsed.items) {
        const pizza = byName.get(it.pizza_name.toLowerCase());
        if (!pizza) { unknown.push(it.pizza_name); continue; }
        const cut = it.cut_into && [4, 6, 8].includes(it.cut_into) ? it.cut_into : null;
        for (let i = 0; i < Math.max(1, it.quantity); i++) {
          added.push({
            pizza_id: pizza.id,
            pizza_name: pizza.name,
            extras: it.extras ?? [],
            removed: it.removed ?? [],
            cut_into: cut,
          });
        }
      }

      // Pani'NO items
      const paninoByName = new Map(availablePaninoProducts.map((p) => [p.name.toLowerCase(), p]));
      const addedPanino: DraftPaninoItem[] = [];
      for (const it of parsed.panino_items ?? []) {
        const prod = paninoByName.get(it.product_name.toLowerCase());
        if (!prod) { unknown.push(it.product_name); continue; }
        const opts = paninoOptions.filter((o) => o.product_key === prod.key);
        const matchOne = (kind: string, value?: string | null) => {
          if (!value) return null;
          const found = opts.find((o) => o.kind === kind && o.name.toLowerCase() === value.toLowerCase());
          return found ? found.name : null;
        };
        const matchMany = (kind: string, values: string[]) => {
          const pool = opts.filter((o) => o.kind === kind);
          return values
            .map((v) => pool.find((o) => o.name.toLowerCase() === v.toLowerCase())?.name)
            .filter((v): v is string => !!v);
        };
        for (let i = 0; i < Math.max(1, it.quantity); i++) {
          addedPanino.push({
            product_key: prod.key,
            product_name: prod.name,
            base: matchOne("base", it.base),
            fries_mode: matchOne("fries_mode", it.fries_mode),
            side: matchOne("side", it.side),
            sauces: matchMany("sauce", it.sauces ?? []),
            removed: matchMany("removable", it.removed ?? []),
            extras: matchMany("extra", it.extras ?? []),
          });
        }
      }

      if (added.length === 0 && addedPanino.length === 0) return toast.error("Aucun produit reconnu.");
      if (added.length) setCart((c) => [...c, ...added]);
      if (addedPanino.length) setPaninoCart((c) => [...c, ...addedPanino]);
      if (parsed.customer_name && !customerName.trim()) setCustomerName(parsed.customer_name);
      if (parsed.requested_time && /^\d{2}:\d{2}$/.test(parsed.requested_time)) {
        setRequestedTime(parsed.requested_time);
      }
      if (parsed.notes && parsed.notes.trim()) {
        setOrderNotes((prev) => (prev ? `${prev} · ${parsed.notes}` : parsed.notes!.trim()));
      }
      const parts: string[] = [];
      if (added.length) parts.push(`${added.length} pizza(s)`);
      if (addedPanino.length) parts.push(`${addedPanino.length} Pani'NO`);
      toast.success(`${parts.join(" + ")} ajouté(s)${unknown.length ? ` (ignoré : ${unknown.join(", ")})` : ""}`);
    } catch (e) {
      console.error(e);
      toast.error("Échec de l'analyse du bon");
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };


  const { ingredients: allIngredientsList } = useIngredients();
  const allIngredients = useMemo(() => {
    return allIngredientsList
      .map((ingredient) => ingredient.name.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "fr"));
  }, [allIngredientsList]);

  const submit = async () => {
    if (submitting) return;
    if (!customerName.trim()) return toast.error("Nom du client requis");
    if (cart.length === 0 && paninoCart.length === 0) return toast.error("Panier vide");
    if (!isValidLocalTime(requestedTime)) return toast.error("Heure demandée invalide");
    if (!settings) return;
    const doughsNeeded = cart.length + pendingPaninoDoughs;
    const projectedStock = stock - doughsNeeded;
    if (doughsNeeded > 0 && projectedStock < 0) {
      toast.warning(
        `Conseil : stock pâtons serré (${stock} restant${stock > 1 ? "s" : ""} pour ${doughsNeeded} nécessaire${doughsNeeded > 1 ? "s" : ""}).`,
      );
    }
    const capacity = computePizzaCapacity(orders, settings, parseLocalTime(requestedTime), cart.length);
    if (cart.length > 0 && !capacity.canAccept) {
      toast.warning(
        `Conseil : créneau pizza très chargé (${Math.max(0, capacity.remainingBeforeOrder)} place(s) restante(s) pour ${cart.length} pizza(s)).`,
      );
    }

    setSubmitting(true);
    let createdOrderId: string | null = null;

    try {
      const reqDate = parseLocalTime(requestedTime);
      const prepStart = cart.length > 0 ? computePrepStart(reqDate, cart.length, settings) : null;
      const breadCount = paninoCart.filter((p) => p.product_key === "panino").length;
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          customer_name: customerName.trim(),
          requested_time: reqDate.toISOString(),
          prep_start_time: prepStart ? prepStart.toISOString() : null,
          notes: orderNotes.trim() || null,
          pains_panino_status: breadCount > 0 ? "a_preparer" : null,
        })
        .select()
        .single();

      if (error || !order) throw error ?? new Error("Erreur création");
      createdOrderId = order.id;

      if (cart.length > 0) {
        const items = cart.map((c) => ({
          order_id: order.id,
          pizza_id: c.pizza_id,
          pizza_name: c.pizza_name,
          extras: c.extras,
          removed: c.removed,
          cut_into: c.cut_into ?? null,
        }));
        const { error: itemsError } = await supabase.from("order_items").insert(items);
        if (itemsError) throw itemsError;
      }

      if (paninoCart.length > 0) {
        const pItems = paninoCart.map((p) => ({
          order_id: order.id,
          product_key: p.product_key,
          product_name: p.product_name,
          base: p.base ?? null,
          fries_mode: p.fries_mode ?? null,
          side: p.side ?? null,
          sauces: p.sauces,
          removed: p.removed,
          extras: p.extras,
        }));
        const { error: paninoError } = await supabase.from("panino_order_items").insert(pItems);
        if (paninoError) throw paninoError;
      }

      toast.success(`Commande ${customerName} validée pour ${formatTime(reqDate)}`);
      setCart([]);
      setPaninoCart([]);
      setCustomerName("");
      setOrderNotes("");
      setRequestedTime(defaultTime());
      reload();
      reloadPanino();
    } catch (error) {
      console.error(error);
      if (createdOrderId) {
        await supabase.from("panino_order_items").delete().eq("order_id", createdOrderId);
        await supabase.from("order_items").delete().eq("order_id", createdOrderId);
        await supabase.from("orders").delete().eq("id", createdOrderId);
      }
      toast.error("Commande non créée : aucune commande partielle conservée");
    } finally {
      setSubmitting(false);
    }
  };


  const canDeleteOrder = (order: Order) => {
    const orderPaninos = paninoByOrder.get(order.id) ?? [];
    const pizzasUntouched = (order.items?.length ?? 0) === 0 || order.status === "to_prepare";
    const breadUntouched = !order.pains_panino_status || order.pains_panino_status === "a_preparer";
    const paninosUntouched = orderPaninos.every((p) => p.status === "pending");
    return pizzasUntouched && breadUntouched && paninosUntouched;
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm("Supprimer cette commande ?")) return;
    const order = orders.find((o) => o.id === orderId);
    if (!order || !canDeleteOrder(order)) {
      toast.error("Commande déjà en préparation : suppression impossible");
      return;
    }
    await supabase.from("order_items").delete().eq("order_id", orderId);
    await supabase.from("panino_order_items").delete().eq("order_id", orderId);
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }
    toast.success("Commande supprimée");
    reload();
    reloadPanino();
  };

  const todayOrders = orders
    .filter((o) => o.status !== "delivered")
    .sort((a, b) => new Date(a.requested_time).getTime() - new Date(b.requested_time).getTime());
  const readyOrders = todayOrders.filter((o) => {
    const paninos = paninoByOrder.get(o.id) ?? [];
    const hasPizzas = (o.items?.length ?? 0) > 0;
    const hasPaninos = paninos.length > 0;
    if (!hasPizzas && !hasPaninos) return false;
    const pizzasReady = !hasPizzas || o.status === "ready";
    const paninosDone = !hasPaninos || paninos.every((p) => p.status === "done");
    return pizzasReady && paninosDone;
  });
  const readyOrderIds = new Set(readyOrders.map((order) => order.id));
  const urgentCashierCount = todayOrders.filter((o) => isLate(o.requested_time)).length;

  const normalizedCatalogQuery = catalogQuery.trim().toLocaleLowerCase("fr");
  const filteredPizzas = pizzas.filter((pizza) =>
    `${pizza.name} ${pizza.ingredients.join(" ")}`
      .toLocaleLowerCase("fr")
      .includes(normalizedCatalogQuery),
  );
  const disabledPaninoKeys = readDisabledPaninoKeys();
  const availablePaninoProducts = paninoProducts.filter(
    (product) => product.active && !disabledPaninoKeys.has(product.key),
  );
  const filteredPaninoProducts = availablePaninoProducts.filter((product) =>
    product.name.toLocaleLowerCase("fr").includes(normalizedCatalogQuery),
  );
  const cartCount = cart.length + paninoCart.length;
  const requestedDate = isValidLocalTime(requestedTime) ? parseLocalTime(requestedTime) : null;
  const pizzaCapacity = settings && requestedDate
    ? computePizzaCapacity(orders, settings, requestedDate, cart.length)
    : null;
  const nextPizzaSlots = settings && requestedDate && cart.length > 0 && pizzaCapacity?.status === "blocked"
    ? findNextPizzaCapacitySlots(orders, settings, requestedDate, cart.length)
    : [];

  return (
    <div className="p-3 lg:p-4">
      <CashierStationHeader
        active="caisse"
        readyCount={readyOrders.length}
        activeCount={todayOrders.length}
        urgentCount={urgentCashierCount}
      />
      {readyOrders.length > 0 && (
        <Link
          to="/pretes"
          className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-status-ready/50 bg-status-ready/10 p-4 text-status-ready shadow-sm transition hover:bg-status-ready/15"
        >
          <span>
            <span className="block text-sm font-black uppercase">À remettre maintenant</span>
            <span className="text-sm text-foreground/80">
              {readyOrders.length} commande{readyOrders.length > 1 ? "s" : ""} prête{readyOrders.length > 1 ? "s" : ""} côté caisse.
            </span>
          </span>
          <span className="rounded-full bg-status-ready px-3 py-1 text-sm font-black text-white">
            Voir
          </span>
        </Link>
      )}
      <div className="grid gap-4 min-[720px]:grid-cols-[minmax(300px,340px)_minmax(0,1fr)] min-[720px]:items-start xl:grid-cols-[360px_minmax(0,1fr)]">
      <h2 className="sr-only">Caisse — Prise de commande</h2>
      {/* Panel gauche : commande */}
      <aside className="flex h-fit flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm min-[720px]:sticky min-[720px]:top-[4.5rem] min-[720px]:max-h-[calc(100vh-5.5rem)] min-[720px]:overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Commande</h2>
          <div className="text-right">
            <div className="text-[10px] uppercase text-muted-foreground">Pâtons</div>
            <div className={`text-xl font-bold ${stock < 20 ? "text-destructive" : "text-secondary"}`}>{stock}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="cust">Nom du client</Label>
            <Input id="cust" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ex : Martin" className="h-11 text-base" />
          </div>
          <div>
            <Label htmlFor="time">Heure demandée</Label>
            <Input
              id="time"
              type="time"
              value={requestedTime}
              onInput={(e) => setRequestedTime(e.currentTarget.value)}
              onChange={(e) => setRequestedTime(e.target.value)}
              onBlur={(e) => setRequestedTime(e.currentTarget.value)}
              className="h-11 text-base"
            />
            {isTimeInPast(requestedTime) && (
              <p className="mt-1 text-xs text-orange-600 dark:text-orange-400">
                ⚠ Heure passée — la commande restera à la date d'aujourd'hui
              </p>
            )}
          </div>
          {pizzaCapacity && (
            <PizzaCapacityCard
              capacity={pizzaCapacity}
              requestedTime={requestedDate}
              nextSlots={nextPizzaSlots}
              onSelectSlot={(slot) => setRequestedTime(toLocalInput(slot))}
            />
          )}
          <div>
            <Label htmlFor="notes">Notes (ex : à couper)</Label>
            <Input id="notes" value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Annotations libres" className="h-11 text-base" />
          </div>
        </div>

        <div className="border-t pt-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleScanFile(f);
            }}
          />
          <Button
            variant="outline"
            className="w-full h-11"
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
          >
            {scanning ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyse du bon…</>
            ) : (
              <><ScanLine className="mr-2 h-4 w-4" /> Scanner un bon de commande</>
            )}
          </Button>
        </div>

        <div className="border-t pt-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">Panier ({cartCount})</div>
            {cartCount > 0 && (
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
                {cart.length} pizza{cart.length > 1 ? "s" : ""} · {paninoCart.length} Pani'NO
              </span>
            )}
          </div>
          {cart.length === 0 && paninoCart.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/35 px-3 py-5 text-center">
              <p className="text-sm font-medium text-muted-foreground">Le panier est vide</p>
              <p className="mt-1 text-xs text-muted-foreground">Touchez un produit pour l'ajouter.</p>
            </div>
          ) : (
            <ul className="max-h-56 space-y-2 overflow-auto pr-1">
              {cart.map((c, idx) => (
                <li key={`p-${idx}`} className="rounded-lg border bg-background p-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-semibold">🍕 {c.pizza_name}</div>
                      {c.extras.length > 0 && <div className="text-xs text-secondary">+ {c.extras.join(", ")}</div>}
                      {c.removed.length > 0 && <div className="text-xs text-destructive">– {c.removed.join(", ")}</div>}
                      {c.cut_into && <div className="text-xs font-semibold text-primary">À couper en {c.cut_into}</div>}
                    </div>
                    <Button size="icon" variant="ghost" aria-label="Supprimer" className="h-7 w-7" onClick={() => setCart(cart.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
              {paninoCart.map((p, idx) => (
                <li key={`pn-${idx}`} className="rounded-lg border bg-background p-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-semibold">{paninoDisplayName(p.product_key, p.product_name)}</div>
                      {p.base && <div className="text-xs">Base : {p.base}</div>}
                      {friesLabel(p.fries_mode) && <div className="text-xs text-primary">{friesLabel(p.fries_mode)}</div>}
                      {p.side && <div className="text-xs">Accompagnement : {p.side}</div>}
                      {p.sauces.length > 0 && (
                        <div className="text-xs">
                          SAUCES : {p.sauces.length === 2
                            ? `MOITIÉ ${p.sauces[0]} / MOITIÉ ${p.sauces[1]}`
                            : p.sauces[0]}
                        </div>
                      )}
                      {p.extras.length > 0 && <div className="text-xs text-secondary">+ {p.extras.join(", ")}</div>}
                      {p.removed.length > 0 && <div className="text-xs text-destructive">– sans {p.removed.join(", ")}</div>}
                    </div>
                    <Button size="icon" variant="ghost" aria-label="Supprimer" className="h-7 w-7" onClick={() => setPaninoCart(paninoCart.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button onClick={submit} className="h-14 shrink-0 text-base font-bold" disabled={cartCount === 0 || submitting}>
          <Check className="mr-2 h-5 w-5" />
          {submitting ? "Validation…" : cartCount === 0 ? "Panier vide" : `Valider ${cartCount} produit${cartCount > 1 ? "s" : ""}`}
        </Button>

        <div className="border-t pt-3">
          <button
            type="button"
            onClick={() => setShowTodayOrders((open) => !open)}
            className="flex w-full items-center justify-between rounded-lg py-1 text-left text-sm font-semibold"
            aria-expanded={showTodayOrders}
          >
            <span>Commandes en cours ({todayOrders.length})</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showTodayOrders ? "rotate-180" : ""}`} />
          </button>
          {showTodayOrders && todayOrders.length === 0 && (
            <p className="mt-2 text-sm italic text-muted-foreground">Aucune commande en cours</p>
          )}
          {showTodayOrders && todayOrders.length > 0 && (
            <ul className="mt-2 max-h-48 space-y-2 overflow-auto pr-1">
              {todayOrders.map((o) => {
                const oPaninos = paninoByOrder.get(o.id) ?? [];
                const readyForPickup = readyOrderIds.has(o.id);
                return (
                  <li
                    key={o.id}
                    className={`rounded-lg border p-2 text-sm ${
                      readyForPickup
                        ? "border-status-ready/50 bg-status-ready/10"
                        : "bg-background"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold truncate">{o.customer_name}</div>
                          {readyForPickup && (
                            <span className="rounded-full bg-status-ready px-2 py-0.5 text-[10px] font-black text-white">
                              PRÊTE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(o.requested_time)}
                          {o.items && o.items.length > 0 && ` · ${o.items.length} pizza${o.items.length > 1 ? "s" : ""}`}
                          {oPaninos.length > 0 && ` · ${oPaninos.length} Pani'NO`}
                        </div>
                        {oPaninos.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {oPaninos.map((p) => (
                              <li key={p.id} className="text-xs text-muted-foreground">
                                {paninoDisplayName(p.product_key, p.product_name)}
                                {friesLabel(p.fries_mode) && ` · ${friesLabel(p.fries_mode)}`}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {canDeleteOrder(o) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Supprimer la commande"
                          className="h-7 w-7 shrink-0 text-destructive"
                          onClick={() => handleDeleteOrder(o.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

      </aside>

      {/* Panel droit : catalogue */}
      <section className="min-w-0">
        <div className="sticky top-[3.55rem] z-20 mb-3 rounded-2xl border bg-background/95 p-2 shadow-sm backdrop-blur min-[720px]:top-[4.5rem]">
          <div className="flex items-center gap-2">
            <div className="flex shrink-0 items-center gap-1 rounded-xl bg-muted p-1">
              <button
                onClick={() => setCatalogTab("pizzas")}
                className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold transition ${catalogTab === "pizzas" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background"}`}
              >
                <PizzaIcon className="h-4 w-4" /> Pizzas
              </button>
              <button
                onClick={() => setCatalogTab("panino")}
                className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold transition ${catalogTab === "panino" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background"}`}
              >
                <Sandwich className="h-4 w-4" /> Pani'NO
              </button>
            </div>
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Rechercher un produit</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={catalogQuery}
                onChange={(event) => setCatalogQuery(event.target.value)}
                placeholder="Rechercher…"
                className="h-12 bg-card pl-9"
              />
            </label>
          </div>
        </div>

        {catalogTab === "pizzas" && (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 2xl:grid-cols-3">
            {filteredPizzas.map((p) => (
              <button
                key={p.id}
                onClick={() => setEditing({ pizza: p })}
                className="group flex min-h-24 overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
              >
                <div className="h-auto w-24 shrink-0 overflow-hidden bg-muted sm:w-28">
                  {getPizzaImage(p.image_path) && (
                    <img src={getPizzaImage(p.image_path)} alt={p.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center p-3">
                  <div className="font-bold leading-tight">{p.name}</div>
                  <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{p.ingredients.join(" · ")}</div>
                  <div className="mt-2 inline-flex items-center text-xs font-bold text-primary">
                    <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {catalogTab === "panino" && (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 2xl:grid-cols-3">
            {filteredPaninoProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => setEditingPanino(p)}
                className="group flex min-h-24 overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
              >
                <div className="flex w-24 shrink-0 items-center justify-center bg-primary/10 text-primary sm:w-28">
                  <Sandwich className="h-11 w-11" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center p-3">
                  <div className="font-bold leading-tight">{p.name}</div>
                  <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {p.key === "panino" && "Steak, tomates, oignons, roquette, cheddar"}
                    {p.key === "fishno" && "Filet de poisson pané"}
                    {p.key === "cornet_frites" && "Cornet de frites simple"}
                  </div>
                  <div className="mt-2 inline-flex items-center text-xs font-bold text-primary">
                    <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {((catalogTab === "pizzas" && filteredPizzas.length === 0) ||
          (catalogTab === "panino" && filteredPaninoProducts.length === 0)) && (
          <div className="rounded-2xl border border-dashed bg-card px-4 py-12 text-center">
            <Search className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 font-semibold">Aucun produit trouvé</p>
            <p className="mt-1 text-sm text-muted-foreground">Essayez un autre nom ou ingrédient.</p>
          </div>
        )}
      </section>

      <PizzaCustomizer
        open={!!editing}
        pizza={editing?.pizza ?? null}
        allIngredients={allIngredients}
        onClose={() => setEditing(null)}
        onAdd={(item) => {
          setCart((c) => [...c, item]);
          setEditing(null);
          toast.success(`${item.pizza_name} ajoutée`);
        }}
      />

      <PaninoCustomizer
        product={editingPanino}
        options={paninoOptions}
        allIngredients={allIngredients}
        onClose={() => setEditingPanino(null)}
        onAdd={(item) => {
          setPaninoCart((c) => [...c, item]);
          setEditingPanino(null);
          toast.success(`${item.product_name} ajouté`);
        }}
      />


      </div>
    </div>
  );
}

function PizzaCapacityCard({
  capacity,
  requestedTime,
  nextSlots,
  onSelectSlot,
}: {
  capacity: PizzaCapacityResult;
  requestedTime: Date;
  nextSlots: Date[];
  onSelectSlot: (slot: Date) => void;
}) {
  const isIdle = capacity.status === "idle";
  const isBlocked = capacity.status === "blocked";
  const isWarning = capacity.status === "warning";
  const idleFull = isIdle && capacity.remainingBeforeOrder <= 0;
  const idleTight = isIdle && capacity.remainingBeforeOrder === 1;
  const visuallyBlocked = isBlocked || idleFull;
  const visuallyWarning = isWarning || idleTight;
  const tone =
    visuallyBlocked ? "border-destructive/50 bg-destructive/10 text-destructive"
    : visuallyWarning ? "border-status-prepare/50 bg-status-prepare/10 text-status-prepare"
    : "border-secondary/50 bg-secondary/10 text-secondary";
  const Icon = visuallyBlocked ? AlertTriangle : visuallyWarning ? Clock : CheckCircle2;
  const placesText = `${Math.max(0, capacity.remainingBeforeOrder)} place${Math.max(0, capacity.remainingBeforeOrder) > 1 ? "s" : ""}`;
  const cartText = `${capacity.requestedPizzas} pizza${capacity.requestedPizzas > 1 ? "s" : ""}`;
  const prepText = capacity.prepStartTime
    ? capacity.minutesUntilPrepStart !== null && capacity.minutesUntilPrepStart <= 0
      ? "Préparation à lancer maintenant"
      : `Préparation à ${formatTime(capacity.prepStartTime)}`
    : null;
  const conflicts = capacity.overlappingOrders.slice(0, 3);

  return (
    <div className={`rounded-xl border p-3 text-sm ${tone}`}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-bold">
            {isIdle && !idleFull && `Capacité pizza à ${formatTime(requestedTime)}`}
            {idleFull && `Créneau pizza chargé à ${formatTime(requestedTime)}`}
            {!isIdle && !isBlocked && `Pizza OK pour ${formatTime(requestedTime)}`}
            {isBlocked && `Conseil : proposer un autre horaire`}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-foreground/75">
            {isIdle && !idleFull && `${placesText} disponible${Math.max(0, capacity.remainingBeforeOrder) > 1 ? "s" : ""} au four sur ce créneau.`}
            {idleFull && "Le four est déjà complet sur ce créneau pour les pizzas. La commande reste possible si le client insiste."}
            {!isIdle && !isBlocked && `${cartText} au panier : il restera ${Math.max(0, capacity.remainingAfterOrder)} place${Math.max(0, capacity.remainingAfterOrder) > 1 ? "s" : ""}.`}
            {isBlocked && `${cartText} au panier, mais seulement ${placesText} disponible${Math.max(0, capacity.remainingBeforeOrder) > 1 ? "s" : ""}. La caissière peut quand même valider.`}
          </p>
          {!isIdle && prepText && (
            <p className="mt-1 text-xs font-semibold text-foreground/80">
              {prepText}
              {capacity.minutesUntilPrepStart !== null && capacity.minutesUntilPrepStart > 0 && (
                <> · dans {capacity.minutesUntilPrepStart} min</>
              )}
            </p>
          )}
          {conflicts.length > 0 && (
            <div className="mt-2 rounded-lg bg-background/70 px-2 py-1.5 text-xs text-foreground/75">
              Déjà prévu : {conflicts.map((order) => `${order.customer_name} (${order.pizzaCount})`).join(", ")}
              {capacity.overlappingOrders.length > conflicts.length && "…"}
            </div>
          )}
          {isBlocked && nextSlots.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-xs font-bold uppercase text-foreground/70">Horaires conseillés</div>
              <div className="flex flex-wrap gap-2">
                {nextSlots.map((slot) => (
                  <button
                    key={slot.toISOString()}
                    type="button"
                    onClick={() => onSelectSlot(slot)}
                    className="rounded-full border bg-background px-3 py-1 text-xs font-bold text-foreground shadow-sm"
                  >
                    {formatTime(slot)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!isIdle && capacity.prepStartTime && minutesUntil(capacity.prepStartTime) <= 0 && !isBlocked && (
            <p className="mt-2 rounded-lg bg-background/70 px-2 py-1.5 text-xs font-semibold text-foreground/80">
              Délai serré : prévenir la cuisine si la commande est acceptée.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PizzaCustomizer({
  open, pizza, allIngredients, onClose, onAdd,
}: {
  open: boolean;
  pizza: Pizza | null;
  allIngredients: string[];
  onClose: () => void;
  onAdd: (item: DraftItem) => void;
}) {
  const [extras, setExtras] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [cutInto, setCutInto] = useState<number | null>(null);

  // reset when pizza changes
  useMemo(() => { setExtras([]); setRemoved([]); setCutInto(null); }, [pizza?.id]);

  if (!pizza) return null;

  const toggle = (arr: string[], setArr: (v: string[]) => void, v: string) =>
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">{pizza.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold mb-2 flex items-center gap-2"><Minus className="h-4 w-4 text-destructive" /> Retirer</div>
            <div className="flex flex-wrap gap-2">
              {pizza.ingredients.map((ing) => (
                <button
                  key={ing}
                  onClick={() => toggle(removed, setRemoved, ing)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${removed.includes(ing) ? "border-destructive bg-destructive/10 text-destructive line-through" : "hover:bg-muted"}`}
                >
                  {ing}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold mb-2 flex items-center gap-2"><Plus className="h-4 w-4 text-secondary" /> Suppléments</div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-auto">
              {allIngredients.map((ing) => (
                <button
                  key={ing}
                  onClick={() => toggle(extras, setExtras, ing)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${extras.includes(ing) ? "border-secondary bg-secondary/15 text-secondary font-semibold" : "hover:bg-muted"}`}
                >
                  + {ing}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold mb-2">À couper en</div>
            <div className="flex flex-wrap gap-2">
              {[4, 6, 8].map((n) => (
                <button
                  key={n}
                  onClick={() => setCutInto(cutInto === n ? null : n)}
                  className={`rounded-full border px-4 py-1.5 text-sm transition ${cutInto === n ? "border-primary bg-primary/15 text-primary font-semibold" : "hover:bg-muted"}`}
                >
                  {n} parts
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => onAdd({ pizza_id: pizza.id, pizza_name: pizza.name, extras, removed, cut_into: cutInto })} className="h-11">
            <Plus className="mr-2 h-4 w-4" /> Ajouter au panier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function defaultTime() {
  const d = new Date();
  const minutes = d.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 5) * 5;
  d.setMinutes(roundedMinutes, 0, 0);
  return toLocalInput(d);
}
function toLocalInput(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
function isValidLocalTime(t: string): boolean {
  return /^\d{2}:\d{2}$/.test(t);
}
function parseLocalTime(t: string): Date {
  // Règle BLOC 5 : la date est TOUJOURS celle du jour de saisie.
  // Si l'heure saisie est dans le passé, on garde la date courante
  // (la commande sera simplement affichée comme "En retard").
  const [hh, mm] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
}
function isTimeInPast(t: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(t)) return false;
  return parseLocalTime(t).getTime() < Date.now();
}

function readDisabledPaninoKeys() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const stored = window.localStorage.getItem(LOCAL_CONTROL_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    return new Set<string>(Array.isArray(parsed.disabledPaninoKeys) ? parsed.disabledPaninoKeys : []);
  } catch {
    return new Set<string>();
  }
}

function PaninoCustomizer({
  product, options, allIngredients, onClose, onAdd,
}: {
  product: PaninoProduct | null;
  options: PaninoOption[];
  allIngredients: string[];
  onClose: () => void;
  onAdd: (item: DraftPaninoItem) => void;
}) {
  const [base, setBase] = useState<string | null>(null);
  const [friesMode, setFriesMode] = useState<string | null>(null);
  const [side, setSide] = useState<string | null>(null);
  const [sauces, setSauces] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [extras, setExtras] = useState<string[]>([]);

  useMemo(() => {
    setBase(null); setFriesMode(null); setSide(null);
    setSauces([]); setRemoved([]); setExtras([]);
  }, [product?.id]);

  if (!product) return null;

  const opts = options.filter((o) => o.product_key === product.key);
  const byKind = (kind: string) =>
    opts.filter((o) => o.kind === kind).sort((a, b) => a.sort_order - b.sort_order);

  const bases = byKind("base");
  const friesModes = byKind("fries_mode");
  const sides = byKind("side");
  const saucesOpts = byKind("sauce");
  const removables = byKind("removable");
  const extrasOpts = byKind("extra");
  const sharedExtrasAllowed = product.key === "panino" || product.key === "fishno";
  const extraNames = Array.from(
    new Set([
      ...extrasOpts.map((option) => option.name),
      ...(sharedExtrasAllowed ? allIngredients : []),
    ].map((ingredient) => ingredient.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));

  const toggleSauce = (name: string) => {
    setSauces((cur) => {
      if (cur.includes(name)) return cur.filter((s) => s !== name);
      if (cur.length >= 2) {
        toast.info("Maximum 2 sauces incluses");
        return cur;
      }
      return [...cur, name];
    });
  };
  const toggleIn = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const canSubmit =
    (bases.length === 0 || base !== null) &&
    (friesModes.length === 0 || friesMode !== null) &&
    (sides.length === 0 || side !== null);

  const handleAdd = () => {
    onAdd({
      product_key: product.key,
      product_name: product.name,
      base,
      fries_mode: friesMode,
      side,
      sauces,
      removed,
      extras,
    });
  };

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {bases.length > 0 && (
            <Section title="Base (obligatoire)">
              {bases.map((o) => (
                <Chip key={o.id} active={base === o.name} onClick={() => setBase(o.name)}>{o.name}</Chip>
              ))}
            </Section>
          )}

          {friesModes.length > 0 && (
            <Section title="Service des frites (obligatoire)">
              {friesModes.map((o) => (
                <Chip key={o.id} active={friesMode === o.name} onClick={() => setFriesMode(o.name)}>{o.name}</Chip>
              ))}
            </Section>
          )}

          {sides.length > 0 && (
            <Section title="Accompagnement (obligatoire)">
              {sides.map((o) => (
                <Chip key={o.id} active={side === o.name} onClick={() => setSide(o.name)}>{o.name}</Chip>
              ))}
            </Section>
          )}

          {saucesOpts.length > 0 && (
            <Section title="Sauces (jusqu'à 2 — incluses, sans supplément)">
              {saucesOpts.map((o) => (
                <Chip key={o.id} active={sauces.includes(o.name)} onClick={() => toggleSauce(o.name)}>{o.name}</Chip>
              ))}
              {sauces.length === 2 && (
                <div className="w-full text-xs font-semibold text-primary mt-1">
                  MOITIÉ {sauces[0].toUpperCase()} / MOITIÉ {sauces[1].toUpperCase()}
                </div>
              )}
            </Section>
          )}

          {removables.length > 0 && (
            <Section title="Retirer" icon={<Minus className="h-4 w-4 text-destructive" />}>
              {removables.map((o) => (
                <button
                  key={o.id}
                  onClick={() => toggleIn(removed, setRemoved, o.name)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${removed.includes(o.name) ? "border-destructive bg-destructive/10 text-destructive line-through" : "hover:bg-muted"}`}
                >
                  {o.name}
                </button>
              ))}
            </Section>
          )}

          {extraNames.length > 0 && (
            <Section title="Suppléments" icon={<Plus className="h-4 w-4 text-secondary" />}>
              {extraNames.map((name) => (
                <button
                  key={name}
                  onClick={() => toggleIn(extras, setExtras, name)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${extras.includes(name) ? "border-secondary bg-secondary/15 text-secondary font-semibold" : "hover:bg-muted"}`}
                >
                  + {name}
                </button>
              ))}
            </Section>
          )}

          {bases.length === 0 && friesModes.length === 0 && sides.length === 0 && saucesOpts.length === 0 && removables.length === 0 && extraNames.length === 0 && (
            <p className="text-sm text-muted-foreground italic">Produit simple — aucune option à configurer.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleAdd} disabled={!canSubmit} className="h-11">
            <Plus className="mr-2 h-4 w-4" /> Ajouter au panier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-semibold mb-2 flex items-center gap-2">{icon}{title}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition ${active ? "border-primary bg-primary/15 text-primary font-semibold" : "hover:bg-muted"}`}
    >
      {children}
    </button>
  );
}
