import type { Order, Settings } from "./kds-types";

/**
 * Calcule l'heure à laquelle la préparation doit commencer pour une commande,
 * pour que les pizzas soient prêtes à l'heure demandée.
 *
 * prep_start = requested_time - boxing - cook - prep*N - safety
 */
export function computePrepStart(
  requestedTime: Date,
  pizzaCount: number,
  s: Settings,
): Date {
  const totalSec =
    s.boxing_time_sec +
    s.cook_time_sec +
    s.prep_time_per_pizza_sec * pizzaCount +
    s.safety_margin_sec;
  return new Date(requestedTime.getTime() - totalSec * 1000);
}

export interface PizzaCapacityResult {
  canAccept: boolean;
  status: "idle" | "ok" | "warning" | "blocked";
  capacity: number;
  requestedPizzas: number;
  overlappingPizzas: number;
  remainingBeforeOrder: number;
  remainingAfterOrder: number;
  prepStartTime: Date | null;
  minutesUntilPrepStart: number | null;
  overlappingOrders: Array<{
    id: string;
    customer_name: string;
    requested_time: string;
    pizzaCount: number;
  }>;
}

export function computePizzaCapacity(
  orders: Order[],
  settings: Settings,
  requestedTime: Date,
  requestedPizzas: number,
): PizzaCapacityResult {
  const capacity = Math.max(1, settings.oven_capacity);
  const requestedWindow = getOvenWindow(requestedTime, settings);
  const overlappingOrders = orders
    .filter((order) => order.status !== "delivered" && order.status !== "ready")
    .map((order) => ({
      order,
      pizzaCount: order.items?.length ?? 0,
      window: getOvenWindow(new Date(order.requested_time), settings),
    }))
    .filter(({ pizzaCount, window }) => pizzaCount > 0 && windowsOverlap(requestedWindow, window))
    .map(({ order, pizzaCount }) => ({
      id: order.id,
      customer_name: order.customer_name,
      requested_time: order.requested_time,
      pizzaCount,
    }));

  const overlappingPizzas = overlappingOrders.reduce((total, order) => total + order.pizzaCount, 0);
  const remainingBeforeOrder = capacity - overlappingPizzas;
  const remainingAfterOrder = remainingBeforeOrder - requestedPizzas;
  const canAccept = requestedPizzas === 0 || remainingAfterOrder >= 0;
  const prepStartTime = requestedPizzas > 0 ? computePrepStart(requestedTime, requestedPizzas, settings) : null;
  const minutesUntilPrepStart = prepStartTime ? Math.round((prepStartTime.getTime() - Date.now()) / 60000) : null;
  const prepIsAlreadyDue = minutesUntilPrepStart !== null && minutesUntilPrepStart <= 0;
  const status =
    requestedPizzas === 0 ? "idle"
    : !canAccept ? "blocked"
    : prepIsAlreadyDue || remainingAfterOrder <= 0 ? "warning"
    : "ok";

  return {
    canAccept,
    status,
    capacity,
    requestedPizzas,
    overlappingPizzas,
    remainingBeforeOrder,
    remainingAfterOrder,
    prepStartTime,
    minutesUntilPrepStart,
    overlappingOrders,
  };
}

export function findNextPizzaCapacitySlots(
  orders: Order[],
  settings: Settings,
  fromTime: Date,
  requestedPizzas: number,
  limit = 3,
): Date[] {
  if (requestedPizzas <= 0) return [];

  const slots: Date[] = [];
  const stepMinutes = 5;
  const searchFrom = new Date(Math.max(Date.now(), fromTime.getTime() - 30 * 60 * 1000));
  const start = roundUpToMinutes(searchFrom, stepMinutes);

  for (let i = 0; i <= 144 && slots.length < limit; i += 1) {
    const candidate = new Date(start.getTime() + i * stepMinutes * 60 * 1000);
    const capacity = computePizzaCapacity(orders, settings, candidate, requestedPizzas);

    if (capacity.canAccept) {
      slots.push(candidate);
    }
  }

  return slots;
}

function getOvenWindow(requestedTime: Date, settings: Settings) {
  const ovenEnd = requestedTime.getTime() - settings.boxing_time_sec * 1000;
  const ovenStart = ovenEnd - settings.cook_time_sec * 1000;
  return { start: ovenStart, end: ovenEnd };
}

function windowsOverlap(a: { start: number; end: number }, b: { start: number; end: number }) {
  return a.start < b.end && b.start < a.end;
}

function roundUpToMinutes(date: Date, minutes: number) {
  const stepMs = minutes * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / stepMs) * stepMs);
}

/**
 * Stock pâtons restant.
 * 1 pâton par pizza + 1 pâton par Pani'NO (panuozzo, fait à partir d'un pâton
 * de pâte à pizza). Fish & NO et cornets de frites n'utilisent pas de pâton.
 */
export function computeStock(
  orders: Order[],
  s: Settings,
  paninoItems: { product_key: string }[] = [],
): number {
  const usedPizzas = orders.reduce((acc, o) => acc + (o.items?.length ?? 0), 0);
  const usedPaninos = paninoItems.filter((p) => p.product_key === "panino").length;
  return s.initial_paton_stock - usedPizzas - usedPaninos - s.paton_losses;
}

export function formatTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function minutesUntil(d: Date | string): number {
  const date = typeof d === "string" ? new Date(d) : d;
  return Math.round((date.getTime() - Date.now()) / 60000);
}

export function isLate(d: Date | string): boolean {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.getTime() < Date.now();
}
