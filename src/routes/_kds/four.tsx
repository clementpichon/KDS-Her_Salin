import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ClipboardList, Flame, Minus, Clock, User, PackageCheck, Eye, EyeOff, Sandwich, Scissors } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { useOrders, useSettings, usePaninoOrderItems, usePizzas } from "@/hooks/use-kds-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { computeStock, formatTime, isLate } from "@/lib/scheduling";
import { friesLabel } from "@/lib/kds-formatting";
import { logProductionEvent } from "@/lib/production-events";
import { buildPizzaioloQueue, type PizzaioloQueueJob } from "@/lib/pizzaiolo-queue";
import { isOrderActive } from "@/lib/order-status";
import { getPizzaDisplayDetails, pizzaProductionStatus } from "@/lib/pizza-production";
import type { OrderItem, PaninoOrderItem, Pizza } from "@/lib/kds-types";


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
  const pizzas = usePizzas();
  const stock = settings ? computeStock(orders, settings, paninoItems) : 0;
  const [focusedIds, setFocusedIds] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [previewOpen, setPreviewOpen] = useState(false);

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
      if (!isOrderActive(o)) return false;
      const hasPizzaItemsInOven = (o.items ?? []).some((item) => pizzaProductionStatus(item, o) === "in_oven");
      if (hasPizzaItemsInOven) return true;
      const hasPizzaItemsAtFour = o.status !== "ready" && (o.items ?? []).some((item) => pizzaProductionStatus(item, o) === "ready");
      if (hasPizzaItemsAtFour) return true;
      if (o.status === "in_oven") return true;
      // commandes pain-only ou pains pas encore cuits
      const bread = breadCountByOrder.get(o.id) ?? 0;
      return bread > 0 && o.pains_panino_status === "en_cours";
    })
    .sort((a, b) => a.requested_time.localeCompare(b.requested_time));
  const upcomingPizzaioloJobs = useMemo(
    () => buildPizzaioloQueue(orders, paninoItems, { excludeStarted: true }).slice(0, 3),
    [orders, paninoItems],
  );

  const markReady = async (id: string) => {
    const busyKey = `pizzas-${id}`;
    if (busyIds.has(busyKey)) return;
    const order = list.find((candidate) => candidate.id === id);
    const pizzaItems = order?.items ?? [];
    const pendingPizzaItems = pizzaItems.filter((item) => pizzaProductionStatus(item, order) === "to_prepare");
    const inOvenPizzaItems = pizzaItems.filter((item) => pizzaProductionStatus(item, order) === "in_oven");

    setBusyIds((prev) => new Set(prev).add(busyKey));
    if (!order || pizzaItems.length === 0) {
      toast.error("Commande introuvable");
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(busyKey);
        return next;
      });
      return;
    }

    if (pendingPizzaItems.length > 0) {
      toast.warning("Commande incomplète : toutes les pizzas ne sont pas encore arrivées au four.");
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(busyKey);
        return next;
      });
      return;
    }

    if (inOvenPizzaItems.length > 0) {
      const { error: itemsError } = await supabase
        .from("order_items")
        .update({ prepared: true, production_status: "ready", ready_at: new Date().toISOString() })
        .in("id", inOvenPizzaItems.map((item) => item.id));
      if (itemsError) {
        toast.error("Impossible de finaliser toutes les pizzas");
        setBusyIds((prev) => {
          const next = new Set(prev);
          next.delete(busyKey);
          return next;
        });
        return;
      }
      void Promise.all(
        inOvenPizzaItems.map((item) =>
          logProductionEvent({
            settings,
            eventType: "PIZZA_FINISHED",
            station: "four",
            orderId: item.order_id,
            orderItemId: item.id,
            productType: "pizza",
            productName: item.pizza_name,
            metadata: { source: "bulk_ready" },
          }),
        ),
      );
    }

    const orderPaninos = paninoItems.filter((item) => item.order_id === id);
    const allPaninosDone = orderPaninos.every((item) => item.status === "done");
    const { error } = await supabase.from("orders").update({ status: "ready" }).eq("id", id);
    if (error) toast.error("Impossible de passer les pizzas en prêtes");
    else if (allPaninosDone) {
      void logProductionEvent({
        settings,
        eventType: "ORDER_READY",
        station: "four",
        orderId: id,
        productType: "order",
      });
    } else {
      toast.success("Pizzas prêtes — attente du poste Pani'NO");
    }
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.delete(busyKey);
      return next;
    });
  };
  const markPainsReady = async (id: string) => {
    if (busyIds.has(`pains-${id}`)) return;
    setBusyIds((prev) => new Set(prev).add(`pains-${id}`));
    const { error } = await supabase.from("orders").update({ pains_panino_status: "pret" }).eq("id", id);
    if (error) toast.error("Impossible de passer les pains en cuits");
    else {
      void logProductionEvent({
        settings,
        eventType: "PANINO_BREAD_FINISHED",
        station: "four",
        orderId: id,
        productType: "panino_bread",
        productName: "Pain Pani'NO",
      });
    }
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.delete(`pains-${id}`);
      return next;
    });
  };
  const loseDough = async () => {
    if (!settings) return;
    await supabase.from("settings").update({ paton_losses: settings.paton_losses + 1 }).eq("id", 1);
    toast("Pâton retiré du stock");
  };


  return (
    <div className="p-3 md:p-4">
      <div className="mb-3 flex items-center justify-between rounded-xl border bg-card px-3 py-3 shadow-sm md:px-4">
        <h1 className="flex items-center gap-2 text-lg font-black md:text-xl"><Flame className="text-status-oven" /> Four — En cuisson ({list.length})</h1>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase text-muted-foreground">Pâtons</div>
            <div className={`text-xl font-bold ${stock < 20 ? "text-destructive" : "text-secondary"}`}>{stock}</div>
          </div>
          <Button variant="outline" onClick={loseDough} className="h-10"><Minus className="mr-1 h-4 w-4" />1 pâton</Button>
        </div>
      </div>

      <UpcomingPizzaioloPreview
        jobs={upcomingPizzaioloJobs}
        pizzas={pizzas}
        open={previewOpen}
        onToggle={() => setPreviewOpen((current) => !current)}
      />

      {list.length === 0 && <div className="rounded-xl border border-dashed p-10 text-center text-sm font-semibold text-muted-foreground">Four vide</div>}

      {list.length > 0 && (
        <div className="grid items-start gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {list.map((o) => {
          const focused = focusedIds.has(o.id);
          const breadCount = breadCountByOrder.get(o.id) ?? 0;
          const pizzaItems = o.items ?? [];
          const pizzaItemsInOven = (o.items ?? []).filter((item) => pizzaProductionStatus(item, o) === "in_oven");
          const pizzaItemsReady = (o.items ?? []).filter((item) => pizzaProductionStatus(item, o) === "ready");
          const pizzaItemsPending = (o.items ?? []).filter((item) => pizzaProductionStatus(item, o) === "to_prepare");
          const hasPizzas = pizzaItems.length > 0;
          const pizzasAlreadyReady = o.status === "ready";
          const canCompletePizzas = hasPizzas && !pizzasAlreadyReady && pizzaItemsPending.length === 0;
          const pizzasBusy = busyIds.has(`pizzas-${o.id}`);
          const painsToCook = breadCount > 0 && o.pains_panino_status === "en_cours";
          const painsBusy = busyIds.has(`pains-${o.id}`);
          const late = isLate(o.requested_time);
          const cardTone = late
            ? "border-orange-400/60 bg-orange-500/[0.03]"
            : canCompletePizzas
              ? "border-status-ready/45 bg-status-ready/[0.03]"
              : pizzaItemsInOven.length > 0 || painsToCook
                ? "border-status-oven/35 bg-card"
                : "border-border bg-card";
          const statusChip = pizzasAlreadyReady
            ? "bg-status-ready/15 text-status-ready"
            : canCompletePizzas
              ? "bg-status-ready text-white"
              : "bg-status-oven/10 text-status-oven";
          const statusLabel = pizzasAlreadyReady
            ? "Pizzas prêtes"
            : canCompletePizzas
              ? "À valider"
              : hasPizzas
                ? `${pizzaItemsInOven.length + pizzaItemsReady.length}/${pizzaItems.length} au four`
                : "Pains au four";
          return (
            <article
              key={o.id}
              onClick={() => toggleFocus(o.id)}
              className={`cursor-pointer rounded-xl border p-3 shadow-sm transition ${cardTone} ${
                focused
                  ? "z-10 scale-[1.01] bg-primary/5 shadow-xl ring-4 ring-primary/25 lg:col-span-2"
                  : ""
              }`}
            >
              <header className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-black text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(o.requested_time)}
                    </span>
                    {late && <span className="rounded-md bg-orange-500/15 px-1.5 py-0.5 text-[11px] font-black uppercase text-orange-600 dark:text-orange-400">Retard</span>}
                  </div>
                  <h2 className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-lg font-black">
                    <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{o.customer_name}</span>
                  </h2>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFocus(o.id); }}
                    className={`rounded-full p-1.5 transition ${focused ? "bg-primary text-primary-foreground" : "bg-muted/70 text-muted-foreground hover:bg-muted"}`}
                    aria-label={focused ? "Désélectionner" : "Mettre en évidence"}
                    title={focused ? "Désélectionner" : "Mettre en évidence"}
                  >
                    {focused ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <div className={`rounded-full px-2.5 py-1 text-xs font-black uppercase ${statusChip}`}>
                    {statusLabel}
                  </div>
                </div>
              </header>
              {o.notes && (
                <div className="mb-2 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs font-semibold text-primary">
                  Note : {o.notes}
                </div>
              )}
              {hasPizzas && (
                <>
                  <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-black uppercase text-muted-foreground">
                    <span>Pizzas</span>
                    {pizzaItemsPending.length > 0 && (
                      <span className="normal-case text-muted-foreground">
                        {pizzaItemsPending.length} pizza{pizzaItemsPending.length > 1 ? "s" : ""} à venir
                      </span>
                    )}
                  </div>
                  <ul className="mb-2 overflow-hidden rounded-lg border bg-background/70">
                    {pizzaItems.map((it) => {
                      const status = pizzaProductionStatus(it, o);
                      const pending = status === "to_prepare";
                      const ready = status === "ready";
                      const details = getPizzaDisplayDetails(it, pizzas);
                      return (
                        <li
                          key={it.id}
                          className={`flex items-start gap-2 border-b px-2.5 py-1.5 transition last:border-b-0 ${
                            pending
                              ? "bg-muted/30 text-muted-foreground opacity-70"
                              : ready
                                ? "bg-status-ready/5"
                                : "bg-background"
                          }`}
                        >
                          <span
                            aria-hidden
                            className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${
                              pending ? "border-2 border-muted-foreground/50 bg-transparent" : ready ? "bg-status-ready" : "bg-status-oven"
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <span className={`font-bold leading-tight ${pending ? "" : "text-foreground"}`}>{it.pizza_name}</span>
                              <span className="text-[11px] font-semibold text-muted-foreground">Base {details.base.label}</span>
                              {it.cut_into && <span className="text-[11px] font-black text-primary">À couper en {it.cut_into}</span>}
                            </div>
                            {(details.extras.length > 0 || details.removed.length > 0) && (
                              <div className="mt-0.5 text-xs font-semibold leading-snug">
                                {details.extras.length > 0 && <span className="text-secondary">+ {details.extras.join(", ")}</span>}
                                {details.removed.length > 0 && <span className="text-destructive">{details.extras.length > 0 ? " · " : ""}Sans {details.removed.join(", ")}</span>}
                              </div>
                            )}
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                            pending
                              ? "bg-muted text-muted-foreground"
                              : ready
                                ? "bg-status-ready/15 text-status-ready"
                                : "bg-status-oven/15 text-status-oven"
                          }`}>
                            {pending ? "À venir" : ready ? "Sortie" : "Au four"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
              {painsToCook && (
                <div className="mb-2 rounded-lg border border-primary/25 bg-primary/5 p-2.5">
                  <div className="flex items-center justify-between gap-2 text-primary">
                    <div className="flex items-center gap-2 text-sm font-black">
                      <Sandwich className="h-4 w-4" /> {breadCount} pain{breadCount > 1 ? "s" : ""} Pani'NO
                    </div>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase">À cuire</span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-primary/80">
                    Valider libère le poste Pani'NO.
                  </div>
                  <ul className="mt-2 space-y-1">
                    {(paninoItemsByOrder.get(o.id) ?? []).map((it) => (
                      <li key={it.id} className="flex items-center justify-between rounded-md border bg-background px-2 py-1 text-sm">
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
                {hasPizzas && !pizzasAlreadyReady && (
                  <Button onClick={(e) => { e.stopPropagation(); markReady(o.id); }} disabled={pizzasBusy || !canCompletePizzas} className="h-10 w-full bg-status-ready text-sm font-black hover:bg-status-ready/90">
                    <PackageCheck className="mr-2 h-4 w-4" />
                    {pizzasBusy
                      ? "Validation…"
                      : canCompletePizzas
                        ? "Commande terminée"
                        : `Commande incomplète (${pizzaItemsInOven.length + pizzaItemsReady.length}/${pizzaItems.length})`}
                  </Button>
                )}
                {painsToCook && (
                  <Button onClick={(e) => { e.stopPropagation(); markPainsReady(o.id); }} disabled={painsBusy} className="h-10 w-full bg-primary text-sm font-black hover:bg-primary/90">
                    <Sandwich className="mr-2 h-4 w-4" /> {painsBusy ? "Validation…" : `Pains cuits — libérer Pani'NO (${breadCount})`}
                  </Button>
                )}
              </div>
            </article>
          );
          })}
        </div>
      )}
    </div>
  );
}

type PizzaSummary = {
  key: string;
  pizza_name: string;
  base: string | null;
  count: number;
  extras: string[];
  removed: string[];
  cut_into: number | null;
};

function UpcomingPizzaioloPreview({
  jobs,
  pizzas,
  open,
  onToggle,
}: {
  jobs: PizzaioloQueueJob[];
  pizzas: Pizza[];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <section className={`mb-3 rounded-xl border bg-card shadow-sm transition ${open ? "border-status-oven/40" : "border-dashed border-status-oven/30 bg-card/80"}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 p-2.5 text-left md:p-3"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-lg bg-status-oven/10 p-1.5 text-status-oven">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-wide text-status-oven">À venir pizzaiolo</div>
            <div className="truncate text-sm font-semibold text-muted-foreground">
              {open ? "Prévisualisation des 3 prochaines préparations" : "Appuyer pour anticiper la suite"}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-status-oven/30 bg-status-oven/10 px-2 py-0.5 text-xs font-black text-status-oven">
            {jobs.length}/3
          </span>
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="border-t px-3 pb-3 md:px-4 md:pb-4">
          {jobs.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed bg-background/70 p-4 text-center text-sm font-semibold text-muted-foreground">
              Aucune commande à venir
            </div>
          ) : (
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {jobs.map((job, index) => (
                <PreviewJobCard key={job.id} job={job} pizzas={pizzas} position={index + 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function PreviewJobCard({ job, pizzas, position }: { job: PizzaioloQueueJob; pizzas: Pizza[]; position: number }) {
  const pizzaSummaries = summarizePizzas(job.items, pizzas);
  const postCookingCount = job.items.filter((item) => item.cut_into).length;
  const breadCount = job.paninos.filter((item) => item.product_key === "panino").length;

  return (
    <article className="rounded-xl border bg-background p-3 shadow-sm">
      <header className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {formatTime(job.requested_time)}
          </div>
          <div className="truncate text-base font-black">{job.customer_name}</div>
          {job.orders.length > 1 && (
            <div className="text-xs font-semibold text-primary">{job.orders.length} tickets regroupés</div>
          )}
        </div>
        <span className="rounded-full bg-status-oven/10 px-2 py-0.5 text-xs font-black text-status-oven">#{position}</span>
      </header>

      {pizzaSummaries.length > 0 ? (
        <ul className="space-y-1.5">
          {pizzaSummaries.map((pizza) => (
            <li key={pizza.key} className="rounded-lg border bg-card px-2 py-1.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-bold">{pizza.count}× {pizza.pizza_name}</span>
                {pizza.cut_into && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-black text-primary">
                    <Scissors className="h-3 w-3" />
                    Four
                  </span>
                )}
              </div>
              {pizza.base && <div className="text-xs font-semibold text-muted-foreground">Base : {pizza.base}</div>}
              {pizza.extras.length > 0 && <div className="text-xs font-semibold text-secondary">+ {pizza.extras.join(", ")}</div>}
              {pizza.removed.length > 0 && <div className="text-xs font-semibold text-destructive">Sans {pizza.removed.join(", ")}</div>}
              {pizza.cut_into && <div className="text-xs font-bold text-primary">À couper en {pizza.cut_into} après cuisson</div>}
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-2 py-2 text-sm font-bold text-primary">
          Pain Pani'NO à venir
        </div>
      )}

      {breadCount > 0 && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-1 text-xs font-black text-primary">
          <Sandwich className="h-3.5 w-3.5" />
          {breadCount} pain{breadCount > 1 ? "s" : ""} Pani'NO
        </div>
      )}

      {postCookingCount > 0 && (
        <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 px-2 py-1.5 text-xs font-black text-primary">
          {postCookingCount} tâche{postCookingCount > 1 ? "s" : ""} post-cuisson Four
        </div>
      )}
    </article>
  );
}

function summarizePizzas(items: OrderItem[], pizzas: Pizza[]): PizzaSummary[] {
  const summaries = new Map<string, PizzaSummary>();

  for (const item of items) {
    const details = getPizzaDisplayDetails(item, pizzas);
    const extras = [...details.extras].sort();
    const removed = [...details.removed].sort();
    const key = [item.pizza_name, details.base.key, extras.join("|"), removed.join("|"), item.cut_into ?? ""].join("::");
    const summary = summaries.get(key);
    if (summary) {
      summary.count += 1;
      continue;
    }

    summaries.set(key, {
      key,
      pizza_name: item.pizza_name,
      base: details.base.label,
      count: 1,
      extras,
      removed,
      cut_into: item.cut_into,
    });
  }

  return Array.from(summaries.values());
}
