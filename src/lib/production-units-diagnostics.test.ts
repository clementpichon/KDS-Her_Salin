import assert from "node:assert/strict";
import { diagnoseProductionUnits } from "./production-units-diagnostics";
import {
  buildProductionUnits,
  type ProductionUnit,
  type ProductionUnitOrderInput,
  type ProductionUnitOrderItemInput,
  type ProductionUnitPaninoItemInput,
} from "./production-units";

function order({
  id = "order-1",
  status = "to_prepare",
  cancelledAt = null,
  items = [],
}: {
  id?: string;
  status?: ProductionUnitOrderInput["status"];
  cancelledAt?: string | null;
  items?: readonly ProductionUnitOrderItemInput[];
} = {}): ProductionUnitOrderInput {
  return {
    id,
    customer_name: "Michel",
    requested_time: "2026-08-03T19:30:00.000Z",
    status,
    cancelled_at: cancelledAt,
    items,
  };
}

function pizzaItem({
  id = "pizza-1",
  orderId = "order-1",
  productionStatus = "to_prepare",
  prepared = false,
  readyAt = productionStatus === "ready" ? "2026-08-03T19:35:00.000Z" : null,
}: {
  id?: string;
  orderId?: string;
  productionStatus?: ProductionUnitOrderItemInput["production_status"];
  prepared?: boolean;
  readyAt?: string | null;
} = {}): ProductionUnitOrderItemInput {
  return {
    id,
    order_id: orderId,
    pizza_id: "pizza-regina",
    pizza_name: "Regina",
    extras: [],
    removed: [],
    prepared,
    production_status: productionStatus,
    ready_at: readyAt,
    cut_into: null,
  };
}

function paninoItem({
  id,
  orderId = "order-1",
  productKey,
  status = "pending",
  doneAt = status === "done" ? "2026-08-03T19:35:00.000Z" : null,
}: {
  id: string;
  orderId?: string;
  productKey: string;
  status?: ProductionUnitPaninoItemInput["status"];
  doneAt?: string | null;
}): ProductionUnitPaninoItemInput {
  return {
    id,
    order_id: orderId,
    product_key: productKey,
    product_name: productKey,
    base: null,
    fries_mode: null,
    side: productKey === "fishno" ? "Frites" : null,
    sauces: [],
    removed: [],
    extras: [],
    status,
    done_at: doneAt,
    created_at: "2026-08-03T19:00:00.000Z",
  };
}

{
  const items = [
    pizzaItem({ id: "pizza-1" }),
    pizzaItem({ id: "pizza-2", productionStatus: "in_oven" }),
  ];
  const paninoItems = [
    paninoItem({ id: "panino-1", productKey: "panino" }),
    paninoItem({ id: "fish-1", productKey: "fishno", status: "done" }),
    paninoItem({ id: "fries-1", productKey: "cornet_frites" }),
  ];

  const diagnostic = diagnoseProductionUnits({
    orders: [order({ items })],
    paninoItems,
  });

  assert.equal(diagnostic.orderCount, 1);
  assert.equal(diagnostic.sourcePizzaItemCount, 2);
  assert.equal(diagnostic.sourcePaninoItemCount, 3);
  assert.equal(diagnostic.productionUnitCount, 5);
  assert.equal(diagnostic.unitsByKind.pizza, 2);
  assert.equal(diagnostic.unitsByKind.panino, 1);
  assert.equal(diagnostic.unitsByKind.fish_no, 1);
  assert.equal(diagnostic.unitsByKind.fries, 1);
  assert.equal(diagnostic.unitsByStatus.created, 3);
  assert.equal(diagnostic.unitsByStatus.in_progress, 1);
  assert.equal(diagnostic.unitsByStatus.ready, 1);
  assert.equal(diagnostic.unitsByStatusSource.item_status, 5);
  assert.equal(diagnostic.isConsistent, true);
}

{
  const item = pizzaItem({ id: "pizza-duplicate-id" });
  const units = buildProductionUnits({ orders: [order({ items: [item] })] });
  const duplicatedUnits = [units[0], { ...units[0] }];
  const diagnostic = diagnoseProductionUnits({
    orders: [order({ items: [item] })],
    productionUnits: duplicatedUnits,
  });

  assert.deepEqual(diagnostic.duplicateProductionUnitIds, ["order_items:pizza-duplicate-id"]);
  assert.deepEqual(diagnostic.duplicateSourceItems, ["order_items:pizza-duplicate-id"]);
  assert.equal(diagnostic.isConsistent, false);
}

{
  const duplicatedSource = pizzaItem({ id: "same-source" });
  const diagnostic = diagnoseProductionUnits({
    orders: [order({ items: [duplicatedSource, { ...duplicatedSource }] })],
  });

  assert.deepEqual(diagnostic.duplicateSourceItems, ["order_items:same-source"]);
  assert.equal(diagnostic.isConsistent, false);
}

{
  const orphanPizza = pizzaItem({ id: "orphan-pizza", orderId: "missing-order" });
  const diagnostic = diagnoseProductionUnits({
    orders: [],
    orderItems: [orphanPizza],
  });

  assert.deepEqual(diagnostic.missingOrders, ["missing-order"]);
  assert.deepEqual(diagnostic.orphanSourceItems, [
    {
      sourceTable: "order_items",
      sourceItemId: "orphan-pizza",
      orderId: "missing-order",
      reason: "source_item_missing_order",
    },
  ]);
  assert.equal(diagnostic.isConsistent, false);
}

{
  const item = pizzaItem({ id: "missing-unit" });
  const diagnostic = diagnoseProductionUnits({
    orders: [order({ items: [item] })],
    productionUnits: [],
  });

  assert.deepEqual(diagnostic.orphanSourceItems, [
    {
      sourceTable: "order_items",
      sourceItemId: "missing-unit",
      orderId: "order-1",
      reason: "source_item_without_unit",
    },
  ]);
  assert.equal(diagnostic.isConsistent, false);
}

{
  const item = pizzaItem({ id: "source-item" });
  const units = buildProductionUnits({ orders: [order({ items: [item] })] });
  const extraUnit: ProductionUnit = {
    ...units[0],
    id: "order_items:unknown-unit",
    sourceItemId: "unknown-unit",
  };
  const diagnostic = diagnoseProductionUnits({
    orders: [order({ items: [item] })],
    productionUnits: [units[0], extraUnit],
  });

  assert.deepEqual(diagnostic.orphanSourceItems, [
    {
      sourceTable: "order_items",
      sourceItemId: "unknown-unit",
      orderId: "order-1",
      reason: "unit_without_source_item",
    },
  ]);
  assert.equal(diagnostic.isConsistent, false);
}

{
  const diagnostic = diagnoseProductionUnits({
    orders: [order()],
    paninoItems: [paninoItem({ id: "unknown-product", productKey: "boisson" })],
  });

  assert.deepEqual(diagnostic.unknownProductKinds, ["boisson"]);
  assert.equal(diagnostic.isConsistent, false);
}

{
  const item = pizzaItem({ id: "status-source", productionStatus: "in_oven" });
  const units = buildProductionUnits({ orders: [order({ items: [item] })] });
  const corruptedUnit: ProductionUnit = {
    ...units[0],
    status: "ready",
    statusSource: "order_ready_fallback",
  };

  const diagnostic = diagnoseProductionUnits({
    orders: [order({ items: [item] })],
    productionUnits: [corruptedUnit],
  });

  assert.equal(diagnostic.inconsistentStatuses.length, 1);
  assert.equal(diagnostic.inconsistentStatuses[0].expectedStatus, "in_progress");
  assert.equal(diagnostic.inconsistentStatuses[0].actualStatus, "ready");
  assert.equal(diagnostic.inconsistentStatuses[0].expectedStatusSource, "item_status");
  assert.equal(diagnostic.inconsistentStatuses[0].actualStatusSource, "order_ready_fallback");
  assert.equal(diagnostic.isConsistent, false);
}

{
  const item = pizzaItem({ id: "cancelled-status", productionStatus: "ready" });
  const diagnostic = diagnoseProductionUnits({
    orders: [
      order({
        status: "cancelled",
        cancelledAt: "2026-08-03T19:10:00.000Z",
        items: [item],
      }),
    ],
  });

  assert.equal(diagnostic.unitsByStatus.cancelled, 1);
  assert.equal(diagnostic.unitsByStatusSource.order_cancelled, 1);
  assert.equal(diagnostic.isConsistent, true);
}

{
  const item = pizzaItem({ id: "delivered-status", productionStatus: "ready" });
  const diagnostic = diagnoseProductionUnits({
    orders: [order({ status: "delivered", items: [item] })],
  });

  assert.equal(diagnostic.unitsByStatus.delivered, 1);
  assert.equal(diagnostic.unitsByStatusSource.order_delivered, 1);
  assert.equal(diagnostic.isConsistent, true);
}

{
  const item = {
    ...pizzaItem({ id: "order-ready-fallback", productionStatus: undefined }),
    production_status: undefined,
  };
  const diagnostic = diagnoseProductionUnits({
    orders: [order({ status: "ready", items: [item] })],
  });

  assert.equal(diagnostic.unitsByStatus.ready, 1);
  assert.equal(diagnostic.unitsByStatusSource.order_ready_fallback, 1);
  assert.equal(diagnostic.isConsistent, true);
}

{
  const item = {
    ...pizzaItem({
      id: "legacy-prepared",
      productionStatus: undefined,
      prepared: true,
    }),
    production_status: undefined,
  };
  const diagnostic = diagnoseProductionUnits({
    orders: [order({ items: [item] })],
  });

  assert.equal(diagnostic.unitsByStatus.in_progress, 1);
  assert.equal(diagnostic.unitsByStatusSource.legacy_prepared, 1);
  assert.equal(diagnostic.isConsistent, true);
}

{
  const diagnostic = diagnoseProductionUnits({
    orders: [
      order({
        items: [
          pizzaItem({
            id: "ready-at-without-ready",
            productionStatus: "in_oven",
            readyAt: "2026-08-03T19:45:00.000Z",
          }),
        ],
      }),
    ],
  });

  assert.deepEqual(diagnostic.temporalIssues, [
    {
      sourceTable: "order_items",
      sourceItemId: "ready-at-without-ready",
      field: "ready_at",
      statusField: "production_status",
      statusValue: "in_oven",
      timestampValue: "2026-08-03T19:45:00.000Z",
      reason: "ready_at_without_ready_status",
    },
  ]);
  assert.equal(diagnostic.isConsistent, false);
}

{
  const diagnostic = diagnoseProductionUnits({
    orders: [
      order({
        items: [
          pizzaItem({
            id: "ready-without-ready-at",
            productionStatus: "ready",
            readyAt: null,
          }),
        ],
      }),
    ],
  });

  assert.deepEqual(diagnostic.temporalIssues, [
    {
      sourceTable: "order_items",
      sourceItemId: "ready-without-ready-at",
      field: "ready_at",
      statusField: "production_status",
      statusValue: "ready",
      timestampValue: null,
      reason: "ready_status_without_ready_at",
    },
  ]);
  assert.equal(diagnostic.isConsistent, false);
}

{
  const diagnostic = diagnoseProductionUnits({
    orders: [order()],
    paninoItems: [
      paninoItem({
        id: "done-at-without-done",
        productKey: "panino",
        status: "in_progress",
        doneAt: "2026-08-03T19:45:00.000Z",
      }),
    ],
  });

  assert.deepEqual(diagnostic.temporalIssues, [
    {
      sourceTable: "panino_order_items",
      sourceItemId: "done-at-without-done",
      field: "done_at",
      statusField: "status",
      statusValue: "in_progress",
      timestampValue: "2026-08-03T19:45:00.000Z",
      reason: "done_at_without_done_status",
    },
  ]);
  assert.equal(diagnostic.isConsistent, false);
}

{
  const diagnostic = diagnoseProductionUnits({
    orders: [order()],
    paninoItems: [
      paninoItem({
        id: "done-without-done-at",
        productKey: "panino",
        status: "done",
        doneAt: null,
      }),
    ],
  });

  assert.deepEqual(diagnostic.temporalIssues, [
    {
      sourceTable: "panino_order_items",
      sourceItemId: "done-without-done-at",
      field: "done_at",
      statusField: "status",
      statusValue: "done",
      timestampValue: null,
      reason: "done_status_without_done_at",
    },
  ]);
  assert.equal(diagnostic.isConsistent, false);
}

{
  const aggregatedItem = {
    ...pizzaItem({ id: "aggregated-pizza" }),
    quantity: 2,
  } as ProductionUnitOrderItemInput & { quantity: number };

  const diagnostic = diagnoseProductionUnits({
    orders: [order({ items: [aggregatedItem] })],
  });

  assert.deepEqual(diagnostic.aggregatedQuantitySourceItems, [
    {
      sourceTable: "order_items",
      sourceItemId: "aggregated-pizza",
      quantity: 2,
      reason: "aggregated_quantity_not_supported",
    },
  ]);
  assert.equal(diagnostic.isConsistent, false);
}

{
  const item = pizzaItem({ id: "immutable-diagnostic" });
  const input = { orders: [order({ items: [item] })] };
  const before = JSON.stringify(input);

  diagnoseProductionUnits(input);

  assert.equal(JSON.stringify(input), before);
}
