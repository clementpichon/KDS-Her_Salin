import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingCart, Pizza as PizzaIcon, Flame, PackageCheck, Settings as SettingsIcon, Sandwich, AlertTriangle, Clock, BrainCircuit } from "lucide-react";
import { useOrders, useSettings, usePaninoOrderItems } from "@/hooks/use-kds-data";
import { computeStock, formatTime, isLate, minutesUntil } from "@/lib/scheduling";
import { computeBrainSnapshot } from "@/lib/kds-brain";

export const Route = createFileRoute("/_kds/")({
  head: () => ({
    meta: [
      { title: "Her Salin — Tableau de bord" },
      { name: "description", content: "Tableau de bord Her Salin : accès rapide aux postes caisse, pizzaiolo, four et prêtes, avec stock pâtons en temps réel." },
      { property: "og:title", content: "Her Salin — Tableau de bord" },
      { property: "og:description", content: "Accès rapide aux postes caisse, pizzaiolo, four et prêtes." },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Home,
});

function Home() {
  const { orders } = useOrders();
  const settings = useSettings();
  const { items: paninoItems } = usePaninoOrderItems();

  const stock = settings ? computeStock(orders, settings, paninoItems) : 0;
  const counts = {
    to_prepare: orders.filter((o) => o.status === "to_prepare").length,
    in_oven: orders.filter((o) => o.status === "in_oven").length,
    ready: orders.filter((o) => o.status === "ready").length,
    panino: paninoItems.filter((i) => i.status !== "done").length,
  };
  const paninoByOrder = new Map<string, typeof paninoItems>();
  for (const item of paninoItems) {
    const list = paninoByOrder.get(item.order_id) ?? [];
    list.push(item);
    paninoByOrder.set(item.order_id, list);
  }
  const watchList = orders
    .filter((order) => order.status !== "delivered")
    .map((order) => {
      const paninos = paninoByOrder.get(order.id) ?? [];
      const stage =
        order.status === "ready" ? "Prêtes"
        : order.status === "in_oven" || order.pains_panino_status === "en_cours" ? "Four"
        : paninos.some((item) => item.status !== "done") && order.pains_panino_status === "pret" ? "Pani'NO"
        : "Pizzaiolo";
      const mins = minutesUntil(order.requested_time);
      return { order, stage, mins, late: isLate(order.requested_time) };
    })
    .filter((entry) => entry.late || entry.mins <= 10)
    .sort((a, b) => a.mins - b.mins)
    .slice(0, 5);
  const readyOrders = orders.filter((order) => order.status === "ready").length;
  const brain = settings
    ? computeBrainSnapshot({
      orders,
      paninoItems,
      settings,
      cart: [],
      paninoCart: [],
      readyOrders,
      urgentCashierCount: watchList.filter((entry) => entry.late).length,
    })
    : null;
  const assistantBadge =
    brain?.globalLevel === "sature" ? 3
    : brain?.globalLevel === "tendu" ? 2
    : brain?.globalLevel === "actif" ? 1
    : null;

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between rounded-2xl bg-card p-5 shadow-sm border md:p-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Her Salin — Tableau de bord</h1>
          <p className="text-muted-foreground">Choisissez votre poste</p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase text-muted-foreground tracking-wide">Stock pâtons</div>
          <div className={`text-3xl font-bold ${stock < 20 ? "text-destructive" : "text-secondary"}`}>{stock}</div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4">
        <TileCard
          to="/assistant"
          color={brain?.globalLevel === "sature" ? "bg-destructive" : brain?.globalLevel === "tendu" ? "bg-status-prepare" : "bg-secondary"}
          icon={<BrainCircuit className="h-8 w-8" />}
          label="Assistant"
          sub={brain ? `Goulot : ${brain.bottleneck.label}` : "Charge globale"}
          badge={assistantBadge}
        />
        <TileCard to="/caisse" color="bg-primary" icon={<ShoppingCart className="h-8 w-8" />} label="Caisse" sub="Nouvelle commande" badge={null} />
        <TileCard to="/pizzaiolo" color="bg-status-prepare" icon={<PizzaIcon className="h-8 w-8" />} label="Pizzaiolo" sub="À préparer" badge={counts.to_prepare} />
        <TileCard to="/four" color="bg-status-oven" icon={<Flame className="h-8 w-8" />} label="Four" sub="En cuisson" badge={counts.in_oven} />
        <TileCard to="/panino" color="bg-primary" icon={<Sandwich className="h-8 w-8" />} label="Pani'NO" sub="Préparations" badge={counts.panino} />
        <TileCard to="/pretes" color="bg-status-ready" icon={<PackageCheck className="h-8 w-8" />} label="Prêtes" sub="À remettre au client" badge={counts.ready} />
        <TileCard to="/reglages" color="bg-muted-foreground" icon={<SettingsIcon className="h-8 w-8" />} label="Réglages" sub="Stock & paramètres" badge={null} />
      </div>

      {watchList.length > 0 && (
        <section className="mt-6 rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
            <AlertTriangle className="h-5 w-5 text-destructive" /> À surveiller maintenant
          </h2>
          <div className="grid gap-2 md:grid-cols-2">
            {watchList.map(({ order, stage, mins, late }) => (
              <div key={order.id} className="rounded-xl border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold">{order.customer_name}</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" /> {formatTime(order.requested_time)} · {stage}
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${late ? "bg-destructive text-destructive-foreground" : "bg-primary/15 text-primary"}`}>
                    {late ? "En retard" : `dans ${mins} min`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TileCard({
  to,
  color,
  icon,
  label,
  sub,
  badge,
}: {
  to: string;
  color: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  badge: number | null;
}) {
  return (
    <Link
      to={to}
      className="group relative flex min-h-28 items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm transition hover:shadow-md active:scale-[0.99] md:min-h-32 md:p-6"
    >
      <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl ${color} text-white md:h-20 md:w-20`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1 pr-8">
        <div className="text-xl font-black leading-tight">{label}</div>
        <div className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground">{sub}</div>
      </div>
      {badge !== null && badge > 0 && (
        <span className="absolute right-3 top-3 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-primary px-2 text-sm font-black text-primary-foreground shadow-sm">
          {badge}
        </span>
      )}
    </Link>
  );
}
