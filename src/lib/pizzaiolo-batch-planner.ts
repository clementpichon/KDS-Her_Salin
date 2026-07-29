import type { OrderItem, Pizza } from "./kds-types";
import type { PizzaioloQueueJob } from "./pizzaiolo-queue";
import { getPizzaBaseInfo, type PizzaBaseInfo, type PizzaBaseKey } from "./pizza-production";

export type PlannedPizza = {
  item: OrderItem;
  job: PizzaioloQueueJob;
  base: PizzaBaseInfo;
};

export type SmartBatchPlan = {
  items: PlannedPizza[];
  base: PizzaBaseInfo;
  label: string;
  primaryJobId: string | null;
  fillCount: number;
  isFull: boolean;
};

type JobPool = {
  job: PizzaioloQueueJob;
  pizzas: PlannedPizza[];
};

export function buildSmartBatchPlan({
  jobs,
  pizzas,
  selectedIds,
  capacity,
  preferredJobId,
}: {
  jobs: PizzaioloQueueJob[];
  pizzas: Pizza[];
  selectedIds: Set<string>;
  capacity: number;
  preferredJobId?: string | null;
}): SmartBatchPlan {
  const limit = Math.max(0, capacity);
  const pools = buildJobPools(jobs, pizzas, selectedIds);
  const fallbackBase = getFallbackBase();

  if (limit === 0 || pools.length === 0) {
    return {
      items: [],
      base: fallbackBase,
      label: "Aucune pizza disponible",
      primaryJobId: null,
      fillCount: 0,
      isFull: false,
    };
  }

  const preferredIndex = preferredJobId ? pools.findIndex((pool) => pool.job.id === preferredJobId) : -1;
  const anchorIndex = preferredIndex >= 0 ? preferredIndex : 0;
  const anchorPool = pools[anchorIndex];
  const picked = chooseFromJob(anchorPool.pizzas, limit, []);
  const primaryItemIds = new Set(picked.map((pizza) => pizza.item.id));

  for (const pool of pools.slice(anchorIndex + 1)) {
    const remaining = limit - picked.length;
    if (remaining <= 0) break;
    const additions = chooseFromJob(
      pool.pizzas.filter((pizza) => !primaryItemIds.has(pizza.item.id)),
      remaining,
      picked,
    );
    picked.push(...additions);
  }

  return {
    items: picked,
    base: picked[0]?.base ?? fallbackBase,
    label: summarizeBatch(picked),
    primaryJobId: anchorPool.job.id,
    fillCount: picked.filter((pizza) => pizza.job.id !== anchorPool.job.id).length,
    isFull: picked.length === limit,
  };
}

function buildJobPools(jobs: PizzaioloQueueJob[], pizzas: Pizza[], selectedIds: Set<string>): JobPool[] {
  return jobs
    .map((job) => ({
      job,
      pizzas: job.items
        .filter((item) => !selectedIds.has(item.id))
        .map((item) => ({ item, job, base: getPizzaBaseInfo(item, pizzas) })),
    }))
    .filter((pool) => pool.pizzas.length > 0);
}

function chooseFromJob(items: PlannedPizza[], capacity: number, context: PlannedPizza[]) {
  if (items.length <= capacity) return [...items];

  const baseGroups = groupByBase(items);
  const contextBase = dominantBase(context);
  const bestGroup = baseGroups.sort((a, b) => scoreBaseGroup(b, capacity, contextBase) - scoreBaseGroup(a, capacity, contextBase))[0];
  const picked = bestGroup.items.slice(0, capacity);

  if (picked.length >= capacity) return picked;

  const pickedIds = new Set(picked.map((pizza) => pizza.item.id));
  const fill = items
    .filter((pizza) => !pickedIds.has(pizza.item.id))
    .sort((a, b) => scorePizzaCompatibility(b, picked, contextBase) - scorePizzaCompatibility(a, picked, contextBase))
    .slice(0, capacity - picked.length);

  return [...picked, ...fill];
}

function groupByBase(items: PlannedPizza[]) {
  const groups = new Map<PizzaBaseKey, { base: PizzaBaseInfo; items: PlannedPizza[]; firstIndex: number }>();
  items.forEach((pizza, index) => {
    const existing = groups.get(pizza.base.key);
    if (existing) {
      existing.items.push(pizza);
      return;
    }
    groups.set(pizza.base.key, { base: pizza.base, items: [pizza], firstIndex: index });
  });
  return Array.from(groups.values());
}

function scoreBaseGroup(
  group: { base: PizzaBaseInfo; items: PlannedPizza[]; firstIndex: number },
  capacity: number,
  contextBase: PizzaBaseKey | null,
) {
  const usableCount = Math.min(group.items.length, capacity);
  const compatibility = contextBase ? baseCompatibility(group.base.key, contextBase) : 0;
  return usableCount * 100 + compatibility * 20 - group.firstIndex;
}

function scorePizzaCompatibility(pizza: PlannedPizza, picked: PlannedPizza[], contextBase: PizzaBaseKey | null) {
  const pickedBase = dominantBase(picked);
  return baseCompatibility(pizza.base.key, pickedBase ?? contextBase) * 20;
}

function dominantBase(items: PlannedPizza[]): PizzaBaseKey | null {
  if (items.length === 0) return null;
  const counts = new Map<PizzaBaseKey, number>();
  for (const item of items) counts.set(item.base.key, (counts.get(item.base.key) ?? 0) + 1);
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function baseCompatibility(a: PizzaBaseKey, b: PizzaBaseKey | null) {
  if (!b) return 0;
  if (a === b) return 3;
  if (isCreamFamily(a) && isCreamFamily(b)) return 2;
  if (a === "unknown" || b === "unknown") return 1;
  return 0;
}

function isCreamFamily(base: PizzaBaseKey) {
  return base === "cream" || base === "goat_cream" || base === "truffle_cream";
}

function summarizeBatch(items: PlannedPizza[]) {
  if (items.length === 0) return "Aucune pizza disponible";
  const counts = new Map<string, number>();
  for (const pizza of items) counts.set(pizza.item.pizza_name, (counts.get(pizza.item.pizza_name) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([name, count]) => `${count} ${name}`)
    .join(" · ");
}

function getFallbackBase(): PizzaBaseInfo {
  return {
    key: "unknown",
    label: "Base à vérifier",
    ringClassName: "border-primary/50",
    badgeClassName: "bg-primary/10 text-primary border-primary/30",
    dotClassName: "bg-primary",
  };
}
