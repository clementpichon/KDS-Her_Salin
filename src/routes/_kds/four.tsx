import { createFileRoute } from "@tanstack/react-router";
import { Flame, Minus, Clock, User, PackageCheck, Eye, EyeOff, Sandwich } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { useOrders, useSettings, usePaninoOrderItems } from "@/hooks/use-kds-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { computeStock, formatTime, isLate } from "@/lib/scheduling";
import { friesLabel } from "@/lib/kds-formatting";
import { TimeSlotGroup } from "@/components/kds/TimeSlotGroup";
import type { PaninoOrderItem } from "@/lib/kds-types";


export const Route = createFileRoute("/_kds/four")({
  head: () => ({
    meta: [
      { title: "Four — En cuisson — Her Salin" },
      { name: "description", content: "Écran four Her Salin : commandes en cuisson et passage en prêtes." },
      { property: "og:title", content: "Four — En cuisson" },
      { property: "og:description", content: "Suivi des commandes en cuisson et passage en prêtes." },
    ],
    links: [{ rel: "canonical", href: "/four" }],
  }),
  component: Four,
});

function Four() {
  const { orders } = useOrders();
  const settings = useSettings();
  const { items: paninoItems } = usePaninoOrderItems();
  const stock = settings ? computeStock(orders, settings, paninoItems) : 0;
  const [focusedIds, setFocusedIds] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const breadCountByOrder = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of paninoItems) {
      if (it.product_key !== "panino") continue;
      m.set(it.order_id, (m.get(it.order_id) ?? 0) + 1);
    }
    return m;
  }, [paninoItems]);

  const paninoItemsByOrder = useMemo(() => {
    const m = new Map<string, PaninoOrderItem[]>();
    for (const it of paninoItems) {
      if (it.product_key !== "panino") continue;
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

  const list = orders
    .filter((o) => {
      if (o.status === "in_oven") return true;
      // commandes pain-only ou pains pas encore cuits
      const bread = breadCountByOrder.get(o.id) ?? 0;
      return bread > 0 && o.pains_panino_status === "en_cours";
    })
    .sort((a, b) => a.requested_time.localeCompare(b.requested_time));

  const markReady = async (id: string) => {
    if (busyIds.has(id)) return;
    setBusyIds((prev) => new Set(prev).add(id));
    const { error } = await supabase.from("orders").update({ status: "ready" }).eq("id", id);
    if (error) toast.error("Impossible de passer les pizzas en prêtes");
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };
  const markPainsReady = async (id: string) => {
    if (busyIds.has(`pains-${id}`)) return;
    setBusyIds((prev) => new Set(prev).add(`pains-${id}`));
    const { error } = await supabase.from("orders").update({ pains_panino_status: "pret" }).eq("id", id);
    if (error) toast.error("Impossible de passer les pains en cuits");
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.delete(`pains-${id}`);
      return next;
    });
  };
  const toggleItemPrepared = async (itemId: string, prepared: boolean) => {
    await supabase.from("order_items").update({ prepared }).eq("id", itemId);
  };
  const loseDough = async () => {
    if (!settings) return;
    await supabase.from("settings").update({ paton_losses: settings.paton_losses + 1 }).eq("id", 1);
    toast("Pâton retiré du stock");
  };


  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between rounded-2xl border bg-card p-4 shadow-sm">
        <h1 className="text-xl font-bold flex items-center gap-2"><Flame className="text-status-oven" /> Four — En cuisson ({list.length})</h1>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase text-muted-foreground">Pâtons</div>
            <div className={`text-xl font-bold ${stock < 20 ? "text-destructive" : "text-secondary"}`}>{stock}</div>
          </div>
          <Button variant="outline" onClick={loseDough}><Minus className="mr-1 h-4 w-4" />1 pâton</Button>
        </div>
      </div>

      {list.length === 0 && <div className="rounded-2xl border-2 border-dashed p-12 text-center text-muted-foreground">Four vide</div>}

      {(() => {
        const groups = new Map<string, typeof list>();
        for (const o of list) {
          const t = formatTime(o.requested_time);
          const arr = groups.get(t) ?? [];
          arr.push(o);
          groups.set(t, arr);
        }
        const entries = Array.from(groups.entries());
        return entries.map(([time, ordersAt]) => (
          <TimeSlotGroup key={time} time={time} count={ordersAt.length} accentClass="border-status-oven/40">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {ordersAt.map((o) => {
          const focused = focusedIds.has(o.id);
          const breadCount = breadCountByOrder.get(o.id) ?? 0;
          const hasPizzas = (o.items?.length ?? 0) > 0;
          const pizzasInOven = o.status === "in_oven";
          const painsToCook = breadCount > 0 && o.pains_panino_status === "en_cours";
          const pizzasBusy = busyIds.has(o.id);
          const painsBusy = busyIds.has(`pains-${o.id}`);
          return (
            <article
              key={o.id}
              onClick={() => toggleFocus(o.id)}
              className={`rounded-2xl border-2 border-status-oven bg-card p-4 shadow-sm cursor-pointer transition ${
                focused
                  ? "ring-4 ring-primary shadow-xl scale-[1.01] bg-primary/5 md:col-span-2 xl:col-span-2 z-10"
                  : ""
              }`}
            >
              <header className="mb-3 flex items-start justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold"><User className="h-5 w-5" /> {o.customer_name}</h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" />Pour {formatTime(o.requested_time)}{isLate(o.requested_time) && <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">En retard</span>}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFocus(o.id); }}
                    className={`rounded-full p-1.5 transition ${focused ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    aria-label={focused ? "Désélectionner" : "Mettre en évidence"}
                    title={focused ? "Désélectionner" : "Mettre en évidence"}
                  >
                    {focused ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <div className="rounded-full bg-status-oven/15 text-status-oven px-3 py-1 text-sm font-bold">AU FOUR</div>
                </div>
              </header>
              {o.notes && (
                <div className="mb-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                  📝 {o.notes}
                </div>
              )}
              {hasPizzas && pizzasInOven && (
                <>
                  <div className="mb-1 text-xs font-bold uppercase text-muted-foreground">Pizzas à cuire</div>
                  <ul className="mb-3 space-y-2">
                    {o.items?.map((it) => (
                      <li
                        key={it.id}
                        className={`flex items-start gap-3 rounded-lg border bg-background p-2 transition ${it.prepared ? "opacity-60" : ""}`}
                      >
                        <Checkbox
                          checked={it.prepared}
                          onCheckedChange={(c) => toggleItemPrepared(it.id, !!c)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Marquer comme cuit"
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
                </>
              )}
              {painsToCook && (
                <div className="mb-3">
                  <div className="mb-1 text-xs font-bold uppercase text-muted-foreground">Pains Pani'NO à cuire</div>
                  <div className="rounded-lg border-2 border-primary/40 bg-primary/10 p-3 flex items-center gap-2 text-primary font-bold">
                    <Sandwich className="h-5 w-5" /> {breadCount} pain{breadCount > 1 ? "s" : ""} à cuire
                  </div>
                  <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
                    Signal Pani'NO : dès validation, le poste peut assembler les Pani'NO en attente.
                  </div>
                  <ul className="mt-2 space-y-1">
                    {(paninoItemsByOrder.get(o.id) ?? []).map((it) => (
                      <li key={it.id} className="flex items-center justify-between rounded border bg-background px-2 py-1 text-sm">
                        <span className="font-semibold">{it.product_name}</span>
                        {friesLabel(it.fries_mode) && (
                          <span className="text-xs font-bold text-primary">{friesLabel(it.fries_mode)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-col gap-2">
                {painsToCook && (
                  <Button onClick={(e) => { e.stopPropagation(); markPainsReady(o.id); }} disabled={painsBusy} className="w-full h-12 text-base font-black bg-primary hover:bg-primary/90">
                    <Sandwich className="mr-2 h-5 w-5" /> {painsBusy ? "Validation…" : `Pains cuits — libérer Pani'NO (${breadCount})`}
                  </Button>
                )}
                {hasPizzas && pizzasInOven && (
                  <Button onClick={(e) => { e.stopPropagation(); markReady(o.id); }} disabled={pizzasBusy} className="w-full h-12 text-base font-bold bg-status-ready hover:bg-status-ready/90">
                    <PackageCheck className="mr-2 h-5 w-5" /> {pizzasBusy ? "Validation…" : "Pizzas prêtes"}
                  </Button>
                )}
              </div>
            </article>
          );
              })}

            </div>
          </TimeSlotGroup>
        ));
      })()}
    </div>
  );
}
