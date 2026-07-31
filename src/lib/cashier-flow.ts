import type {
  DraftItem,
  DraftPaninoItem,
  Order,
  OrderItem,
  PaninoOrderItem,
  Settings,
} from "./kds-types";
import { isOrderActive } from "./order-status";
import { pizzaProductionStatus } from "./pizza-production";
import { formatTime } from "./scheduling";

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
  remainingPizzaCount: number;
  paninoCount: number;
  fishCount: number;
  friesCount: number;
  grenaillesCount: number;
}

export interface CashierProductionBatchPreview {
  time: Date;
  label: string;
  existingPizzas: number;
  draftPizzas: number;
  totalPizzas: number;
  capacity: number;
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
    planned: number;
    remaining: number;
    reserveAfterOrder: number;
    batches: CashierProductionBatchPreview[];
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

type ProjectedPizzaOrder = {
  id: string;
  customer_name: string;
  requested_time: string;
  pizzaCount: number;
  remainingPizzaCount: number;
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
const PANINO_STATION_CAPACITY = 2;
const FISH_FRYER_CAPACITY = 3;
const FRIES_FRYER_CAPACITY = 6;
const NEARBY_ORDER_WINDOW_MINUTES = 12;
export const MAX_PREPARATION_LEAD_MINUTES = 30;
export const TARGET_SPONTANEOUS_CAPACITY_RESERVE = 4;

const DEFAULT_SERVICE_WINDOWS: ServiceWindowDefinition[] = [
  { start: "12:00", end: "14:00" },
  { start: "19:00", end: "22:30" },
];

type ServiceWindowDefinition = {
  start: `${number}:${number}`;
  end: `${number}:${number}`;
};

export interface GenerateServiceSlotsParams {
  now?: Date;
  serviceWindows?: ServiceWindowDefinition[];
  intervalMinutes?: number;
}

export interface ProductionPlanResult {
  pickupTime: Date;
  batches: CashierProductionBatchPreview[];
  draftBatches: CashierProductionBatchPreview[];
  existingPizzasInDraftBatches: number;
  draftPizzas: number;
  draftBatchCapacity: number;
  plannedPizzasAtPickup: number;
  remainingPizzasAtPickup: number;
  reserveAfterDraft: number;
  maxDraftBatchWorkloadRatio: number;
  draftCompletesExistingBatch: boolean;
  latePizzaCount: number;
  projectedOrders: ProjectedPizzaOrder[];
  timingRisk: boolean;
}

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

export function generateServiceSlots({
  now = new Date(),
  serviceWindows = DEFAULT_SERVICE_WINDOWS,
  intervalMinutes = SLOT_STEP_MINUTES,
}: GenerateServiceSlotsParams = {}): Date[] {
  const stepMs = intervalMinutes * 60 * 1000;
  const sortedWindows = serviceWindows
    .map((window) => ({
      start: atLocalServiceTime(now, window.start),
      end: atLocalServiceTime(now, window.end),
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  for (const serviceWindow of sortedWindows) {
    if (now.getTime() <= serviceWindow.end.getTime()) {
      const start = roundUpToMinutes(
        new Date(Math.max(now.getTime(), serviceWindow.start.getTime())),
        intervalMinutes,
      );
      return buildSlotsBetween(start, serviceWindow.end, stepMs);
    }
  }

  const nextDayFirstWindow = sortedWindows[0];
  if (!nextDayFirstWindow) return [];

  const start = new Date(nextDayFirstWindow.start);
  const end = new Date(nextDayFirstWindow.end);
  start.setDate(start.getDate() + 1);
  end.setDate(end.getDate() + 1);
  return buildSlotsBetween(start, end, stepMs);
}

export function buildCashierSlotOptions(params: BuildSlotOptionsParams): CashierSlotOption[] {
  const slots = generateServiceSlots({
    now: params.fromTime ?? new Date(),
    intervalMinutes: SLOT_STEP_MINUTES,
  });
  const limitedSlots = typeof params.count === "number" ? slots.slice(0, params.count) : slots;
  const options = limitedSlots.map((requestedTime) =>
    analyzeCashierSlot({
      ...params,
      requestedTime,
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
  const productionPlan = planProduction({
    pickupTime: requestedTime,
    draftOrder: { cart },
    existingOrders: orders,
    settings,
    now: new Date(),
  });
  const nearbyOrders = getNearbyActiveOrders(orders, requestedTime);
  const paninoByOrder = groupPaninoItemsByOrder(paninoItems);

  const existingOrders = mergeExistingOrders(
    productionPlan.projectedOrders,
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

  const totalRatios = [
    productionPlan.maxDraftBatchWorkloadRatio,
    totalPanino / PANINO_STATION_CAPACITY,
    totalFish / FISH_FRYER_CAPACITY,
    Math.max(totalFries, totalGrenailles) / FRIES_FRYER_CAPACITY,
    friesMixedLoad ? 1.2 : 0,
  ];
  const existingRatios = [
    productionPlan.draftBatchCapacity > 0
      ? productionPlan.existingPizzasInDraftBatches / productionPlan.draftBatchCapacity
      : 0,
    existingPanino / PANINO_STATION_CAPACITY,
    existingFish / FISH_FRYER_CAPACITY,
    Math.max(existingFries, existingGrenailles) / FRIES_FRYER_CAPACITY,
  ];
  const highestTotalRatio = Math.max(...totalRatios);
  const highestExistingRatio = Math.max(...existingRatios);
  const hasExistingLoad =
    productionPlan.existingPizzasInDraftBatches > 0 ||
    productionPlan.remainingPizzasAtPickup > 0 ||
    existingPanino > 0 ||
    existingFish > 0 ||
    existingFries > 0 ||
    existingGrenailles > 0;
  const level = resolveSlotLevel({
    highestTotalRatio,
    highestExistingRatio,
    pizzaProjection: productionPlan,
    friesMixedLoad,
    hasExistingLoad,
  });
  const warnings = buildWarnings({
    level,
    pizzaAlready: productionPlan.existingPizzasInDraftBatches,
    pizzaAdded: draft.pizzaCount,
    pizzaCapacity: productionPlan.draftBatchCapacity || Math.max(1, settings.oven_capacity),
    pizzaPlanned: productionPlan.plannedPizzasAtPickup,
    pizzaRemaining: productionPlan.remainingPizzasAtPickup,
    pizzaReserve: productionPlan.reserveAfterDraft,
    timingRisk: productionPlan.timingRisk,
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
      already: productionPlan.existingPizzasInDraftBatches,
      added: draft.pizzaCount,
      total: productionPlan.existingPizzasInDraftBatches + draft.pizzaCount,
      capacity: productionPlan.draftBatchCapacity || Math.max(1, settings.oven_capacity),
      planned: productionPlan.plannedPizzasAtPickup,
      remaining: productionPlan.remainingPizzasAtPickup,
      reserveAfterOrder: productionPlan.reserveAfterDraft,
      batches: productionPlan.draftBatches,
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

export function planProduction({
  pickupTime,
  draftOrder,
  existingOrders,
  settings,
  now = new Date(),
  ovenCapacity = Math.max(1, settings.oven_capacity),
  intervalMinutes = SLOT_STEP_MINUTES,
}: {
  pickupTime: Date;
  draftOrder: { cart: DraftItem[] };
  existingOrders: Order[];
  settings: Settings;
  now?: Date;
  ovenCapacity?: number;
  intervalMinutes?: number;
}): ProductionPlanResult {
  const pickupSlot = roundToNearestMinutes(pickupTime, intervalMinutes);
  const nowSlot = roundUpToMinutes(now, intervalMinutes);
  const stepMs = intervalMinutes * 60 * 1000;
  const leadMs = MAX_PREPARATION_LEAD_MINUTES * 60 * 1000;
  const batchMap = new Map<number, MutableProductionBatch>();
  const projectedOrders: ProjectedPizzaOrder[] = [];
  let plannedPizzasAtPickup = 0;
  let remainingPizzasAtPickup = 0;
  let latePizzaCount = 0;

  const orderGroups = existingOrders
    .filter(isOrderActive)
    .map((order) => {
      const pickup = new Date(order.requested_time);
      if (Number.isNaN(pickup.getTime())) return null;

      const pizzaItems = order.items ?? [];
      const remainingItems = pizzaItems.filter(
        (item) => pizzaProductionStatus(item, order) !== "ready",
      );
      const toPrepareItems = pizzaItems.filter(
        (item) => pizzaProductionStatus(item, order) === "to_prepare",
      );
      const inOvenItems = pizzaItems.filter(
        (item) => pizzaProductionStatus(item, order) === "in_oven",
      );

      if (isSamePlanningSlot(pickup, pickupSlot, intervalMinutes)) {
        plannedPizzasAtPickup += pizzaItems.length;
        remainingPizzasAtPickup += remainingItems.length;
      }

      if (remainingItems.length > 0) {
        projectedOrders.push({
          id: order.id,
          customer_name: order.customer_name,
          requested_time: order.requested_time,
          pizzaCount: pizzaItems.length,
          remainingPizzaCount: remainingItems.length,
        });
      }

      return {
        id: order.id,
        customerName: order.customer_name,
        pickup,
        toPrepareItems,
        inOvenItems,
      };
    })
    .filter((group): group is ExistingProductionGroup => Boolean(group))
    .sort(compareProductionGroups);

  for (const group of orderGroups) {
    for (const item of group.inOvenItems) {
      const batchTime = roundToNearestMinutes(
        item.sent_to_oven_at ? new Date(item.sent_to_oven_at) : nowSlot,
        intervalMinutes,
      );
      placePizzaInBatch(batchMap, batchTime, {
        capacity: ovenCapacity,
        existingPizzas: 1,
        workloadUnits: computePizzaItemWorkload(item),
        orderId: group.id,
      });
    }
  }

  for (const group of orderGroups) {
    if (group.toPrepareItems.length === 0) continue;
    if (group.pickup.getTime() < now.getTime()) latePizzaCount += group.toPrepareItems.length;
    schedulePizzaGroup({
      batchMap,
      pickupTime: group.pickup,
      items: group.toPrepareItems,
      nowSlot,
      capacity: ovenCapacity,
      stepMs,
      leadMs,
      isDraft: false,
      orderId: group.id,
    });
  }

  const draftItems = draftOrder.cart;
  if (draftItems.length > 0) {
    if (pickupTime.getTime() < now.getTime()) latePizzaCount += draftItems.length;
    schedulePizzaGroup({
      batchMap,
      pickupTime,
      items: draftItems,
      nowSlot,
      capacity: ovenCapacity,
      stepMs,
      leadMs,
      isDraft: true,
      orderId: "__draft__",
    });
  }

  const batches = Array.from(batchMap.values())
    .sort((a, b) => a.time.getTime() - b.time.getTime())
    .map(toBatchPreview);
  const draftBatches = batches.filter((batch) => batch.draftPizzas > 0);
  const draftBatchCapacity = draftBatches.reduce((total, batch) => total + batch.capacity, 0);
  const existingPizzasInDraftBatches = draftBatches.reduce(
    (total, batch) => total + batch.existingPizzas,
    0,
  );
  const draftWorkloadUnits = draftItems.reduce(
    (total, item) => total + computePizzaItemWorkload(item),
    0,
  );
  const existingWorkloadInDraftBatches = Array.from(batchMap.values())
    .filter((batch) => batch.draftPizzas > 0)
    .reduce((total, batch) => total + batch.existingWorkloadUnits, 0);
  const maxDraftBatchWorkloadRatio =
    draftBatchCapacity > 0
      ? Math.max(
          ...Array.from(batchMap.values())
            .filter((batch) => batch.draftPizzas > 0)
            .map(
              (batch) => (batch.existingWorkloadUnits + batch.draftWorkloadUnits) / batch.capacity,
            ),
        )
      : draftItems.length > 0
        ? (draftWorkloadUnits + existingWorkloadInDraftBatches) / ovenCapacity
        : 0;
  const draftCompletesExistingBatch = draftBatches.some(
    (batch) => batch.existingPizzas > 0 && batch.totalPizzas === batch.capacity,
  );
  const reserveAfterDraft = computeSpontaneousReserve({
    batchMap,
    pickupTime,
    nowSlot,
    capacity: ovenCapacity,
    stepMs,
    leadMs,
  });

  return {
    pickupTime,
    batches,
    draftBatches,
    existingPizzasInDraftBatches,
    draftPizzas: draftItems.length,
    draftBatchCapacity,
    plannedPizzasAtPickup,
    remainingPizzasAtPickup,
    reserveAfterDraft,
    maxDraftBatchWorkloadRatio,
    draftCompletesExistingBatch,
    latePizzaCount,
    projectedOrders: projectedOrders.sort(
      (a, b) => new Date(a.requested_time).getTime() - new Date(b.requested_time).getTime(),
    ),
    timingRisk: latePizzaCount > 0 || (draftBatches.length === 0 && draftItems.length > 0),
  };
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

type ExistingProductionGroup = {
  id: string;
  customerName: string;
  pickup: Date;
  toPrepareItems: OrderItem[];
  inOvenItems: OrderItem[];
};

type MutableProductionBatch = {
  time: Date;
  existingPizzas: number;
  draftPizzas: number;
  existingWorkloadUnits: number;
  draftWorkloadUnits: number;
  capacity: number;
  orderIds: Set<string>;
};

type PizzaWorkloadSource = Pick<
  DraftItem | OrderItem,
  "pizza_name" | "extras" | "removed" | "base" | "cut_into"
>;

function compareProductionGroups(a: ExistingProductionGroup, b: ExistingProductionGroup) {
  const byPickup = a.pickup.getTime() - b.pickup.getTime();
  if (byPickup !== 0) return byPickup;
  return a.customerName.localeCompare(b.customerName, "fr");
}

function schedulePizzaGroup({
  batchMap,
  pickupTime,
  items,
  nowSlot,
  capacity,
  stepMs,
  leadMs,
  isDraft,
  orderId,
}: {
  batchMap: Map<number, MutableProductionBatch>;
  pickupTime: Date;
  items: PizzaWorkloadSource[];
  nowSlot: Date;
  capacity: number;
  stepMs: number;
  leadMs: number;
  isDraft: boolean;
  orderId: string;
}) {
  if (items.length === 0) return;

  const intervalMinutes = stepMs / 60000;
  const pickupSlot = roundToNearestMinutes(pickupTime, intervalMinutes);
  const dueMs = Math.max(nowSlot.getTime(), pickupSlot.getTime());
  const earliestMs = Math.max(nowSlot.getTime(), dueMs - leadMs);
  const requiredSlots = Math.max(1, Math.ceil(items.length / capacity));
  const preferredStartMs = Math.max(earliestMs, dueMs - (requiredSlots - 1) * stepMs);

  for (const item of items) {
    const partialBatchTime = findCompatiblePartialBatch(batchMap, {
      earliestMs,
      dueMs,
      capacity,
    });
    const targetMs =
      partialBatchTime ??
      findOpenPreferredBatch(batchMap, {
        startMs: preferredStartMs,
        dueMs,
        stepMs,
        capacity,
      }) ??
      findOpenPreferredBatch(batchMap, {
        startMs: earliestMs,
        dueMs,
        stepMs,
        capacity,
      }) ??
      dueMs;

    placePizzaInBatch(batchMap, new Date(targetMs), {
      capacity,
      existingPizzas: isDraft ? 0 : 1,
      draftPizzas: isDraft ? 1 : 0,
      workloadUnits: computePizzaItemWorkload(item),
      orderId,
    });
  }
}

function findCompatiblePartialBatch(
  batchMap: Map<number, MutableProductionBatch>,
  {
    earliestMs,
    dueMs,
    capacity,
  }: {
    earliestMs: number;
    dueMs: number;
    capacity: number;
  },
) {
  return Array.from(batchMap.values())
    .filter((batch) => {
      const time = batch.time.getTime();
      const total = batch.existingPizzas + batch.draftPizzas;
      return time >= earliestMs && time <= dueMs && total > 0 && total < capacity;
    })
    .sort((a, b) => b.time.getTime() - a.time.getTime())[0]
    ?.time.getTime();
}

function findOpenPreferredBatch(
  batchMap: Map<number, MutableProductionBatch>,
  {
    startMs,
    dueMs,
    stepMs,
    capacity,
  }: {
    startMs: number;
    dueMs: number;
    stepMs: number;
    capacity: number;
  },
) {
  for (let time = startMs; time <= dueMs; time += stepMs) {
    const batch = batchMap.get(time);
    const used = batch ? batch.existingPizzas + batch.draftPizzas : 0;
    if (used < capacity) return time;
  }
  return null;
}

function placePizzaInBatch(
  batchMap: Map<number, MutableProductionBatch>,
  time: Date,
  {
    capacity,
    existingPizzas = 0,
    draftPizzas = 0,
    workloadUnits,
    orderId,
  }: {
    capacity: number;
    existingPizzas?: number;
    draftPizzas?: number;
    workloadUnits: number;
    orderId: string;
  },
) {
  const key = time.getTime();
  const batch = batchMap.get(key) ?? {
    time,
    existingPizzas: 0,
    draftPizzas: 0,
    existingWorkloadUnits: 0,
    draftWorkloadUnits: 0,
    capacity,
    orderIds: new Set<string>(),
  };

  batch.existingPizzas += existingPizzas;
  batch.draftPizzas += draftPizzas;
  if (existingPizzas > 0) batch.existingWorkloadUnits += workloadUnits;
  if (draftPizzas > 0) batch.draftWorkloadUnits += workloadUnits;
  batch.orderIds.add(orderId);
  batchMap.set(key, batch);
}

function toBatchPreview(batch: MutableProductionBatch): CashierProductionBatchPreview {
  return {
    time: batch.time,
    label: formatTime(batch.time),
    existingPizzas: batch.existingPizzas,
    draftPizzas: batch.draftPizzas,
    totalPizzas: batch.existingPizzas + batch.draftPizzas,
    capacity: batch.capacity,
  };
}

function computeSpontaneousReserve({
  batchMap,
  pickupTime,
  nowSlot,
  capacity,
  stepMs,
  leadMs,
}: {
  batchMap: Map<number, MutableProductionBatch>;
  pickupTime: Date;
  nowSlot: Date;
  capacity: number;
  stepMs: number;
  leadMs: number;
}) {
  const intervalMinutes = stepMs / 60000;
  const dueMs = Math.max(
    nowSlot.getTime(),
    roundToNearestMinutes(pickupTime, intervalMinutes).getTime(),
  );
  const startMs = Math.max(nowSlot.getTime(), dueMs - leadMs);
  let bestReserve = 0;

  for (let time = startMs; time <= dueMs; time += stepMs) {
    const batch = batchMap.get(time);
    const used = batch ? batch.existingPizzas + batch.draftPizzas : 0;
    bestReserve = Math.max(bestReserve, capacity - used);
  }

  return bestReserve;
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
  pizzaOrders: ProjectedPizzaOrder[],
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
      remainingPizzaCount: pizzaOrder.remainingPizzaCount,
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
      remainingPizzaCount: countRemainingPizzaItems(order),
      paninoCount: 0,
      fishCount: 0,
      friesCount: 0,
      grenaillesCount: 0,
    };

    merged.set(order.id, {
      ...current,
      requestedTime: current.requestedTime || order.requested_time,
      pizzaCount: Math.max(current.pizzaCount, order.items?.length ?? 0),
      remainingPizzaCount: Math.max(current.remainingPizzaCount, countRemainingPizzaItems(order)),
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
  pizzaProjection,
  friesMixedLoad,
  hasExistingLoad,
}: {
  highestTotalRatio: number;
  highestExistingRatio: number;
  pizzaProjection: ProductionPlanResult;
  friesMixedLoad: boolean;
  hasExistingLoad: boolean;
}): CashierLoadLevel {
  if (pizzaProjection.timingRisk) return "tendu";
  if (
    pizzaProjection.draftPizzas > 0 &&
    pizzaProjection.reserveAfterDraft < TARGET_SPONTANEOUS_CAPACITY_RESERVE &&
    !pizzaProjection.draftCompletesExistingBatch
  ) {
    return "charge";
  }

  if (!hasExistingLoad) {
    if (friesMixedLoad) return "charge";
    if (highestTotalRatio <= 0) return "calme";
    if (highestTotalRatio <= 1) return "actif";
    if (highestTotalRatio <= 1.5) return "charge";
    return "tendu";
  }

  if (pizzaProjection.draftCompletesExistingBatch && highestTotalRatio <= 1.15) return "actif";

  if (friesMixedLoad || highestTotalRatio >= 1.2) return "tendu";
  if (highestTotalRatio >= 1.05 || highestExistingRatio >= 0.75) {
    return "charge";
  }
  if (highestTotalRatio >= 0.55) return "actif";
  return "calme";
}

function isRecommendedSlot(option: CashierSlotOption) {
  return option.level === "calme" || option.level === "actif";
}

function computePizzaItemWorkload(item: PizzaWorkloadSource) {
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
  pizzaPlanned,
  pizzaRemaining,
  pizzaReserve,
  timingRisk,
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
  pizzaPlanned: number;
  pizzaRemaining: number;
  pizzaReserve: number;
  timingRisk: boolean;
  paninoTotal: number;
  fishTotal: number;
  friesTotal: number;
  grenaillesTotal: number;
  friesMixedLoad: boolean;
}) {
  const warnings: string[] = [];
  if (timingRisk) {
    warnings.push("Pizza : retard ou fenêtre de production très serrée.");
  }
  if (pizzaAdded > 0 && pizzaAlready + pizzaAdded > pizzaCapacity) {
    warnings.push(
      `Pizza : ${pizzaAlready} déjà prévue(s), +${pizzaAdded}, soit ${pizzaAlready + pizzaAdded}/${pizzaCapacity}.`,
    );
  }
  if (
    pizzaAdded > 0 &&
    pizzaAlready > 0 &&
    pizzaAlready + pizzaAdded === pizzaCapacity &&
    warnings.length === 0
  ) {
    warnings.push("Pizza : la commande complète une fournée de 4.");
  }
  if (
    pizzaAdded > 0 &&
    pizzaReserve < TARGET_SPONTANEOUS_CAPACITY_RESERVE &&
    warnings.length === 0
  ) {
    warnings.push(
      `Réserve : seulement ${pizzaReserve} place(s) libres dans la fenêtre de production.`,
    );
  }
  if (pizzaPlanned > 0 && pizzaRemaining === 0 && warnings.length === 0) {
    warnings.push("Pizza : les commandes prévues à cette heure sont déjà prêtes.");
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

function countRemainingPizzaItems(order: Order) {
  return (order.items ?? []).filter((item) => pizzaProductionStatus(item, order) !== "ready")
    .length;
}

function atLocalServiceTime(date: Date, value: `${number}:${number}`) {
  const [hour, minute] = value.split(":").map(Number);
  const output = new Date(date);
  output.setHours(hour, minute, 0, 0);
  return output;
}

function buildSlotsBetween(start: Date, end: Date, stepMs: number) {
  const slots: Date[] = [];
  for (let time = start.getTime(); time <= end.getTime(); time += stepMs) {
    slots.push(new Date(time));
  }
  return slots;
}

function isSamePlanningSlot(a: Date, b: Date, intervalMinutes: number) {
  return (
    roundToNearestMinutes(a, intervalMinutes).getTime() ===
    roundToNearestMinutes(b, intervalMinutes).getTime()
  );
}

function roundUpToMinutes(date: Date, minutes: number) {
  const stepMs = minutes * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / stepMs) * stepMs);
}

function roundToNearestMinutes(date: Date, minutes: number) {
  const stepMs = minutes * 60 * 1000;
  return new Date(Math.round(date.getTime() / stepMs) * stepMs);
}
