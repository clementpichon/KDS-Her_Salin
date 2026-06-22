import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, AlertTriangle, BrainCircuit, Clock, ShoppingCart } from "lucide-react";
import { useMemo } from "react";
import { useOrders, usePaninoOrderItems, usePhoneStatus, useProductionEvents, useSettings } from "@/hooks/use-kds-data";
import { computeBrainSnapshot, type StationLoad, type WorkloadLevel } from "@/lib/kds-brain";
import { cashierActivityDetails, getCurrentCashierActivity } from "@/lib/cashier-activity";
import { formatTime, isLate, minutesUntil } from "@/lib/scheduling";

export const Route = createFileRoute("/_kds/assistant")({
  head: () => ({
    meta: [
      { title: "Assistant — Cerveau KDS — Her Salin" },
      { name: "description", content: "Assistant Her Salin : charge des postes, goulot actuel, conseils opérationnels et commandes à surveiller." },
      { property: "og:title", content: "Assistant — Cerveau KDS" },
      { property: "og:description", content: "Vue temps réel des charges et des goulots du service." },
    ],
    links: [{ rel: "canonical", href: "/assistant" }],
  }),
  component: AssistantPage,
});

function AssistantPage() {
  const { orders } = useOrders();
  const { items: paninoItems } = usePaninoOrderItems();
  const { events } = useProductionEvents(120);
  const { status: phoneStatus } = usePhoneStatus();
  const settings = useSettings();
  const cashierActivity = useMemo(() => getCurrentCashierActivity(events), [events]);
  const phoneBusy = Boolean(phoneStatus?.is_ringing || phoneStatus?.is_on_call);
  const cashierPhoneLoad = phoneBusy ? 2.6 : 0;
  const cashierPhoneDetails = phoneStatus?.is_on_call
    ? "Téléphone en cours"
    : phoneStatus?.is_ringing
      ? "Téléphone entrant"
      : null;

  const paninoByOrder = useMemo(() => {
    const map = new Map<string, typeof paninoItems>();
    for (const item of paninoItems) {
      const list = map.get(item.order_id) ?? [];
      list.push(item);
      map.set(item.order_id, list);
    }
    return map;
  }, [paninoItems]);

  const activeOrders = orders.filter((order) => order.status !== "delivered");
  const readyOrders = activeOrders.filter((order) => {
    const paninos = paninoByOrder.get(order.id) ?? [];
    const hasPizzas = (order.items?.length ?? 0) > 0;
    const hasPaninos = paninos.length > 0;
    if (!hasPizzas && !hasPaninos) return false;
    const pizzasReady = !hasPizzas || order.status === "ready";
    const paninosDone = !hasPaninos || paninos.every((item) => item.status === "done");
    return pizzasReady && paninosDone;
  });
  const urgentCashierCount = activeOrders.filter((order) => isLate(order.requested_time)).length;

  const snapshot = settings
    ? computeBrainSnapshot({
      orders,
      paninoItems,
      settings,
      cart: [],
      paninoCart: [],
      readyOrders: readyOrders.length,
      urgentCashierCount,
      cashierActivityLoad: Math.max(cashierActivity?.load ?? 0, cashierPhoneLoad),
      cashierActivityDetails: cashierPhoneDetails ?? (cashierActivity ? cashierActivityDetails(cashierActivity) : undefined),
    })
    : null;

  const watchList = activeOrders
    .map((order) => {
      const paninos = paninoByOrder.get(order.id) ?? [];
      const stage =
        order.status === "ready" ? "Prêtes"
        : order.status === "in_oven" || order.pains_panino_status === "en_cours" ? "Four"
        : paninos.some((item) => item.status !== "done") && order.pains_panino_status === "pret" ? "Pani'NO"
        : "Pizzaiolo";
      const mins = minutesUntil(order.requested_time);
      return { order, stage, mins, late: isLate(order.requested_time), paninoCount: paninos.length };
    })
    .filter((entry) => entry.late || entry.mins <= 15)
    .sort((a, b) => a.mins - b.mins)
    .slice(0, 8);

  if (!snapshot) {
    return <div className="p-8">Chargement de l'assistant…</div>;
  }

  const tone = levelTone(snapshot.globalLevel);
  const bottleneckLabel = snapshot.bottleneck.load > 0 ? snapshot.bottleneck.label : "Aucun goulot";
  const bottleneckDetails = snapshot.bottleneck.load > 0 ? snapshot.bottleneck.details : "Aucun poste en charge immédiate";

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <header className={`mb-6 rounded-3xl border p-6 shadow-sm ${tone.panel}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-black uppercase text-muted-foreground">
              <BrainCircuit className="h-4 w-4" /> Cerveau assistant
            </div>
            <h1 className="text-2xl font-black md:text-4xl">Goulot actuel : {bottleneckLabel}</h1>
            <p className="mt-2 max-w-2xl text-sm text-foreground/75 md:text-base">
              {bottleneckDetails}. Niveau global : <span className="font-bold">{levelLabel(snapshot.globalLevel)}</span>.
            </p>
          </div>
          <div className={`rounded-2xl px-4 py-3 text-center font-black ${tone.badge}`}>
            <div className="text-3xl">{Math.round(snapshot.bottleneck.ratio * 100)}%</div>
            <div className="text-xs uppercase">charge goulot</div>
          </div>
        </div>
      </header>

      <section className="mb-6 grid gap-3 md:grid-cols-3">
        {snapshot.advice.map((advice) => (
          <div key={advice} className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase text-primary">
              <AlertTriangle className="h-4 w-4" /> Conseil
            </div>
            <p className="font-semibold">{advice}</p>
          </div>
        ))}
      </section>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {snapshot.stations.map((station) => (
          <StationCard key={station.key} station={station} />
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black">
            <Activity className="h-5 w-5 text-primary" /> Lecture du service
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Metric label="Commandes actives" value={activeOrders.length} />
            <Metric label="Commandes prêtes" value={readyOrders.length} />
            <Metric label="À surveiller caisse" value={urgentCashierCount} />
            <Metric label="Produits Pani'NO actifs" value={paninoItems.filter((item) => item.status !== "done").length} />
          </div>
          <div className="mt-3 rounded-xl border bg-background p-4">
            <div className="text-xs font-bold uppercase text-muted-foreground">Activité caisse</div>
            <div className={`mt-1 text-lg font-black ${phoneBusy || cashierActivity ? "text-status-prepare" : "text-secondary"}`}>
              {cashierPhoneDetails ?? cashierActivityDetails(cashierActivity)}
            </div>
          </div>
          <div className="mt-4 rounded-xl border bg-background p-4">
            <div className="font-bold">Décision rapide</div>
            <p className="mt-1 text-sm text-muted-foreground">
              La prise de commande reste possible. L'assistant sert à conseiller la caissière et à prévenir l'équipe quand un poste absorbe trop de charge.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black">
            <Clock className="h-5 w-5 text-destructive" /> À surveiller
          </h2>
          {watchList.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Aucun créneau critique.
            </div>
          ) : (
            <div className="space-y-2">
              {watchList.map(({ order, stage, mins, late, paninoCount }) => (
                <div key={order.id} className="rounded-xl border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold">{order.customer_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(order.requested_time)} · {stage} · {(order.items?.length ?? 0)} pizza{(order.items?.length ?? 0) > 1 ? "s" : ""} · {paninoCount} Pani'NO
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${late ? "bg-destructive text-destructive-foreground" : "bg-primary/15 text-primary"}`}>
                      {late ? "Retard" : `${mins} min`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link to="/caisse" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">
            <ShoppingCart className="h-4 w-4" /> Retour caisse
          </Link>
        </section>
      </div>
    </div>
  );
}

function StationCard({ station }: { station: StationLoad }) {
  const tone = levelTone(station.level);
  const percent = Math.min(140, Math.round(station.ratio * 100));

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-black">{station.label}</div>
          <div className="mt-1 text-xs text-muted-foreground">{station.details}</div>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${tone.badge}`}>
          {levelLabel(station.level)}
        </span>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${tone.bar}`} style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatLoad(station.load)} / {station.capacity}</span>
        <span>{percent}%</span>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="text-xs font-bold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-black">{value}</div>
    </div>
  );
}

function levelTone(level: WorkloadLevel) {
  if (level === "sature") {
    return {
      panel: "border-destructive/50 bg-destructive/10",
      badge: "bg-destructive text-destructive-foreground",
      bar: "bg-destructive",
    };
  }
  if (level === "tendu") {
    return {
      panel: "border-status-prepare/50 bg-status-prepare/10",
      badge: "bg-status-prepare text-white",
      bar: "bg-status-prepare",
    };
  }
  if (level === "actif") {
    return {
      panel: "border-primary/40 bg-primary/10",
      badge: "bg-primary text-primary-foreground",
      bar: "bg-primary",
    };
  }
  return {
    panel: "border-secondary/40 bg-secondary/10",
    badge: "bg-secondary text-secondary-foreground",
    bar: "bg-secondary",
  };
}

function levelLabel(level: WorkloadLevel) {
  if (level === "sature") return "saturé";
  if (level === "tendu") return "tendu";
  if (level === "actif") return "actif";
  return "calme";
}

function formatLoad(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
