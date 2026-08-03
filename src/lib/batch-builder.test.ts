import assert from "node:assert/strict";
import { buildBatchPlan } from "./batch-builder";
import { buildSchedulerPlan, type SchedulerExecutionPlan } from "./scheduler-core";
import type { WorkUnit, WorkUnitStation, WorkUnitStatus, WorkUnitType } from "./work-units";

function workUnit({
  id,
  station = "four",
  workflowNodeId = "pizza.cooking",
  type = "cooking",
  productKind = "pizza",
  productName = "Regina",
  status = "available",
  requestedTime = "2026-08-03T19:30:00.000Z",
  orderId = "order-1",
  productionUnitId = `production-${id}`,
}: {
  id: string;
  station?: WorkUnitStation;
  workflowNodeId?: string;
  type?: WorkUnitType;
  productKind?: WorkUnit["productKind"];
  productName?: string;
  status?: WorkUnitStatus;
  requestedTime?: string | null;
  orderId?: string;
  productionUnitId?: string;
}): WorkUnit {
  return {
    id,
    productionUnitId,
    orderId,
    sourceProductionUnitStatus: "created",
    workflowNodeId,
    type,
    station,
    status,
    statusSource: "dependency_projection",
    dependsOn: [],
    productKind,
    productName,
    requestedTime,
    customerName: "Michel",
    estimatedDurationSec: null,
    executionProfileId: workflowNodeId,
  };
}

function pizzaCookingWorkUnits(count: number) {
  return Array.from({ length: count }, (_, index) =>
    workUnit({
      id: `pizza-cooking-${index + 1}`,
      orderId: `order-${Math.floor(index / 2) + 1}`,
      productionUnitId: `pizza-${index + 1}`,
    }),
  );
}

function schedulerPlanFor(workUnits: readonly WorkUnit[]): SchedulerExecutionPlan {
  return buildSchedulerPlan({ workUnits });
}

function workUnitIdsByBatch(plan: ReturnType<typeof buildBatchPlan>) {
  return plan.batches.map((batch) => batch.workUnitIds);
}

function assertBatchedWorkUnitsMatchScheduler(plan: SchedulerExecutionPlan) {
  const batchPlan = buildBatchPlan({ schedulerPlan: plan });

  assert.deepEqual(batchPlan.batchedWorkUnitIds, plan.scheduledWorkUnitIds);
  assert.equal(new Set(batchPlan.batchedWorkUnitIds).size, batchPlan.batchedWorkUnitIds.length);
}

for (const count of [1, 2, 3, 4]) {
  const batchPlan = buildBatchPlan({
    schedulerPlan: schedulerPlanFor(pizzaCookingWorkUnits(count)),
  });

  assert.equal(batchPlan.batchCount, 1);
  assert.equal(batchPlan.batches[0].batchType, "pizza_oven");
  assert.equal(batchPlan.batches[0].targetStation, "four");
  assert.equal(batchPlan.batches[0].capacity, 4);
  assert.equal(batchPlan.batches[0].isFull, count === 4);
  assert.equal(batchPlan.batches[0].workUnitIds.length, count);
}

{
  const batchPlan = buildBatchPlan({
    schedulerPlan: schedulerPlanFor(pizzaCookingWorkUnits(5)),
  });

  assert.deepEqual(workUnitIdsByBatch(batchPlan), [
    ["pizza-cooking-1", "pizza-cooking-2", "pizza-cooking-3", "pizza-cooking-4"],
    ["pizza-cooking-5"],
  ]);
  assert.deepEqual(
    batchPlan.batches.map((batch) => [batch.batchType, batch.capacity, batch.isFull]),
    [
      ["pizza_oven", 4, true],
      ["pizza_oven", 4, false],
    ],
  );
}

{
  const batchPlan = buildBatchPlan({
    schedulerPlan: schedulerPlanFor(pizzaCookingWorkUnits(8)),
  });

  assert.deepEqual(workUnitIdsByBatch(batchPlan), [
    ["pizza-cooking-1", "pizza-cooking-2", "pizza-cooking-3", "pizza-cooking-4"],
    ["pizza-cooking-5", "pizza-cooking-6", "pizza-cooking-7", "pizza-cooking-8"],
  ]);
  assert.deepEqual(
    batchPlan.batches.map((batch) => batch.isFull),
    [true, true],
  );
}

{
  const schedulerPlan = schedulerPlanFor([
    ...pizzaCookingWorkUnits(3),
    workUnit({
      id: "pizza-cooking-order-a",
      orderId: "order-a",
      productionUnitId: "pizza-a",
      requestedTime: "2026-08-03T19:00:00.000Z",
    }),
    workUnit({
      id: "pizza-cooking-order-b",
      orderId: "order-b",
      productionUnitId: "pizza-b",
      requestedTime: "2026-08-03T19:10:00.000Z",
    }),
  ]);
  const batchPlan = buildBatchPlan({ schedulerPlan });

  assert.deepEqual(batchPlan.batchedWorkUnitIds, schedulerPlan.scheduledWorkUnitIds);
  assert.deepEqual(workUnitIdsByBatch(batchPlan), [
    ["pizza-cooking-order-a", "pizza-cooking-order-b", "pizza-cooking-1", "pizza-cooking-2"],
    ["pizza-cooking-3"],
  ]);
}

{
  const schedulerPlan = schedulerPlanFor([
    workUnit({
      id: "pizza-cooking-a",
      requestedTime: "2026-08-03T19:00:00.000Z",
      orderId: "order-a",
      productionUnitId: "pizza-a",
    }),
    workUnit({
      id: "panino-middle",
      station: "panino",
      workflowNodeId: "panino.filling",
      productKind: "panino",
      productName: "Pani'NO Burger",
      requestedTime: "2026-08-03T19:05:00.000Z",
      orderId: "order-middle",
      productionUnitId: "panino-middle",
    }),
    workUnit({
      id: "pizza-cooking-b",
      requestedTime: "2026-08-03T19:10:00.000Z",
      orderId: "order-b",
      productionUnitId: "pizza-b",
    }),
  ]);
  const batchPlan = buildBatchPlan({ schedulerPlan });

  assert.deepEqual(schedulerPlan.scheduledWorkUnitIds, [
    "pizza-cooking-a",
    "panino-middle",
    "pizza-cooking-b",
  ]);
  assert.deepEqual(workUnitIdsByBatch(batchPlan), [
    ["pizza-cooking-a", "pizza-cooking-b"],
    ["panino-middle"],
  ]);
  assert.deepEqual(batchPlan.batchedWorkUnitIds, [
    "pizza-cooking-a",
    "panino-middle",
    "pizza-cooking-b",
  ]);
}

{
  const schedulerPlan = schedulerPlanFor([
    workUnit({ id: "pizza-cooking-1" }),
    workUnit({
      id: "pizza-finishing-1",
      workflowNodeId: "pizza.finishing",
      type: "finishing",
    }),
    workUnit({
      id: "pizza-packaging-1",
      workflowNodeId: "pizza.packaging",
      type: "packaging",
    }),
  ]);
  const batchPlan = buildBatchPlan({ schedulerPlan });

  assert.deepEqual(
    batchPlan.batches.map((batch) => [batch.batchType, batch.workUnitIds]),
    [
      ["pizza_oven", ["pizza-cooking-1"]],
      ["single_work_unit", ["pizza-finishing-1"]],
      ["single_work_unit", ["pizza-packaging-1"]],
    ],
  );
}

{
  const schedulerPlan = schedulerPlanFor([
    workUnit({
      id: "pizzaiolo-preparation",
      station: "pizzaiolo",
      workflowNodeId: "pizza.preparation",
      type: "preparation",
    }),
    workUnit({
      id: "panino-assembly",
      station: "panino",
      workflowNodeId: "panino.assembly",
      type: "assembly",
      productKind: "panino",
      productName: "Pani'NO Burger",
    }),
    workUnit({
      id: "fish-fryer",
      station: "fish_fryer",
      workflowNodeId: "fish_no.fish_cooking",
      productKind: "fish_no",
      productName: "Fish & NO",
    }),
    workUnit({
      id: "fries-fryer",
      station: "fries_fryer",
      workflowNodeId: "fries.cooking",
      productKind: "fries",
      productName: "Cornet de frites",
    }),
  ]);
  const batchPlan = buildBatchPlan({ schedulerPlan });

  assert.deepEqual(
    batchPlan.batches.map((batch) => [
      batch.targetStation,
      batch.batchType,
      batch.capacity,
      batch.isFull,
      batch.workUnitIds,
    ]),
    [
      ["pizzaiolo", "single_work_unit", 1, true, ["pizzaiolo-preparation"]],
      ["panino", "single_work_unit", 1, true, ["panino-assembly"]],
      ["fish_fryer", "single_work_unit", 1, true, ["fish-fryer"]],
      ["fries_fryer", "single_work_unit", 1, true, ["fries-fryer"]],
    ],
  );
}

{
  const schedulerPlan = schedulerPlanFor([
    ...pizzaCookingWorkUnits(5),
    workUnit({
      id: "panino-assembly",
      station: "panino",
      workflowNodeId: "panino.assembly",
      type: "assembly",
      productKind: "panino",
      productName: "Pani'NO Burger",
    }),
  ]);
  const firstBatchPlan = buildBatchPlan({ schedulerPlan });
  const secondBatchPlan = buildBatchPlan({ schedulerPlan });

  assert.deepEqual(firstBatchPlan, secondBatchPlan);
  assert.deepEqual(firstBatchPlan.batchIds, [
    "batch:four:pizza_oven:pizza-cooking-1",
    "batch:four:pizza_oven:pizza-cooking-5",
    "batch:panino:single_work_unit:panino-assembly",
  ]);
}

{
  const schedulerPlan = schedulerPlanFor([
    ...pizzaCookingWorkUnits(6),
    workUnit({
      id: "panino-filling",
      station: "panino",
      workflowNodeId: "panino.filling",
      productKind: "panino",
      productName: "Pani'NO Burger",
    }),
    workUnit({
      id: "pizza-packaging",
      workflowNodeId: "pizza.packaging",
      type: "packaging",
    }),
  ]);

  assertBatchedWorkUnitsMatchScheduler(schedulerPlan);
}

{
  const schedulerPlan = schedulerPlanFor([
    ...pizzaCookingWorkUnits(4),
    workUnit({
      id: "panino-filling",
      station: "panino",
      workflowNodeId: "panino.filling",
      productKind: "panino",
      productName: "Pani'NO Burger",
    }),
  ]);
  const schedulerPlanBefore = JSON.stringify(schedulerPlan);
  const batchPlan = buildBatchPlan({ schedulerPlan });

  (batchPlan.batches[0].workUnits[0].workUnit.dependsOn as string[]).push("mutated");

  assert.equal(JSON.stringify(schedulerPlan), schedulerPlanBefore);
}
