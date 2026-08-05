import assert from "node:assert/strict";
import { buildBatchPlan } from "../batch-builder";
import { assembleProductionPlan, buildProductionPlan } from "../production-plan";
import {
  type ProductionUnit,
  type ProductionUnitOrderInput,
  type ProductionUnitOrderItemInput,
  type ProductionUnitPaninoItemInput,
} from "../production-units";
import { buildSchedulerPlan } from "../scheduler-core";
import type { WorkUnit } from "../work-units";
import { diagnoseWorkUnits } from "../work-units-diagnostics";
import { buildPizzaioloViewModel } from "./pizzaiolo-view-model";

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
    cancelled_at: status === "cancelled" ? "2026-08-03T19:00:00.000Z" : null,
    items,
  };
}

function pizzaItem({
  id = "pizza-item-1",
  orderId = "order-1",
  name = "Regina",
  productionStatus = "to_prepare",
  extras = ["Olives"],
  removed = [],
  cutInto = null,
}: {
  id?: string;
  orderId?: string;
  name?: string;
  productionStatus?: ProductionUnitOrderItemInput["production_status"];
  extras?: readonly string[];
  removed?: readonly string[];
  cutInto?: number | null;
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
    extras: [...extras],
    removed: [...removed],
    prepared: false,
    production_status: productionStatus,
    oven_batch_id: null,
    sent_to_oven_at: null,
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
  status?: ProductionUnitPaninoItemInput["status"];
} = {}): ProductionUnitPaninoItemInput {
  return {
    id,
    order_id: orderId,
    product_key: productKey,
    product_name: productName,
    base: productKey === "panino" ? "Creme" : null,
    fries_mode: null,
    side: null,
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
  idSeed = "pizzaiolo-view-model-test",
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
  idSeed = "pizzaiolo-view-model-artifacts",
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

{
  const plan = planFrom({ orders: [] });
  const viewModel = buildPizzaioloViewModel(plan);

  assert.equal(viewModel.planId, plan.id);
  assert.equal(viewModel.planUsable, true);
  assert.equal(viewModel.availableWorkUnits.length, 0);
  assert.equal(viewModel.pizzasReadyToPrepare.length, 0);
  assert.equal(viewModel.groupedOrders.length, 0);
  assert.equal(viewModel.selection.hasSelectableWorkUnits, false);
  assert.deepEqual(viewModel.recommendations, []);
}

{
  const plan = planFrom({
    orders: [
      order({
        items: [
          pizzaItem({
            extras: ["Olives", "Champignons"],
            removed: ["Oignons"],
            cutInto: 6,
          }),
        ],
      }),
    ],
  });
  const viewModel = buildPizzaioloViewModel(plan);

  assert.equal(viewModel.availableWorkUnits.length, 1);
  assert.equal(viewModel.availableWorkUnits[0].workflowNodeId, "pizza.preparation");
  assert.equal(viewModel.availableWorkUnits[0].schedulerSequence, 0);
  assert.equal(viewModel.availableWorkUnits[0].stationSequence, 0);
  assert.equal(viewModel.availableWorkUnits[0].sourceItemId, "pizza-item-1");
  assert.deepEqual(viewModel.availableWorkUnits[0].pizza, {
    base: "tomato",
    extras: ["Olives", "Champignons"],
    removed: ["Oignons"],
    cutInto: 6,
  });
  assert.equal(viewModel.pizzasReadyToPrepare.length, 1);
  assert.deepEqual(viewModel.selection.selectableWorkUnitIds, [
    "work_unit:order_items:pizza-item-1:pizza.preparation",
  ]);
  assert.deepEqual(viewModel.selection.selectableOrderIds, ["order-1"]);
  assert.equal(viewModel.selection.hasSelectableWorkUnits, true);
  assert.deepEqual(viewModel.recommendations, [
    {
      code: "follow_scheduler_order",
      workUnitIds: ["work_unit:order_items:pizza-item-1:pizza.preparation"],
      reason: "Ordre issu du Scheduler du ProductionPlan.",
    },
  ]);
}

{
  const plan = planFrom({
    orders: [
      order({
        id: "mixed-order",
        customerName: "Paul",
        items: [pizzaItem({ id: "mixed-pizza", orderId: "mixed-order" })],
      }),
    ],
    paninoItems: [paninoItem({ id: "mixed-panino", orderId: "mixed-order" })],
  });
  const viewModel = buildPizzaioloViewModel(plan);
  const group = viewModel.groupedOrders.find((candidate) => candidate.orderId === "mixed-order");

  assert.ok(group);
  assert.equal(group.customerName, "Paul");
  assert.equal(group.isMixedOrder, true);
  assert.deepEqual(group.productKinds, ["pizza", "panino"]);
  assert.deepEqual(group.productNames, ["Regina", "Pani'NO Burger"]);
  assert.deepEqual(group.availableWorkUnitIds, [
    "work_unit:order_items:mixed-pizza:pizza.preparation",
    "work_unit:panino_order_items:mixed-panino:panino.bread",
  ]);
  assert.deepEqual(group.workUnitIds, [
    "work_unit:order_items:mixed-pizza:pizza.preparation",
    "work_unit:panino_order_items:mixed-panino:panino.bread",
  ]);
  assert.equal(
    group.workUnitIds.includes("work_unit:panino_order_items:mixed-panino:panino.filling"),
    false,
  );
  assert.deepEqual(
    viewModel.availableWorkUnits.map((workUnit) => workUnit.workflowNodeId),
    ["pizza.preparation", "panino.bread"],
  );
}

{
  const basePlan = planFrom({
    orders: [order({ items: [pizzaItem()] })],
  });
  const blockedWorkUnits = basePlan.workUnits.map((workUnit) =>
    workUnit.workflowNodeId === "pizza.preparation"
      ? { ...workUnit, status: "blocked" as const, dependsOn: ["missing-work-unit"] }
      : workUnit,
  );
  const plan = assembleFromArtifacts({
    productionUnits: basePlan.productionUnits,
    workUnits: blockedWorkUnits,
  });
  const viewModel = buildPizzaioloViewModel(plan);

  assert.equal(viewModel.planUsable, false);
  assert.equal(viewModel.availableWorkUnits.length, 0);
  assert.equal(viewModel.blockedWorkUnits.length, 1);
  assert.deepEqual(viewModel.blockedWorkUnits[0].blockedDependencyIds, ["missing-work-unit"]);
  assert.ok(viewModel.diagnostics.some((diagnostic) => diagnostic.includes("missing_dependency")));
  assert.deepEqual(viewModel.selection.selectableWorkUnitIds, []);
  assert.deepEqual(viewModel.selection.selectableOrderIds, []);
  assert.equal(viewModel.selection.hasSelectableWorkUnits, false);
}

{
  const basePlan = planFrom({
    orders: [order({ items: [pizzaItem()] })],
  });
  const invalidAvailableWorkUnits = basePlan.workUnits.map((workUnit) =>
    workUnit.workflowNodeId === "pizza.preparation"
      ? { ...workUnit, status: "available" as const, dependsOn: ["missing-work-unit"] }
      : workUnit,
  );
  const plan = assembleFromArtifacts({
    productionUnits: basePlan.productionUnits,
    workUnits: invalidAvailableWorkUnits,
  });
  const viewModel = buildPizzaioloViewModel(plan);
  const group = viewModel.groupedOrders.find((candidate) => candidate.orderId === "order-1");

  assert.ok(group);
  assert.equal(plan.isUsable, false);
  assert.deepEqual(viewModel.selection.selectableWorkUnitIds, []);
  assert.deepEqual(viewModel.selection.selectableOrderIds, []);
  assert.equal(viewModel.selection.hasSelectableWorkUnits, false);
  assert.deepEqual(group.availableWorkUnitIds, []);
  assert.ok(viewModel.diagnostics.some((diagnostic) => diagnostic.includes("missing_dependency")));
}

{
  const plan = planFrom({
    orders: [
      order({
        id: "unsupported-mixed-order",
        items: [pizzaItem({ id: "usable-pizza", orderId: "unsupported-mixed-order" })],
      }),
    ],
    paninoItems: [
      paninoItem({
        id: "unsupported-item",
        orderId: "unsupported-mixed-order",
        productKey: "unknown_product",
        productName: "Produit inconnu",
      }),
    ],
  });
  const viewModel = buildPizzaioloViewModel(plan);

  assert.equal(plan.isUsable, false);
  assert.equal(plan.schedulerPlan.scheduledWorkUnitCount > 0, true);
  assert.deepEqual(viewModel.availableWorkUnits, []);
  assert.deepEqual(viewModel.selection.selectableWorkUnitIds, []);
  assert.deepEqual(viewModel.selection.selectableOrderIds, []);
  assert.equal(viewModel.selection.hasSelectableWorkUnits, false);
  assert.ok(
    viewModel.diagnostics.some((diagnostic) =>
      diagnostic.includes("production_unit_without_work_unit"),
    ),
  );
}

{
  const plan = planFrom({
    orders: [
      order({
        id: "oven-order",
        items: [
          pizzaItem({
            id: "oven-pizza",
            orderId: "oven-order",
            productionStatus: "in_oven",
          }),
        ],
      }),
    ],
  });
  const viewModel = buildPizzaioloViewModel(plan);
  const group = viewModel.groupedOrders.find((candidate) => candidate.orderId === "oven-order");

  assert.ok(group);
  assert.deepEqual(viewModel.selection.selectableWorkUnitIds, []);
  assert.deepEqual(viewModel.selection.selectableOrderIds, []);
  assert.deepEqual(group.availableWorkUnitIds, []);
}

{
  const plan = planFrom({
    orders: [
      order({
        id: "delivered-order",
        status: "delivered",
        items: [pizzaItem({ id: "delivered-pizza", orderId: "delivered-order" })],
      }),
    ],
  });
  const viewModel = buildPizzaioloViewModel(plan);
  const group = viewModel.groupedOrders.find(
    (candidate) => candidate.orderId === "delivered-order",
  );

  assert.ok(group);
  assert.equal(group.isCompleted, true);
  assert.deepEqual(group.availableWorkUnitIds, []);
  assert.deepEqual(group.completedWorkUnitIds, [
    "work_unit:order_items:delivered-pizza:pizza.preparation",
  ]);
  assert.deepEqual(viewModel.selection.selectableOrderIds, []);
  assert.equal(viewModel.selection.hasSelectableWorkUnits, false);
}

{
  const plan = planFrom({
    orders: [
      order({
        id: "later",
        requestedTime: "2026-08-03T19:35:00.000Z",
        items: [pizzaItem({ id: "later-pizza", orderId: "later" })],
      }),
      order({
        id: "earlier",
        requestedTime: "2026-08-03T19:30:00.000Z",
        items: [pizzaItem({ id: "earlier-pizza", orderId: "earlier" })],
      }),
    ],
  });

  assert.deepEqual(buildPizzaioloViewModel(plan), buildPizzaioloViewModel(plan));
  assert.deepEqual(buildPizzaioloViewModel(plan).selection.selectableOrderIds, [
    "earlier",
    "later",
  ]);
  assert.deepEqual(
    buildPizzaioloViewModel(plan).groupedOrders.map((group) => group.orderId),
    ["earlier", "later"],
  );
}

{
  const plan = planFrom({
    orders: [
      order({
        items: [pizzaItem()],
      }),
    ],
  });
  const before = JSON.stringify(plan);

  buildPizzaioloViewModel(plan);

  assert.equal(JSON.stringify(plan), before);
}
