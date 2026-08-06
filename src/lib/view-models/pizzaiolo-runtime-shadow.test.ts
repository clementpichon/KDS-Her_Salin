import assert from "node:assert/strict";
import type { Order, OrderItem, PaninoOrderItem, Pizza } from "../kds-types";
import type { ShadowProductionClock } from "../shadow-production";
import {
  createPizzaioloRuntimeShadowScheduler,
  getLastPizzaioloRuntimeShadowReport,
  runPizzaioloRuntimeShadowComparison,
  shouldSchedulePizzaioloRuntimeShadowComparison,
} from "./pizzaiolo-runtime-shadow";
import type {
  PizzaioloLegacyShadowComparison,
  PizzaioloLegacyShadowIssue,
  PizzaioloLegacyShadowSummary,
} from "./pizzaiolo-legacy-shadow-comparison";

const REQUESTED_1930 = "2026-08-06T19:30:00.000Z";
const REQUESTED_1935 = "2026-08-06T19:35:00.000Z";

const PIZZAS: Pizza[] = [
  {
    id: "pizza-regina",
    name: "Regina",
    ingredients: ["tomate"],
    default_base: "tomato",
    image_path: null,
    sort_order: 1,
    active: true,
  },
];

function order({
  id = "order-1",
  customerName = "Client test",
  requestedTime = REQUESTED_1930,
  status = "to_prepare",
  queuePosition = null,
  items = [],
}: {
  id?: string;
  customerName?: string;
  requestedTime?: string;
  status?: Order["status"];
  queuePosition?: number | null;
  items?: readonly OrderItem[];
} = {}): Order {
  return {
    id,
    customer_name: customerName,
    requested_time: requestedTime,
    status,
    pizzaiolo_queue_position: queuePosition,
    prep_start_time: null,
    created_at: "2026-08-06T18:30:00.000Z",
    updated_at: "2026-08-06T18:30:00.000Z",
    cancelled_at: status === "cancelled" ? "2026-08-06T18:45:00.000Z" : null,
    notes: null,
    pains_panino_status: null,
    customer_phone_hash: null,
    customer_phone: "0600000000",
    items: [...items],
  };
}

function pizzaItem({
  id = "pizza-item-1",
  orderId = "order-1",
  pizzaId = "pizza-regina",
  name = "Regina",
  base = "tomato",
  defaultBase = "tomato",
  baseResolution = "default",
  productionStatus = "to_prepare",
}: {
  id?: string;
  orderId?: string;
  pizzaId?: string | null;
  name?: string;
  base?: string | null;
  defaultBase?: string | null;
  baseResolution?: string | null;
  productionStatus?: OrderItem["production_status"];
} = {}): OrderItem {
  return {
    id,
    order_id: orderId,
    pizza_id: pizzaId,
    pizza_name: name,
    base,
    default_base_snapshot: defaultBase,
    explicit_base_snapshot: null,
    base_resolution: baseResolution,
    base_confidence: 1,
    extras: [],
    removed: [],
    prepared: false,
    production_status: productionStatus,
    oven_batch_id: null,
    sent_to_oven_at: productionStatus === "in_oven" ? "2026-08-06T19:25:00.000Z" : null,
    ready_at: productionStatus === "ready" ? "2026-08-06T19:35:00.000Z" : null,
    cut_into: null,
  };
}

function paninoItem({
  id = "panino-item-1",
  orderId = "order-1",
  productKey = "panino",
  productName = "Pani'NO Burger",
}: {
  id?: string;
  orderId?: string;
  productKey?: string;
  productName?: string;
} = {}): PaninoOrderItem {
  return {
    id,
    order_id: orderId,
    product_key: productKey,
    product_name: productName,
    base: productKey === "panino" ? "Creme" : null,
    fries_mode: null,
    side: null,
    sauces: [],
    removed: [],
    extras: [],
    status: "pending",
    done_at: null,
    created_at: "2026-08-06T18:30:00.000Z",
  };
}

function tickingClock(): ShadowProductionClock {
  let now = 0;
  return {
    nowIso: () => "2026-08-06T18:59:00.000Z",
    nowMs: () => {
      now += 5;
      return now;
    },
  };
}

function slowClock(): ShadowProductionClock {
  let now = 0;
  return {
    nowIso: () => "2026-08-06T18:59:00.000Z",
    nowMs: () => {
      now += 50;
      return now;
    },
  };
}

function fullCoverage() {
  return {
    orders: true,
    orderItems: true,
    paninoItems: true,
    pizzas: true,
  };
}

function comparisonFixture({
  warnings = [],
  blockingDifferences = [],
  unsupported = [],
}: {
  warnings?: readonly PizzaioloLegacyShadowIssue[];
  blockingDifferences?: readonly PizzaioloLegacyShadowIssue[];
  unsupported?: readonly PizzaioloLegacyShadowIssue[];
} = {}): PizzaioloLegacyShadowComparison {
  const summary: PizzaioloLegacyShadowSummary = {
    legacyVisibleOrders: 1,
    viewModelVisibleOrders: 1,
    legacyActionableOrders: 1,
    viewModelSelectableOrders: 1,
    legacyVisiblePizzas: 1,
    legacyActionablePizzas: 1,
    viewModelActionablePizzas: 1,
    matches: 1,
    warnings: warnings.length,
    blockingDifferences: blockingDifferences.length,
    unsupported: unsupported.length,
    isConsistent: blockingDifferences.length === 0,
  };

  return {
    matches: [
      {
        kind: "match",
        code: "fixture_match",
        message: "Fixture match",
        refs: {},
      },
    ],
    warnings,
    blockingDifferences,
    unsupported,
    summary,
  };
}

function issue(kind: PizzaioloLegacyShadowIssue["kind"], code: string): PizzaioloLegacyShadowIssue {
  return {
    kind,
    code,
    message: code,
    refs: { orderId: "order-1" },
  };
}

function snapshot(value: unknown) {
  return JSON.stringify(value);
}

{
  assert.equal(shouldSchedulePizzaioloRuntimeShadowComparison(false), false);
  assert.equal(shouldSchedulePizzaioloRuntimeShadowComparison(true), true);
}

{
  const orders = [order({ items: [pizzaItem()] })];
  const paninoItems = [paninoItem()];
  const report = runPizzaioloRuntimeShadowComparison({
    orders,
    paninoItems,
    pizzas: PIZZAS,
    coverage: fullCoverage(),
    clock: tickingClock(),
    idSeed: "success",
  });

  assert.equal(report.status, "success");
  assert.equal(report.planUsable, true);
  assert.equal(report.summary?.legacyVisibleOrders, 1);
  assert.equal(report.summary?.viewModelVisibleOrders, 1);
  assert.equal(report.summary?.legacyActionablePizzas, 1);
  assert.equal(report.summary?.viewModelActionablePizzas, 1);
  assert.equal(report.blockingDifferenceCount, 0);
  assert.equal(report.unsupportedCount, 0);
  assert.equal(report.performance.productionPlanMs > 0, true);
  assert.equal(report.performance.viewModelMs > 0, true);
  assert.equal(report.performance.legacySnapshotMs > 0, true);
  assert.equal(report.performance.comparisonMs > 0, true);
  assert.equal(report.performance.totalMs, report.durationMs);
}

{
  const report = runPizzaioloRuntimeShadowComparison({
    orders: [order({ items: [pizzaItem()] })],
    pizzas: PIZZAS,
    coverage: {
      orders: true,
      orderItems: true,
      paninoItems: false,
      pizzas: true,
    },
    clock: tickingClock(),
  });

  assert.equal(report.status, "skipped");
  assert.equal(report.planUsable, null);
  assert.equal(report.summary, null);
  assert.equal(report.blockingDifferenceCount, 0);
  assert.match(report.warnings.join("\n"), /pizzaiolo_comparison_panino_data_missing/);
}

{
  const report = runPizzaioloRuntimeShadowComparison({
    orders: [order({ items: [pizzaItem()] })],
    paninoItems: [],
    pizzas: [],
    clock: tickingClock(),
  });

  assert.equal(report.status, "skipped");
  assert.match(report.warnings.join("\n"), /pizzaiolo_comparison_pizza_catalog_missing/);
}

{
  const orders = [order({ id: "other-order", items: [] })];
  const paninoItems = [
    paninoItem({
      id: "unknown-product",
      orderId: "other-order",
      productKey: "boisson",
      productName: "Boisson",
    }),
  ];
  const report = runPizzaioloRuntimeShadowComparison({
    orders,
    paninoItems,
    pizzas: PIZZAS,
    coverage: fullCoverage(),
    clock: tickingClock(),
    idSeed: "unusable",
  });

  assert.equal(report.status, "success");
  assert.equal(report.planUsable, false);
  assert.match(report.warnings.join("\n"), /pizzaiolo_comparison_plan_unusable/);
}

{
  const orders = [
    order({
      id: "later",
      requestedTime: REQUESTED_1935,
      queuePosition: 1000,
      items: [pizzaItem({ id: "later-pizza", orderId: "later" })],
    }),
    order({
      id: "earlier",
      requestedTime: REQUESTED_1930,
      queuePosition: 2000,
      items: [pizzaItem({ id: "earlier-pizza", orderId: "earlier" })],
    }),
  ];
  const report = runPizzaioloRuntimeShadowComparison({
    orders,
    paninoItems: [],
    pizzas: PIZZAS,
    coverage: fullCoverage(),
    clock: tickingClock(),
    idSeed: "warnings",
  });

  assert.equal(report.status, "success");
  assert.equal(report.warningCount > 0, true);
  assert.equal(report.blockingDifferenceCount, 0);
}

{
  const report = runPizzaioloRuntimeShadowComparison({
    orders: [order({ items: [pizzaItem()] })],
    paninoItems: [],
    pizzas: PIZZAS,
    coverage: fullCoverage(),
    clock: tickingClock(),
    dependencies: {
      comparePizzaioloViewModelWithLegacy: () =>
        comparisonFixture({
          blockingDifferences: [issue("blocking_difference", "fixture_blocking_difference")],
        }),
    },
  });

  assert.equal(report.status, "success");
  assert.equal(report.blockingDifferenceCount, 1);
  assert.equal(report.summary?.blockingDifferences, 1);
}

{
  const orders = [
    order({
      items: [
        pizzaItem({
          id: "ambiguous-pizza",
          pizzaId: null,
          name: "Mystere",
          base: null,
          defaultBase: null,
          baseResolution: null,
        }),
      ],
    }),
  ];
  const report = runPizzaioloRuntimeShadowComparison({
    orders,
    paninoItems: [],
    pizzas: PIZZAS,
    coverage: fullCoverage(),
    clock: tickingClock(),
    idSeed: "unsupported",
  });

  assert.equal(report.status, "success");
  assert.equal(report.unsupportedCount > 0, true);
}

{
  const logs: string[] = [];
  assert.doesNotThrow(() =>
    runPizzaioloRuntimeShadowComparison({
      orders: [order({ items: [pizzaItem()] })],
      paninoItems: [],
      pizzas: PIZZAS,
      coverage: fullCoverage(),
      clock: tickingClock(),
      debug: true,
      logger: { log: (message) => logs.push(message) },
      dependencies: {
        buildProductionPlan: () => {
          throw new Error("boom");
        },
      },
    }),
  );

  const report = getLastPizzaioloRuntimeShadowReport();
  assert.ok(report);
  assert.equal(report.status, "failed");
  assert.equal(report.error, "boom");
  assert.equal(report.blockingDifferenceCount, 1);
  assert.match(logs[0] ?? "", /Status: failed/);
}

{
  const orders = [
    order({
      customerName: "Michel Secret",
      items: [pizzaItem()],
    }),
  ];
  const logs: string[] = [];

  runPizzaioloRuntimeShadowComparison({
    orders,
    paninoItems: [],
    pizzas: PIZZAS,
    coverage: fullCoverage(),
    clock: tickingClock(),
    logger: { log: (message) => logs.push(message) },
  });

  assert.equal(logs.length, 0);

  runPizzaioloRuntimeShadowComparison({
    orders,
    paninoItems: [],
    pizzas: PIZZAS,
    coverage: fullCoverage(),
    clock: tickingClock(),
    debug: true,
    logger: { log: (message) => logs.push(message) },
  });

  assert.equal(logs.length, 1);
  assert.match(logs[0] ?? "", /PIZZAIOLO SHADOW COMPARISON/);
  assert.doesNotMatch(logs[0] ?? "", /Michel Secret/);
  assert.doesNotMatch(logs[0] ?? "", /0600000000/);
}

{
  const logs: string[] = [];
  const report = runPizzaioloRuntimeShadowComparison({
    orders: [order({ items: [pizzaItem()] })],
    paninoItems: [],
    pizzas: PIZZAS,
    coverage: fullCoverage(),
    clock: slowClock(),
    debug: true,
    logger: { log: (message) => logs.push(message) },
    dependencies: {
      comparePizzaioloViewModelWithLegacy: () =>
        comparisonFixture({
          warnings: [issue("warning", "fixture_warning")],
          unsupported: [issue("unsupported", "fixture_unsupported")],
        }),
    },
  });

  assert.equal(report.status, "success");
  assert.equal(report.warningCount, 2);
  assert.equal(report.unsupportedCount, 1);
  assert.match(report.warnings.join("\n"), /pizzaiolo_comparison_slow/);
  assert.match(logs[0] ?? "", /Diagnostics:/);
  assert.match(logs[0] ?? "", /fixture_warning/);
  assert.match(logs[0] ?? "", /fixture_unsupported/);
}

{
  const orders = [order({ items: [pizzaItem()] })];
  const paninoItems = [paninoItem()];
  const beforeOrders = snapshot(orders);
  const beforePaninoItems = snapshot(paninoItems);
  const beforePizzas = snapshot(PIZZAS);

  const first = runPizzaioloRuntimeShadowComparison({
    orders,
    paninoItems,
    pizzas: PIZZAS,
    coverage: fullCoverage(),
    clock: tickingClock(),
    idSeed: "deterministic",
  });
  const second = runPizzaioloRuntimeShadowComparison({
    orders,
    paninoItems,
    pizzas: PIZZAS,
    coverage: fullCoverage(),
    clock: tickingClock(),
    idSeed: "deterministic",
  });

  assert.deepEqual(first, second);
  assert.equal(snapshot(orders), beforeOrders);
  assert.equal(snapshot(paninoItems), beforePaninoItems);
  assert.equal(snapshot(PIZZAS), beforePizzas);
}

{
  const tasks: (() => void)[] = [];
  const publishedOrderCounts: number[] = [];
  const scheduler = createPizzaioloRuntimeShadowScheduler({
    enqueue: (task) => tasks.push(task),
    run: (params) => {
      const report = runPizzaioloRuntimeShadowComparison({
        ...params,
        paninoItems: [],
        pizzas: PIZZAS,
        coverage: fullCoverage(),
        clock: tickingClock(),
      });
      publishedOrderCounts.push(report.summary?.legacyVisibleOrders ?? -1);
      return report;
    },
  });

  scheduler.schedule({
    orders: [order({ id: "obsolete", items: [pizzaItem({ orderId: "obsolete" })] })],
  });
  scheduler.schedule({
    orders: [
      order({ id: "latest-a", items: [pizzaItem({ id: "latest-a-pizza", orderId: "latest-a" })] }),
      order({ id: "latest-b", items: [pizzaItem({ id: "latest-b-pizza", orderId: "latest-b" })] }),
    ],
  });

  assert.equal(tasks.length, 1);
  tasks[0]?.();
  assert.deepEqual(publishedOrderCounts, [2]);
  assert.equal(getLastPizzaioloRuntimeShadowReport()?.summary?.legacyVisibleOrders, 2);
}
