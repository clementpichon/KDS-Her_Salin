import { Link } from "@tanstack/react-router";
import { AlertTriangle, PackageCheck, ShoppingCart } from "lucide-react";

type CashierView = "caisse" | "pretes";

export function CashierStationHeader({
  active,
  readyCount,
  activeCount,
  urgentCount = 0,
}: {
  active: CashierView;
  readyCount: number;
  activeCount: number;
  urgentCount?: number;
}) {
  return (
    <section className="mb-4 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-primary">
            Poste caissière
          </div>
          <h1 className="text-2xl font-black tracking-tight">Caisse & remise client</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prendre les commandes, garder un oeil sur les commandes prêtes et fluidifier la remise au client.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center sm:min-w-80">
          <StationStat label="En cours" value={activeCount} />
          <StationStat label="Prêtes" value={readyCount} tone={readyCount > 0 ? "ready" : "neutral"} />
          <StationStat label="À surveiller" value={urgentCount} tone={urgentCount > 0 ? "warning" : "neutral"} />
        </div>
      </div>

      <nav className="mt-4 grid gap-2 sm:grid-cols-2" aria-label="Navigation poste caissière">
        <StationLink
          to="/caisse"
          active={active === "caisse"}
          icon={<ShoppingCart className="h-4 w-4" />}
          label="Nouvelle commande"
          description="Saisir, scanner et vérifier le créneau pizza"
        />
        <StationLink
          to="/pretes"
          active={active === "pretes"}
          icon={<PackageCheck className="h-4 w-4" />}
          label="Commandes prêtes"
          description={readyCount > 0 ? `${readyCount} à remettre maintenant` : "Aucune remise en attente"}
          badge={readyCount}
        />
      </nav>
    </section>
  );
}

function StationLink({
  to,
  active,
  icon,
  label,
  description,
  badge,
}: {
  to: "/caisse" | "/pretes";
  active: boolean;
  icon: React.ReactNode;
  label: string;
  description: string;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-xl border p-3 transition ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "bg-background hover:border-primary/40 hover:bg-primary/5"
      }`}
    >
      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
        active ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"
      }`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-bold">
          {label}
          {!!badge && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-black ${
              active ? "bg-primary-foreground text-primary" : "bg-status-ready text-white"
            }`}>
              {badge}
            </span>
          )}
        </span>
        <span className={`mt-0.5 block text-xs ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
          {description}
        </span>
      </span>
    </Link>
  );
}

function StationStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "ready" | "warning";
}) {
  const cls =
    tone === "ready" ? "border-status-ready/40 bg-status-ready/10 text-status-ready"
    : tone === "warning" ? "border-status-prepare/40 bg-status-prepare/10 text-status-prepare"
    : "border-border bg-background text-foreground";

  return (
    <div className={`rounded-xl border px-3 py-2 ${cls}`}>
      <div className="text-xl font-black leading-none">{value}</div>
      <div className="mt-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase">
        {tone === "warning" && value > 0 && <AlertTriangle className="h-3 w-3" />}
        {label}
      </div>
    </div>
  );
}
