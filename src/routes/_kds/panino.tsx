import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Sandwich, User, Clock, Check, RotateCcw, Pizza as PizzaIcon, Flame } from "lucide-react";
import { useOrders, usePaninoOrderItems, useSettings } from "@/hooks/use-kds-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { computeStock, formatTime, isLate } from "@/lib/scheduling";
import { friesLabel, paninoDisplayName } from "@/lib/kds-formatting";
import { TimeSlotGroup } from "@/components/kds/TimeSlotGroup";
import { logProductionEvent } from "@/lib/production-events";
import type { Order, PaninoOrderItem, PaninoStatus } from "@/lib/kds-types";

export const Route = createFileRoute("/_kds/panino")({
  head: () => ({
    meta: [
      { title: "Pani'NO — Poste de préparation — Her Salin" },
      { name: "description", content: "Écran KDS dédié au poste Pani'NO : préparations en attente, en cours et terminées." },
      { property: "og:title", content: "Pani'NO — Poste de préparation" },
    ],
    links: [{ rel: "canonical", href: "/panino" }],
  }),
  component: PaninoKds,
});

type Group = {
  order_id: string;
  customer: string;
  requested_time: string;
  items: PaninoOrderItem[];
  status: PaninoStatus; // aggregated
  done_at: string | null; // most recent done_at when all done
  pizzaCount: number;
  pizzaStatus: Order["status"] | null;
  breadCount: number;
  painsReady: boolean;
};


function aggregateStatus(items: PaninoOrderItem[]): PaninoStatus {
  if (items.every((i) => i.status === "done")) return "done";
  if (items.some((i) => i.status === "in_progress")) return "in_progress";
  return "pending";
}

function PaninoKds() {
  const { orders } = useOrders();
  const { items } = usePaninoOrderItems();
  const settings = useSettings();
  const stock = settings ? computeStock(orders, settings, items) : 0;
  const [, force] = useState(0);

  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const ordersById = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);

  const groups: Group[] = useMemo(() => {
    const map = new Map<string, PaninoOrderItem[]>();
    for (const it of items) {
      const arr = map.get(it.order_id) ?? [];
      arr.push(it);
      map.set(it.order_id, arr);
    }
    const out: Group[] = [];
    for (const [order_id, list] of map) {
      const order = ordersById.get(order_id);
      const status = aggregateStatus(list);
      // Once the whole group is done, hide it immediately — it moves to "Prêtes"
      if (status === "done") continue;
      const done_at = null;

      const breadCount = list.filter((i) => i.product_key === "panino").length;
      const painsReady = breadCount === 0 || order?.pains_panino_status === "pret";
      out.push({
        order_id,
        customer: order?.customer_name ?? "—",
        requested_time: order?.requested_time ?? list[0].created_at,
        items: list.slice().sort((a, b) => a.created_at.localeCompare(b.created_at)),
        status,
        done_at,
        pizzaCount: order?.items?.length ?? 0,
        pizzaStatus: order?.status ?? null,
        breadCount,
        painsReady,
      });
    }
    return out.sort((a, b) => a.requested_time.localeCompare(b.requested_time));
  }, [items, ordersById]);


  const setItemStatus = async (id: string, status: PaninoStatus) => {
    const item = items.find((candidate) => candidate.id === id);
    const { error } = await supabase
      .from("panino_order_items")
      .update({ status, done_at: status === "done" ? new Date().toISOString() : null })
      .eq("id", id);
    if (!error && item) {
      recordPaninoEvent(item, status, settings);
    }
  };

  const setGroupStatus = async (group: Group, status: PaninoStatus) => {
    const { error } = await supabase
      .from("panino_order_items")
      .update({ status, done_at: status === "done" ? new Date().toISOString() : null })
      .in("id", group.items.map((i) => i.id));
    if (!error) {
      group.items.forEach((item) => recordPaninoEvent(item, status, settings));
    }
  };

  const counts = {
    pending: items.filter((i) => i.status === "pending").length,
    in_progress: items.filter((i) => i.status === "in_progress").length,
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between rounded-2xl border bg-card p-4 shadow-sm">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Sandwich className="text-primary" /> Pani'NO ({groups.filter((g) => g.status !== "done").length})
        </h1>
        <div className="flex items-center gap-4 text-sm">
          <div><span className="font-semibold">{counts.pending}</span> <span className="text-muted-foreground">produits en attente</span></div>
          <div><span className="font-semibold">{counts.in_progress}</span> <span className="text-muted-foreground">en préparation</span></div>
          <div className="text-right border-l pl-4">
            <div className="text-[10px] uppercase text-muted-foreground">Pâtons</div>
            <div className={`text-xl font-bold ${stock < 20 ? "text-destructive" : "text-secondary"}`}>{stock}</div>
          </div>
        </div>
      </div>

      {groups.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed p-12 text-center text-muted-foreground">
          Aucune commande
        </div>
      )}

      {(() => {
        const byTime = new Map<string, Group[]>();
        for (const g of groups) {
          const t = formatTime(g.requested_time);
          const arr = byTime.get(t) ?? [];
          arr.push(g);
          byTime.set(t, arr);
        }
        const entries = Array.from(byTime.entries());
        return entries.map(([time, gs]) => (
          <TimeSlotGroup key={time} time={time} count={gs.length} accentClass="border-primary/40">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {gs.map((g) => (
                <GroupCard
                  key={g.order_id}
                  group={g}
                  onItemStatus={setItemStatus}
                  onGroupStatus={(ids, s) => setGroupStatus({ ...g, items: g.items.filter((item) => ids.includes(item.id)) }, s)}
                />
              ))}
            </div>
          </TimeSlotGroup>
        ));
      })()}
    </div>
  );
}

function recordPaninoEvent(
  item: PaninoOrderItem,
  status: PaninoStatus,
  settings: ReturnType<typeof useSettings>,
) {
  const eventTypes = eventTypesForPaninoItem(item, status);
  if (eventTypes.length === 0) return;

  void Promise.all(
    eventTypes.map((eventType) =>
      logProductionEvent({
        settings,
        eventType,
        station: "panino",
        orderId: item.order_id,
        orderItemId: item.id,
        productType: item.product_key,
        productName: item.product_name,
        metadata: {
          fries_mode: item.fries_mode,
          side: item.side,
          sauces: item.sauces,
        },
      }),
    ),
  );
}

function eventTypesForPaninoItem(item: PaninoOrderItem, status: PaninoStatus) {
  if (status === "pending") return [];
  if (item.product_key === "panino") {
    return status === "done" ? ["PANINO_FINISHED"] : ["PANINO_PREP_STARTED", "PANINO_STEAK_STARTED"];
  }
  if (item.product_key === "fishno") {
    return status === "done" ? ["FISH_FINISHED"] : ["FISH_STARTED"];
  }
  if (item.product_key === "cornet_frites") {
    return status === "done" ? ["FRIES_FINISHED"] : ["FRIES_STARTED"];
  }
  return status === "done" ? ["PANINO_FINISHED"] : ["PANINO_PREP_STARTED"];
}

function GroupCard({
  group,
  onItemStatus,
  onGroupStatus,
}: {
  group: Group;
  onItemStatus: (id: string, s: PaninoStatus) => void;
  onGroupStatus: (ids: string[], s: PaninoStatus) => void;
}) {
  const waitingForBread = group.breadCount > 0 && !group.painsReady;
  const canFinishItem = (item: PaninoOrderItem) => item.product_key !== "panino" || group.painsReady;
  const finishableItems = group.items.filter(canFinishItem);
  const startableItems = group.items.filter((item) =>
    item.status === "pending" && (item.product_key !== "panino" || group.painsReady || waitingForBread),
  );
  const blockedBreadItems = group.items.filter((item) => !canFinishItem(item));
  const finishableStatus = finishableItems.length > 0 ? aggregateStatus(finishableItems) : group.status;
  const borderColor =
    group.status === "done" ? "border-status-ready"
    : group.status === "in_progress" ? "border-status-oven"
    : "border-status-prepare";
  const badge =
    group.status === "done" ? { label: "TERMINÉE", cls: "bg-status-ready/15 text-status-ready" }
    : group.status === "in_progress" ? { label: "EN PRÉPARATION", cls: "bg-status-oven/15 text-status-oven" }
    : { label: "EN ATTENTE", cls: "bg-status-prepare/15 text-status-prepare" };

  return (
    <article className={`rounded-2xl border-2 ${borderColor} bg-card p-4 shadow-sm transition ${group.status === "done" ? "opacity-70" : ""}`}>
      <header className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold"><User className="h-5 w-5" />{group.customer}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />Pour {formatTime(group.requested_time)}{isLate(group.requested_time) && <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">En retard</span>}
            <span className="ml-1 text-xs">· {group.items.length} produit{group.items.length > 1 ? "s" : ""}</span>
          </div>
        </div>
        <div className={`rounded-full ${badge.cls} px-3 py-1 text-xs font-bold`}>{badge.label}</div>
      </header>

      {group.pizzaCount > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-dashed border-status-oven/50 bg-status-oven/5 px-2 py-1.5 text-xs font-semibold text-status-oven">
          <PizzaIcon className="h-3.5 w-3.5" />
          <span className="uppercase">Aussi au Pizzaiolo :</span>
          <span>{group.pizzaCount} pizza{group.pizzaCount > 1 ? "s" : ""}</span>
          {group.pizzaStatus && (
            <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-[10px] uppercase">
              {group.pizzaStatus === "to_prepare" && "à préparer"}
              {group.pizzaStatus === "in_oven" && "au four"}
              {group.pizzaStatus === "ready" && "prêtes ✓"}
              {group.pizzaStatus === "delivered" && "remises"}
            </span>
          )}
        </div>
      )}

      {waitingForBread && (
        <div className="mb-3 rounded-md border-2 border-status-oven/50 bg-status-oven/10 px-3 py-2 text-sm font-bold text-status-oven">
          ⏳ Pain Pani'NO en attente du four — lancez le steak, Fish & NO et frites maintenant
        </div>
      )}

      <div className="mb-3 space-y-2">
        {group.items.map((item) => (
          <ItemBlock
            key={item.id}
            item={item}
            waitingForBread={waitingForBread && item.product_key === "panino"}
            onStatus={(s) => onItemStatus(item.id, s)}
          />
        ))}
      </div>

      <div className="grid gap-2">
        {startableItems.length > 0 && (
          <Button onClick={() => onGroupStatus(startableItems.map((item) => item.id), "in_progress")} className="h-12 text-base font-black">
            <Flame className="mr-2 h-5 w-5" />
            {waitingForBread ? "Lancer temps masqué" : "Tout commencer"}
          </Button>
        )}

        {finishableItems.length === 0 ? (
          <div className="flex-1 rounded-md bg-muted px-3 py-2 text-center text-xs font-semibold uppercase text-muted-foreground">
            {blockedBreadItems.length > 0 ? "Pain pas encore cuit" : "Aucune action disponible"}
          </div>
        ) : (
          <>
            {finishableStatus === "in_progress" && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onGroupStatus(finishableItems.map((item) => item.id), "pending")} className="h-12 px-4">
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button onClick={() => onGroupStatus(finishableItems.map((item) => item.id), "done")} className="flex-1 h-12 bg-status-ready text-base font-black hover:bg-status-ready/90">
                  <Check className="mr-2 h-5 w-5" /> Terminer le disponible
                </Button>
              </div>
            )}
            {finishableStatus === "done" && (
              <Button variant="outline" onClick={() => onGroupStatus(finishableItems.map((item) => item.id), "in_progress")} className="h-12">
                <RotateCcw className="mr-2 h-4 w-4" /> Annuler
              </Button>
            )}
          </>
        )}
      </div>

    </article>
  );
}

function ItemBlock({
  item,
  waitingForBread,
  onStatus,
}: {
  item: PaninoOrderItem;
  waitingForBread?: boolean;
  onStatus: (s: PaninoStatus) => void;
}) {
  const sauceLine =
    item.sauces.length === 2
      ? `MOITIÉ ${item.sauces[0].toUpperCase()} / MOITIÉ ${item.sauces[1].toUpperCase()}`
      : item.sauces[0]?.toUpperCase() ?? "";

  const stateRing =
    item.status === "done" ? "border-status-ready/60 bg-status-ready/5"
    : item.status === "in_progress" ? "border-status-oven/60 bg-status-oven/5"
    : "border-border bg-background";

  return (
    <div className={`rounded-xl border p-3 space-y-2 ${stateRing} ${waitingForBread && item.status !== "in_progress" ? "opacity-80" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-base font-bold uppercase tracking-wide">{paninoDisplayName(item.product_key, item.product_name)}</div>
        <button
          onClick={() => onStatus(item.status === "done" ? "in_progress" : waitingForBread && item.status === "pending" ? "in_progress" : "done")}
          disabled={waitingForBread && item.status === "in_progress"}
          className={`shrink-0 rounded-full p-2 transition ${item.status === "done" ? "bg-status-ready text-white" : item.status === "in_progress" ? "bg-status-oven text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
          title={waitingForBread && item.status === "pending" ? "Lancer le steak" : waitingForBread ? "En attente du pain" : item.status === "done" ? "Marquer en cours" : "Marquer terminé"}
          aria-label="Basculer statut"
        >
          {waitingForBread && item.status === "pending" ? <Flame className="h-4 w-4" /> : <Check className="h-4 w-4" />}
        </button>
      </div>
      {waitingForBread && item.status === "pending" && (
        <div className="rounded-lg border border-status-prepare/40 bg-status-prepare/10 px-3 py-2 text-sm font-bold text-status-prepare">
          🔥 Temps masqué : lancer le steak maintenant
        </div>
      )}
      {waitingForBread && item.status === "in_progress" && (
        <div className="rounded-lg border border-status-oven/40 bg-status-oven/10 px-3 py-2 text-sm font-bold text-status-oven">
          Steak en cuisson — finalisation dès que le pain arrive
        </div>
      )}
      {item.base && (
        <div className="text-sm"><span className="text-muted-foreground">Base :</span> <span className="font-semibold">{item.base}</span></div>
      )}
      {friesLabel(item.fries_mode) && (
        <div className="rounded-md bg-primary/10 border border-primary/30 px-2 py-1 text-sm font-bold text-primary">
          {friesLabel(item.fries_mode)}
        </div>
      )}
      {item.side && (
        <div className="text-sm"><span className="text-muted-foreground">Accompagnement :</span> <span className="font-semibold">{item.side}</span></div>
      )}
      {sauceLine && (
        <div className="text-sm font-semibold">SAUCES : {sauceLine}</div>
      )}
      {item.extras.length > 0 && (
        <div className="text-sm">
          <div className="text-muted-foreground font-semibold uppercase text-xs mt-1">Suppléments</div>
          <ul className="list-disc list-inside text-secondary">
            {item.extras.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}
      {item.removed.length > 0 && (
        <div className="text-sm">
          <div className="text-muted-foreground font-semibold uppercase text-xs mt-1">Retraits</div>
          <ul className="list-disc list-inside text-destructive">
            {item.removed.map((e) => <li key={e}>Sans {e.toLowerCase()}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
