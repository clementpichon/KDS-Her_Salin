import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  anonymizeProductionPlanSnapshot,
  compareProductionPlanWithLegacy,
  type ProductionPlanShadowValidationReport,
  type ProductionPlanSnapshot,
  type ProductionPlanSnapshotOrder,
  type ProductionPlanSnapshotOrderItem,
  type ProductionPlanSnapshotPaninoItem,
} from "./production-plan-shadow-validation";

const REQUESTED_1930 = "2026-08-03T19:30:00.000Z";

function order({
  id = "order-1",
  customerName = "Michel",
  requestedTime = REQUESTED_1930,
  status = "to_prepare",
  painsPaninoStatus = null,
}: {
  id?: string;
  customerName?: string | null;
  requestedTime?: string | null;
  status?: ProductionPlanSnapshotOrder["status"];
  painsPaninoStatus?: string | null;
} = {}): ProductionPlanSnapshotOrder {
  return {
    id,
    customer_name: customerName,
    requested_time: requestedTime,
    status,
    cancelled_at: null,
    phone: "06 00 00 00 00",
    customer_phone_hash: "phone-hash",
    external_order_id: "external-order",
    comment: "Appeler Michel a l'arrivee.",
    ...(painsPaninoStatus ? { pains_panino_status: painsPaninoStatus } : {}),
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
  productionStatus?: ProductionPlanSnapshotOrderItem["production_status"];
  includeProductionStatus?: boolean;
  prepared?: boolean;
} = {}): ProductionPlanSnapshotOrderItem {
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
    prepared,
    ...(includeProductionStatus ? { production_status: productionStatus } : {}),
    oven_batch_id: null,
    sent_to_oven_at: null,
    ready_at: productionStatus === "ready" ? "2026-08-03T19:35:00.000Z" : null,
    cut_into: null,
    customer_notes: "Sans ticket client dans les fixtures.",
  };
}

function paninoItem({
  id = "panino-item-1",
  orderId = "order-1",
  productKey = "panino",
  productName = "Pani'NO Burger",
  status = "pending",
  side = null,
}: {
  id?: string;
  orderId?: string;
  productKey?: string;
  productName?: string;
  status?: ProductionPlanSnapshotPaninoItem["status"];
  side?: string | null;
} = {}): ProductionPlanSnapshotPaninoItem {
  return {
    id,
    order_id: orderId,
    product_key: productKey,
    product_name: productName,
    base: productKey === "panino" ? "creme" : null,
    fries_mode: null,
    side,
    sauces: [],
    removed: [],
    extras: [],
    status,
    done_at: status === "done" ? "2026-08-03T19:45:00.000Z" : null,
    external_item_id: "external-item",
    notes: "Information client a retirer.",
  };
}

function snapshot({
  orders = [order()],
  orderItems = [],
  paninoItems = [],
  legacy,
  source = "fixture",
}: {
  orders?: readonly ProductionPlanSnapshotOrder[];
  orderItems?: readonly ProductionPlanSnapshotOrderItem[];
  paninoItems?: readonly ProductionPlanSnapshotPaninoItem[];
  legacy?: ProductionPlanSnapshot["legacy"];
  source?: ProductionPlanSnapshot["source"];
} = {}): ProductionPlanSnapshot {
  return {
    snapshotId: "snapshot-test",
    capturedAt: "2026-08-03T19:00:00.000Z",
    source,
    orders,
    orderItems,
    paninoItems,
    ...(legacy ? { legacy } : {}),
  };
}

function hasFinding(report: ProductionPlanShadowValidationReport, code: string) {
  return [
    ...report.matches,
    ...report.warnings,
    ...report.blockingDifferences,
    ...report.unsupportedCases,
  ].some((finding) => finding.code === code);
}

function countFindings(report: ProductionPlanShadowValidationReport, code: string) {
  return [
    ...report.matches,
    ...report.warnings,
    ...report.blockingDifferences,
    ...report.unsupportedCases,
  ].filter((finding) => finding.code === code).length;
}

function assertNoBlocking(report: ProductionPlanShadowValidationReport) {
  assert.deepEqual(report.blockingDifferences, []);
  assert.equal(report.planUsable, true);
}

{
  const report = compareProductionPlanWithLegacy(
    snapshot({
      orders: [],
      orderItems: [],
      paninoItems: [],
    }),
  );

  assertNoBlocking(report);
  assert.equal(report.counts.source.physicalProducts, 0);
  assert.equal(report.counts.plan.physicalProducts, 0);
  assert.equal(report.counts.plan.activeLoadByStation.pizzaiolo, 0);
}

{
  const report = compareProductionPlanWithLegacy(
    snapshot({
      orderItems: [pizzaItem()],
      legacy: { activeLoadByStation: { pizzaiolo: 1 } },
    }),
  );

  assertNoBlocking(report);
  assert.equal(report.counts.plan.pizzas, 1);
  assert.equal(report.counts.plan.pizzasCurrentlyPreparable, 1);
  assert.equal(report.counts.plan.activeLoadByStation.pizzaiolo, 1);
  assert.ok(hasFinding(report, "legacy.activeLoadByStation.pizzaiolo"));
}

{
  const report = compareProductionPlanWithLegacy(
    snapshot({
      orderItems: Array.from({ length: 4 }, (_, index) =>
        pizzaItem({
          id: `pizza-${index + 1}`,
          includeProductionStatus: false,
          prepared: true,
        }),
      ),
    }),
  );

  assertNoBlocking(report);
  assert.equal(report.counts.plan.pizzas, 4);
  assert.equal(report.counts.plan.pizzasReadyForOven, 4);
  assert.equal(report.counts.plan.activeLoadByStation.four, 4);
}

{
  const report = compareProductionPlanWithLegacy(
    snapshot({
      orderItems: Array.from({ length: 5 }, (_, index) =>
        pizzaItem({
          id: `pizza-${index + 1}`,
          includeProductionStatus: false,
          prepared: true,
        }),
      ),
    }),
  );

  assertNoBlocking(report);
  assert.equal(report.counts.plan.pizzas, 5);
  assert.equal(report.counts.plan.pizzasReadyForOven, 5);
  assert.equal(report.counts.plan.activeLoadByStation.four, 5);
}

{
  const report = compareProductionPlanWithLegacy(
    snapshot({
      orders: [order({ id: "mixed-order" })],
      orderItems: [pizzaItem({ id: "mixed-pizza", orderId: "mixed-order" })],
      paninoItems: [
        paninoItem({
          id: "mixed-panino",
          orderId: "mixed-order",
          productKey: "panino",
          productName: "Pani'NO Burger",
        }),
      ],
    }),
  );

  assertNoBlocking(report);
  assert.equal(report.counts.plan.pizzas, 1);
  assert.equal(report.counts.plan.paninos, 1);
  assert.equal(report.counts.plan.mixedOrders, 1);
}

{
  const report = compareProductionPlanWithLegacy(
    snapshot({
      orders: [{ ...order(), status: "cancelled", cancelled_at: "2026-08-03T19:05:00.000Z" }],
      orderItems: [pizzaItem()],
    }),
  );

  assertNoBlocking(report);
  assert.equal(report.counts.plan.cancelledProducts, 1);
  assert.equal(report.counts.plan.activeLoadByStation.pizzaiolo, 0);
}

{
  const report = compareProductionPlanWithLegacy(
    snapshot({
      orders: [order({ status: "ready" })],
      orderItems: [pizzaItem({ includeProductionStatus: false })],
    }),
  );

  assertNoBlocking(report);
  assert.equal(report.counts.plan.readyProducts, 1);
  assert.equal(report.counts.plan.activeLoadByStation.pizzaiolo, 0);
}

{
  const report = compareProductionPlanWithLegacy(
    snapshot({
      orders: [order({ status: "delivered" })],
      orderItems: [pizzaItem({ includeProductionStatus: false })],
    }),
  );

  assertNoBlocking(report);
  assert.equal(report.counts.plan.readyProducts, 0);
  assert.equal(report.counts.plan.inProgressProducts, 0);
  assert.equal(report.counts.plan.activeLoadByStation.pizzaiolo, 0);
}

{
  const report = compareProductionPlanWithLegacy(
    snapshot({
      orders: [order({ painsPaninoStatus: "pain_au_four" })],
      paninoItems: [paninoItem()],
    }),
  );

  assertNoBlocking(report);
  assert.ok(hasFinding(report, "legacy_panino_bread_state_not_modelled"));
  assert.equal(report.unsupportedCases.length, 1);
}

{
  const report = compareProductionPlanWithLegacy(
    snapshot({
      paninoItems: [
        paninoItem({
          productKey: "fishno",
          productName: "Fish & NO",
          side: "Pommes grenailles",
        }),
      ],
    }),
  );

  assertNoBlocking(report);
  assert.equal(report.counts.plan.fishNo, 1);
  assert.equal(report.counts.plan.activeLoadByStation.fish_fryer, 1);
  assert.equal(report.counts.plan.activeLoadByStation.fries_fryer, 1);
}

{
  const report = compareProductionPlanWithLegacy(
    snapshot({
      paninoItems: [
        paninoItem({
          productKey: "dessert",
          productName: "Tiramisu",
        }),
      ],
    }),
  );

  assert.equal(report.planUsable, false);
  assert.equal(report.counts.plan.productsWithoutWorkflow, 1);
  assert.ok(hasFinding(report, "plan_unusable"));
  assert.ok(hasFinding(report, "plan.production_unit_without_work_unit"));
}

{
  const report = compareProductionPlanWithLegacy(
    snapshot({
      orders: [{ id: "legacy-order" }],
      orderItems: [pizzaItem({ orderId: "legacy-order" })],
    }),
  );

  assertNoBlocking(report);
  assert.ok(hasFinding(report, "missing_requested_time"));
  assert.ok(hasFinding(report, "missing_order_status"));
}

{
  const report = compareProductionPlanWithLegacy(
    snapshot({
      orders: [order({ id: "order-without-items" })],
      orderItems: [],
      paninoItems: [],
    }),
  );

  assertNoBlocking(report);
  assert.ok(hasFinding(report, "order_without_products"));
  assert.ok(hasFinding(report, "count.orders"));
}

{
  const report = compareProductionPlanWithLegacy(
    snapshot({
      orders: [],
      orderItems: [pizzaItem({ orderId: "missing-order" })],
    }),
  );

  assert.equal(report.planUsable, true);
  assert.ok(hasFinding(report, "source_item_missing_order"));
  assert.equal(report.blockingDifferences.length, 1);
}

{
  const report = compareProductionPlanWithLegacy(
    snapshot({
      orders: [order({ status: "ready" })],
      orderItems: [pizzaItem({ productionStatus: "to_prepare" })],
    }),
  );

  assertNoBlocking(report);
  assert.ok(hasFinding(report, "order_item_status_divergence"));
  assert.ok(hasFinding(report, "count.pizzasCurrentlyPreparable"));
}

{
  const input = snapshot({
    source: "supabase-manual-export",
    orderItems: [pizzaItem()],
  });
  const anonymized = anonymizeProductionPlanSnapshot(input);
  const report = compareProductionPlanWithLegacy(anonymized);

  assert.equal(anonymized.source, "supabase-manual-export");
  assertNoBlocking(report);
  assert.equal(report.counts.source.physicalProducts, 1);
}

{
  const source = snapshot({
    orders: [order({ id: "sensitive-order", customerName: "Client Reel" })],
    orderItems: [pizzaItem({ id: "sensitive-pizza", orderId: "sensitive-order" })],
    paninoItems: [paninoItem({ id: "sensitive-panino", orderId: "sensitive-order" })],
    legacy: { counts: { physicalProducts: 2 } },
  });

  const first = anonymizeProductionPlanSnapshot(source);
  const second = anonymizeProductionPlanSnapshot(source);

  assert.deepEqual(first, second);
  assert.equal(first.snapshotId, "snapshot-anonymized");
  assert.equal(first.orders[0]?.id, "order-001");
  assert.equal(first.orders[0]?.customer_name, "Client 001");
  assert.equal(first.orders[0]?.phone, null);
  assert.equal(first.orders[0]?.customer_phone_hash, null);
  assert.equal(first.orders[0]?.comment, null);
  assert.equal(first.orderItems?.[0]?.id, "pizza-item-001");
  assert.equal(first.orderItems?.[0]?.order_id, "order-001");
  assert.equal(first.paninoItems?.[0]?.id, "panino-item-001");
  assert.equal(first.paninoItems?.[0]?.order_id, "order-001");
  assert.equal(first.paninoItems?.[0]?.notes, null);
}

{
  const input = snapshot({
    orderItems: [pizzaItem()],
    paninoItems: [paninoItem()],
  });

  assert.deepEqual(compareProductionPlanWithLegacy(input), compareProductionPlanWithLegacy(input));
}

{
  const input = snapshot({
    orderItems: [pizzaItem()],
    paninoItems: [paninoItem()],
  });
  const before = JSON.parse(JSON.stringify(input)) as ProductionPlanSnapshot;

  compareProductionPlanWithLegacy(input);
  anonymizeProductionPlanSnapshot(input);

  assert.deepEqual(input, before);
}

{
  const fixture = JSON.parse(
    readFileSync(
      new URL("./fixtures/production-plan/service-shadow-snapshot.json", import.meta.url),
      "utf8",
    ),
  ) as ProductionPlanSnapshot;
  const report = compareProductionPlanWithLegacy(fixture);

  assertNoBlocking(report);
  assert.equal(report.counts.plan.physicalProducts, 4);
  assert.equal(countFindings(report, "ambiguous_legacy_status"), 2);
}
