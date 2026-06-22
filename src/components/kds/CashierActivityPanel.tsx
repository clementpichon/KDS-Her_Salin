import { CheckCircle2, HandCoins, Loader2, PhoneCall, Store, Utensils } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useProductionEvents, useSettings } from "@/hooks/use-kds-data";
import {
  CASHIER_ACTIVITIES,
  cashierActivityDetails,
  formatActivityDuration,
  getCurrentCashierActivity,
  type CashierActivity,
  type CashierActivityKey,
} from "@/lib/cashier-activity";
import { logProductionEvent } from "@/lib/production-events";
import type { Settings } from "@/lib/kds-types";

const ACTIVITY_ICONS: Record<CashierActivityKey, ReactNode> = {
  phone: <PhoneCall className="h-4 w-4" />,
  counter: <Store className="h-4 w-4" />,
  handoff: <HandCoins className="h-4 w-4" />,
  support: <Utensils className="h-4 w-4" />,
};

export function CashierActivityPanel() {
  const settings = useSettings();
  const { events } = useProductionEvents(80);
  const [busy, setBusy] = useState<CashierActivityKey | "available" | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const current = useMemo(() => getCurrentCashierActivity(events, now), [events, now]);

  const startActivity = async (key: CashierActivityKey) => {
    if (!settings || busy) return;
    const next = CASHIER_ACTIVITIES.find((activity) => activity.key === key);
    if (!next) return;
    if (current?.key === key) {
      toast("Activité déjà en cours");
      return;
    }

    setBusy(key);
    await closeCurrentActivity(current, settings);
    const ok = await logProductionEvent({
      settings,
      eventType: next.startEvent,
      station: "caisse",
      productType: "cashier_activity",
      productName: next.label,
      metadata: {
        activity: next.key,
        source: "cashier_quick_panel",
      },
    });
    if (ok) toast.success(`${next.label} lancé`);
    setBusy(null);
  };

  const markAvailable = async () => {
    if (!settings || busy) return;
    setBusy("available");
    await closeCurrentActivity(current, settings);
    const ok = await logProductionEvent({
      settings,
      eventType: "CASHIER_AVAILABLE",
      station: "caisse",
      productType: "cashier_activity",
      productName: "Disponible",
      metadata: {
        source: "cashier_quick_panel",
      },
    });
    if (ok) toast.success("Caisse disponible");
    setBusy(null);
  };

  return (
    <div className="mt-4 rounded-xl border border-dashed bg-background p-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-black uppercase text-muted-foreground">Charge caisse</div>
          <div className={`text-sm font-bold ${current ? "text-status-prepare" : "text-secondary"}`}>
            {cashierActivityDetails(current)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {CASHIER_ACTIVITIES.map((activity) => (
            <Button
              key={activity.key}
              type="button"
              size="sm"
              variant={current?.key === activity.key ? "default" : "outline"}
              disabled={!settings || !!busy}
              onClick={() => startActivity(activity.key)}
              className="h-11 justify-start gap-2 text-xs font-black"
            >
              {busy === activity.key ? <Loader2 className="h-4 w-4 animate-spin" /> : ACTIVITY_ICONS[activity.key]}
              <span className="truncate">{activity.label}</span>
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant={current ? "secondary" : "outline"}
            disabled={!settings || !!busy}
            onClick={markAvailable}
            className="h-11 justify-start gap-2 text-xs font-black"
          >
            {busy === "available" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Disponible
          </Button>
        </div>
      </div>
      {current && (
        <p className="mt-2 text-xs text-muted-foreground">
          Durée enregistrée au retour disponible : {formatActivityDuration(current.durationSeconds)}.
        </p>
      )}
    </div>
  );
}

async function closeCurrentActivity(current: CashierActivity | null, settings: Settings) {
  if (!current) return;
  const definition = CASHIER_ACTIVITIES.find((activity) => activity.key === current.key);
  if (!definition) return;
  await logProductionEvent({
    settings,
    eventType: definition.endEvent,
    station: "caisse",
    productType: "cashier_activity",
    productName: definition.label,
    metadata: {
      activity: definition.key,
      duration_seconds: current.durationSeconds,
      source: "cashier_quick_panel",
    },
  });
}
