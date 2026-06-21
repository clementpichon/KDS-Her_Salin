import { createFileRoute } from "@tanstack/react-router";
import { Flame, Minus, Clock, User, Eye, EyeOff, Sandwich, Fish, Utensils } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { useOrders, useSettings, usePaninoOrderItems } from "@/hooks/use-kds-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { computeStock, formatTime, minutesUntil, isLate } from "@/lib/scheduling";
import { paninoDisplayName } from "@/lib/kds-formatting";
import { TimeSlotGroup } from "@/components/kds/TimeSlotGroup";
import type { Order, OrderItem, PaninoOrderItem } from "@/lib/kds-types";

type PizzaioloJob = {
  id: string;
  customer_name: string;
  requested_time: string;
  prep_start_time: string | null;
  orders: Order[];
  items: OrderItem[];
  paninos: PaninoOrderItem[];
};

export const Route = createFileRoute("/_kds/pizzaiolo")({
  head: () => ({
    meta: [
      { title: "Pizzaiolo — À préparer — Her Salin" },
      { name: "description", content: "Écran pizzaiolo Her Salin : liste des commandes à préparer, suivi par pizza et envoi au four." },
      { property: "og:title", content: "Pizzaiolo — À préparer" },
      { property: "og:description", content: "Liste des commandes à préparer et envoi au four." },
    ],
    links: [{ rel: "canonical", href: "/pizzaiolo" }],
  }),
  component: Pizzaiolo,
});

function Pizzaiolo() {
  const { orders } = useOrders();
  const settings = useSettings();
  const { items: paninoItems } = usePaninoOrderItems();
  const stock = settings ? computeStock(orders, settings, paninoItems) : 0;
  const [focusedIds, setFocusedIds] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const paninoByOrder = useMemo(() => {
    const m = new Map<string, PaninoOrderItem[]>();
    for (const it of paninoItems) {
      if (it.status === "done") continue;
      const arr = m.get(it.order_id) ?? [];
      arr.push(it);
      m.set(it.order_id, arr);
    }
    return m;
  }, [paninoItems]);

  const toggleFocus = (id: string) => {
    setFocusedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const ordersToDisplay = orders
    .filter((o) => {
      const hasPizzas = (o.items?.length ?? 0) > 0;
      const paninos = paninoByOrder.get(o.id) ?? [];
      const breadCount = paninos.filter((p) => p.product_key === "panino").length;
      const pizzasDone = !hasPizzas || o.status !== "to_prepare";
      const painsDone = breadCount === 0 || (o.pains_panino_status && o.pains_panino_status !== "a_preparer");
      // Affiche tant que le pizzaiolo a une tâche en cours (pizzas à préparer OU pains à préparer)
      if (pizzasDone && painsDone) return false;
      return hasPizzas || breadCount > 0;
    })
    .sort((a, b) => a.requested_time.localeCompare(b.requested_time));

  const list = useMemo(() => {
    const jobs = new Map<string, PizzaioloJob>();
    for (const order of ordersToDisplay) {
      const key = pizzaioloJobKey(order);
      const existing = jobs.get(key);
      const orderItems = order.status === "to_prepare" ? order.items ?? [] : [];
      const orderPaninos = paninoByOrder.get(order.id) ?? [];
      if (!existing) {
        jobs.set(key, {
          id: key,
          customer_name: order.customer_name,
          requested_time: order.requested_time,
          prep_start_time: order.prep_start_time,
          orders: [order],
          items: [...orderItems],
          paninos: [...orderPaninos],
        });
        continue;
      }

      existing.orders.push(order);
      existing.items.push(...orderItems);
      existing.paninos.push(...orderPaninos);
      if (order.requested_time.localeCompare(existing.requested_time) < 0) {
        existing.requested_time = order.requested_time;
      }
      if (
        order.prep_start_time &&
        (!existing.prep_start_time || order.prep_start_time.localeCompare(existing.prep_start_time) < 0)
      ) {
        existing.prep_start_time = order.prep_start_time;
      }
    }

    return Array.from(jobs.values()).sort((a, b) => a.requested_time.localeCompare(b.requested_time));
  }, [ordersToDisplay, paninoByOrder]);

  const sendToOven = async (jobId: string, pizzaOrderIds: string[], breadOrderIds: string[]) => {
    if (busyIds.has(jobId)) return;
    setBusyIds((prev) => new Set(prev).add(jobId));
    const updates = [];
    if (pizzaOrderIds.length > 0) {
      updates.push(supabase.from("orders").update({ status: "in_oven" }).in("id", pizzaOrderIds));
    }
    if (breadOrderIds.length > 0) {
      updates.push(supabase.from("orders").update({ pains_panino_status: "en_cours" }).in("id", breadOrderIds));
    }

    if (updates.length === 0) {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
      return;
    }

    const results = await Promise.all(updates);
    if (results.some((result) => result.error)) {
      toast.error("Impossible d'envoyer toute la commande au four");
    } else {
      toast.success("Commande envoyée au four");
    }
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.delete(jobId);
      return next;
    });
  };


  const loseDough = async () => {
    if (!settings) return;
    await supabase.from("settings").update({ paton_losses: settings.paton_losses + 1 }).eq("id", 1);
    toast("Pâton retiré du stock");
  };
  const toggleItemPrepared = async (itemId: string, prepared: boolean) => {
    await supabase.from("order_items").update({ prepared }).eq("id", itemId);
  };

  // Compte des pizzas par créneau horaire (affichage informatif uniquement,
  // aucune limite n'est appliquée).
  const slotCounts = (() => {
    const m = new Map<string, number>();
    for (const o of list) {
      const t = formatTime(o.requested_time);
      m.set(t, (m.get(t) ?? 0) + o.items.length);
    }
    return Array.from(m.entries());
  })();

  const groups = new Map<string, PizzaioloJob[]>();
  for (const job of list) {
    const t = formatTime(job.requested_time);
    const arr = groups.get(t) ?? [];
    arr.push(job);
    groups.set(t, arr);
  }
  const groupEntries = Array.from(groups.entries());

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between rounded-2xl border bg-card p-4 shadow-sm">
        <h1 className="text-xl font-bold flex items-center gap-2"><Flame className="text-status-prepare" /> Pizzaiolo — À préparer ({list.length})</h1>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase text-muted-foreground">Pâtons</div>
            <div className={`text-xl font-bold ${stock < 20 ? "text-destructive" : "text-secondary"}`}>{stock}</div>
          </div>
          <Button variant="outline" onClick={loseDough}><Minus className="mr-1 h-4 w-4" />1 pâton</Button>
        </div>
      </div>

      {slotCounts.length > 0 && (
        <div className="mb-4 rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-2 text-xs font-bold uppercase text-muted-foreground">Pizzas par créneau</div>
          <div className="flex flex-wrap gap-2">
            {slotCounts.map(([time, count]) => (
              <div key={time} className="flex items-center gap-2 rounded-lg border-2 border-status-prepare/40 bg-status-prepare/10 px-3 py-2 text-status-prepare">
                <Clock className="h-4 w-4" />
                <span className="text-base font-bold">{time}</span>
                <span className="rounded-full bg-status-prepare px-2 py-0.5 text-sm font-bold text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {list.length === 0 && <EmptyState text="Aucune commande à préparer 🎉" />}

      {groupEntries.map(([time, ordersAt]) => (
        <TimeSlotGroup
          key={time}
          time={time}
          count={ordersAt.length}
          accentClass="border-status-prepare/40"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ordersAt.map((job) => {
              const mins = minutesUntil(job.prep_start_time ?? job.requested_time);
              const urgent = mins <= 2;
              const canStart = mins <= 0;
              const focused = focusedIds.has(job.id);
              const paninos = job.paninos;
              const breadCount = paninos.filter((p) => p.product_key === "panino").length;
              const fishCount = paninos.filter((p) => p.product_key === "fishno").length;
              const friesCount = paninos.filter((p) => p.product_key === "cornet_frites").length;
              const hasPizzas = job.items.length > 0;
              const hasOtherPaninoWork = fishCount + friesCount > 0 || (breadCount > 0 && !hasPizzas);
              const pizzaOrderIds = job.orders
                .filter((order) => (order.items?.length ?? 0) > 0 && order.status === "to_prepare")
                .map((order) => order.id);
              const breadOrderIds = job.orders
                .filter((order) => {
                  const orderBreadCount = (paninoByOrder.get(order.id) ?? []).filter((p) => p.product_key === "panino").length;
                  return orderBreadCount > 0 && (!order.pains_panino_status || order.pains_panino_status === "a_preparer");
                })
                .map((order) => order.id);
              const notes = Array.from(
                new Set(job.orders.map((order) => order.notes?.trim()).filter((note): note is string => !!note)),
              );
              return (
                <article key={job.id} onClick={() => toggleFocus(job.id)} className={`rounded-2xl border-2 bg-card p-4 shadow-sm cursor-pointer transition ${urgent ? "border-destructive" : "border-status-prepare"} ${focused ? "ring-4 ring-primary shadow-xl scale-[1.01] bg-primary/5 md:col-span-2 xl:col-span-2 z-10" : ""}`}>
                  <header className="mb-3 flex items-start justify-between">
                    <div>
                      <h2 className="flex items-center gap-2 text-lg font-bold"><User className="h-5 w-5" /> {job.customer_name}</h2>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />Pour {formatTime(job.requested_time)}
                        {isLate(job.requested_time) && <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">En retard</span>}
                        {job.orders.length > 1 && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
                            {job.orders.length} tickets regroupés
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFocus(job.id); }}
                        className={`rounded-full p-1.5 transition ${focused ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                        aria-label={focused ? "Désélectionner" : "Mettre en évidence"}
                        title={focused ? "Désélectionner" : "Mettre en évidence"}
                      >
                        {focused ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <div className={`rounded-full px-3 py-1 text-sm font-bold ${urgent ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-status-prepare/15 text-status-prepare"}`}>
                        {mins <= 0 ? "MAINTENANT" : `dans ${mins} min`}
                      </div>
                    </div>
                  </header>

                  {notes.length > 0 && (
                    <div className="mb-3 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                      📝 {notes.join(" · ")}
                    </div>
                  )}

                  {breadCount > 0 && (
                    <div className="mb-3 rounded-lg border-2 border-primary/50 bg-primary/10 p-3">
                      <div className="flex items-center gap-2 text-base font-bold text-primary">
                        <Sandwich className="h-5 w-5" /> Préparer {breadCount} pain{breadCount > 1 ? "s" : ""} Pani'NO
                      </div>
                      <div className="mt-1 text-xs font-semibold text-primary/80">
                        Info poste Pani'NO : le steak peut être lancé en temps masqué pendant la cuisson du pain.
                      </div>
                    </div>
                  )}

                  {hasOtherPaninoWork && (
                    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 px-2 py-1.5 text-xs font-semibold text-primary">
                      <span className="uppercase">Aussi au poste Pani'NO :</span>
                      {breadCount > 0 && !hasPizzas && (
                        <span className="inline-flex items-center gap-1"><Sandwich className="h-3.5 w-3.5" />{breadCount} Pani'NO</span>
                      )}
                      {fishCount > 0 && (
                        <span className="inline-flex items-center gap-1"><Fish className="h-3.5 w-3.5" />{fishCount} Fish & NO</span>
                      )}
                      {friesCount > 0 && (
                        <span className="inline-flex items-center gap-1"><Utensils className="h-3.5 w-3.5" />{friesCount} Cornet{friesCount > 1 ? "s" : ""} de frites</span>
                      )}
                      {(fishCount > 0 || friesCount > 0) && (
                        <span className="w-full text-[11px] text-primary/80">Ces produits ne doivent pas attendre le pain Pani'NO.</span>
                      )}
                    </div>
                  )}

                  {hasPizzas && (
                    <ul className="mb-3 space-y-2">
                      {job.items.map((it) => (
                        <li
                          key={it.id}
                          className={`flex items-start gap-3 rounded-lg border bg-background p-2 transition ${it.prepared ? "opacity-60" : ""}`}
                        >
                          <Checkbox
                            checked={it.prepared}
                            onCheckedChange={(c) => toggleItemPrepared(it.id, !!c)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Marquer comme préparé"
                            className="mt-1 h-6 w-6"
                          />
                          <div className="flex-1">
                            <div className={`font-semibold ${it.prepared ? "line-through" : ""}`}>{it.pizza_name}</div>
                            {it.extras.length > 0 && <div className="text-xs text-secondary">+ {it.extras.join(", ")}</div>}
                            {it.removed.length > 0 && <div className="text-xs text-destructive">– sans {it.removed.join(", ")}</div>}
                            {it.cut_into && <div className="text-xs font-bold text-primary">✂️ À couper en {it.cut_into}</div>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {(hasPizzas || breadCount > 0) && (() => {
                    const total = job.items.length;
                    const done = job.items.filter((i) => i.prepared).length;
                    const pizzasPending = pizzaOrderIds.length > 0;
                    const painsPending = breadOrderIds.length > 0;
                    if (!pizzasPending && !painsPending) {
                      return (
                        <div className="rounded-md bg-status-ready/10 px-3 py-2 text-center text-xs font-semibold uppercase text-status-ready">
                          Préparation envoyée ✓
                        </div>
                      );
                    }
                    return (
                      <div className="grid gap-2">
                        {pizzasPending && (
                          <Button
                            onClick={(e) => { e.stopPropagation(); sendToOven(`${job.id}-pizzas`, pizzaOrderIds, []); }}
                            disabled={!canStart || busyIds.has(`${job.id}-pizzas`)}
                            className="w-full h-12 text-base font-bold bg-status-oven hover:bg-status-oven/90"
                          >
                            <Flame className="mr-2 h-5 w-5" />
                            {!canStart ? `À lancer dans ${mins} min` : busyIds.has(`${job.id}-pizzas`) ? "Envoi…" : `Pizzas au four (${done}/${total})`}
                          </Button>
                        )}
                        {painsPending && (
                          <Button
                            onClick={(e) => { e.stopPropagation(); sendToOven(`${job.id}-pains`, [], breadOrderIds); }}
                            disabled={!canStart || busyIds.has(`${job.id}-pains`)}
                            className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90"
                          >
                            <Sandwich className="mr-2 h-5 w-5" />
                            {!canStart ? `Pain${breadCount > 1 ? "s" : ""} à lancer dans ${mins} min` : busyIds.has(`${job.id}-pains`) ? "Envoi…" : `Pain${breadCount > 1 ? "s" : ""} Pani'NO au four (${breadCount})`}
                          </Button>
                        )}
                      </div>
                    );
                  })()}

                </article>
              );
            })}
          </div>
        </TimeSlotGroup>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border-2 border-dashed p-12 text-center text-muted-foreground">{text}</div>;
}

function pizzaioloJobKey(order: Order) {
  const customer = order.customer_name.trim().toLocaleLowerCase("fr");
  const requested = new Date(order.requested_time);
  const day = requested.toISOString().slice(0, 10);
  return `${day}-${formatTime(order.requested_time)}-${customer}`;
}
