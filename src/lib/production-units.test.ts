import assert from "node:assert/strict";
import {
  buildProductionUnits,
  productionUnitId,
  type ProductionUnitOrderInput,
  type ProductionUnitOrderItemInput,
  type ProductionUnitPaninoItemInput,
} from "./production-units";

function order({
  id = "order-1",
  customerName = "Michel",
  requestedTime = "2026-08-02T19:30:00.000Z",
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
  extras = [],
  removed = [],
}: {
  id?: string;
  orderId?: string;
  name?: string;
  productionStatus?: ProductionUnitOrderItemInput["production_status"];
  prepared?: boolean;
  extras?: string[];
  removed?: string[];
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
    extras,
    removed,
    prepared,
    production_status: productionStatus,
    oven_batch_id: null,
    sent_to_oven_at: null,
    ready_at: null,
    cut_into: null,
  };
}

function legacyPizzaItem({
  id = "legacy-pizza-item",
  orderId = "legacy-order",
  prepared,
}: {
  id?: string;
  orderId?: string;
  prepared?: boolean;
} = {}): ProductionUnitOrderItemInput {
  return {
    id,
    order_id: orderId,
    pizza_name: "Ancienne pizza",
    prepared,
  };
}

function paninoItem({
  id,
  orderId = "order-1",
  productKey,
  productName,
  status = "pending",
  side = null,
  friesMode = null,
}: {
  id: string;
  orderId?: string;
  productKey: string;
  productName: string;
  status?: ProductionUnitPaninoItemInput["status"];
  side?: string | null;
  friesMode?: string | null;
}): ProductionUnitPaninoItemInput {
  return {
    id,
    order_id: orderId,
    product_key: productKey,
    product_name: productName,
    base: productKey === "panino" ? "Crème" : null,
    fries_mode: friesMode,
    side,
    sauces: ["Sauce blanche"],
    removed: [],
    extras: [],
    status,
    done_at: status === "done" ? "2026-08-02T19:35:00.000Z" : null,
    created_at: "2026-08-02T19:00:00.000Z",
  };
}

{
  const item = pizzaItem();
  const units = buildProductionUnits({ orders: [order({ items: [item] })] });

  assert.equal(units.length, 1);
  assert.equal(units[0].id, "order_items:pizza-item-1");
  assert.equal(units[0].sourceTable, "order_items");
  assert.equal(units[0].sourceItemId, "pizza-item-1");
  assert.equal(units[0].kind, "pizza");
  assert.equal(units[0].status, "created");
  assert.equal(units[0].statusSource, "item_status");
  assert.equal(units[0].quantity, 1);
  assert.equal(units[0].customerName, "Michel");
  assert.equal(units[0].requestedTime, "2026-08-02T19:30:00.000Z");
}

{
  const items = [1, 2, 3].map((index) =>
    pizzaItem({ id: `regina-${index}`, orderId: "order-identical", name: "Regina" }),
  );
  const units = buildProductionUnits({
    orders: [order({ id: "order-identical", items })],
  });

  assert.equal(units.length, 3);
  assert.deepEqual(
    units.map((unit) => unit.id),
    ["order_items:regina-1", "order_items:regina-2", "order_items:regina-3"],
  );
  assert.deepEqual(
    units.map((unit) => unit.productName),
    ["Regina", "Regina", "Regina"],
  );
}

{
  const orders = [
    order({
      id: "mixed-order",
      items: [pizzaItem({ id: "mixed-pizza", orderId: "mixed-order" })],
    }),
  ];
  const paninoItems = [
    paninoItem({
      id: "mixed-panino",
      orderId: "mixed-order",
      productKey: "panino",
      productName: "Pani'NO Burger",
      friesMode: "Dans le Pani'NO",
    }),
    paninoItem({
      id: "mixed-fish",
      orderId: "mixed-order",
      productKey: "fishno",
      productName: "Fish & NO",
      side: "Pommes grenailles",
    }),
    paninoItem({
      id: "mixed-fries",
      orderId: "mixed-order",
      productKey: "cornet_frites",
      productName: "Cornet de frites",
    }),
  ];

  const units = buildProductionUnits({ orders, paninoItems });

  assert.deepEqual(
    units.map((unit) => unit.kind),
    ["pizza", "panino", "fish_no", "fries"],
  );
  assert.equal(units[1].panino?.friesMode, "Dans le Pani'NO");
  assert.equal(units[2].panino?.side, "Pommes grenailles");
  assert.equal(units[3].productKey, "cornet_frites");
}

{
  const units = buildProductionUnits({
    orders: [
      order({
        items: [pizzaItem({ id: "ready-pizza", productionStatus: "ready" })],
      }),
    ],
  });

  assert.equal(units[0].status, "ready");
  assert.equal(units[0].statusSource, "item_status");
}

{
  const units = buildProductionUnits({
    orders: [
      order({
        items: [pizzaItem({ id: "oven-pizza", productionStatus: "in_oven", prepared: true })],
      }),
    ],
  });

  assert.equal(units[0].status, "in_progress");
  assert.equal(units[0].statusSource, "item_status");
  assert.equal(units[0].pizza?.productionStatus, "in_oven");
}

{
  const units = buildProductionUnits({
    orders: [
      order({
        status: "cancelled",
        cancelledAt: "2026-08-02T19:12:00.000Z",
        items: [pizzaItem({ id: "cancelled-pizza", productionStatus: "ready" })],
      }),
    ],
    paninoItems: [
      paninoItem({
        id: "cancelled-panino",
        productKey: "panino",
        productName: "Pani'NO",
        status: "done",
      }),
    ],
  });

  assert.deepEqual(
    units.map((unit) => [unit.status, unit.statusSource]),
    [
      ["cancelled", "order_cancelled"],
      ["cancelled", "order_cancelled"],
    ],
  );
}

{
  const units = buildProductionUnits({
    orders: [
      order({
        id: "legacy-order",
        customerName: null,
        requestedTime: null,
        status: "to_prepare",
        items: [legacyPizzaItem({ prepared: true })],
      }),
    ],
  });

  assert.equal(units[0].status, "in_progress");
  assert.equal(units[0].statusSource, "legacy_prepared");
  assert.equal(units[0].customerName, null);
  assert.equal(units[0].requestedTime, null);
  assert.equal(units[0].pizza?.productionStatus, null);
}

{
  const units = buildProductionUnits({
    orders: [
      order({
        status: "ready",
        items: [legacyPizzaItem({ id: "ready-fallback", orderId: "order-1" })],
      }),
    ],
  });

  assert.equal(units[0].status, "ready");
  assert.equal(units[0].statusSource, "order_ready_fallback");
}

{
  const units = buildProductionUnits({
    orders: [
      order({
        status: "ready",
        items: [pizzaItem({ id: "item-status-wins", productionStatus: "to_prepare" })],
      }),
    ],
  });

  assert.equal(units[0].status, "created");
  assert.equal(units[0].statusSource, "item_status");
}

{
  const item = pizzaItem({
    id: "custom-pizza",
    productionStatus: "to_prepare",
    extras: ["Burrata", "Olives"],
    removed: ["Champignons"],
  });
  item.base = "cream";
  item.default_base_snapshot = "tomato";
  item.explicit_base_snapshot = "cream";
  item.base_resolution = "cashier_override";
  item.base_confidence = 0.92;
  item.cut_into = 6;

  const units = buildProductionUnits({ orders: [order({ items: [item] })] });

  assert.equal(units[0].pizza?.base, "cream");
  assert.equal(units[0].pizza?.defaultBaseSnapshot, "tomato");
  assert.equal(units[0].pizza?.explicitBaseSnapshot, "cream");
  assert.equal(units[0].pizza?.baseResolution, "cashier_override");
  assert.equal(units[0].pizza?.baseConfidence, 0.92);
  assert.deepEqual(units[0].pizza?.extras, ["Burrata", "Olives"]);
  assert.deepEqual(units[0].pizza?.removed, ["Champignons"]);
  assert.equal(units[0].pizza?.cutInto, 6);
}

{
  const explicitOrder = order({ id: "explicit-order", items: [] });
  const explicitItems = [
    pizzaItem({ id: "explicit-item", orderId: "explicit-order", name: "Margherita" }),
  ];

  const units = buildProductionUnits({
    orders: [explicitOrder],
    orderItems: explicitItems,
  });

  assert.equal(units.length, 1);
  assert.equal(units[0].orderId, "explicit-order");
  assert.equal(units[0].id, productionUnitId("order_items", "explicit-item"));
}

{
  const inputOrder = order({
    items: [
      pizzaItem({
        id: "immutable-pizza",
        extras: ["Burrata"],
        removed: ["Oignons"],
      }),
    ],
  });
  const input = { orders: [inputOrder] };
  const before = JSON.stringify(input);
  const units = buildProductionUnits(input);

  (units[0].pizza?.extras as string[]).push("Olives");
  (units[0].pizza?.removed as string[]).push("Champignons");

  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(inputOrder.items?.[0].extras, ["Burrata"]);
  assert.deepEqual(inputOrder.items?.[0].removed, ["Oignons"]);
}
