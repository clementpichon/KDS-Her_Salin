import assert from "node:assert/strict";
import { buildSchedulerPlan } from "./scheduler-core";
import type { WorkUnit, WorkUnitStation, WorkUnitStatus } from "./work-units";

function workUnit({
  id,
  station = "pizzaiolo",
  status = "available",
  dependsOn = [],
  requestedTime = "2026-08-03T19:30:00.000Z",
  orderId = "order-1",
  productionUnitId = `${id}-production-unit`,
  workflowNodeId = id,
}: {
  id: string;
  station?: WorkUnitStation;
  status?: WorkUnitStatus;
  dependsOn?: readonly string[];
  requestedTime?: string | null;
  orderId?: string;
  productionUnitId?: string;
  workflowNodeId?: string;
}): WorkUnit {
  return {
    id,
    productionUnitId,
    orderId,
    sourceProductionUnitStatus: "created",
    workflowNodeId,
    type: "preparation",
    station,
    status,
    statusSource: "dependency_projection",
    dependsOn,
    productKind: "pizza",
    productName: "Regina",
    requestedTime,
    customerName: "Michel",
    estimatedDurationSec: null,
    executionProfileId: workflowNodeId,
  };
}

{
  const plan = buildSchedulerPlan({
    workUnits: [
      workUnit({ id: "available" }),
      workUnit({ id: "blocked", status: "blocked" }),
      workUnit({ id: "in-progress", status: "in_progress" }),
      workUnit({ id: "completed", status: "completed" }),
      workUnit({ id: "cancelled", status: "cancelled" }),
    ],
  });

  assert.deepEqual(plan.scheduledWorkUnitIds, ["available"]);
  assert.equal(plan.scheduledWorkUnitCount, 1);
}

{
  const plan = buildSchedulerPlan({
    workUnits: [
      workUnit({ id: "prepared", status: "completed" }),
      workUnit({
        id: "cook-ready",
        station: "four",
        dependsOn: ["prepared"],
      }),
      workUnit({ id: "started", status: "in_progress" }),
      workUnit({
        id: "blocked-by-started",
        station: "four",
        dependsOn: ["started"],
      }),
      workUnit({
        id: "blocked-by-missing",
        station: "four",
        dependsOn: ["missing"],
      }),
    ],
  });

  assert.deepEqual(plan.scheduledWorkUnitIds, ["cook-ready"]);
}

{
  const plan = buildSchedulerPlan({
    workUnits: [
      workUnit({ id: "fries", station: "fries_fryer" }),
      workUnit({ id: "pizza", station: "pizzaiolo" }),
      workUnit({ id: "panino", station: "panino" }),
      workUnit({ id: "oven", station: "four" }),
    ],
  });

  assert.deepEqual(
    plan.stationPlans.map((stationPlan) => stationPlan.targetStation),
    ["pizzaiolo", "four", "panino", "fries_fryer"],
  );
  assert.deepEqual(
    plan.stationPlans.map((stationPlan) =>
      stationPlan.workUnits.map((scheduledWorkUnit) => scheduledWorkUnit.workUnitId),
    ),
    [["pizza"], ["oven"], ["panino"], ["fries"]],
  );
}

{
  const workUnits = [
    workUnit({
      id: "panino-late",
      station: "panino",
      requestedTime: "2026-08-03T20:00:00.000Z",
      orderId: "order-b",
    }),
    workUnit({
      id: "pizza-null-time",
      station: "pizzaiolo",
      requestedTime: null,
      orderId: "order-a",
    }),
    workUnit({
      id: "pizza-early",
      station: "pizzaiolo",
      requestedTime: "2026-08-03T19:00:00.000Z",
      orderId: "order-c",
    }),
    workUnit({
      id: "pizza-same-time-a",
      station: "pizzaiolo",
      requestedTime: "2026-08-03T19:30:00.000Z",
      orderId: "order-a",
      productionUnitId: "production-a",
    }),
    workUnit({
      id: "pizza-same-time-b",
      station: "pizzaiolo",
      requestedTime: "2026-08-03T19:30:00.000Z",
      orderId: "order-a",
      productionUnitId: "production-b",
    }),
  ];

  assert.deepEqual(
    buildSchedulerPlan({ workUnits }).scheduledWorkUnitIds,
    buildSchedulerPlan({ workUnits: [...workUnits].reverse() }).scheduledWorkUnitIds,
  );
  assert.deepEqual(buildSchedulerPlan({ workUnits }).scheduledWorkUnitIds, [
    "pizza-early",
    "pizza-same-time-a",
    "pizza-same-time-b",
    "panino-late",
    "pizza-null-time",
  ]);
}

{
  const plan = buildSchedulerPlan({
    workUnits: [
      workUnit({
        id: "pizzaiolo-null-time",
        station: "pizzaiolo",
        requestedTime: null,
      }),
      workUnit({
        id: "panino-dated",
        station: "panino",
        requestedTime: "2026-08-03T20:00:00.000Z",
      }),
    ],
  });

  assert.deepEqual(plan.scheduledWorkUnitIds, ["panino-dated", "pizzaiolo-null-time"]);
  assert.deepEqual(
    plan.stationPlans.map((stationPlan) => [
      stationPlan.targetStation,
      stationPlan.workUnits.map((scheduledWorkUnit) => [
        scheduledWorkUnit.workUnitId,
        scheduledWorkUnit.sequence,
        scheduledWorkUnit.stationSequence,
      ]),
    ]),
    [
      ["pizzaiolo", [["pizzaiolo-null-time", 1, 0]]],
      ["panino", [["panino-dated", 0, 0]]],
    ],
  );
}

{
  const plan = buildSchedulerPlan({
    workUnits: [
      workUnit({ id: "pizza-1", station: "pizzaiolo" }),
      workUnit({ id: "pizza-2", station: "pizzaiolo" }),
      workUnit({ id: "oven-1", station: "four" }),
    ],
  });

  assert.deepEqual(
    plan.stationPlans.flatMap((stationPlan) =>
      stationPlan.workUnits.map((workUnit) => [
        workUnit.workUnitId,
        workUnit.sequence,
        workUnit.stationSequence,
        workUnit.targetStation,
      ]),
    ),
    [
      ["pizza-1", 0, 0, "pizzaiolo"],
      ["pizza-2", 1, 1, "pizzaiolo"],
      ["oven-1", 2, 0, "four"],
    ],
  );
}

{
  const input = [
    workUnit({ id: "done", status: "completed" }),
    workUnit({ id: "ready", dependsOn: ["done"] }),
  ];
  const before = JSON.stringify(input);
  const plan = buildSchedulerPlan({ workUnits: input });

  (plan.stationPlans[0].workUnits[0].workUnit.dependsOn as string[]).push("mutated");

  assert.equal(JSON.stringify(input), before);
}
