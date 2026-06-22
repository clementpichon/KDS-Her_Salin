import { createFileRoute } from "@tanstack/react-router";
import { Copy, PackageCheck, Clock, User, HandCoins, Eye, EyeOff, Sandwich, PhoneCall } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useOrders, usePaninoOrderItems } from "@/hooks/use-kds-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CashierStationHeader } from "@/components/kds/CashierStationHeader";
import { formatTime, isLate } from "@/lib/scheduling";
import { friesLabel, paninoDisplayName } from "@/lib/kds-formatting";
import { formatPhoneNumber } from "@/lib/phone-utils";
import type { PaninoOrderItem } from "@/lib/kds-types";

export const Route = createFileRoute("/_kds/pretes")({
  head: () => ({
    meta: [
      { title: "Commandes prêtes — Her Salin" },
      { name: "description", content: "Commandes prêtes à remettre au client, avec récapitulatif des pizzas, Pani'NO et suppléments." },
      { property: "og:title", content: "Commandes prêtes" },
      { property: "og:description", content: "Commandes prêtes à remettre au client." },
    ],
    links: [{ rel: "canonical", href: "/pretes" }],
  }),
  component: Pretes,
});

function Pretes() {
  const { orders, reload: reloadOrders } = useOrders();
  const { items: paninoItems } = usePaninoOrderItems();
  const [focusedIds, setFocusedIds] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [deliveredIds, setDeliveredIds] = useState<Set<string>>(new Set());

  const toggleFocus = (id: string) => {
    setFocusedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const paninoByOrder = useMemo(() => {
    const m = new Map<string, PaninoOrderItem[]>();
    for (const it of paninoItems) {
      const arr = m.get(it.order_id) ?? [];
      arr.push(it);
      m.set(it.order_id, arr);
    }
    return m;
  }, [paninoItems]);

  const list = orders
    .filter((o) => {
      if (o.status === "delivered") return false;
      if (deliveredIds.has(o.id)) return false;
      const paninos = paninoByOrder.get(o.id) ?? [];
      const hasPizzas = (o.items?.length ?? 0) > 0;
      const hasPaninos = paninos.length > 0;
      if (!hasPizzas && !hasPaninos) return false;
      const pizzasReady = !hasPizzas || o.status === "ready";
      const paninosDone = !hasPaninos || paninos.every((p) => p.status === "done");
      return pizzasReady && paninosDone;
    })
    .sort((a, b) => a.requested_time.localeCompare(b.requested_time));
  const activeOrders = orders.filter((o) => o.status !== "delivered" && !deliveredIds.has(o.id));
  const lateReadyCount = list.filter((o) => isLate(o.requested_time)).length;

  const deliver = async (id: string) => {
    if (busyIds.has(id)) return;
    setBusyIds((prev) => new Set(prev).add(id));
    const { error } = await supabase.from("orders").update({ status: "delivered" }).eq("id", id);
    if (error) {
      console.error(error);
      toast.error("Impossible de remettre la commande");
    } else {
      setDeliveredIds((prev) => new Set(prev).add(id));
      setFocusedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success("Commande remise");
      await reloadOrders();
    }
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <div className="p-3 lg:p-4">
      <CashierStationHeader
        active="pretes"
        readyCount={list.length}
        activeCount={activeOrders.length}
        urgentCount={lateReadyCount}
      />

      <h2 className="text-xl font-bold mb-4 flex items-center justify-between gap-2 rounded-2xl border bg-card p-4 shadow-sm">
        <span className="flex items-center gap-2">
          <PackageCheck className="text-status-ready" /> À remettre maintenant
        </span>
        <span className="rounded-full bg-status-ready/15 px-3 py-1 text-sm font-black text-status-ready">
          {list.length}
        </span>
      </h2>

      {list.length === 0 && <div className="rounded-2xl border-2 border-dashed p-12 text-center text-muted-foreground">Aucune commande prête</div>}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((o) => {
          const focused = focusedIds.has(o.id);
          const paninos = paninoByOrder.get(o.id) ?? [];
          const busy = busyIds.has(o.id);
          return (
            <article
              key={o.id}
              onClick={() => toggleFocus(o.id)}
              className={`rounded-2xl border-2 border-status-ready bg-card p-4 shadow-sm cursor-pointer transition ${
                focused
                  ? "ring-4 ring-primary shadow-xl scale-[1.01] bg-primary/5 md:col-span-2 xl:col-span-2 z-10"
                  : ""
              }`}
            >
              <header className="mb-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xl font-bold"><User className="h-5 w-5" /> {o.customer_name}</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" />{formatTime(o.requested_time)}{isLate(o.requested_time) && <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">En retard</span>}</div>
                  {o.customer_phone && (
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <a
                        href={`tel:${o.customer_phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 font-bold text-primary"
                      >
                        <PhoneCall className="h-3 w-3" /> Rappeler {formatPhoneNumber(o.customer_phone)}
                      </a>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await navigator.clipboard.writeText(o.customer_phone ?? "");
                            toast.success("Numéro copié");
                          } catch {
                            toast.error("Impossible de copier le numéro");
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 font-bold text-muted-foreground"
                      >
                        <Copy className="h-3 w-3" /> Copier
                      </button>
                    </div>
                  )}
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
                  <div className="rounded-full bg-status-ready/15 text-status-ready px-3 py-1 text-sm font-bold">PRÊTE</div>
                </div>
              </header>
              {o.notes && (
                <div className="mb-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                  📝 {o.notes}
                </div>
              )}
              {(o.items?.length ?? 0) > 0 && (
                <ul className="mb-3 space-y-1">
                  {o.items?.map((it) => (
                    <li key={it.id} className="text-sm">
                      <span className="font-semibold">{it.pizza_name}</span>
                      {it.extras.length > 0 && <span className="text-secondary"> + {it.extras.join(", ")}</span>}
                      {it.removed.length > 0 && <span className="text-destructive"> – sans {it.removed.join(", ")}</span>}
                      {it.cut_into && <span className="font-bold text-primary"> · à couper en {it.cut_into}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {paninos.length > 0 && (
                <ul className="mb-3 space-y-1 border-t pt-2">
                  {paninos.map((p) => {
                    const sauceLine =
                      p.sauces.length === 2
                        ? `moitié ${p.sauces[0]} / moitié ${p.sauces[1]}`
                        : p.sauces[0] ?? "";
                    return (
                      <li key={p.id} className="text-sm">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <Sandwich className="h-3.5 w-3.5" />{paninoDisplayName(p.product_key, p.product_name)}
                        </span>
                        {p.base && <span className="text-muted-foreground"> · base {p.base}</span>}
                        {friesLabel(p.fries_mode) && <span className="text-primary"> · {friesLabel(p.fries_mode)}</span>}
                        {p.side && <span className="text-muted-foreground"> · {p.side}</span>}
                        {sauceLine && <span> · {sauceLine}</span>}
                        {p.extras.length > 0 && <span className="text-secondary"> + {p.extras.join(", ")}</span>}
                        {p.removed.length > 0 && <span className="text-destructive"> – sans {p.removed.join(", ")}</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
              <Button onClick={(e) => { e.stopPropagation(); deliver(o.id); }} disabled={busy} className="w-full h-12 text-base font-bold">
                <HandCoins className="mr-2 h-5 w-5" /> {busy ? "Remise…" : "Commande remise"}
              </Button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
