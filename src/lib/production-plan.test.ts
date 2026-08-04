import assert from "node:assert/strict";
import { buildBatchPlan } from "./batch-builder";
import {
  assembleProductionPlan,
  buildProductionPlan,
  type ProductionPlan,
} from "./production-plan";
import {
  buildProductionUnits,
  type ProductionUnit,
  type ProductionUnitOrderInput,
  type ProductionUnitOrderItemInput,
  type ProductionUnitPaninoItemInput,
} from "./production-units";
import { buildSchedulerPlan } from "./scheduler-core";
import { buildWorkUnits, type WorkUnit, type WorkUnitStatus } from "./work-units";
import { diagnoseWorkUnits } from "./work-units-diagnostics";

const REQUESTED_1930 = "2026-08-03T19:30:00.000Z";

function order({
  id = "order-1",
  customerName = "Michel",
  requestedTime = REQUESTED_1930,
  status = "to_prepare",
  items = [],
}: {
  id?: string;
  customerName?: string | null;
  requestedTime?: string | null;
  status?: ProductionUnitOrderInput["status"];
  items?: readonly ProductionUnitOrderItemInput[];
} = {}): ProductionUnitOrderInput {
  return {
    id,
    customer_name: customerName,
    requested_time: requestedTime,
    status,
    cancelled_at: null,
    items,
  };
}

function pizzaItem({
  id = "pizza-item-1",
  orderId = "order-1",
  name = "Regina",
  productionStatus = "to_prepare",
  includeProductionStatus = true,
  prepared = false,
}: {
  id?: string;
  orderId?: string;
  name?: string;
  productionStatus?: ProductionUnitOrderItemInput["production_status"];
  includeProductionStatus?: boolean;
  prepared?: boolean;
} = {}): ProductionUnitOrderItemInput {
  return {
    id,
    order_id: orderId,
    pizza_id: `pizza-${name.toLowerCase().replaceAll(" ", "-")}`,
    pizza_name: name,
    base: "tomato",
    default_base_snapshot: "tomato",
    explicit_base_snapshot: null,
    base_resolution: "catalog_default",
    base_confidence: 1,
    extras: ["Olives"],
    removed: [],
    prepared,
    ...(includeProductionStatus ? { production_status: productionStatus } : {}),
    oven_batch_id: null,
    sent_to_oven_at: null,
    ready_at: productionStatus === "ready" ? "2026-08-03T19:35:00.000Z" : null,
    cut_into: null,
  };
}

function paninoItem({
  id,
  orderId = "order-1",
  productKey,
  productName,
  status = "pending",
  friesMode = null,
  side = null,
}: {
  id: string;
  orderId?: string;
  productKey: string;
  productName: string;
  status?: ProductionUnitPaninoItemInput["status"];
  friesMode?: string | null;
  side?: string | null;
}): ProductionUnitPaninoItemInput {
  return {
    id,
    order_id: orderId,
    product_key: productKey,
    product_name: productName,
    base: productKey === "panino" ? "Creme" : null,
    fries_mode: friesMode,
    side,
    sauces: ["Burger"],
    removed: [],
    extras: [],
    status,
    done_at: status === "done" ? "2026-08-03T19:45:00.000Z" : null,
    created_at: "2026-08-03T19:00:00.000Z",
  };
}

function planFrom({
  orders,
  paninoItems = [],
}: {
  orders: readonly ProductionUnitOrderInput[];
  paninoItems?: readonly ProductionUnitPaninoItemInput[];
}) {
  return buildProductionPlan({ orders, paninoItems, idSeed: "test" });
}

function stationView(plan: ProductionPlan, station: string) {
  const view = plan.stationViews.find((candidate) => candidate.targetStation === station);
  assert.ok(view, `Missing station view ${station}`);
  return view;
}

function scheduledStationNodes(plan: ProductionPlan) {
  return plan.schedulerPlan.stationPlans.flatMap((stationPlan) =>
    stationPlan.workUnits.map((scheduledWorkUnit) => [
      scheduledWorkUnit.targetStation,
      scheduledWorkUnit.workflowNodeId,
      scheduledWorkUnit.productionUnitId,
    ]),
  );
}

function ovenReadyOrder({
  id,
  pizzaCount,
}: {
  id: string;
  pizzaCount: number;
}): ProductionUnitOrderInput {
  return order({
    id,
    items: Array.from({ length: pizzaCount }, (_, index) =>
      pizzaItem({
        id: `${id}-pizza-${index + 1}`,
        orderId: id,
        includeProductionStatus: false,
        prepared: true,
      }),
    ),
  });
}

function buildArtifacts({
  productionUnits,
  workUnits,
}: {
  productionUnits: readonly ProductionUnit[];
  workUnits: readonly WorkUnit[];
}) {
  const workUnitDiagnostic = diagnoseWorkUnits({ productionUnits, workUnits });
  const schedulerPlan = buildSchedulerPlan({ workUnits });
  const batchPlan = buildBatchPlan({ schedulerPlan });

  return assembleProductionPlan({
    idSeed: "artifacts",
    productionUnits,
    workUnits,
    workUnitDiagnostic,
    schedulerPlan,
    batchPlan,
  });
}

function withNodeStatuses(
  workUnits: readonly WorkUnit[],
  statusByNode: Readonly<Record<string, WorkUnitStatus>>,
) {
  return workUnits.map((workUnit) => {
    const status = statusByNode[workUnit.workflowNodeId];
    return status ? { ...workUnit, status } : workUnit;
  });
}

function flattenPhysicalBatchWorkUnitIds(plan: ProductionPlan) {
  return plan.batchPlan.batches.flatMap((batch) => batch.workUnitIds);
}

function assertNoScheduledWorkUnitLostOrDuplicated(plan: ProductionPlan) {
  const scheduledIds = plan.schedulerPlan.scheduledWorkUnitIds;
  const batchedIds = plan.batchPlan.batchedWorkUnitIds;
  const physicalBatchIds = flattenPhysicalBatchWorkUnitIds(plan);

  assert.deepEqual(batchedIds, scheduledIds);
  assert.equal(new Set(batchedIds).size, batchedIds.length);
  assert.deepEqual([...physicalBatchIds].sort(), [...scheduledIds].sort());
}

{
  const plan = planFrom({
    orders: [order({ items: [pizzaItem()] })],
  });

  assert.equal(plan.isUsable, true);
  assert.equal(plan.counters.productionUnitCount, 1);
  assert.equal(plan.counters.workUnitCount, 3);
  assert.equal(plan.counters.scheduledWorkUnitCount, 1);
  assert.deepEqual(scheduledStationNodes(plan), [
    ["pizzaiolo", "pizza.preparation", "order_items:pizza-item-1"],
  ]);
  assert.deepEqual(stationView(plan, "pizzaiolo").scheduledWorkUnitIds, [
    "work_unit:order_items:pizza-item-1:pizza.preparation",
  ]);
}

{
  const plan = planFrom({
    orders: [
      order({
        id: "mixed-order",
        items: [pizzaItem({ id: "mixed-pizza", orderId: "mixed-order" })],
      }),
    ],
    paninoItems: [
      paninoItem({
        id: "mixed-panino",
        orderId: "mixed-order",
        productKey: "panino",
        productName: "Pani'NO Burger",
      }),
    ],
  });

  assert.equal(plan.isUsable, true);
  assert.equal(plan.counters.productionUnitsByKind.pizza, 1);
  assert.equal(plan.counters.productionUnitsByKind.panino, 1);
  assert.deepEqual(scheduledStationNodes(plan), [
    ["pizzaiolo", "pizza.preparation", "order_items:mixed-pizza"],
    ["pizzaiolo", "panino.bread", "panino_order_items:mixed-panino"],
    ["panino", "panino.filling", "panino_order_items:mixed-panino"],
  ]);
  assert.equal(stationView(plan, "pizzaiolo").scheduledWorkUnitCount, 2);
  assert.equal(stationView(plan, "panino").scheduledWorkUnitCount, 1);
}

{
  const plan = planFrom({
    orders: [order()],
    paninoItems: [
      paninoItem({
        id: "fish-no-1",
        productKey: "fishno",
        productName: "Fish & NO",
        side: "Pommes grenailles",
      }),
    ],
  });

  assert.equal(plan.isUsable, true);
  assert.equal(plan.counters.productionUnitsByKind.fish_no, 1);
  assert.deepEqual(scheduledStationNodes(plan), [
    ["fish_fryer", "fish_no.fish_cooking", "panino_order_items:fish-no-1"],
    ["fries_fryer", "fish_no.side_cooking", "panino_order_items:fish-no-1"],
  ]);
  assert.equal(stationView(plan, "fish_fryer").scheduledWorkUnitCount, 1);
  assert.equal(stationView(plan, "fries_fryer").scheduledWorkUnitCount, 1);
}

{
  const plan = planFrom({
    orders: [
      order({
        id: "order-a",
        items: [pizzaItem({ id: "pizza-a", orderId: "order-a" })],
      }),
      order({
        id: "order-b",
        requestedTime: "2026-08-03T19:45:00.000Z",
        items: [pizzaItem({ id: "pizza-b", orderId: "order-b" })],
      }),
    ],
    paninoItems: [
      paninoItem({
        id: "fries-1",
        orderId: "order-b",
        productKey: "cornet_frites",
        productName: "Cornet de frites",
      }),
    ],
  });

  assert.equal(plan.isUsable, true);
  assert.equal(plan.counters.productionUnitCount, 3);
  assert.equal(plan.counters.workUnitCount, 8);
  assert.equal(plan.counters.scheduledWorkUnitCount, 3);
  assertNoScheduledWorkUnitLostOrDuplicated(plan);
}

{
  const [productionUnit] = buildProductionUnits({
    orders: [order({ items: [pizzaItem()] })],
  });
  const workUnits = buildWorkUnits({ productionUnits: [productionUnit] });
  const plan = buildArtifacts({
    productionUnits: [productionUnit],
    workUnits: [...workUnits, { ...workUnits[0] }],
  });

  assert.equal(plan.isUsable, false);
  assert.equal(
    plan.blockingIssues.some((issue) => issue.type === "duplicate_work_unit_id"),
    true,
  );
  assert.equal(plan.counters.blockingIssueCount > 0, true);
}

{
  const [productionUnit] = buildProductionUnits({
    orders: [order({ items: [pizzaItem()] })],
  });
  const workUnits = buildWorkUnits({ productionUnits: [productionUnit] })
    .filter((workUnit) => workUnit.workflowNodeId !== "pizza.preparation")
    .map((workUnit) =>
      workUnit.workflowNodeId === "pizza.cooking"
        ? { ...workUnit, status: "available" as const, dependsOn: ["missing-preparation"] }
        : workUnit,
    );
  const plan = buildArtifacts({ productionUnits: [productionUnit], workUnits });

  assert.equal(plan.isUsable, false);
  assert.deepEqual(
    plan.blockingIssues
      .filter((issue) => issue.type === "missing_dependency")
      .map((issue) => ({
        workUnitId: issue.refs.workUnitId,
        missingDependencyId: issue.refs.missingDependencyId,
      })),
    [
      {
        workUnitId: "work_unit:order_items:pizza-item-1:pizza.cooking",
        missingDependencyId: "missing-preparation",
      },
    ],
  );
  assert.deepEqual(plan.schedulerPlan.scheduledWorkUnitIds, []);
}

{
  const plan = planFrom({
    orders: [order()],
    paninoItems: [
      paninoItem({
        id: "dessert-1",
        productKey: "dessert",
        productName: "Tiramisu",
      }),
    ],
  });

  assert.equal(plan.counters.productionUnitsByKind.other, 1);
  assert.equal(plan.counters.workUnitCount, 0);
  assert.equal(plan.isUsable, false);
  assert.equal(
    plan.blockingIssues.some((issue) => issue.type === "production_unit_without_work_unit"),
    true,
  );
}

{
  const plan = planFrom({
    orders: [ovenReadyOrder({ id: "oven-order", pizzaCount: 5 })],
  });

  assert.equal(plan.isUsable, true);
  assert.deepEqual(plan.batchPlan.batchIds, [
    "batch:four:pizza_oven:work_unit:order_items:oven-order-pizza-1:pizza.cooking",
    "batch:four:pizza_oven:work_unit:order_items:oven-order-pizza-5:pizza.cooking",
  ]);
  assert.deepEqual(
    plan.batchPlan.batches.map((batch) => [
      batch.batchType,
      batch.workUnitIds.length,
      batch.isFull,
    ]),
    [
      ["pizza_oven", 4, true],
      ["pizza_oven", 1, false],
    ],
  );
  assertNoScheduledWorkUnitLostOrDuplicated(plan);
}

{
  const plan = planFrom({
    orders: [
      order({
        id: "timeline-a",
        requestedTime: "2026-08-03T19:30:00.000Z",
        items: [
          pizzaItem({
            id: "timeline-pizza-a",
            orderId: "timeline-a",
            includeProductionStatus: false,
            prepared: true,
          }),
        ],
      }),
      order({
        id: "timeline-b",
        requestedTime: "2026-08-03T19:35:00.000Z",
        items: [
          pizzaItem({
            id: "timeline-pizza-b",
            orderId: "timeline-b",
            includeProductionStatus: false,
            prepared: true,
          }),
        ],
      }),
    ],
    paninoItems: [
      paninoItem({
        id: "timeline-panino",
        orderId: "timeline-a",
        productKey: "panino",
        productName: "Pani'NO Burger",
      }),
    ],
  });

  assert.deepEqual(plan.batchPlan.batchedWorkUnitIds, plan.schedulerPlan.scheduledWorkUnitIds);
  assert.deepEqual(plan.schedulerPlan.scheduledWorkUnitIds, [
    "work_unit:panino_order_items:timeline-panino:panino.bread",
    "work_unit:order_items:timeline-pizza-a:pizza.cooking",
    "work_unit:panino_order_items:timeline-panino:panino.filling",
    "work_unit:order_items:timeline-pizza-b:pizza.cooking",
  ]);
}

{
  const plan = planFrom({
    orders: [ovenReadyOrder({ id: "station-order", pizzaCount: 4 })],
    paninoItems: [
      paninoItem({
        id: "station-panino",
        orderId: "station-order",
        productKey: "panino",
        productName: "Pani'NO Burger",
      }),
    ],
  });

  assert.equal(stationView(plan, "four").batchCount, 1);
  assert.equal(stationView(plan, "four").scheduledWorkUnitCount, 4);
  assert.equal(stationView(plan, "pizzaiolo").scheduledWorkUnitCount, 1);
  assert.equal(stationView(plan, "panino").scheduledWorkUnitCount, 1);
  assert.deepEqual(stationView(plan, "handover").scheduledWorkUnitIds, []);
}

{
  const params = {
    orders: [
      order({
        id: "same-input-order",
        items: [pizzaItem({ id: "same-input-pizza", orderId: "same-input-order" })],
      }),
    ],
    paninoItems: [
      paninoItem({
        id: "same-input-panino",
        orderId: "same-input-order",
        productKey: "panino",
        productName: "Pani'NO Burger",
      }),
    ],
    idSeed: "same-input",
  };

  assert.deepEqual(buildProductionPlan(params), buildProductionPlan(params));
}

{
  const orders = [
    order({
      id: "mutation-order",
      items: [pizzaItem({ id: "mutation-pizza", orderId: "mutation-order" })],
    }),
  ];
  const paninoItems = [
    paninoItem({
      id: "mutation-panino",
      orderId: "mutation-order",
      productKey: "panino",
      productName: "Pani'NO Burger",
    }),
  ];
  const ordersBefore = JSON.stringify(orders);
  const paninoItemsBefore = JSON.stringify(paninoItems);
  const productionUnits = buildProductionUnits({ orders, paninoItems });
  const productionUnitsBefore = JSON.stringify(productionUnits);
  const workUnits = buildWorkUnits({ productionUnits });
  const workUnitsBefore = JSON.stringify(workUnits);
  const plan = buildArtifacts({ productionUnits, workUnits });

  (plan.productionUnits[0].pizza?.extras as string[] | undefined)?.push("Mutated");
  (plan.workUnits[0].dependsOn as string[]).push("mutated-work-unit");
  (plan.schedulerPlan.stationPlans[0].workUnits[0].workUnit.dependsOn as string[]).push(
    "mutated-scheduler",
  );
  (plan.batchPlan.batches[0].workUnits[0].workUnit.dependsOn as string[]).push("mutated-batch");

  assert.equal(JSON.stringify(orders), ordersBefore);
  assert.equal(JSON.stringify(paninoItems), paninoItemsBefore);
  assert.equal(JSON.stringify(productionUnits), productionUnitsBefore);
  assert.equal(JSON.stringify(workUnits), workUnitsBefore);
}

{
  const [productionUnit] = buildProductionUnits({
    orders: [order({ items: [pizzaItem({ id: "completed-pizza", productionStatus: "ready" })] })],
  });
  const completedWorkUnits = withNodeStatuses(
    buildWorkUnits({ productionUnits: [productionUnit] }),
    {
      "pizza.preparation": "completed",
      "pizza.cooking": "completed",
      "pizza.packaging": "completed",
    },
  );
  const schedulerPlan = buildSchedulerPlan({ workUnits: completedWorkUnits });
  const batchPlan = buildBatchPlan({ schedulerPlan });
  const corruptedBatchPlan = {
    ...batchPlan,
    batchedWorkUnitIds: ["ghost-work-unit"],
  };
  const diagnostic = diagnoseWorkUnits({
    productionUnits: [productionUnit],
    workUnits: completedWorkUnits,
  });
  const plan = assembleProductionPlan({
    idSeed: "corrupted-batch",
    productionUnits: [productionUnit],
    workUnits: completedWorkUnits,
    workUnitDiagnostic: diagnostic,
    schedulerPlan,
    batchPlan: corruptedBatchPlan,
  });

  assert.equal(plan.isUsable, false);
  assert.equal(
    plan.blockingIssues.some((issue) => issue.type === "batch_work_unit_order_mismatch"),
    true,
  );
}
