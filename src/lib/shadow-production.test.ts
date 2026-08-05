import assert from "node:assert/strict";
import {
  createShadowProductionScheduler,
  getLastShadowProductionReport,
  runShadowProduction,
  shouldRunShadowProductionAfterReload,
  type ShadowProductionClock,
} from "./shadow-production";
import type {
  ProductionUnitOrderInput,
  ProductionUnitOrderItemInput,
  ProductionUnitPaninoItemInput,
} from "./production-units";

const REQUESTED_1930 = "2026-08-05T19:30:00.000Z";

function order({
  id = "order-1",
  items = [],
}: {
  id?: string;
  items?: readonly ProductionUnitOrderItemInput[];
} = {}): ProductionUnitOrderInput {
  return {
    id,
    customer_name: "Client test",
    requested_time: REQUESTED_1930,
    status: "to_prepare",
    cancelled_at: null,
    items,
  };
}

function pizzaItem({
  id = "pizza-1",
  orderId = "order-1",
  pizzaName = "Regina",
}: {
  id?: string;
  orderId?: string;
  pizzaName?: string;
} = {}): ProductionUnitOrderItemInput {
  return {
    id,
    order_id: orderId,
    pizza_id: `pizza-${id}`,
    pizza_name: pizzaName,
    base: "tomate",
    extras: [],
    removed: [],
    prepared: false,
    production_status: "to_prepare",
    ready_at: null,
    sent_to_oven_at: null,
    oven_batch_id: null,
    cut_into: null,
  };
}

function paninoItem({
  id = "unknown-1",
  orderId = "order-1",
  productKey = "unknown_product",
  productName = "Produit inconnu",
}: {
  id?: string;
  orderId?: string;
  productKey?: string;
  productName?: string;
} = {}): ProductionUnitPaninoItemInput {
  return {
    id,
    order_id: orderId,
    product_key: productKey,
    product_name: productName,
    status: "pending",
    base: null,
    fries_mode: null,
    side: null,
    sauces: [],
    removed: [],
    extras: [],
    done_at: null,
    created_at: "2026-08-05T19:00:00.000Z",
  };
}

function tickingClock(): ShadowProductionClock {
  let now = 0;
  return {
    nowIso: () => "2026-08-05T19:00:00.000Z",
    nowMs: () => {
      now += 5;
      return now;
    },
  };
}

function slowClock(): ShadowProductionClock {
  let now = 0;
  return {
    nowIso: () => "2026-08-05T19:00:00.000Z",
    nowMs: () => {
      now += 50;
      return now;
    },
  };
}

function fullCoverage() {
  return {
    orders: true,
    orderItems: true,
    paninoItems: true,
  };
}

function snapshot(value: unknown) {
  return JSON.stringify(value);
}

{
  const orders = [
    order({
      items: [pizzaItem({ id: "pizza-a" }), pizzaItem({ id: "pizza-b" })],
    }),
  ];

  const report = runShadowProduction({
    orders,
    paninoItems: [],
    coverage: fullCoverage(),
    clock: tickingClock(),
    idSeed: "counter-test",
  });

  assert.equal(report.planUsable, true);
  assert.equal(report.orders, 1);
  assert.equal(report.productionUnits, 2);
  assert.equal(report.workUnits, 6);
  assert.equal(report.batches, 2);
  assert.deepEqual(report.coverage, fullCoverage());
  assert.equal(report.performanceStatus, "ok");
  assert.equal(report.warnings, 0);
  assert.deepEqual(report.warningDiagnostics, []);
  assert.equal(report.blockingDifferences, 0);
  assert.equal(report.performance.schedulerMs > 0, true);
  assert.equal(report.performance.batchBuilderMs > 0, true);
  assert.equal(report.performance.totalMs, report.durationMs);
}

{
  const report = runShadowProduction({
    orders: [order({ items: [pizzaItem()] })],
    clock: tickingClock(),
    idSeed: "coverage-warning",
    coverage: {
      orders: true,
      orderItems: true,
      paninoItems: false,
    },
  });

  assert.equal(report.planUsable, true);
  assert.equal(report.coverage.paninoItems, false);
  assert.equal(report.warnings, 1);
  assert.match(report.warningDiagnostics.join("\n"), /panino_items_not_included/);
  assert.equal(report.blockingDifferences, 0);
}

{
  const report = runShadowProduction({
    orders: [order({ items: [pizzaItem()] })],
    paninoItems: [],
    coverage: fullCoverage(),
    clock: tickingClock(),
    idSeed: "coverage-complete",
  });

  assert.equal(report.planUsable, true);
  assert.equal(report.warnings, 0);
  assert.equal(report.warningDiagnostics.length, 0);
}

{
  const report = runShadowProduction({
    orders: [order({ items: [pizzaItem()] })],
    paninoItems: [],
    coverage: fullCoverage(),
    clock: slowClock(),
    idSeed: "slow-plan",
  });

  assert.equal(report.planUsable, true);
  assert.equal(report.performanceStatus, "slow");
  assert.equal(report.warnings, 1);
  assert.match(report.warningDiagnostics.join("\n"), /shadow_production_slow/);
  assert.equal(report.blockingDifferences, 0);
}

{
  const orders = [order({ items: [pizzaItem()] })];

  assert.doesNotThrow(() =>
    runShadowProduction({
      orders,
      paninoItems: [],
      coverage: fullCoverage(),
      clock: tickingClock(),
      dependencies: {
        buildProductionUnits: () => {
          throw new Error("boom");
        },
      },
    }),
  );

  const report = getLastShadowProductionReport();
  assert.ok(report);
  assert.equal(report.planUsable, false);
  assert.equal(report.orders, 1);
  assert.equal(report.productionUnits, 0);
  assert.equal(report.workUnits, 0);
  assert.equal(report.batches, 0);
  assert.equal(report.warnings, 0);
  assert.equal(report.blockingDifferences, 1);
  assert.equal(report.error, "boom");
  assert.match(report.diagnostics.join("\n"), /shadow_production_failed/);
}

{
  const orders = [order()];
  const paninoItems = [paninoItem()];
  const report = runShadowProduction({
    orders,
    paninoItems,
    coverage: {
      orders: true,
      orderItems: true,
      paninoItems: false,
    },
    clock: tickingClock(),
    idSeed: "unusable-plan",
  });

  assert.equal(report.planUsable, false);
  assert.equal(report.productionUnits, 1);
  assert.equal(report.workUnits, 0);
  assert.equal(report.batches, 0);
  assert.equal(report.warnings, 1);
  assert.match(report.warningDiagnostics.join("\n"), /panino_items_not_included/);
  assert.equal(report.blockingDifferences, 1);
  assert.match(report.diagnostics.join("\n"), /production_unit_without_work_unit/);
  assert.doesNotMatch(report.warningDiagnostics.join("\n"), /production_unit_without_work_unit/);
}

{
  const orders = [order({ items: [pizzaItem()] })];
  const before = snapshot(orders);

  const first = runShadowProduction({
    orders,
    paninoItems: [],
    coverage: fullCoverage(),
    clock: tickingClock(),
    idSeed: "deterministic",
  });
  const second = runShadowProduction({
    orders,
    paninoItems: [],
    coverage: fullCoverage(),
    clock: tickingClock(),
    idSeed: "deterministic",
  });

  assert.deepEqual(first, second);
  assert.equal(snapshot(orders), before);
}

{
  const tasks: (() => void)[] = [];
  const publishedOrderCounts: number[] = [];
  const scheduler = createShadowProductionScheduler({
    enqueue: (task) => tasks.push(task),
    run: (params) => {
      const report = runShadowProduction({
        ...params,
        paninoItems: [],
        coverage: fullCoverage(),
        clock: tickingClock(),
      });
      publishedOrderCounts.push(report.orders);
      return report;
    },
  });

  scheduler.schedule({
    orders: [order({ id: "obsolete", items: [pizzaItem({ orderId: "obsolete" })] })],
  });
  scheduler.schedule({
    orders: [
      order({ id: "latest-a", items: [pizzaItem({ id: "latest-pizza-a", orderId: "latest-a" })] }),
      order({ id: "latest-b", items: [pizzaItem({ id: "latest-pizza-b", orderId: "latest-b" })] }),
    ],
  });

  assert.equal(tasks.length, 1);
  tasks[0]?.();
  assert.deepEqual(publishedOrderCounts, [2]);
}

{
  assert.equal(
    shouldRunShadowProductionAfterReload({
      ordersError: null,
      orderItemsError: null,
    }),
    true,
  );
  assert.equal(
    shouldRunShadowProductionAfterReload({
      ordersError: new Error("orders failed"),
      orderItemsError: null,
    }),
    false,
  );
  assert.equal(
    shouldRunShadowProductionAfterReload({
      ordersError: null,
      orderItemsError: new Error("items failed"),
    }),
    false,
  );
}

{
  const logs: string[] = [];
  const orders = [order({ items: [pizzaItem()] })];

  runShadowProduction({
    orders,
    paninoItems: [],
    coverage: fullCoverage(),
    clock: tickingClock(),
    idSeed: "debug-disabled",
    logger: {
      log: (message) => logs.push(message),
    },
  });

  assert.equal(logs.length, 0);

  const report = runShadowProduction({
    orders,
    paninoItems: [],
    coverage: fullCoverage(),
    clock: tickingClock(),
    idSeed: "debug-log",
    debug: true,
    logger: {
      log: (message) => logs.push(message),
    },
  });

  assert.equal(report.planUsable, true);
  assert.equal(logs.length, 1);
  assert.match(logs[0] ?? "", /SHADOW PRODUCTION/);
  assert.match(logs[0] ?? "", /ProductionPlan : usable/);
  assert.match(logs[0] ?? "", /Orders : 1/);
}
