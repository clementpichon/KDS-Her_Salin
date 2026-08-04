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
  id,
  customerName = "Michel",
  requestedTime = REQUESTED_1930,
  status = "to_prepare",
  items = [],
}: {
  id: string;
  customerName?: string | null;
  requestedTime?: string | null;
  status?: ProductionUnitOrderInput["status"];
  items?: readonly ProductionUnitOrderItemInput[];
}): ProductionUnitOrderInput {
  return {
    id,
    customer_name: customerName,
    requested_time: requestedTime,
    status,
    cancelled_at: status === "cancelled" ? "2026-08-03T19:00:00.000Z" : null,
    items,
  };
}

function pizzaItem({
  id,
  orderId,
  name = "Regina",
  preparedForOven = false,
  productionStatus = "to_prepare",
}: {
  id: string;
  orderId: string;
  name?: string;
  preparedForOven?: boolean;
  productionStatus?: ProductionUnitOrderItemInput["production_status"];
}): ProductionUnitOrderItemInput {
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
    extras: [],
    removed: [],
    prepared: preparedForOven,
    ...(preparedForOven ? {} : { production_status: productionStatus }),
    oven_batch_id: null,
    sent_to_oven_at: null,
    ready_at: productionStatus === "ready" ? "2026-08-03T19:45:00.000Z" : null,
    cut_into: null,
  };
}

function paninoItem({
  id,
  orderId,
  productKey,
  productName,
  side = null,
  friesMode = null,
  status = "pending",
}: {
  id: string;
  orderId: string;
  productKey: string;
  productName: string;
  side?: string | null;
  friesMode?: string | null;
  status?: ProductionUnitPaninoItemInput["status"];
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

function ovenReadyPizzaItems({ orderId, names }: { orderId: string; names: readonly string[] }) {
  return names.map((name, index) =>
    pizzaItem({
      id: `${orderId}-${String(index + 1).padStart(2, "0")}-${slug(name)}`,
      orderId,
      name,
      preparedForOven: true,
    }),
  );
}

function planFrom({
  orders,
  paninoItems = [],
  idSeed = "business",
}: {
  orders: readonly ProductionUnitOrderInput[];
  paninoItems?: readonly ProductionUnitPaninoItemInput[];
  idSeed?: string;
}) {
  return buildProductionPlan({ orders, paninoItems, idSeed });
}

function assembleFromArtifacts({
  productionUnits,
  workUnits,
  idSeed = "business-artifacts",
}: {
  productionUnits: readonly ProductionUnit[];
  workUnits: readonly WorkUnit[];
  idSeed?: string;
}) {
  const workUnitDiagnostic = diagnoseWorkUnits({ productionUnits, workUnits });
  const schedulerPlan = buildSchedulerPlan({ workUnits });
  const batchPlan = buildBatchPlan({ schedulerPlan });

  return assembleProductionPlan({
    idSeed,
    productionUnits,
    workUnits,
    workUnitDiagnostic,
    schedulerPlan,
    batchPlan,
  });
}

function stationView(plan: ProductionPlan, targetStation: string) {
  const view = plan.stationViews.find((candidate) => candidate.targetStation === targetStation);
  assert.ok(view, `Missing station view ${targetStation}`);
  return view;
}

function workUnitsFor(plan: ProductionPlan, productionUnitId: string) {
  return plan.workUnits.filter((workUnit) => workUnit.productionUnitId === productionUnitId);
}

function workflowNodesFor(plan: ProductionPlan, productionUnitId: string) {
  return workUnitsFor(plan, productionUnitId).map((workUnit) => workUnit.workflowNodeId);
}

function workUnitByNode(plan: ProductionPlan, productionUnitId: string, workflowNodeId: string) {
  const workUnit = workUnitsFor(plan, productionUnitId).find(
    (candidate) => candidate.workflowNodeId === workflowNodeId,
  );
  assert.ok(workUnit, `Missing ${workflowNodeId} for ${productionUnitId}`);
  return workUnit;
}

function pizzaOvenBatches(plan: ProductionPlan) {
  return plan.batchPlan.batches.filter((batch) => batch.batchType === "pizza_oven");
}

function pizzaOvenBatchNames(plan: ProductionPlan) {
  return pizzaOvenBatches(plan).map((batch) =>
    batch.workUnits.map((scheduledWorkUnit) => scheduledWorkUnit.workUnit.productName),
  );
}

function assertUsablePlanInvariants(plan: ProductionPlan) {
  assert.equal(plan.isUsable, true, JSON.stringify(plan.blockingIssues, null, 2));
  assert.equal(plan.workUnitDiagnostic.isConsistent, true);
  assert.equal(plan.blockingIssues.length, 0);
  assertNoDuplicateWorkUnits(plan);
  assertEveryDependencyExists(plan);
  assertScheduledDependenciesAreCompleted(plan);
  assertNoScheduledWorkUnitLostOrDuplicated(plan);
  assertNoWorkUnitAppearsInMultipleBatches(plan);
  assertNoPizzaAppearsInMultipleOvenBatches(plan);
  assertPizzaOvenCapacity(plan);
  assertStationViewsOnlyContainTheirStation(plan);
}

function assertNoDuplicateWorkUnits(plan: ProductionPlan) {
  const ids = plan.workUnits.map((workUnit) => workUnit.id);
  assert.equal(new Set(ids).size, ids.length);
}

function assertEveryDependencyExists(plan: ProductionPlan) {
  const ids = new Set(plan.workUnits.map((workUnit) => workUnit.id));

  for (const workUnit of plan.workUnits) {
    for (const dependencyId of workUnit.dependsOn) {
      assert.equal(ids.has(dependencyId), true, `${workUnit.id} depends on ${dependencyId}`);
    }
  }
}

function assertScheduledDependenciesAreCompleted(plan: ProductionPlan) {
  const workUnitsById = new Map(plan.workUnits.map((workUnit) => [workUnit.id, workUnit]));

  for (const stationPlan of plan.schedulerPlan.stationPlans) {
    for (const scheduledWorkUnit of stationPlan.workUnits) {
      for (const dependencyId of scheduledWorkUnit.workUnit.dependsOn) {
        assert.equal(
          workUnitsById.get(dependencyId)?.status,
          "completed",
          `${scheduledWorkUnit.workUnitId} was scheduled before ${dependencyId}`,
        );
      }
    }
  }
}

function assertNoScheduledWorkUnitLostOrDuplicated(plan: ProductionPlan) {
  const scheduledIds = [...plan.schedulerPlan.scheduledWorkUnitIds];
  const batchedIds = [...plan.batchPlan.batchedWorkUnitIds];
  const physicalBatchIds = plan.batchPlan.batches.flatMap((batch) => batch.workUnitIds);

  assert.deepEqual(batchedIds, scheduledIds);
  assert.equal(new Set(batchedIds).size, batchedIds.length);
  assert.equal(new Set(physicalBatchIds).size, physicalBatchIds.length);
  assert.deepEqual([...physicalBatchIds].sort(), [...scheduledIds].sort());
}

function assertNoWorkUnitAppearsInMultipleBatches(plan: ProductionPlan) {
  const workUnitIds = plan.batchPlan.batches.flatMap((batch) => batch.workUnitIds);
  assert.equal(new Set(workUnitIds).size, workUnitIds.length);
}

function assertNoPizzaAppearsInMultipleOvenBatches(plan: ProductionPlan) {
  const pizzaWorkUnitIds = pizzaOvenBatches(plan).flatMap((batch) => batch.workUnitIds);
  assert.equal(new Set(pizzaWorkUnitIds).size, pizzaWorkUnitIds.length);
}

function assertPizzaOvenCapacity(plan: ProductionPlan) {
  for (const batch of pizzaOvenBatches(plan)) {
    assert.equal(batch.targetStation, "four");
    assert.equal(batch.capacity, 4);
    assert.equal(batch.workUnitIds.length <= 4, true);
  }
}

function assertStationViewsOnlyContainTheirStation(plan: ProductionPlan) {
  const scheduledWorkUnitsById = new Map(
    plan.schedulerPlan.stationPlans.flatMap((stationPlan) =>
      stationPlan.workUnits.map((workUnit) => [workUnit.workUnitId, workUnit]),
    ),
  );
  const batchesById = new Map(plan.batchPlan.batches.map((batch) => [batch.id, batch]));

  for (const view of plan.stationViews) {
    for (const workUnitId of view.scheduledWorkUnitIds) {
      assert.equal(scheduledWorkUnitsById.get(workUnitId)?.targetStation, view.targetStation);
    }
    for (const batchId of view.batchIds) {
      assert.equal(batchesById.get(batchId)?.targetStation, view.targetStation);
    }
  }
}

function assertNoActiveCharge(plan: ProductionPlan) {
  assert.equal(plan.schedulerPlan.scheduledWorkUnitCount, 0);
  assert.equal(plan.batchPlan.batchCount, 0);
  assert.deepEqual(plan.batchPlan.batchedWorkUnitIds, []);
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

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

{
  const orderId = "four-pizza-order";
  const plan = planFrom({
    orders: [
      order({
        id: orderId,
        items: ovenReadyPizzaItems({
          orderId,
          names: ["Regina", "Regina", "Margherita", "Margherita"],
        }),
      }),
    ],
  });

  assertUsablePlanInvariants(plan);
  assert.equal(plan.counters.productionUnitCount, 4);
  assert.equal(plan.counters.workUnitCount, 12);
  assert.equal(plan.counters.scheduledWorkUnitCount, 4);
  assert.equal(plan.counters.batchesByType.pizza_oven, 1);
  assert.deepEqual(pizzaOvenBatchNames(plan), [["Regina", "Regina", "Margherita", "Margherita"]]);
}

{
  const orderA = "shared-batch-a";
  const orderB = "shared-batch-b";
  const plan = planFrom({
    orders: [
      order({
        id: orderA,
        items: ovenReadyPizzaItems({ orderId: orderA, names: ["Regina", "Regina"] }),
      }),
      order({
        id: orderB,
        items: ovenReadyPizzaItems({ orderId: orderB, names: ["Margherita", "Margherita"] }),
      }),
    ],
  });

  assertUsablePlanInvariants(plan);
  assert.deepEqual(pizzaOvenBatchNames(plan), [["Regina", "Regina", "Margherita", "Margherita"]]);
  assert.deepEqual(plan.batchPlan.batchedWorkUnitIds, plan.schedulerPlan.scheduledWorkUnitIds);
}

{
  const orderId = "six-pizza-order";
  const plan = planFrom({
    orders: [
      order({
        id: orderId,
        items: ovenReadyPizzaItems({
          orderId,
          names: ["Regina", "Regina", "Margherita", "Margherita", "Piccante", "Piccante"],
        }),
      }),
    ],
  });

  assertUsablePlanInvariants(plan);
  assert.deepEqual(
    pizzaOvenBatches(plan).map((batch) => batch.workUnitIds.length),
    [4, 2],
  );
  assert.deepEqual(pizzaOvenBatchNames(plan), [
    ["Regina", "Regina", "Margherita", "Margherita"],
    ["Piccante", "Piccante"],
  ]);
}

{
  const orderA = "documented-a";
  const orderB = "documented-b";
  const plan = planFrom({
    orders: [
      order({
        id: orderA,
        items: ovenReadyPizzaItems({
          orderId: orderA,
          names: ["Regina", "Regina", "Margherita", "Margherita", "Fromages", "Fromages"],
        }),
      }),
      order({
        id: orderB,
        items: ovenReadyPizzaItems({ orderId: orderB, names: ["Chevre miel", "Piccante"] }),
      }),
    ],
  });

  assertUsablePlanInvariants(plan);
  assert.deepEqual(pizzaOvenBatchNames(plan), [
    ["Regina", "Regina", "Margherita", "Margherita"],
    ["Fromages", "Fromages", "Chevre miel", "Piccante"],
  ]);
}

{
  const orderId = "mixed-real-order";
  const plan = planFrom({
    orders: [
      order({
        id: orderId,
        items: ovenReadyPizzaItems({ orderId, names: ["Regina"] }),
      }),
    ],
    paninoItems: [
      paninoItem({
        id: "mixed-panino",
        orderId,
        productKey: "panino",
        productName: "Pani'NO Burger",
        friesMode: "Dans le Pani'NO",
      }),
      paninoItem({
        id: "mixed-fish",
        orderId,
        productKey: "fishno",
        productName: "Fish & NO",
        side: "Pommes grenailles",
      }),
      paninoItem({
        id: "mixed-fries",
        orderId,
        productKey: "cornet_frites",
        productName: "Cornet de frites",
      }),
    ],
  });
  const paninoUnitId = "panino_order_items:mixed-panino";
  const fishUnitId = "panino_order_items:mixed-fish";

  assertUsablePlanInvariants(plan);
  assert.equal(stationView(plan, "pizzaiolo").scheduledWorkUnitCount, 1);
  assert.equal(stationView(plan, "four").scheduledWorkUnitCount, 1);
  assert.equal(stationView(plan, "panino").scheduledWorkUnitCount, 1);
  assert.equal(stationView(plan, "fish_fryer").scheduledWorkUnitCount, 1);
  assert.equal(stationView(plan, "fries_fryer").scheduledWorkUnitCount, 2);
  assert.deepEqual(workUnitByNode(plan, paninoUnitId, "panino.assembly").dependsOn, [
    "work_unit:panino_order_items:mixed-panino:panino.bread",
    "work_unit:panino_order_items:mixed-panino:panino.filling",
  ]);
  assert.deepEqual(workUnitByNode(plan, fishUnitId, "fish_no.assembly").dependsOn, [
    "work_unit:panino_order_items:mixed-fish:fish_no.fish_cooking",
    "work_unit:panino_order_items:mixed-fish:fish_no.side_cooking",
  ]);
  assert.deepEqual(
    pizzaOvenBatches(plan).flatMap((batch) =>
      batch.workUnits.map((scheduledWorkUnit) => scheduledWorkUnit.workflowNodeId),
    ),
    ["pizza.cooking"],
  );
}

{
  const noPostOrder = "no-post";
  const shortPostOrder = "short-post";
  const longPostOrder = "long-post";
  const plan = planFrom({
    orders: [
      order({
        id: noPostOrder,
        items: [pizzaItem({ id: "no-post-regina", orderId: noPostOrder, name: "Regina" })],
      }),
      order({
        id: shortPostOrder,
        items: [
          pizzaItem({ id: "short-post-fromages", orderId: shortPostOrder, name: "Fromages" }),
        ],
      }),
      order({
        id: longPostOrder,
        items: [pizzaItem({ id: "long-post-chevre", orderId: longPostOrder, name: "Chevre miel" })],
      }),
    ],
  });

  assertUsablePlanInvariants(plan);
  assert.deepEqual(workflowNodesFor(plan, "order_items:no-post-regina"), [
    "pizza.preparation",
    "pizza.cooking",
    "pizza.packaging",
  ]);
  assert.deepEqual(workflowNodesFor(plan, "order_items:short-post-fromages"), [
    "pizza.preparation",
    "pizza.cooking",
    "pizza.finishing",
    "pizza.packaging",
  ]);
  assert.deepEqual(workflowNodesFor(plan, "order_items:long-post-chevre"), [
    "pizza.preparation",
    "pizza.cooking",
    "pizza.finishing",
    "pizza.packaging",
  ]);

  const fromagesUnitId = "order_items:short-post-fromages";
  const chevreUnitId = "order_items:long-post-chevre";
  assert.equal(workUnitByNode(plan, fromagesUnitId, "pizza.packaging").status, "blocked");
  assert.equal(workUnitByNode(plan, chevreUnitId, "pizza.packaging").status, "blocked");
  assert.equal(
    plan.workUnits.every((workUnit) => workUnit.estimatedDurationSec === null),
    true,
  );
}

{
  const [productionUnit] = buildProductionUnits({
    orders: [
      order({
        id: "post-cook-state",
        items: [pizzaItem({ id: "post-cook-pizza", orderId: "post-cook-state", name: "Fromages" })],
      }),
    ],
  });
  const workUnits = withNodeStatuses(buildWorkUnits({ productionUnits: [productionUnit] }), {
    "pizza.preparation": "completed",
    "pizza.cooking": "completed",
    "pizza.finishing": "available",
    "pizza.packaging": "blocked",
  });
  const plan = assembleFromArtifacts({ productionUnits: [productionUnit], workUnits });

  assertUsablePlanInvariants(plan);
  assert.deepEqual(plan.schedulerPlan.scheduledWorkUnitIds, [
    "work_unit:order_items:post-cook-pizza:pizza.finishing",
  ]);
}

{
  const cancelledOrder = "cancelled-order";
  const plan = planFrom({
    orders: [
      order({
        id: cancelledOrder,
        status: "cancelled",
        items: ovenReadyPizzaItems({ orderId: cancelledOrder, names: ["Regina", "Regina"] }),
      }),
    ],
  });

  assert.equal(plan.isUsable, true);
  assert.equal(
    plan.workUnits.every((workUnit) => workUnit.status === "cancelled"),
    true,
  );
  assertNoActiveCharge(plan);
}

for (const status of ["ready", "delivered"] as const) {
  const orderId = `${status}-order`;
  const plan = planFrom({
    orders: [
      order({
        id: orderId,
        status,
        items: ovenReadyPizzaItems({ orderId, names: ["Regina", "Margherita"] }),
      }),
    ],
  });

  assert.equal(plan.isUsable, true);
  assert.equal(
    plan.workUnits.every((workUnit) => workUnit.status === "completed"),
    true,
  );
  assertNoActiveCharge(plan);
}

{
  const plan = planFrom({
    orders: [order({ id: "unknown-order" })],
    paninoItems: [
      paninoItem({
        id: "unknown-product",
        orderId: "unknown-order",
        productKey: "dessert",
        productName: "Dessert inconnu",
      }),
    ],
  });

  assert.equal(plan.isUsable, false);
  assert.equal(
    plan.blockingIssues.some((issue) => issue.type === "production_unit_without_work_unit"),
    true,
  );
}

{
  const [productionUnit] = buildProductionUnits({
    orders: [
      order({
        id: "missing-dependency-order",
        items: [
          pizzaItem({
            id: "missing-dependency-pizza",
            orderId: "missing-dependency-order",
            preparedForOven: true,
          }),
        ],
      }),
    ],
  });
  const workUnits = buildWorkUnits({ productionUnits: [productionUnit] }).map((workUnit) =>
    workUnit.workflowNodeId === "pizza.cooking"
      ? { ...workUnit, dependsOn: ["missing-preparation"] }
      : workUnit,
  );
  const plan = assembleFromArtifacts({ productionUnits: [productionUnit], workUnits });

  assert.equal(plan.isUsable, false);
  assert.equal(
    plan.blockingIssues.some((issue) => issue.type === "missing_dependency"),
    true,
  );
  assert.equal(plan.schedulerPlan.scheduledWorkUnitCount, 0);
}

{
  const orderId = "divergent-batch-order";
  const productionUnits = buildProductionUnits({
    orders: [
      order({
        id: orderId,
        items: ovenReadyPizzaItems({ orderId, names: ["Regina", "Margherita"] }),
      }),
    ],
  });
  const workUnits = buildWorkUnits({ productionUnits });
  const workUnitDiagnostic = diagnoseWorkUnits({ productionUnits, workUnits });
  const schedulerPlan = buildSchedulerPlan({ workUnits });
  const batchPlan = buildBatchPlan({ schedulerPlan });
  const plan = assembleProductionPlan({
    idSeed: "divergent-batch",
    productionUnits,
    workUnits,
    workUnitDiagnostic,
    schedulerPlan,
    batchPlan: {
      ...batchPlan,
      batchedWorkUnitIds: [...batchPlan.batchedWorkUnitIds].reverse(),
    },
  });

  assert.equal(plan.isUsable, false);
  assert.equal(
    plan.blockingIssues.some((issue) => issue.type === "batch_work_unit_order_mismatch"),
    true,
  );
}

{
  const orderId = "deterministic-order";
  const params = {
    orders: [
      order({
        id: orderId,
        items: ovenReadyPizzaItems({ orderId, names: ["Regina", "Margherita", "Piccante"] }),
      }),
    ],
    paninoItems: [
      paninoItem({
        id: "deterministic-panino",
        orderId,
        productKey: "panino",
        productName: "Pani'NO Burger",
      }),
    ],
    idSeed: "deterministic",
  };
  const firstPlan = buildProductionPlan(params);
  const secondPlan = buildProductionPlan(params);

  assert.deepEqual(firstPlan, secondPlan);
  assert.equal(firstPlan.id, secondPlan.id);
}

{
  const orderId = "mutation-order";
  const orders = [
    order({
      id: orderId,
      items: ovenReadyPizzaItems({ orderId, names: ["Regina", "Margherita"] }),
    }),
  ];
  const paninoItems = [
    paninoItem({
      id: "mutation-panino",
      orderId,
      productKey: "panino",
      productName: "Pani'NO Burger",
    }),
  ];
  const ordersBefore = JSON.stringify(orders);
  const paninoItemsBefore = JSON.stringify(paninoItems);
  const plan = buildProductionPlan({ orders, paninoItems, idSeed: "mutation" });

  (plan.productionUnits[0].pizza?.extras as string[] | undefined)?.push("Mutation");
  (plan.workUnits[0].dependsOn as string[]).push("mutation");
  (plan.batchPlan.batches[0].workUnits[0].workUnit.dependsOn as string[]).push("mutation");

  assert.equal(JSON.stringify(orders), ordersBefore);
  assert.equal(JSON.stringify(paninoItems), paninoItemsBefore);
}
