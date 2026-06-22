import { Copy, PhoneCall, PhoneIncoming } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePhoneStatus } from "@/hooks/use-kds-data";
import { formatPhoneNumber } from "@/lib/phone-utils";

export function PhoneStatusBanner() {
  const { status } = usePhoneStatus();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const isBusy = Boolean(status?.is_ringing || status?.is_on_call);
  const startedAt = status?.call_started_at ? new Date(status.call_started_at) : null;
  const elapsedSeconds = startedAt ? Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000)) : 0;
  const phone = status?.current_phone_number ?? "";
  const formattedPhone = formatPhoneNumber(phone);
  const statusText = status?.is_on_call ? "Appel en cours" : status?.is_ringing ? "Appel entrant" : "Ligne libre";
  const elapsedText = useMemo(() => formatElapsed(elapsedSeconds), [elapsedSeconds]);

  const copyPhone = async () => {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      toast.success("Numéro copié");
    } catch {
      toast.error("Impossible de copier le numéro");
    }
  };

  if (!isBusy) {
    return (
      <div className="mt-4 flex items-center justify-between rounded-xl border bg-background px-3 py-2 text-sm">
        <span className="inline-flex items-center gap-2 font-bold text-secondary">
          <PhoneCall className="h-4 w-4" /> Ligne téléphone libre
        </span>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border-2 border-status-prepare/60 bg-status-prepare/10 p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-black uppercase text-status-prepare">
            <PhoneIncoming className="h-4 w-4" /> {statusText}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-xl font-black">{formattedPhone || "Numéro masqué"}</span>
            {startedAt && (
              <span className="rounded-full bg-background px-2 py-1 text-xs font-bold text-muted-foreground">
                {elapsedText}
              </span>
            )}
            {status?.matched_customer_name && (
              <span className="rounded-full bg-primary/15 px-2 py-1 text-xs font-bold text-primary">
                Commande liée : {status.matched_customer_name}
              </span>
            )}
          </div>
        </div>
        {phone && (
          <div className="flex gap-2">
            <a
              href={`tel:${phone}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground"
            >
              <PhoneCall className="h-4 w-4" /> Rappeler
            </a>
            <Button type="button" variant="outline" onClick={copyPhone} className="h-10 gap-2">
              <Copy className="h-4 w-4" /> Copier
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes <= 0) return `${rest}s`;
  return `${minutes}min ${String(rest).padStart(2, "0")}s`;
}
