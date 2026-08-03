import assert from "node:assert/strict";
import {
  buildProductionUnits,
  type ProductionUnit,
  type ProductionUnitOrderInput,
  type ProductionUnitOrderItemInput,
  type ProductionUnitPaninoItemInput,
} from "./production-units";
import { buildSchedulerPlan, type SchedulerExecutionPlan } from "./scheduler-core";
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
  productionStatus,
  prepared = false,
}: {
  id?: string;
  orderId?: string;
  name?: string;
  productionStatus?: ProductionUnitOrderItemInput["production_status"];
  prepared?: boolean;
} = {}): ProductionUnitOrderItemInput {
  return {
    id,
    order_id: orderId,
    pizza_id: "pizza-regina",
    pizza_name: name,
    base: "tomato",
    default_base_snapshot: "tomato",
    explicit_base_snapshot: null,
    base_resolution: "catalog_default",
    base_confidence: 1,
    extras: [],
    removed: [],
    prepared,
    ...(productionStatus === undefined ? {} : { production_status: productionStatus }),
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

function buildChain({
  orders,
  paninoItems = [],
}: {
  orders: readonly ProductionUnitOrderInput[];
  paninoItems?: readonly ProductionUnitPaninoItemInput[];
}) {
  const productionUnits = buildProductionUnits({ orders, paninoItems });
  const workUnits = buildWorkUnits({ productionUnits });
  const plan = planConsistentWorkUnits(productionUnits, workUnits);

  return { productionUnits, workUnits, plan };
}

function planConsistentWorkUnits(
  productionUnits: readonly ProductionUnit[],
  workUnits: readonly WorkUnit[],
) {
  const diagnostic = diagnoseWorkUnits({ productionUnits, workUnits });
  assert.equal(diagnostic.isConsistent, true, JSON.stringify(diagnostic, null, 2));
  return buildSchedulerPlan({ workUnits });
}

function scheduledStationNodes(plan: SchedulerExecutionPlan) {
  return plan.stationPlans.flatMap((stationPlan) =>
    stationPlan.workUnits.map((scheduledWorkUnit) => [
      scheduledWorkUnit.targetStation,
      scheduledWorkUnit.workflowNodeId,
      scheduledWorkUnit.productionUnitId,
    ]),
  );
}

function scheduledProductionUnitIds(plan: SchedulerExecutionPlan) {
  return plan.stationPlans.flatMap((stationPlan) =>
    stationPlan.workUnits.map((scheduledWorkUnit) => scheduledWorkUnit.productionUnitId),
  );
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

function nodeId(productionUnit: ProductionUnit, workflowNodeId: string) {
  return `work_unit:${productionUnit.id}:${workflowNodeId}`;
}

{
  const { productionUnits, plan } = buildChain({
    orders: [order({ items: [pizzaItem()] })],
  });

  assert.deepEqual(scheduledStationNodes(plan), [
    ["pizzaiolo", "pizza.preparation", productionUnits[0].id],
  ]);
}

{
  const { productionUnits, plan } = buildChain({
    orders: [
      order({
        id: "legacy-order",
        items: [
          pizzaItem({
            id: "legacy-prepared-pizza",
            orderId: "legacy-order",
            productionStatus: undefined,
            prepared: true,
          }),
        ],
      }),
    ],
  });

  assert.deepEqual(scheduledStationNodes(plan), [["four", "pizza.cooking", productionUnits[0].id]]);
}

{
  const { productionUnits, workUnits } = buildChain({
    orders: [
      order({
        items: [pizzaItem({ id: "chevre-miel", name: "Chevre miel" })],
      }),
    ],
  });

  const cookingPlan = planConsistentWorkUnits(
    productionUnits,
    withNodeStatuses(workUnits, {
      "pizza.preparation": "completed",
      "pizza.cooking": "available",
    }),
  );

  assert.deepEqual(scheduledStationNodes(cookingPlan), [
    ["four", "pizza.cooking", productionUnits[0].id],
  ]);

  const finishingPlan = planConsistentWorkUnits(
    productionUnits,
    withNodeStatuses(workUnits, {
      "pizza.preparation": "completed",
      "pizza.cooking": "completed",
      "pizza.finishing": "available",
    }),
  );

  assert.deepEqual(scheduledStationNodes(finishingPlan), [
    ["four", "pizza.finishing", productionUnits[0].id],
  ]);
}

{
  const { productionUnits, workUnits, plan } = buildChain({
    orders: [order()],
    paninoItems: [
      paninoItem({
        id: "panino-1",
        productKey: "panino",
        productName: "Pani'NO Burger",
        friesMode: "Dans le Pani'NO",
      }),
    ],
  });

  assert.deepEqual(scheduledStationNodes(plan), [
    ["pizzaiolo", "panino.bread", productionUnits[0].id],
    ["panino", "panino.filling", productionUnits[0].id],
  ]);

  const assemblyPlan = planConsistentWorkUnits(
    productionUnits,
    withNodeStatuses(workUnits, {
      "panino.bread": "completed",
      "panino.filling": "completed",
      "panino.assembly": "available",
    }),
  );

  assert.deepEqual(scheduledStationNodes(assemblyPlan), [
    ["panino", "panino.assembly", productionUnits[0].id],
  ]);
}

{
  const { productionUnits, workUnits, plan } = buildChain({
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

  assert.deepEqual(scheduledStationNodes(plan), [
    ["fish_fryer", "fish_no.fish_cooking", productionUnits[0].id],
    ["fries_fryer", "fish_no.side_cooking", productionUnits[0].id],
  ]);

  const assemblyPlan = planConsistentWorkUnits(
    productionUnits,
    withNodeStatuses(workUnits, {
      "fish_no.fish_cooking": "completed",
      "fish_no.side_cooking": "completed",
      "fish_no.assembly": "available",
    }),
  );

  assert.deepEqual(scheduledStationNodes(assemblyPlan), [
    ["panino", "fish_no.assembly", productionUnits[0].id],
  ]);

  const packagingPlan = planConsistentWorkUnits(
    productionUnits,
    withNodeStatuses(workUnits, {
      "fish_no.fish_cooking": "completed",
      "fish_no.side_cooking": "completed",
      "fish_no.assembly": "completed",
      "fish_no.packaging": "available",
    }),
  );

  assert.deepEqual(scheduledStationNodes(packagingPlan), [
    ["panino", "fish_no.packaging", productionUnits[0].id],
  ]);
}

{
  const { productionUnits, plan } = buildChain({
    orders: [order()],
    paninoItems: [
      paninoItem({
        id: "fries-1",
        productKey: "cornet_frites",
        productName: "Cornet de frites",
      }),
      paninoItem({
        id: "grenailles-1",
        productKey: "grenailles",
        productName: "Pommes grenailles",
      }),
    ],
  });

  assert.deepEqual(scheduledStationNodes(plan), [
    ["fries_fryer", "fries.cooking", productionUnits[0].id],
    ["fries_fryer", "grenailles.cooking", productionUnits[1].id],
  ]);
}

{
  const { productionUnits, plan } = buildChain({
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

  assert.deepEqual(scheduledStationNodes(plan), [
    ["pizzaiolo", "pizza.preparation", productionUnits[0].id],
    ["pizzaiolo", "panino.bread", productionUnits[1].id],
    ["panino", "panino.filling", productionUnits[1].id],
  ]);
}

{
  const orderA = order({
    id: "order-a",
    items: [pizzaItem({ id: "pizza-a", orderId: "order-a" })],
  });
  const orderB = order({
    id: "order-b",
    items: [pizzaItem({ id: "pizza-b", orderId: "order-b" })],
  });

  const firstPlan = buildChain({ orders: [orderB, orderA] }).plan;
  const secondPlan = buildChain({ orders: [orderA, orderB] }).plan;

  assert.deepEqual(scheduledProductionUnitIds(firstPlan), scheduledProductionUnitIds(secondPlan));
  assert.deepEqual(scheduledProductionUnitIds(firstPlan), [
    "order_items:pizza-a",
    "order_items:pizza-b",
  ]);
}

{
  const { plan } = buildChain({
    orders: [
      order({
        id: "order-null",
        requestedTime: null,
        items: [pizzaItem({ id: "pizza-null", orderId: "order-null" })],
      }),
      order({
        id: "order-dated",
        requestedTime: REQUESTED_1930,
        items: [pizzaItem({ id: "pizza-dated", orderId: "order-dated" })],
      }),
    ],
  });

  assert.deepEqual(scheduledProductionUnitIds(plan), [
    "order_items:pizza-dated",
    "order_items:pizza-null",
  ]);
}

{
  const { productionUnits, workUnits } = buildChain({
    orders: [order({ items: [pizzaItem()] })],
  });
  const cookingId = nodeId(productionUnits[0], "pizza.cooking");
  const corruptedWorkUnits = workUnits
    .filter((workUnit) => workUnit.workflowNodeId !== "pizza.preparation")
    .map((workUnit) =>
      workUnit.workflowNodeId === "pizza.cooking"
        ? { ...workUnit, status: "available" as const, dependsOn: ["missing-preparation"] }
        : workUnit,
    );

  const diagnostic = diagnoseWorkUnits({ productionUnits, workUnits: corruptedWorkUnits });
  const plan = buildSchedulerPlan({ workUnits: corruptedWorkUnits });

  assert.equal(diagnostic.isConsistent, false);
  assert.deepEqual(diagnostic.missingDependencyIssues, [
    { workUnitId: cookingId, missingDependencyId: "missing-preparation" },
  ]);
  assert.deepEqual(plan.scheduledWorkUnitIds, []);
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

  const diagnostic = diagnoseWorkUnits({ productionUnits, workUnits });
  const plan = buildSchedulerPlan({ workUnits });
  (plan.stationPlans[0].workUnits[0].workUnit.dependsOn as string[]).push("mutated");

  assert.equal(diagnostic.isConsistent, true);
  assert.equal(JSON.stringify(orders), ordersBefore);
  assert.equal(JSON.stringify(paninoItems), paninoItemsBefore);
  assert.equal(JSON.stringify(productionUnits), productionUnitsBefore);
  assert.equal(JSON.stringify(workUnits), workUnitsBefore);
}
