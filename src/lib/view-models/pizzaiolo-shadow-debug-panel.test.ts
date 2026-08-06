import assert from "node:assert/strict";
import type { Order, OrderItem, PaninoOrderItem, Pizza } from "../kds-types";
import { buildProductionPlan } from "../production-plan";
import type { ShadowProductionClock } from "../shadow-production";
import {
  buildPizzaioloShadowDebugPanelView,
  shouldRenderPizzaioloShadowDebugPanel,
} from "./pizzaiolo-shadow-debug-panel";
import {
  getLastPizzaioloRuntimeShadowReport,
  runPizzaioloRuntimeShadowComparison,
  subscribeToPizzaioloRuntimeShadowReports,
  type PizzaioloRuntimeShadowReport,
} from "./pizzaiolo-runtime-shadow";
import type {
  PizzaioloLegacyShadowComparison,
  PizzaioloLegacyShadowIssue,
  PizzaioloLegacyShadowSummary,
} from "./pizzaiolo-legacy-shadow-comparison";

const REQUESTED_1930 = "2026-08-06T19:30:00.000Z";

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
  items = [],
}: {
  id?: string;
  customerName?: string;
  items?: readonly OrderItem[];
} = {}): Order {
  return {
    id,
    customer_name: customerName,
    requested_time: REQUESTED_1930,
    status: "to_prepare",
    pizzaiolo_queue_position: null,
    prep_start_time: null,
    created_at: "2026-08-06T18:30:00.000Z",
    updated_at: "2026-08-06T18:30:00.000Z",
    cancelled_at: null,
    notes: "note confidentielle",
    pains_panino_status: null,
    customer_phone_hash: "hash-secret",
    customer_phone: "0600000000",
    items: [...items],
  };
}

function pizzaItem({
  id = "pizza-item-1",
  orderId = "order-1",
}: {
  id?: string;
  orderId?: string;
} = {}): OrderItem {
  return {
    id,
    order_id: orderId,
    pizza_id: "pizza-regina",
    pizza_name: "Regina",
    base: "tomato",
    default_base_snapshot: "tomato",
    explicit_base_snapshot: null,
    base_resolution: "default",
    base_confidence: 1,
    extras: [],
    removed: [],
    prepared: false,
    production_status: "to_prepare",
    oven_batch_id: null,
    sent_to_oven_at: null,
    ready_at: null,
    cut_into: null,
  };
}

function paninoItem(): PaninoOrderItem {
  return {
    id: "panino-item-1",
    order_id: "order-1",
    product_key: "panino",
    product_name: "Pani'NO Burger",
    base: "Creme",
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
    matches: [],
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

function reportWithDiagnostics(): PizzaioloRuntimeShadowReport {
  return runPizzaioloRuntimeShadowComparison({
    orders: [order({ items: [pizzaItem()] })],
    paninoItems: [paninoItem()],
    pizzas: PIZZAS,
    coverage: fullCoverage(),
    clock: tickingClock(),
    dependencies: {
      comparePizzaioloViewModelWithLegacy: () =>
        comparisonFixture({
          warnings: [issue("warning", "fixture_warning")],
          blockingDifferences: [issue("blocking_difference", "fixture_blocking")],
          unsupported: [issue("unsupported", "fixture_unsupported")],
        }),
    },
  });
}

{
  assert.equal(shouldRenderPizzaioloShadowDebugPanel(false), false);
  assert.equal(buildPizzaioloShadowDebugPanelView({ debugEnabled: false, report: null }), null);
}

{
  const view = buildPizzaioloShadowDebugPanelView({ debugEnabled: true, report: null });

  assert.ok(view);
  assert.equal(view.title, "Shadow Pizzaiolo");
  assert.equal(view.badge, "DEBUG");
  assert.deepEqual(view.diagnosticCodes, []);
  assert.equal(view.rows.find((row) => row.label === "Status")?.value, "waiting");
}

{
  const report = runPizzaioloRuntimeShadowComparison({
    orders: [order({ customerName: "Michel Secret", items: [pizzaItem()] })],
    paninoItems: [paninoItem()],
    pizzas: PIZZAS,
    coverage: fullCoverage(),
    clock: tickingClock(),
  });
  const view = buildPizzaioloShadowDebugPanelView({ debugEnabled: true, report });

  assert.ok(view);
  assert.equal(view.rows.find((row) => row.label === "Status")?.value, "success");
  assert.equal(view.rows.find((row) => row.label === "Plan usable")?.value, "yes");
  assert.equal(view.rows.find((row) => row.label === "Legacy visible orders")?.value, "1");
  assert.equal(view.rows.find((row) => row.label === "Duration")?.value, `${report.durationMs} ms`);
  assert.deepEqual(view.diagnosticCodes, []);

  const serializedView = JSON.stringify(view);
  assert.doesNotMatch(serializedView, /Michel Secret/);
  assert.doesNotMatch(serializedView, /0600000000/);
  assert.doesNotMatch(serializedView, /note confidentielle/);
  assert.doesNotMatch(serializedView, /hash-secret/);
}

{
  const report = reportWithDiagnostics();
  const view = buildPizzaioloShadowDebugPanelView({ debugEnabled: true, report });

  assert.ok(view);
  assert.deepEqual(view.diagnosticCodes, [
    "fixture_warning",
    "fixture_blocking",
    "fixture_unsupported",
  ]);
}

{
  const reports: PizzaioloRuntimeShadowReport[] = [];
  const unsubscribe = subscribeToPizzaioloRuntimeShadowReports((report) => reports.push(report));

  runPizzaioloRuntimeShadowComparison({
    orders: [order({ id: "first", items: [pizzaItem({ orderId: "first" })] })],
    paninoItems: [paninoItem()],
    pizzas: PIZZAS,
    coverage: fullCoverage(),
    clock: tickingClock(),
    idSeed: "first",
  });
  runPizzaioloRuntimeShadowComparison({
    orders: [
      order({ id: "second-a", items: [pizzaItem({ id: "second-a-pizza", orderId: "second-a" })] }),
      order({ id: "second-b", items: [pizzaItem({ id: "second-b-pizza", orderId: "second-b" })] }),
    ],
    paninoItems: [paninoItem()],
    pizzas: PIZZAS,
    coverage: fullCoverage(),
    clock: tickingClock(),
    idSeed: "second",
  });

  unsubscribe();

  assert.equal(reports.length, 2);
  assert.equal(reports[1]?.summary?.legacyVisibleOrders, 2);
  assert.equal(getLastPizzaioloRuntimeShadowReport()?.summary?.legacyVisibleOrders, 2);
}

{
  let productionPlanCalls = 0;
  const report = runPizzaioloRuntimeShadowComparison({
    orders: [order({ items: [pizzaItem()] })],
    paninoItems: [paninoItem()],
    pizzas: PIZZAS,
    coverage: fullCoverage(),
    clock: tickingClock(),
    dependencies: {
      buildProductionPlan: (params) => {
        productionPlanCalls += 1;
        return buildProductionPlan(params);
      },
    },
  });

  buildPizzaioloShadowDebugPanelView({ debugEnabled: true, report });
  buildPizzaioloShadowDebugPanelView({
    debugEnabled: true,
    report: getLastPizzaioloRuntimeShadowReport(),
  });

  assert.equal(productionPlanCalls, 1);
}
