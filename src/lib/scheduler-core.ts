import type { WorkUnit, WorkUnitStation } from "./work-units";

export interface BuildSchedulerPlanParams {
  workUnits: readonly WorkUnit[];
}

export interface ScheduledWorkUnit {
  workUnitId: string;
  productionUnitId: string;
  orderId: string;
  workflowNodeId: string;
  targetStation: WorkUnitStation;
  sequence: number;
  stationSequence: number;
  workUnit: WorkUnit;
}

export interface SchedulerStationPlan {
  targetStation: WorkUnitStation;
  workUnits: readonly ScheduledWorkUnit[];
}

export interface SchedulerExecutionPlan {
  scheduledWorkUnitCount: number;
  scheduledWorkUnitIds: readonly string[];
  stationPlans: readonly SchedulerStationPlan[];
}

const STATION_ORDER: readonly WorkUnitStation[] = [
  "pizzaiolo",
  "four",
  "panino",
  "fish_fryer",
  "fries_fryer",
  "handover",
];

const STATION_RANK = new Map(STATION_ORDER.map((station, index) => [station, index]));

export function buildSchedulerPlan({
  workUnits,
}: BuildSchedulerPlanParams): SchedulerExecutionPlan {
  const workUnitsById = new Map(workUnits.map((workUnit) => [workUnit.id, workUnit]));
  const executableWorkUnits = workUnits
    .filter((workUnit) => isExecutableWorkUnit(workUnit, workUnitsById))
    .sort(compareWorkUnitsForScheduling);

  const scheduledWorkUnits = executableWorkUnits.map((workUnit, sequence) => ({
    workUnitId: workUnit.id,
    productionUnitId: workUnit.productionUnitId,
    orderId: workUnit.orderId,
    workflowNodeId: workUnit.workflowNodeId,
    targetStation: workUnit.station,
    sequence,
    stationSequence: 0,
    workUnit: cloneWorkUnit(workUnit),
  }));

  const stationPlans = groupScheduledWorkUnitsByStation(scheduledWorkUnits);

  return {
    scheduledWorkUnitCount: scheduledWorkUnits.length,
    scheduledWorkUnitIds: scheduledWorkUnits.map((workUnit) => workUnit.workUnitId),
    stationPlans,
  };
}

function isExecutableWorkUnit(workUnit: WorkUnit, workUnitsById: ReadonlyMap<string, WorkUnit>) {
  return (
    workUnit.status === "available" &&
    workUnit.dependsOn.every(
      (dependencyId) => workUnitsById.get(dependencyId)?.status === "completed",
    )
  );
}

function groupScheduledWorkUnitsByStation(
  scheduledWorkUnits: readonly ScheduledWorkUnit[],
): SchedulerStationPlan[] {
  const workUnitsByStation = new Map<WorkUnitStation, ScheduledWorkUnit[]>();

  for (const scheduledWorkUnit of scheduledWorkUnits) {
    const stationWorkUnits = workUnitsByStation.get(scheduledWorkUnit.targetStation) ?? [];
    stationWorkUnits.push({
      ...scheduledWorkUnit,
      stationSequence: stationWorkUnits.length,
    });
    workUnitsByStation.set(scheduledWorkUnit.targetStation, stationWorkUnits);
  }

  return STATION_ORDER.flatMap((targetStation) => {
    const workUnits = workUnitsByStation.get(targetStation);
    if (!workUnits) return [];
    return [{ targetStation, workUnits }];
  });
}

function compareWorkUnitsForScheduling(left: WorkUnit, right: WorkUnit) {
  return (
    compareNullableString(left.requestedTime, right.requestedTime) ||
    compareStation(left.station, right.station) ||
    left.orderId.localeCompare(right.orderId) ||
    left.productionUnitId.localeCompare(right.productionUnitId) ||
    left.workflowNodeId.localeCompare(right.workflowNodeId) ||
    left.id.localeCompare(right.id)
  );
}

function compareStation(left: WorkUnitStation, right: WorkUnitStation) {
  return stationRank(left) - stationRank(right);
}

function stationRank(station: WorkUnitStation) {
  return STATION_RANK.get(station) ?? STATION_ORDER.length;
}

function compareNullableString(left: string | null, right: string | null) {
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left.localeCompare(right);
}

function cloneWorkUnit(workUnit: WorkUnit): WorkUnit {
  return {
    ...workUnit,
    dependsOn: [...workUnit.dependsOn],
  };
}
