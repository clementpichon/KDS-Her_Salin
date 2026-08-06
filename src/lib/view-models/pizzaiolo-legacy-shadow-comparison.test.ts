import assert from "node:assert/strict";
import { buildBatchPlan } from "../batch-builder";
import type { Order, OrderItem, PaninoOrderItem, Pizza } from "../kds-types";
import { assembleProductionPlan, buildProductionPlan } from "../production-plan";
import { buildSchedulerPlan } from "../scheduler-core";
import type { WorkUnit } from "../work-units";
import { diagnoseWorkUnits } from "../work-units-diagnostics";
import { buildPizzaioloViewModel } from "./pizzaiolo-view-model";
import {
  buildLegacyPizzaioloSnapshot,
  comparePizzaioloViewModelWithLegacy,
  type LegacyPizzaioloSnapshot,
} from "./pizzaiolo-legacy-shadow-comparison";

const REQUESTED_1930 = "2026-08-03T19:30:00.000Z";
const REQUESTED_1935 = "2026-08-03T19:35:00.000Z";

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
  {
    id: "pizza-fromages",
    name: "Fromages",
    ingredients: ["creme"],
    default_base: "cream",
    image_path: null,
    sort_order: 2,
    active: true,
  },
];

function order({
  id = "order-1",
  customerName = "Michel",
  requestedTime = REQUESTED_1930,
  status = "to_prepare",
  queuePosition = null,
  painsPaninoStatus = null,
  items = [],
}: {
  id?: string;
  customerName?: string;
  requestedTime?: string;
  status?: Order["status"];
  queuePosition?: number | null;
  painsPaninoStatus?: Order["pains_panino_status"];
  items?: readonly OrderItem[];
} = {}): Order {
  return {
    id,
    customer_name: customerName,
    requested_time: requestedTime,
    status,
    pizzaiolo_queue_position: queuePosition,
    prep_start_time: null,
    created_at: "2026-08-03T18:30:00.000Z",
    updated_at: "2026-08-03T18:30:00.000Z",
    cancelled_at: status === "cancelled" ? "2026-08-03T18:45:00.000Z" : null,
    notes: null,
    pains_panino_status: painsPaninoStatus,
    customer_phone_hash: null,
    customer_phone: null,
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
  explicitBase = null,
  baseResolution = "default",
  extras = [],
  removed = [],
  cutInto = null,
  prepared = false,
  productionStatus = "to_prepare",
}: {
  id?: string;
  orderId?: string;
  pizzaId?: string | null;
  name?: string;
  base?: string | null;
  defaultBase?: string | null;
  explicitBase?: string | null;
  baseResolution?: string | null;
  extras?: readonly string[];
  removed?: readonly string[];
  cutInto?: number | null;
  prepared?: boolean;
  productionStatus?: OrderItem["production_status"];
} = {}): OrderItem {
  return {
    id,
    order_id: orderId,
    pizza_id: pizzaId,
    pizza_name: name,
    base,
    default_base_snapshot: defaultBase,
    explicit_base_snapshot: explicitBase,
    base_resolution: baseResolution,
    base_confidence: 1,
    extras: [...extras],
    removed: [...removed],
    prepared,
    production_status: productionStatus,
    oven_batch_id: null,
    sent_to_oven_at: productionStatus === "in_oven" ? "2026-08-03T19:25:00.000Z" : null,
    ready_at: productionStatus === "ready" ? "2026-08-03T19:35:00.000Z" : null,
    cut_into: cutInto,
  };
}

function paninoItem({
  id = "panino-item-1",
  orderId = "order-1",
  productKey = "panino",
  productName = "Pani'NO Burger",
  status = "pending",
}: {
  id?: string;
  orderId?: string;
  productKey?: string;
  productName?: string;
  status?: PaninoOrderItem["status"];
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
    status,
    done_at: status === "done" ? "2026-08-03T19:40:00.000Z" : null,
    created_at: "2026-08-03T18:30:00.000Z",
  };
}

function planFrom({
  orders,
  paninoItems = [],
  idSeed = "pizzaiolo-legacy-shadow-comparison-test",
}: {
  orders: readonly Order[];
  paninoItems?: readonly PaninoOrderItem[];
  idSeed?: string;
}) {
  return buildProductionPlan({ orders, paninoItems, idSeed });
}

function comparisonFrom({
  orders,
  paninoItems = [],
  pizzas = PIZZAS,
}: {
  orders: readonly Order[];
  paninoItems?: readonly PaninoOrderItem[];
  pizzas?: readonly Pizza[];
}) {
  const legacy = buildLegacyPizzaioloSnapshot({ orders, paninoItems, pizzas });
  const viewModel = buildPizzaioloViewModel(planFrom({ orders, paninoItems }));
  return comparePizzaioloViewModelWithLegacy({ legacy, viewModel });
}

function assembleFromWorkUnits({
  orders,
  workUnits,
  paninoItems = [],
}: {
  orders: readonly Order[];
  workUnits: readonly WorkUnit[];
  paninoItems?: readonly PaninoOrderItem[];
}) {
  const basePlan = planFrom({ orders, paninoItems });
  const workUnitDiagnostic = diagnoseWorkUnits({
    productionUnits: basePlan.productionUnits,
    workUnits,
  });
  const schedulerPlan = buildSchedulerPlan({ workUnits });
  const batchPlan = buildBatchPlan({ schedulerPlan });
  return assembleProductionPlan({
    idSeed: "pizzaiolo-legacy-shadow-comparison-artifacts",
    productionUnits: basePlan.productionUnits,
    workUnits,
    workUnitDiagnostic,
    schedulerPlan,
    batchPlan,
  });
}

function issueCodes(snapshot: {
  warnings: readonly { code: string }[];
  blockingDifferences: readonly { code: string }[];
  unsupported: readonly { code: string }[];
}) {
  return [
    ...snapshot.warnings.map((issue) => issue.code),
    ...snapshot.blockingDifferences.map((issue) => issue.code),
    ...snapshot.unsupported.map((issue) => issue.code),
  ];
}

{
  const comparison = comparisonFrom({
    orders: [order({ items: [pizzaItem()] })],
  });

  assert.equal(comparison.summary.isConsistent, true);
  assert.equal(comparison.blockingDifferences.length, 0);
  assert.equal(comparison.warnings.length, 0);
  assert.equal(comparison.summary.legacyVisibleOrders, 1);
  assert.equal(comparison.summary.viewModelVisibleOrders, 1);
  assert.equal(comparison.summary.legacyActionableOrders, 1);
  assert.equal(comparison.summary.viewModelSelectableOrders, 1);
  assert.equal(comparison.summary.legacyActionablePizzas, 1);
  assert.ok(comparison.matches.some((issue) => issue.code === "visible_order_set_matches"));
  assert.ok(comparison.matches.some((issue) => issue.code === "actionable_order_set_matches"));
  assert.ok(comparison.matches.some((issue) => issue.code === "actionable_pizza_order_matches"));
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
  const comparison = comparisonFrom({ orders });

  assert.equal(comparison.blockingDifferences.length, 0);
  assert.ok(comparison.warnings.some((issue) => issue.code === "visible_order_order_differs"));
  assert.ok(comparison.warnings.some((issue) => issue.code === "actionable_order_order_differs"));
  assert.ok(comparison.warnings.some((issue) => issue.code === "actionable_pizza_order_differs"));
}

{
  const orders = [
    order({
      id: "visible-context",
      items: [pizzaItem({ id: "visible-context-pizza", orderId: "visible-context" })],
    }),
  ];
  const baseViewModel = buildPizzaioloViewModel(planFrom({ orders }));
  const legacy: LegacyPizzaioloSnapshot = {
    visibleOrderIds: ["visible-context"],
    actionableOrderIds: [],
    visiblePizzaItemIds: [],
    actionablePizzaItemIds: [],
    jobs: [],
    pizzas: [],
    ambiguousPizzaItemIds: [],
  };
  const viewModel = {
    ...baseViewModel,
    availableWorkUnits: [],
    pizzasReadyToPrepare: [],
    groupedOrders: baseViewModel.groupedOrders.map((group) => ({
      ...group,
      availableWorkUnitIds: [],
      blockedWorkUnitIds: ["blocked-work-unit"],
      completedWorkUnitIds: [],
    })),
    selection: {
      selectableWorkUnitIds: [],
      selectableOrderIds: [],
      hasSelectableWorkUnits: false,
    },
    recommendations: [],
  };
  const comparison = comparePizzaioloViewModelWithLegacy({ legacy, viewModel });

  assert.equal(comparison.blockingDifferences.length, 0);
  assert.ok(comparison.matches.some((issue) => issue.code === "visible_order_set_matches"));
  assert.ok(comparison.matches.some((issue) => issue.code === "actionable_order_set_matches"));
  assert.equal(comparison.summary.legacyVisibleOrders, 1);
  assert.equal(comparison.summary.viewModelVisibleOrders, 1);
  assert.equal(comparison.summary.legacyActionableOrders, 0);
  assert.equal(comparison.summary.viewModelSelectableOrders, 0);
}

{
  const orders = [order({ id: "panino-only", items: [] })];
  const paninoItems = [paninoItem({ id: "panino-only-item", orderId: "panino-only" })];
  const comparison = comparisonFrom({ orders, paninoItems });

  assert.equal(comparison.blockingDifferences.length, 0);
  assert.equal(comparison.summary.legacyVisibleOrders, 1);
  assert.equal(comparison.summary.viewModelVisibleOrders, 1);
  assert.equal(comparison.summary.legacyActionableOrders, 1);
  assert.equal(comparison.summary.viewModelSelectableOrders, 1);
  assert.equal(comparison.summary.legacyVisiblePizzas, 0);
  assert.equal(comparison.summary.legacyActionablePizzas, 0);
  assert.equal(comparison.summary.viewModelActionablePizzas, 0);
  assert.ok(comparison.matches.some((issue) => issue.code === "visible_order_set_matches"));
  assert.ok(comparison.matches.some((issue) => issue.code === "actionable_order_set_matches"));
}

{
  const orders = [
    order({
      id: "grouped-a",
      customerName: "Michel",
      requestedTime: REQUESTED_1930,
      items: [pizzaItem({ id: "grouped-a-pizza", orderId: "grouped-a" })],
    }),
    order({
      id: "grouped-b",
      customerName: "Michel",
      requestedTime: REQUESTED_1930,
      items: [pizzaItem({ id: "grouped-b-pizza", orderId: "grouped-b" })],
    }),
  ];
  const legacy = buildLegacyPizzaioloSnapshot({ orders, paninoItems: [], pizzas: PIZZAS });
  const viewModel = buildPizzaioloViewModel(planFrom({ orders }));
  const comparison = comparePizzaioloViewModelWithLegacy({ legacy, viewModel });

  assert.equal(legacy.jobs.length, 1);
  assert.deepEqual(legacy.jobs[0]?.orderIds, ["grouped-a", "grouped-b"]);
  assert.equal(comparison.blockingDifferences.length, 0);
  assert.equal(comparison.summary.legacyVisibleOrders, 2);
  assert.equal(comparison.summary.viewModelVisibleOrders, 2);
  assert.ok(comparison.matches.some((issue) => issue.code === "visible_order_set_matches"));
}

{
  const orders = [order({ items: [pizzaItem()] })];
  const basePlan = planFrom({ orders });
  const invalidWorkUnits = basePlan.workUnits.map((workUnit) =>
    workUnit.workflowNodeId === "pizza.preparation"
      ? { ...workUnit, status: "available" as const, dependsOn: ["missing-work-unit"] }
      : workUnit,
  );
  const viewModel = buildPizzaioloViewModel(
    assembleFromWorkUnits({ orders, workUnits: invalidWorkUnits }),
  );
  const legacy = buildLegacyPizzaioloSnapshot({ orders, paninoItems: [], pizzas: PIZZAS });
  const comparison = comparePizzaioloViewModelWithLegacy({ legacy, viewModel });

  assert.ok(
    comparison.blockingDifferences.some(
      (issue) => issue.code === "legacy_pizza_missing_in_view_model",
    ),
  );
}

{
  const orders = [order({ items: [pizzaItem()] })];
  const viewModel = buildPizzaioloViewModel(planFrom({ orders }));
  const legacy: LegacyPizzaioloSnapshot = {
    visibleOrderIds: [],
    actionableOrderIds: [],
    visiblePizzaItemIds: [],
    actionablePizzaItemIds: [],
    jobs: [],
    pizzas: [],
    ambiguousPizzaItemIds: [],
  };
  const comparison = comparePizzaioloViewModelWithLegacy({ legacy, viewModel });

  assert.ok(
    comparison.blockingDifferences.some(
      (issue) => issue.code === "view_model_pizza_missing_in_legacy",
    ),
  );
}

{
  const comparison = comparisonFrom({
    orders: [
      order({
        status: "cancelled",
        items: [pizzaItem()],
      }),
    ],
  });

  assert.equal(comparison.summary.isConsistent, true);
  assert.equal(comparison.blockingDifferences.length, 0);
  assert.equal(comparison.summary.legacyVisibleOrders, 0);
}

{
  const comparison = comparisonFrom({
    orders: [
      order({
        status: "delivered",
        items: [pizzaItem()],
      }),
    ],
  });

  assert.equal(comparison.summary.isConsistent, true);
  assert.equal(comparison.blockingDifferences.length, 0);
  assert.equal(comparison.summary.legacyVisiblePizzas, 0);
}

{
  const comparison = comparisonFrom({
    orders: [
      order({
        status: "in_oven",
        items: [pizzaItem({ productionStatus: "in_oven" })],
      }),
    ],
  });

  assert.equal(comparison.summary.isConsistent, true);
  assert.equal(comparison.blockingDifferences.length, 0);
  assert.equal(comparison.summary.legacyVisiblePizzas, 0);
}

{
  const orders = [
    order({
      id: "mixed-order",
      items: [pizzaItem({ id: "mixed-pizza", orderId: "mixed-order" })],
    }),
  ];
  const paninoItems = [paninoItem({ id: "mixed-panino", orderId: "mixed-order" })];
  const comparison = comparisonFrom({ orders, paninoItems });

  assert.equal(comparison.blockingDifferences.length, 0);
  assert.ok(comparison.matches.some((issue) => issue.code === "mixed_order_context_matches"));
}

{
  const comparison = comparisonFrom({
    orders: [
      order({
        items: [
          pizzaItem({
            id: "cream-pizza",
            base: "cream",
            explicitBase: "cream",
            baseResolution: "explicit",
            extras: ["Olives"],
            removed: ["Oignons"],
            cutInto: 6,
          }),
        ],
      }),
    ],
  });

  assert.equal(comparison.blockingDifferences.length, 0);
  assert.equal(issueCodes(comparison).includes("pizza_base_differs"), false);
  assert.equal(issueCodes(comparison).includes("pizza_extras_differs"), false);
  assert.equal(issueCodes(comparison).includes("pizza_removed_differs"), false);
  assert.equal(issueCodes(comparison).includes("pizza_cut_differs"), false);
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
  const comparison = comparisonFrom({ orders, pizzas: [] });

  assert.equal(comparison.blockingDifferences.length, 0);
  assert.ok(comparison.unsupported.some((issue) => issue.code === "legacy_ambiguous_pizza_base"));
  assert.ok(comparison.unsupported.some((issue) => issue.code === "pizza_base_ambiguous"));
  assert.equal(
    comparison.matches.some(
      (issue) => issue.code === "pizza_details_match" && issue.refs.itemId === "ambiguous-pizza",
    ),
    false,
  );
}

{
  const orders = [
    order({
      id: "deterministic",
      items: [pizzaItem({ id: "deterministic-pizza", orderId: "deterministic" })],
    }),
  ];
  const legacy = buildLegacyPizzaioloSnapshot({ orders, paninoItems: [], pizzas: PIZZAS });
  const viewModel = buildPizzaioloViewModel(planFrom({ orders }));

  assert.deepEqual(
    comparePizzaioloViewModelWithLegacy({ legacy, viewModel }),
    comparePizzaioloViewModelWithLegacy({ legacy, viewModel }),
  );
}

{
  const orders = [
    order({
      id: "immutable",
      items: [pizzaItem({ id: "immutable-pizza", orderId: "immutable" })],
    }),
  ];
  const paninoItems = [paninoItem({ id: "immutable-panino", orderId: "immutable" })];
  const plan = planFrom({ orders, paninoItems });
  const viewModel = buildPizzaioloViewModel(plan);
  const beforeOrders = JSON.stringify(orders);
  const beforePaninoItems = JSON.stringify(paninoItems);
  const beforeViewModel = JSON.stringify(viewModel);

  const legacy = buildLegacyPizzaioloSnapshot({ orders, paninoItems, pizzas: PIZZAS });
  comparePizzaioloViewModelWithLegacy({ legacy, viewModel });

  assert.equal(JSON.stringify(orders), beforeOrders);
  assert.equal(JSON.stringify(paninoItems), beforePaninoItems);
  assert.equal(JSON.stringify(viewModel), beforeViewModel);
}
