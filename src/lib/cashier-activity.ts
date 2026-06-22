import type { ProductionEvent } from "@/lib/kds-types";

export type CashierActivityKey = "phone" | "counter" | "handoff" | "support";

export type CashierActivity = {
  key: CashierActivityKey;
  label: string;
  startedAt: string;
  durationSeconds: number;
  load: number;
};

export const CASHIER_ACTIVITIES: Array<{
  key: CashierActivityKey;
  label: string;
  startEvent: string;
  endEvent: string;
  load: number;
}> = [
  {
    key: "phone",
    label: "Téléphone",
    startEvent: "CASHIER_PHONE_STARTED",
    endEvent: "CASHIER_PHONE_ENDED",
    load: 2.6,
  },
  {
    key: "counter",
    label: "Client comptoir",
    startEvent: "CASHIER_COUNTER_STARTED",
    endEvent: "CASHIER_COUNTER_ENDED",
    load: 2,
  },
  {
    key: "handoff",
    label: "Remise client",
    startEvent: "CASHIER_HANDOFF_STARTED",
    endEvent: "CASHIER_HANDOFF_ENDED",
    load: 1.5,
  },
  {
    key: "support",
    label: "Aide salle / annexe",
    startEvent: "CASHIER_SUPPORT_STARTED",
    endEvent: "CASHIER_SUPPORT_ENDED",
    load: 1.2,
  },
];

const START_EVENT_BY_TYPE = new Map(CASHIER_ACTIVITIES.map((activity) => [activity.startEvent, activity]));
const END_EVENT_TYPES = new Set(CASHIER_ACTIVITIES.map((activity) => activity.endEvent));
const MAX_ACTIVE_SECONDS = 6 * 60 * 60;

export function getCurrentCashierActivity(events: ProductionEvent[], now = new Date()): CashierActivity | null {
  const latest = events
    .filter((event) => event.station === "caisse" && isCashierActivityEvent(event.event_type))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  if (!latest) return null;
  const activity = START_EVENT_BY_TYPE.get(latest.event_type);
  if (!activity) return null;

  const durationSeconds = Math.max(0, Math.floor((now.getTime() - new Date(latest.created_at).getTime()) / 1000));
  if (durationSeconds > MAX_ACTIVE_SECONDS) return null;
  return {
    key: activity.key,
    label: activity.label,
    startedAt: latest.created_at,
    durationSeconds,
    load: activity.load,
  };
}

export function cashierActivityDetails(activity: CashierActivity | null) {
  if (!activity) return "Disponible";
  return `${activity.label} depuis ${formatActivityDuration(activity.durationSeconds)}`;
}

export function formatActivityDuration(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  if (minutes <= 0) return `${remainingSeconds}s`;
  if (minutes < 60) return `${minutes}min ${String(remainingSeconds).padStart(2, "0")}s`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return `${hours}h ${String(restMinutes).padStart(2, "0")}min`;
}

function isCashierActivityEvent(eventType: string) {
  return eventType === "CASHIER_AVAILABLE" || START_EVENT_BY_TYPE.has(eventType) || END_EVENT_TYPES.has(eventType);
}
