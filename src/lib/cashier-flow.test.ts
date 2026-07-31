import assert from "node:assert/strict";
import { analyzeCashierSlot, generateServiceSlots, planProduction } from "./cashier-flow";
import type { DraftItem, Order, OrderItem, Settings } from "./kds-types";

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
}: {
  id: string;
  customerName: string;
  requestedTime: Date;
  pizzaCount: number;
  productionStatus?: "to_prepare" | "in_oven" | "ready";
}): Order {
  return {
    id,
    customer_name: customerName,
    requested_time: requestedTime.toISOString(),
    status: productionStatus === "ready" ? "ready" : "to_prepare",
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
  });

  assert.equal(slot.level, "actif");
  assert.deepEqual(
    slot.pizza.batches.map((batch) => batch.totalPizzas),
    [4],
  );
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
}

console.log("cashier-flow tests passed");
