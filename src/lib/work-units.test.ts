import assert from "node:assert/strict";
import {
  buildProductionUnits,
  type ProductionUnit,
  type ProductionUnitOrderInput,
  type ProductionUnitOrderItemInput,
  type ProductionUnitPaninoItemInput,
} from "./production-units";
import { buildWorkUnits, workUnitId, type WorkUnit } from "./work-units";

function order({
  id = "order-1",
  customerName = "Michel",
  requestedTime = "2026-08-03T19:30:00.000Z",
  status = "to_prepare",
  cancelledAt = null,
  items = [],
}: {
  id?: string;
  customerName?: string | null;
  requestedTime?: string | null;
  status?: ProductionUnitOrderInput["status"];
  cancelledAt?: string | null;
  items?: readonly ProductionUnitOrderItemInput[];
} = {}): ProductionUnitOrderInput {
  return {
    id,
    customer_name: customerName,
    requested_time: requestedTime,
    status,
    cancelled_at: cancelledAt,
    items,
  };
}

function pizzaItem({
  id = "pizza-item-1",
  orderId = "order-1",
  name = "Regina",
  productionStatus = "to_prepare",
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
    production_status: productionStatus,
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
    base: productKey === "panino" ? "Crème" : null,
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

function workUnitsForProductionUnits(productionUnits: readonly ProductionUnit[]) {
  return buildWorkUnits({ productionUnits });
}

function workUnitsFor({
  orders,
  paninoItems = [],
}: {
  orders: readonly ProductionUnitOrderInput[];
  paninoItems?: readonly ProductionUnitPaninoItemInput[];
}) {
  return workUnitsForProductionUnits(buildProductionUnits({ orders, paninoItems }));
}

function byNode(workUnits: readonly WorkUnit[]) {
  return new Map(workUnits.map((unit) => [unit.workflowNodeId, unit]));
}

function assertDependenciesPointToExistingWorkUnits(workUnits: readonly WorkUnit[]) {
  const ids = new Set(workUnits.map((unit) => unit.id));

  for (const unit of workUnits) {
    for (const dependencyId of unit.dependsOn) {
      assert.ok(ids.has(dependencyId), `${unit.id} depends on missing ${dependencyId}`);
    }
  }
}

{
  const item = pizzaItem();
  const productionUnits = buildProductionUnits({ orders: [order({ items: [item] })] });
  const workUnits = workUnitsForProductionUnits(productionUnits);
  const workByNode = byNode(workUnits);

  assert.equal(workUnits.length, 3);
  assert.deepEqual(
    workUnits.map((unit) => unit.workflowNodeId),
    ["pizza.preparation", "pizza.cooking", "pizza.packaging"],
  );
  assert.equal(workByNode.get("pizza.preparation")?.status, "available");
  assert.equal(workByNode.get("pizza.cooking")?.status, "blocked");
  assert.equal(workByNode.get("pizza.finishing"), undefined);
  assert.equal(workByNode.get("pizza.packaging")?.status, "blocked");
  assert.deepEqual(workByNode.get("pizza.cooking")?.dependsOn, [
    workUnitId(productionUnits[0].id, "pizza.preparation"),
  ]);
  assert.deepEqual(workByNode.get("pizza.packaging")?.dependsOn, [
    workUnitId(productionUnits[0].id, "pizza.cooking"),
  ]);
  assert.equal(workUnits[0].customerName, "Michel");
  assert.equal(workUnits[0].requestedTime, "2026-08-03T19:30:00.000Z");
}

{
  const productionUnits = buildProductionUnits({
    orders: [
      order({
        items: [pizzaItem({ id: "chevre-miel", name: "Chèvre miel" })],
      }),
    ],
  });
  const workUnits = workUnitsForProductionUnits(productionUnits);
  const workByNode = byNode(workUnits);

  assert.deepEqual(
    workUnits.map((unit) => unit.workflowNodeId),
    ["pizza.preparation", "pizza.cooking", "pizza.finishing", "pizza.packaging"],
  );
  assert.equal(workByNode.get("pizza.finishing")?.type, "finishing");
  assert.equal(workByNode.get("pizza.finishing")?.status, "blocked");
  assert.deepEqual(workByNode.get("pizza.finishing")?.dependsOn, [
    workUnitId(productionUnits[0].id, "pizza.cooking"),
  ]);
  assert.deepEqual(workByNode.get("pizza.packaging")?.dependsOn, [
    workUnitId(productionUnits[0].id, "pizza.finishing"),
  ]);
}

{
  const workUnits = workUnitsFor({
    orders: [
      order({
        items: [pizzaItem({ id: "oven-pizza", productionStatus: "in_oven", prepared: true })],
      }),
    ],
  });
  const workByNode = byNode(workUnits);

  assert.equal(workByNode.get("pizza.preparation")?.status, "completed");
  assert.equal(workByNode.get("pizza.cooking")?.status, "in_progress");
  assert.equal(workByNode.get("pizza.packaging")?.status, "blocked");
  assert.equal(workByNode.get("pizza.cooking")?.statusSource, "production_unit_status");
}

{
  const productionUnits = buildProductionUnits({
    orders: [
      order({
        id: "legacy-order",
        items: [
          {
            id: "legacy-pizza",
            order_id: "legacy-order",
            pizza_name: "Chèvre miel",
            prepared: true,
          },
        ],
      }),
    ],
  });
  const workByNode = byNode(workUnitsForProductionUnits(productionUnits));

  assert.equal(workByNode.get("pizza.preparation")?.status, "completed");
  assert.equal(workByNode.get("pizza.cooking")?.status, "available");
  assert.equal(workByNode.get("pizza.finishing")?.status, "blocked");
  assert.equal(workByNode.get("pizza.packaging")?.status, "blocked");
  assert.equal(workByNode.get("pizza.preparation")?.statusSource, "legacy_item_status");
  assert.equal(workByNode.get("pizza.cooking")?.statusSource, "dependency_projection");
}

{
  const workUnits = workUnitsFor({
    orders: [
      order({
        items: [pizzaItem({ id: "ready-pizza", productionStatus: "ready" })],
      }),
    ],
  });

  assert.deepEqual(
    workUnits.map((unit) => unit.status),
    ["completed", "completed", "completed"],
  );
}

{
  const workUnits = workUnitsFor({
    orders: [
      order({
        status: "delivered",
        items: [pizzaItem({ id: "delivered-pizza", productionStatus: "to_prepare" })],
      }),
    ],
  });

  assert.deepEqual(
    workUnits.map((unit) => unit.status),
    ["completed", "completed", "completed"],
  );
}

{
  const [productionUnit] = buildProductionUnits({
    orders: [order({ items: [pizzaItem({ id: "failed-pizza" })] })],
  });
  const failedProductionUnit: ProductionUnit = {
    ...productionUnit,
    status: "failed",
  };
  const workUnits = workUnitsForProductionUnits([failedProductionUnit]);

  assert.deepEqual(
    workUnits.map((unit) => unit.status),
    ["failed", "failed", "failed"],
  );
}

{
  const workUnits = workUnitsFor({
    orders: [
      order({
        status: "cancelled",
        cancelledAt: "2026-08-03T19:12:00.000Z",
        items: [pizzaItem({ id: "cancelled-pizza", productionStatus: "ready" })],
      }),
    ],
    paninoItems: [
      paninoItem({
        id: "cancelled-panino",
        productKey: "panino",
        productName: "Pani'NO Burger",
        status: "done",
      }),
    ],
  });

  assert.equal(workUnits.length, 7);
  assert.deepEqual(
    workUnits.map((unit) => unit.status),
    ["cancelled", "cancelled", "cancelled", "cancelled", "cancelled", "cancelled", "cancelled"],
  );
}

{
  const workUnits = workUnitsFor({
    orders: [order({ id: "panino-order", items: [] })],
    paninoItems: [
      paninoItem({
        id: "panino-1",
        orderId: "panino-order",
        productKey: "panino",
        productName: "Pani'NO Burger",
        friesMode: "Dans le Pani'NO",
      }),
    ],
  });
  const workByNode = byNode(workUnits);

  assert.deepEqual(
    workUnits.map((unit) => unit.workflowNodeId),
    ["panino.bread", "panino.filling", "panino.assembly", "panino.packaging"],
  );
  assert.equal(workByNode.get("panino.bread")?.station, "pizzaiolo");
  assert.equal(workByNode.get("panino.filling")?.station, "panino");
  assert.equal(workByNode.get("panino.bread")?.status, "available");
  assert.equal(workByNode.get("panino.filling")?.status, "available");
  assert.equal(workByNode.get("panino.assembly")?.status, "blocked");
  assert.deepEqual(workByNode.get("panino.assembly")?.dependsOn, [
    workUnits[0].id,
    workUnits[1].id,
  ]);
}

{
  const workUnits = workUnitsFor({
    orders: [order({ id: "panino-progress-order", items: [] })],
    paninoItems: [
      paninoItem({
        id: "panino-progress",
        orderId: "panino-progress-order",
        productKey: "panino",
        productName: "Pani'NO Burger",
        status: "in_progress",
      }),
    ],
  });
  const workByNode = byNode(workUnits);

  assert.equal(workByNode.get("panino.bread")?.status, "available");
  assert.equal(workByNode.get("panino.filling")?.status, "in_progress");
  assert.equal(workByNode.get("panino.assembly")?.status, "blocked");
}

{
  const workUnits = workUnitsFor({
    orders: [order({ id: "fish-order", items: [] })],
    paninoItems: [
      paninoItem({
        id: "fish-1",
        orderId: "fish-order",
        productKey: "fishno",
        productName: "Fish & NO",
        side: "Pommes grenailles",
      }),
    ],
  });
  const workByNode = byNode(workUnits);

  assert.deepEqual(
    workUnits.map((unit) => unit.workflowNodeId),
    ["fish_no.fish_cooking", "fish_no.side_cooking", "fish_no.assembly", "fish_no.packaging"],
  );
  assert.equal(workByNode.get("fish_no.fish_cooking")?.station, "fish_fryer");
  assert.equal(workByNode.get("fish_no.side_cooking")?.station, "fries_fryer");
  assert.equal(workByNode.get("fish_no.fish_cooking")?.status, "available");
  assert.equal(workByNode.get("fish_no.side_cooking")?.status, "available");
  assert.equal(workByNode.get("fish_no.assembly")?.status, "blocked");
  assert.deepEqual(workByNode.get("fish_no.assembly")?.dependsOn, [
    workUnits[0].id,
    workUnits[1].id,
  ]);
  assert.equal(
    workByNode.get("fish_no.side_cooking")?.executionProfileId,
    "fish_no.side.pommes_grenailles",
  );
}

{
  const workUnits = workUnitsFor({
    orders: [order({ id: "fish-progress-order", items: [] })],
    paninoItems: [
      paninoItem({
        id: "fish-progress",
        orderId: "fish-progress-order",
        productKey: "fishno",
        productName: "Fish & NO",
        status: "in_progress",
        side: "Frites",
      }),
    ],
  });
  const workByNode = byNode(workUnits);

  assert.equal(workByNode.get("fish_no.fish_cooking")?.status, "available");
  assert.equal(workByNode.get("fish_no.side_cooking")?.status, "available");
  assert.equal(workByNode.get("fish_no.assembly")?.status, "blocked");
  assert.equal(workByNode.get("fish_no.packaging")?.status, "blocked");
}

{
  const workUnits = workUnitsFor({
    orders: [order({ id: "fries-order", items: [] })],
    paninoItems: [
      paninoItem({
        id: "fries-1",
        orderId: "fries-order",
        productKey: "cornet_frites",
        productName: "Cornet de frites",
      }),
      paninoItem({
        id: "grenailles-1",
        orderId: "fries-order",
        productKey: "grenailles",
        productName: "Pommes grenailles",
      }),
    ],
  });

  assert.deepEqual(
    workUnits.map((unit) => [unit.workflowNodeId, unit.status, unit.station]),
    [
      ["fries.cooking", "available", "fries_fryer"],
      ["fries.packaging", "blocked", "panino"],
      ["grenailles.cooking", "available", "fries_fryer"],
      ["grenailles.packaging", "blocked", "panino"],
    ],
  );
}

{
  const workUnits = workUnitsFor({
    orders: [order({ id: "unknown-product-order", items: [] })],
    paninoItems: [
      paninoItem({
        id: "unknown-product",
        orderId: "unknown-product-order",
        productKey: "boisson",
        productName: "Boisson",
      }),
    ],
  });

  assert.deepEqual(workUnits, []);
}

{
  const productionUnits = buildProductionUnits({
    orders: [order({ id: "immutable-order", items: [pizzaItem({ id: "immutable-pizza" })] })],
  });
  const before = JSON.stringify(productionUnits);
  const workUnits = buildWorkUnits({ productionUnits });

  (workUnits[1].dependsOn as string[]).push("mutated");

  assert.equal(JSON.stringify(productionUnits), before);
  assert.deepEqual(productionUnits[0].pizza?.extras, []);
}

{
  const productionUnits = buildProductionUnits({
    orders: [
      order({
        id: "deterministic-order",
        items: [
          pizzaItem({ id: "deterministic-regina", orderId: "deterministic-order" }),
          pizzaItem({
            id: "deterministic-chevre",
            orderId: "deterministic-order",
            name: "Chèvre miel",
          }),
        ],
      }),
    ],
    paninoItems: [
      paninoItem({
        id: "deterministic-panino",
        orderId: "deterministic-order",
        productKey: "panino",
        productName: "Pani'NO Burger",
      }),
    ],
  });

  assert.deepEqual(buildWorkUnits({ productionUnits }), buildWorkUnits({ productionUnits }));
}

{
  const workUnits = workUnitsFor({
    orders: [
      order({
        id: "dependency-order",
        items: [
          pizzaItem({ id: "dependency-regina", orderId: "dependency-order" }),
          pizzaItem({
            id: "dependency-chevre",
            orderId: "dependency-order",
            name: "Chèvre miel",
          }),
        ],
      }),
    ],
    paninoItems: [
      paninoItem({
        id: "dependency-panino",
        orderId: "dependency-order",
        productKey: "panino",
        productName: "Pani'NO Burger",
      }),
      paninoItem({
        id: "dependency-fish",
        orderId: "dependency-order",
        productKey: "fishno",
        productName: "Fish & NO",
      }),
      paninoItem({
        id: "dependency-fries",
        orderId: "dependency-order",
        productKey: "cornet_frites",
        productName: "Cornet de frites",
      }),
      paninoItem({
        id: "dependency-grenailles",
        orderId: "dependency-order",
        productKey: "grenailles",
        productName: "Pommes grenailles",
      }),
    ],
  });

  assertDependenciesPointToExistingWorkUnits(workUnits);
}
