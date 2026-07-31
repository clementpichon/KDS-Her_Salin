import type { DraftItem, DraftPaninoItem, Order, PaninoOrderItem, Settings } from "./kds-types";
import { isOrderActive } from "./order-status";
import { computePizzaCapacity, formatTime } from "./scheduling";

export type CashierFlowStep = "products" | "slot" | "client";
export type CashierCatalogTab = "pizzas" | "panino" | "fishno" | "frites";
export type CashierLoadLevel = "calme" | "actif" | "charge" | "tendu";

export interface CashierDraftSummary {
  totalProducts: number;
  pizzaCount: number;
  paninoCount: number;
  fishCount: number;
  friesCount: number;
  grenaillesCount: number;
  doughCount: number;
}

export interface CashierSlotExistingOrder {
  id: string;
  customerName: string;
  requestedTime: string;
  pizzaCount: number;
  paninoCount: number;
  fishCount: number;
  friesCount: number;
  grenaillesCount: number;
}

export interface CashierSlotOption {
  id: string;
  time: Date;
  label: string;
  level: CashierLoadLevel;
  recommended: boolean;
  pizza: {
    already: number;
    added: number;
    total: number;
    capacity: number;
  };
  panino: {
    already: number;
    added: number;
    total: number;
    capacity: number;
  };
  fish: {
    already: number;
    added: number;
    total: number;
    capacity: number;
  };
  fries: {
    alreadyFries: number;
    alreadyGrenailles: number;
    addedFries: number;
    addedGrenailles: number;
    totalFries: number;
    totalGrenailles: number;
    capacity: number;
    mixedLoad: boolean;
  };
  existingOrders: CashierSlotExistingOrder[];
  warnings: string[];
}

type PizzaCapacityOrder = {
  id: string;
  customer_name: string;
  requested_time: string;
  pizzaCount: number;
};

interface BuildSlotOptionsParams {
  orders: Order[];
  paninoItems: PaninoOrderItem[];
  settings: Settings;
  cart: DraftItem[];
  paninoCart: DraftPaninoItem[];
  fromTime?: Date;
  count?: number;
}

const SLOT_STEP_MINUTES = 5;
const DEFAULT_SLOT_COUNT = 12;
const PANINO_STATION_CAPACITY = 2;
const FISH_FRYER_CAPACITY = 3;
const FRIES_FRYER_CAPACITY = 6;
const NEARBY_ORDER_WINDOW_MINUTES = 12;

export function summarizeCashierDraft(
  cart: DraftItem[],
  paninoCart: DraftPaninoItem[],
): CashierDraftSummary {
  const paninoCount = paninoCart.filter((item) => item.product_key === "panino").length;
  const fishCount = paninoCart.filter((item) => item.product_key === "fishno").length;
  const friesCount = paninoCart.filter(needsFriesFryer).length;
  const grenaillesCount = paninoCart.filter(needsGrenaillesFryer).length;

  return {
    totalProducts: cart.length + paninoCart.length,
    pizzaCount: cart.length,
    paninoCount,
    fishCount,
    friesCount,
    grenaillesCount,
    doughCount: cart.length + paninoCount,
  };
}

export function buildCashierSlotOptions(params: BuildSlotOptionsParams): CashierSlotOption[] {
  const count = params.count ?? DEFAULT_SLOT_COUNT;
  const start = roundUpToMinutes(params.fromTime ?? new Date(), SLOT_STEP_MINUTES);
  const options = Array.from({ length: count }, (_, index) =>
    analyzeCashierSlot({
      ...params,
      requestedTime: new Date(start.getTime() + index * SLOT_STEP_MINUTES * 60 * 1000),
    }),
  );

  const recommended = options.filter(isRecommendedSlot);
  const others = options.filter((option) => !isRecommendedSlot(option));

  return [...recommended, ...others].map((option) => ({
    ...option,
    recommended: isRecommendedSlot(option),
  }));
}

export function analyzeCashierSlot({
  orders,
  paninoItems,
  settings,
  cart,
  paninoCart,
  requestedTime,
}: BuildSlotOptionsParams & { requestedTime: Date }): CashierSlotOption {
  const draft = summarizeCashierDraft(cart, paninoCart);
  const pizzaCapacity = computePizzaCapacity(orders, settings, requestedTime, draft.pizzaCount);
  const nearbyOrders = getNearbyActiveOrders(orders, requestedTime);
  const paninoByOrder = groupPaninoItemsByOrder(paninoItems);

  const existingOrders = mergeExistingOrders(
    pizzaCapacity.overlappingOrders,
    nearbyOrders,
    paninoByOrder,
  );

  const existingPanino = existingOrders.reduce((sum, order) => sum + order.paninoCount, 0);
  const existingFish = existingOrders.reduce((sum, order) => sum + order.fishCount, 0);
  const existingFries = existingOrders.reduce((sum, order) => sum + order.friesCount, 0);
  const existingGrenailles = existingOrders.reduce((sum, order) => sum + order.grenaillesCount, 0);

  const totalPanino = existingPanino + draft.paninoCount;
  const totalFish = existingFish + draft.fishCount;
  const totalFries = existingFries + draft.friesCount;
  const totalGrenailles = existingGrenailles + draft.grenaillesCount;
  const friesMixedLoad = totalFries > 0 && totalGrenailles > 0;
  const pizzaWorkloadUnits = computeDraftPizzaWorkloadUnits(cart);

  const totalRatios = [
    pizzaCapacity.capacity > 0
      ? (pizzaCapacity.overlappingPizzas + pizzaWorkloadUnits) / pizzaCapacity.capacity
      : 0,
    totalPanino / PANINO_STATION_CAPACITY,
    totalFish / FISH_FRYER_CAPACITY,
    Math.max(totalFries, totalGrenailles) / FRIES_FRYER_CAPACITY,
    friesMixedLoad ? 1.2 : 0,
  ];
  const existingRatios = [
    pizzaCapacity.capacity > 0 ? pizzaCapacity.overlappingPizzas / pizzaCapacity.capacity : 0,
    existingPanino / PANINO_STATION_CAPACITY,
    existingFish / FISH_FRYER_CAPACITY,
    Math.max(existingFries, existingGrenailles) / FRIES_FRYER_CAPACITY,
  ];
  const highestTotalRatio = Math.max(...totalRatios);
  const highestExistingRatio = Math.max(...existingRatios);
  const hasExistingLoad =
    pizzaCapacity.overlappingPizzas > 0 ||
    existingPanino > 0 ||
    existingFish > 0 ||
    existingFries > 0 ||
    existingGrenailles > 0;
  const level = resolveSlotLevel({
    highestTotalRatio,
    highestExistingRatio,
    pizzaStatus: pizzaCapacity.status,
    friesMixedLoad,
    hasExistingLoad,
  });
  const warnings = buildWarnings({
    level,
    pizzaAlready: pizzaCapacity.overlappingPizzas,
    pizzaAdded: draft.pizzaCount,
    pizzaCapacity: pizzaCapacity.capacity,
    paninoTotal: totalPanino,
    fishTotal: totalFish,
    friesTotal: totalFries,
    grenaillesTotal: totalGrenailles,
    friesMixedLoad,
  });

  return {
    id: requestedTime.toISOString(),
    time: requestedTime,
    label: formatTime(requestedTime),
    level,
    recommended: false,
    pizza: {
      already: pizzaCapacity.overlappingPizzas,
      added: draft.pizzaCount,
      total: pizzaCapacity.overlappingPizzas + draft.pizzaCount,
      capacity: pizzaCapacity.capacity,
    },
    panino: {
      already: existingPanino,
      added: draft.paninoCount,
      total: totalPanino,
      capacity: PANINO_STATION_CAPACITY,
    },
    fish: {
      already: existingFish,
      added: draft.fishCount,
      total: totalFish,
      capacity: FISH_FRYER_CAPACITY,
    },
    fries: {
      alreadyFries: existingFries,
      alreadyGrenailles: existingGrenailles,
      addedFries: draft.friesCount,
      addedGrenailles: draft.grenaillesCount,
      totalFries,
      totalGrenailles,
      capacity: FRIES_FRYER_CAPACITY,
      mixedLoad: friesMixedLoad,
    },
    existingOrders,
    warnings,
  };
}

export function isSlotHighlyLoaded(slot: CashierSlotOption): boolean {
  return slot.level === "charge" || slot.level === "tendu";
}

function getNearbyActiveOrders(orders: Order[], requestedTime: Date) {
  const center = requestedTime.getTime();
  const windowMs = NEARBY_ORDER_WINDOW_MINUTES * 60 * 1000;

  return orders.filter((order) => {
    if (!isOrderActive(order)) return false;
    const orderTime = new Date(order.requested_time).getTime();
    if (Number.isNaN(orderTime)) return false;
    return Math.abs(orderTime - center) <= windowMs;
  });
}

function groupPaninoItemsByOrder(items: PaninoOrderItem[]) {
  const grouped = new Map<string, PaninoOrderItem[]>();
  for (const item of items) {
    const current = grouped.get(item.order_id) ?? [];
    current.push(item);
    grouped.set(item.order_id, current);
  }
  return grouped;
}

function mergeExistingOrders(
  pizzaOrders: PizzaCapacityOrder[],
  nearbyOrders: Order[],
  paninoByOrder: Map<string, PaninoOrderItem[]>,
) {
  const merged = new Map<string, CashierSlotExistingOrder>();

  for (const pizzaOrder of pizzaOrders) {
    merged.set(pizzaOrder.id, {
      id: pizzaOrder.id,
      customerName: pizzaOrder.customer_name,
      requestedTime: pizzaOrder.requested_time,
      pizzaCount: pizzaOrder.pizzaCount,
      paninoCount: 0,
      fishCount: 0,
      friesCount: 0,
      grenaillesCount: 0,
    });
  }

  for (const order of nearbyOrders) {
    const paninos = paninoByOrder.get(order.id) ?? [];
    const current = merged.get(order.id) ?? {
      id: order.id,
      customerName: order.customer_name,
      requestedTime: order.requested_time,
      pizzaCount: order.items?.length ?? 0,
      paninoCount: 0,
      fishCount: 0,
      friesCount: 0,
      grenaillesCount: 0,
    };

    merged.set(order.id, {
      ...current,
      requestedTime: current.requestedTime || order.requested_time,
      pizzaCount: Math.max(current.pizzaCount, order.items?.length ?? 0),
      paninoCount: paninos.filter((item) => item.product_key === "panino").length,
      fishCount: paninos.filter((item) => item.product_key === "fishno").length,
      friesCount: paninos.filter(needsFriesFryer).length,
      grenaillesCount: paninos.filter(needsGrenaillesFryer).length,
    });
  }

  return Array.from(merged.values()).sort(
    (a, b) => new Date(a.requestedTime).getTime() - new Date(b.requestedTime).getTime(),
  );
}

function resolveSlotLevel({
  highestTotalRatio,
  highestExistingRatio,
  pizzaStatus,
  friesMixedLoad,
  hasExistingLoad,
}: {
  highestTotalRatio: number;
  highestExistingRatio: number;
  pizzaStatus: "idle" | "ok" | "warning" | "blocked";
  friesMixedLoad: boolean;
  hasExistingLoad: boolean;
}): CashierLoadLevel {
  if (!hasExistingLoad) {
    if (friesMixedLoad) return "charge";
    if (highestTotalRatio <= 0) return "calme";
    if (highestTotalRatio <= 1) return "actif";
    if (highestTotalRatio <= 1.5) return "charge";
    return "tendu";
  }

  if (friesMixedLoad || pizzaStatus === "blocked" || highestTotalRatio >= 1.15) return "tendu";
  if (pizzaStatus === "warning" || highestTotalRatio >= 0.9 || highestExistingRatio >= 0.75) {
    return "charge";
  }
  if (highestTotalRatio >= 0.55) return "actif";
  return "calme";
}

function isRecommendedSlot(option: CashierSlotOption) {
  return option.level === "calme" || option.level === "actif";
}

function computeDraftPizzaWorkloadUnits(cart: DraftItem[]) {
  return cart.reduce((total, item) => total + computePizzaItemWorkload(item), 0);
}

function computePizzaItemWorkload(item: DraftItem) {
  const name = item.pizza_name.toLocaleLowerCase("fr");
  const postCookHints = ["saumon", "burrata", "parme", "roquette", "truffe"];
  const postCookExtra = postCookHints.some((hint) => name.includes(hint)) ? 0.18 : 0;
  const modifierExtra = Math.min(0.35, item.extras.length * 0.07 + item.removed.length * 0.04);
  const baseExtra = item.base === "unknown" ? 0.1 : 0;
  const cutExtra = item.cut_into ? 0.05 : 0;
  return 1 + postCookExtra + modifierExtra + baseExtra + cutExtra;
}

function buildWarnings({
  level,
  pizzaAlready,
  pizzaAdded,
  pizzaCapacity,
  paninoTotal,
  fishTotal,
  friesTotal,
  grenaillesTotal,
  friesMixedLoad,
}: {
  level: CashierLoadLevel;
  pizzaAlready: number;
  pizzaAdded: number;
  pizzaCapacity: number;
  paninoTotal: number;
  fishTotal: number;
  friesTotal: number;
  grenaillesTotal: number;
  friesMixedLoad: boolean;
}) {
  const warnings: string[] = [];
  if (pizzaAdded > 0 && pizzaAlready + pizzaAdded > pizzaCapacity) {
    warnings.push(
      `Pizza : ${pizzaAlready} déjà prévue(s), +${pizzaAdded}, soit ${pizzaAlready + pizzaAdded}/${pizzaCapacity}.`,
    );
  }
  if (paninoTotal > PANINO_STATION_CAPACITY) {
    warnings.push(`Pani'NO : ${paninoTotal} préparation(s) sur le même créneau.`);
  }
  if (fishTotal > FISH_FRYER_CAPACITY) {
    warnings.push(
      `Fish & NO : ${fishTotal} portion(s), friteuse poisson prévue pour ${FISH_FRYER_CAPACITY}.`,
    );
  }
  if (friesMixedLoad) {
    warnings.push("Frites : frites et pommes grenailles se croisent, à coordonner.");
  } else if (Math.max(friesTotal, grenaillesTotal) > FRIES_FRYER_CAPACITY) {
    warnings.push(
      `Friteuse : ${Math.max(friesTotal, grenaillesTotal)} portion(s) pour ${FRIES_FRYER_CAPACITY} possibles.`,
    );
  }
  if (warnings.length === 0 && level === "charge") {
    warnings.push("Créneau dense : conseillé, mais à confirmer avec la cuisine si besoin.");
  }
  if (warnings.length === 0 && level === "tendu") {
    warnings.push("Créneau très chargé : sélection possible uniquement par choix volontaire.");
  }
  return warnings;
}

function needsFriesFryer(
  item: Pick<
    DraftPaninoItem | PaninoOrderItem,
    "product_key" | "product_name" | "fries_mode" | "side"
  >,
) {
  const text =
    `${item.product_key} ${item.product_name} ${item.fries_mode ?? ""} ${item.side ?? ""}`.toLocaleLowerCase(
      "fr",
    );
  return text.includes("frite") && !text.includes("grenaille");
}

function needsGrenaillesFryer(
  item: Pick<
    DraftPaninoItem | PaninoOrderItem,
    "product_key" | "product_name" | "fries_mode" | "side"
  >,
) {
  const text =
    `${item.product_key} ${item.product_name} ${item.fries_mode ?? ""} ${item.side ?? ""}`.toLocaleLowerCase(
      "fr",
    );
  return text.includes("grenaille");
}

function roundUpToMinutes(date: Date, minutes: number) {
  const stepMs = minutes * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / stepMs) * stepMs);
}
