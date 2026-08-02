import assert from "node:assert/strict";
import { analyzeCashierSlot, generateServiceSlots, planProduction } from "./cashier-flow";
import type { DraftItem, DraftPaninoItem, Order, OrderItem, Settings } from "./kds-types";
import { slotShortReason } from "../routes/_kds/-caisse-slot-presentation";

const settings: Settings = {
  id: 1,
  oven_capacity: 4,
  cook_time_sec: 240,
  prep_time_per_pizza_sec: 90,
  boxing_time_sec: 30,
  safety_margin_sec: 60,
  batch_interval_sec: 300,
  initial_paton_stock: 100,
  paton_losses: 0,
  paton_stock_reset_at: null,
  system_mode: "test",
};

function at(hour: number, minute: number) {
  return new Date(2026, 6, 31, hour, minute, 0, 0);
}

function timeLabel(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function draftPizza(index: number): DraftItem {
  return {
    pizza_id: `draft-${index}`,
    pizza_name: "Margherita",
    base: "tomato",
    extras: [],
    removed: [],
  };
}

function draftPizzas(count: number) {
  return Array.from({ length: count }, (_, index) => draftPizza(index));
}

function draftPanino({
  productKey = "panino",
  productName = "Pani'NO",
  friesMode = null,
  side = null,
}: {
  productKey?: string;
  productName?: string;
  friesMode?: string | null;
  side?: string | null;
} = {}): DraftPaninoItem {
  return {
    product_key: productKey,
    product_name: productName,
    base: null,
    fries_mode: friesMode,
    side,
    sauces: [],
    removed: [],
    extras: [],
  };
}

function orderPizza(orderId: string, index: number, productionStatus = "to_prepare"): OrderItem {
  return {
    id: `${orderId}-item-${index}`,
    order_id: orderId,
    pizza_id: `pizza-${index}`,
    pizza_name: "Margherita",
    base: "tomato",
    extras: [],
    removed: [],
    prepared: productionStatus !== "to_prepare",
    production_status: productionStatus as OrderItem["production_status"],
    cut_into: null,
  };
}

function order({
  id,
  customerName,
  requestedTime,
  pizzaCount,
  productionStatus = "to_prepare",
  status,
}: {
  id: string;
  customerName: string;
  requestedTime: Date;
  pizzaCount: number;
  productionStatus?: "to_prepare" | "in_oven" | "ready";
  status?: Order["status"];
}): Order {
  return {
    id,
    customer_name: customerName,
    requested_time: requestedTime.toISOString(),
    status: status ?? (productionStatus === "ready" ? "ready" : "to_prepare"),
    pizzaiolo_queue_position: null,
    prep_start_time: null,
    created_at: requestedTime.toISOString(),
    updated_at: requestedTime.toISOString(),
    cancelled_at: null,
    notes: null,
    pains_panino_status: null,
    customer_phone_hash: null,
    customer_phone: null,
    items: Array.from({ length: pizzaCount }, (_, index) =>
      orderPizza(id, index, productionStatus),
    ),
  };
}

{
  const slots = generateServiceSlots({ now: at(19, 5), intervalMinutes: 5 });
  assert.equal(timeLabel(slots[0]), "19:05");
  assert.equal(timeLabel(slots[slots.length - 1]), "22:30");
}

{
  const slots = generateServiceSlots({ now: at(12, 37), intervalMinutes: 5 });
  assert.equal(timeLabel(slots[0]), "12:40");
  assert.equal(timeLabel(slots[slots.length - 1]), "14:00");
}

{
  const slots = generateServiceSlots({ now: at(17, 14), intervalMinutes: 5 });
  assert.equal(timeLabel(slots[0]), "19:00");
  assert.equal(timeLabel(slots[slots.length - 1]), "22:30");
}

{
  const slot = analyzeCashierSlot({
    orders: [
      order({
        id: "existing-1",
        customerName: "Anne",
        requestedTime: at(19, 25),
        pizzaCount: 1,
      }),
    ],
    paninoItems: [],
    settings,
    cart: draftPizzas(3),
    paninoCart: [],
    requestedTime: at(19, 25),
    fromTime: at(19, 0),
  });

  assert.notEqual(slot.level, "charge");
  assert.notEqual(slot.level, "tendu");
  assert.deepEqual(
    slot.pizza.batches.map((batch) => batch.totalPizzas),
    [4],
  );
}

{
  const slot = analyzeCashierSlot({
    orders: [
      order({
        id: "existing-3",
        customerName: "Michel",
        requestedTime: at(19, 25),
        pizzaCount: 3,
      }),
    ],
    paninoItems: [],
    settings,
    cart: draftPizzas(1),
    paninoCart: [],
    requestedTime: at(19, 25),
    fromTime: at(19, 0),
  });

  assert.notEqual(slot.level, "charge");
  assert.notEqual(slot.level, "tendu");
  assert.deepEqual(
    slot.pizza.batches.map((batch) => batch.totalPizzas),
    [4],
  );
}

{
  const slot = analyzeCashierSlot({
    orders: [],
    paninoItems: [],
    settings,
    cart: draftPizzas(4),
    paninoCart: [],
    requestedTime: at(19, 0),
    fromTime: at(18, 30),
  });

  assert.notEqual(slot.level, "charge");
  assert.notEqual(slot.level, "tendu");
  assert.ok(slot.feasibilityScore >= 65);
  assert.equal(slotShortReason(slot), "Fournée complète");
}

{
  const slot = analyzeCashierSlot({
    orders: [
      order({
        id: "existing-1-reason",
        customerName: "Anne",
        requestedTime: at(19, 25),
        pizzaCount: 1,
      }),
    ],
    paninoItems: [],
    settings,
    cart: draftPizzas(3),
    paninoCart: [],
    requestedTime: at(19, 25),
    fromTime: at(19, 0),
  });

  assert.equal(slotShortReason(slot), "Complète bien une fournée");
}

{
  const slot = analyzeCashierSlot({
    orders: [
      order({
        id: "existing-3-reason",
        customerName: "Michel",
        requestedTime: at(19, 25),
        pizzaCount: 3,
      }),
    ],
    paninoItems: [],
    settings,
    cart: draftPizzas(1),
    paninoCart: [],
    requestedTime: at(19, 25),
    fromTime: at(19, 0),
  });

  assert.equal(slotShortReason(slot), "Complète bien une fournée");
}

{
  const slot = analyzeCashierSlot({
    orders: [],
    paninoItems: [],
    settings,
    cart: [],
    paninoCart: [draftPanino(), draftPanino(), draftPanino()],
    requestedTime: at(19, 30),
    fromTime: at(19, 0),
  });

  assert.ok(slot.feasibilityScore < 65);
  assert.equal(slot.level, "tendu");
}

{
  const slot = analyzeCashierSlot({
    orders: [],
    paninoItems: [],
    settings,
    cart: draftPizzas(1),
    paninoCart: [],
    requestedTime: at(18, 55),
    fromTime: at(19, 0),
  });

  assert.ok(slot.feasibilityScore <= 35);
  assert.equal(slot.level, "tendu");
}

{
  const slot = analyzeCashierSlot({
    orders: [
      order({
        id: "ready-empty-load",
        customerName: "Claire",
        requestedTime: at(19, 30),
        pizzaCount: 4,
        productionStatus: "ready",
      }),
    ],
    paninoItems: [],
    settings,
    cart: [],
    paninoCart: [],
    requestedTime: at(19, 30),
    fromTime: at(19, 0),
  });

  assert.equal(slot.pizza.remaining, 0);
  assert.equal(slot.level, "calme");
}

{
  const slot = analyzeCashierSlot({
    orders: [],
    paninoItems: [],
    settings,
    cart: [],
    paninoCart: [],
    requestedTime: at(19, 30),
    fromTime: at(19, 0),
  });

  assert.equal(slot.level, "calme");
}

{
  const threePlusOne = analyzeCashierSlot({
    orders: [
      order({
        id: "existing-3-for-score",
        customerName: "Michel",
        requestedTime: at(19, 25),
        pizzaCount: 3,
      }),
    ],
    paninoItems: [],
    settings,
    cart: draftPizzas(1),
    paninoCart: [],
    requestedTime: at(19, 25),
    fromTime: at(19, 0),
  });

  const fourPlusOne = analyzeCashierSlot({
    orders: [
      order({
        id: "existing-4-for-score",
        customerName: "Paul",
        requestedTime: at(19, 25),
        pizzaCount: 4,
      }),
    ],
    paninoItems: [],
    settings,
    cart: draftPizzas(1),
    paninoCart: [],
    requestedTime: at(19, 25),
    fromTime: at(19, 0),
  });

  assert.ok(fourPlusOne.feasibilityScore < threePlusOne.feasibilityScore);
  assert.notEqual(fourPlusOne.level, "tendu");
  assert.equal(slotShortReason(fourPlusOne), "Encore de la marge");
}

{
  const existingOrders = [
    order({
      id: "existing-7",
      customerName: "Lucie",
      requestedTime: at(19, 35),
      pizzaCount: 7,
    }),
  ];
  const slot = analyzeCashierSlot({
    orders: existingOrders,
    paninoItems: [],
    settings,
    cart: draftPizzas(1),
    paninoCart: [],
    requestedTime: at(19, 35),
    fromTime: at(19, 0),
  });

  assert.notEqual(slot.level, "charge");
  assert.notEqual(slot.level, "tendu");
  assert.equal(slotShortReason(slot), "Complète bien une fournée");

  const plan = planProduction({
    pickupTime: at(19, 35),
    draftOrder: { cart: draftPizzas(1) },
    existingOrders,
    settings,
    now: at(19, 0),
  });

  assert.deepEqual(
    plan.batches.map((batch) => batch.totalPizzas),
    [4, 4],
  );
}

{
  const slot = analyzeCashierSlot({
    orders: [
      order({
        id: "existing-1-before-draft",
        customerName: "Anne",
        requestedTime: at(18, 40),
        pizzaCount: 1,
      }),
    ],
    paninoItems: [],
    settings,
    cart: draftPizzas(4),
    paninoCart: [],
    requestedTime: at(19, 0),
    fromTime: at(18, 30),
  });

  assert.deepEqual(
    slot.pizza.batches.map((batch) => batch.totalPizzas),
    [4, 1],
  );
  assert.equal(slotShortReason(slot), "Fournée complète + fournée ouverte");
}

{
  const slot = analyzeCashierSlot({
    orders: [],
    paninoItems: [],
    settings,
    cart: [],
    paninoCart: [
      draftPanino({
        productKey: "cornet_frites",
        productName: "Cornet frites",
        friesMode: "frites",
      }),
      draftPanino({
        productKey: "cornet_frites",
        productName: "Pommes grenailles",
        friesMode: "grenailles",
      }),
    ],
    requestedTime: at(19, 30),
    fromTime: at(19, 0),
  });

  assert.equal(slot.fries.mixedLoad, true);
  assert.equal(slot.level, "charge");
}

{
  const plan = planProduction({
    pickupTime: at(19, 30),
    draftOrder: { cart: draftPizzas(6) },
    existingOrders: [],
    settings,
    now: at(19, 0),
  });

  assert.deepEqual(
    plan.draftBatches.map((batch) => batch.totalPizzas),
    [4, 2],
  );
}

{
  const plan = planProduction({
    pickupTime: at(19, 35),
    draftOrder: { cart: draftPizzas(2) },
    existingOrders: [
      order({
        id: "existing-6",
        customerName: "Paul",
        requestedTime: at(19, 30),
        pizzaCount: 6,
      }),
    ],
    settings,
    now: at(19, 0),
  });

  assert.deepEqual(
    plan.batches.map((batch) => batch.totalPizzas),
    [4, 4],
  );
  assert.equal(plan.draftBatches[0].existingPizzas, 2);
  assert.equal(plan.draftBatches[0].draftPizzas, 2);
}

{
  const plan = planProduction({
    pickupTime: at(19, 30),
    draftOrder: { cart: draftPizzas(4) },
    existingOrders: [
      order({
        id: "ready-4",
        customerName: "Claire",
        requestedTime: at(19, 30),
        pizzaCount: 4,
        productionStatus: "ready",
      }),
    ],
    settings,
    now: at(19, 5),
  });

  assert.equal(plan.remainingPizzasAtPickup, 0);
  assert.equal(plan.existingPizzasInDraftBatches, 0);
  assert.deepEqual(
    plan.draftBatches.map((batch) => batch.totalPizzas),
    [4],
  );
  assert.deepEqual(plan.projectedOrders, []);
}

{
  const plan = planProduction({
    pickupTime: at(19, 30),
    draftOrder: { cart: draftPizzas(4) },
    existingOrders: [
      order({
        id: "ready-items",
        customerName: "Claire",
        requestedTime: at(19, 30),
        pizzaCount: 4,
        productionStatus: "ready",
        status: "to_prepare",
      }),
    ],
    settings,
    now: at(19, 5),
  });

  assert.equal(plan.remainingPizzasAtPickup, 0);
  assert.equal(plan.existingPizzasInDraftBatches, 0);
  assert.deepEqual(plan.projectedOrders, []);
}

{
  const plan = planProduction({
    pickupTime: at(19, 30),
    draftOrder: { cart: draftPizzas(4) },
    existingOrders: [
      order({
        id: "delivered-4",
        customerName: "Claire",
        requestedTime: at(19, 30),
        pizzaCount: 4,
        status: "delivered",
      }),
    ],
    settings,
    now: at(19, 5),
  });

  assert.equal(plan.remainingPizzasAtPickup, 0);
  assert.equal(plan.existingPizzasInDraftBatches, 0);
  assert.deepEqual(plan.projectedOrders, []);
}

console.log("cashier-flow tests passed");
