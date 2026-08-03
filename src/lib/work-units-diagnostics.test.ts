import assert from "node:assert/strict";
import type { ProductionUnit, ProductionUnitKind } from "./production-units";
import { diagnoseWorkUnits } from "./work-units-diagnostics";
import { buildWorkUnits, type WorkUnit, type WorkUnitStatus } from "./work-units";

function productionUnit({
  id = "production-unit-1",
  kind = "pizza",
  status = "created",
  productName = kind === "pizza" ? "Regina" : "Produit",
}: {
  id?: string;
  kind?: ProductionUnitKind;
  status?: ProductionUnit["status"];
  productName?: string;
} = {}): ProductionUnit {
  return {
    id,
    kind,
    status,
    statusSource: "default_created",
    sourceTable: kind === "pizza" ? "order_items" : "panino_order_items",
    sourceItemId: `${id}-source`,
    sourceQuantityIndex: null,
    orderId: "order-1",
    customerName: "Michel",
    requestedTime: "2026-08-03T19:30:00.000Z",
    orderStatus: "to_prepare",
    productKey: null,
    productName,
    quantity: 1,
    pizza: null,
    panino: null,
  };
}

function workUnit({
  id = "work-unit-1",
  productionUnitId = "production-unit-1",
  status = "available",
  dependsOn = [],
}: {
  id?: string;
  productionUnitId?: string;
  status?: WorkUnitStatus;
  dependsOn?: readonly string[];
} = {}): WorkUnit {
  return {
    id,
    productionUnitId,
    orderId: "order-1",
    sourceProductionUnitStatus: "created",
    workflowNodeId: id,
    type: "preparation",
    station: "pizzaiolo",
    status,
    statusSource: "dependency_projection",
    dependsOn,
    productKind: "pizza",
    productName: "Regina",
    requestedTime: "2026-08-03T19:30:00.000Z",
    customerName: "Michel",
    estimatedDurationSec: null,
    executionProfileId: id,
  };
}

{
  const productionUnits = [
    productionUnit({ id: "pizza-1", kind: "pizza", productName: "Regina" }),
    productionUnit({ id: "panino-1", kind: "panino", productName: "Pani'NO Burger" }),
  ];
  const workUnits = buildWorkUnits({ productionUnits });
  const diagnostic = diagnoseWorkUnits({ productionUnits, workUnits });

  assert.equal(diagnostic.productionUnitCount, 2);
  assert.equal(diagnostic.workUnitCount, 7);
  assert.equal(diagnostic.workUnitsByKind.pizza, 3);
  assert.equal(diagnostic.workUnitsByKind.panino, 4);
  assert.equal(diagnostic.workUnitsByStatus.available, 3);
  assert.equal(diagnostic.workUnitsByStatus.blocked, 4);
  assert.equal(diagnostic.isConsistent, true);
}

{
  const productionUnits = [productionUnit()];
  const duplicate = workUnit({ id: "duplicate-id" });
  const diagnostic = diagnoseWorkUnits({
    productionUnits,
    workUnits: [duplicate, { ...duplicate }],
  });

  assert.deepEqual(diagnostic.duplicateWorkUnitIds, [{ id: "duplicate-id", count: 2 }]);
  assert.equal(diagnostic.isConsistent, false);
}

{
  const productionUnits = [productionUnit()];
  const diagnostic = diagnoseWorkUnits({
    productionUnits,
    workUnits: [workUnit({ id: "blocked-by-missing", status: "blocked", dependsOn: ["missing"] })],
  });

  assert.deepEqual(diagnostic.missingDependencyIssues, [
    { workUnitId: "blocked-by-missing", missingDependencyId: "missing" },
  ]);
  assert.equal(diagnostic.isConsistent, false);
}

{
  const productionUnits = [productionUnit()];
  const diagnostic = diagnoseWorkUnits({
    productionUnits,
    workUnits: [
      workUnit({ id: "cycle-a", status: "blocked", dependsOn: ["cycle-b"] }),
      workUnit({ id: "cycle-b", status: "blocked", dependsOn: ["cycle-a"] }),
    ],
  });

  assert.deepEqual(diagnostic.cycleIssues, [{ cycle: ["cycle-a", "cycle-b", "cycle-a"] }]);
  assert.equal(diagnostic.isConsistent, false);
}

{
  const productionUnits = [productionUnit()];
  const diagnostic = diagnoseWorkUnits({
    productionUnits,
    workUnits: [
      workUnit({ id: "dependency", status: "in_progress" }),
      workUnit({ id: "available-too-soon", status: "available", dependsOn: ["dependency"] }),
    ],
  });

  assert.deepEqual(diagnostic.availabilityIssues, [
    {
      workUnitId: "available-too-soon",
      dependencyId: "dependency",
      dependencyStatus: "in_progress",
    },
  ]);
  assert.equal(diagnostic.isConsistent, false);
}

{
  const productionUnits = [productionUnit({ id: "orphan-pizza", kind: "pizza" })];
  const diagnostic = diagnoseWorkUnits({ productionUnits, workUnits: [] });

  assert.deepEqual(diagnostic.productionUnitsWithoutWorkUnits, [
    { productionUnitId: "orphan-pizza", kind: "pizza", productName: "Regina" },
  ]);
  assert.equal(diagnostic.isConsistent, false);
}

{
  const productionUnits = [
    productionUnit({
      id: "supported-without-workflow",
      kind: "fish_no",
      productName: "Fish & NO",
    }),
  ];
  const diagnostic = diagnoseWorkUnits({ productionUnits, workUnits: [] });

  assert.deepEqual(diagnostic.emptyWorkflowForSupportedProducts, [
    {
      productionUnitId: "supported-without-workflow",
      kind: "fish_no",
      productName: "Fish & NO",
    },
  ]);
  assert.equal(diagnostic.isConsistent, false);
}

{
  const productionUnits = [
    productionUnit({
      id: "unsupported-other",
      kind: "other",
      productName: "Boisson",
    }),
  ];
  const diagnostic = diagnoseWorkUnits({ productionUnits, workUnits: [] });

  assert.deepEqual(diagnostic.productionUnitsWithoutWorkUnits, [
    { productionUnitId: "unsupported-other", kind: "other", productName: "Boisson" },
  ]);
  assert.deepEqual(diagnostic.emptyWorkflowForSupportedProducts, []);
  assert.equal(diagnostic.isConsistent, false);
}
