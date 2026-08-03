import type { ScheduledWorkUnit, SchedulerExecutionPlan } from "./scheduler-core";
import type { WorkUnit, WorkUnitStation } from "./work-units";

export type PlannedBatchType = "pizza_oven" | "single_work_unit";

export interface BuildBatchPlanParams {
  schedulerPlan: SchedulerExecutionPlan;
}

export interface PlannedBatch {
  id: string;
  targetStation: WorkUnitStation;
  batchType: PlannedBatchType;
  capacity: number;
  sequence: number;
  stationSequence: number;
  isFull: boolean;
  workUnitIds: readonly string[];
  workUnits: readonly ScheduledWorkUnit[];
}

export interface BatchBuilderPlan {
  batchCount: number;
  batchIds: readonly string[];
  batchedWorkUnitIds: readonly string[];
  batches: readonly PlannedBatch[];
}

interface BatchCandidate {
  id: string;
  targetStation: WorkUnitStation;
  batchType: PlannedBatchType;
  capacity: number;
  firstWorkUnitSequence: number;
  workUnits: readonly ScheduledWorkUnit[];
}

const PIZZA_OVEN_CAPACITY = 4;

export function buildBatchPlan({ schedulerPlan }: BuildBatchPlanParams): BatchBuilderPlan {
  const scheduledWorkUnits = schedulerPlan.stationPlans
    .flatMap((stationPlan) => stationPlan.workUnits)
    .sort(compareScheduledWorkUnits);

  const pizzaOvenWorkUnits = scheduledWorkUnits.filter(isPizzaOvenCookingWorkUnit);
  const unitWorkUnits = scheduledWorkUnits.filter(
    (scheduledWorkUnit) => !isPizzaOvenCookingWorkUnit(scheduledWorkUnit),
  );

  const batchCandidates = [
    ...buildPizzaOvenBatchCandidates(pizzaOvenWorkUnits),
    ...unitWorkUnits.map(buildSingleWorkUnitBatchCandidate),
  ].sort(compareBatchCandidates);

  const stationSequences = new Map<WorkUnitStation, number>();
  const batches = batchCandidates.map((candidate, sequence) => {
    const stationSequence = stationSequences.get(candidate.targetStation) ?? 0;
    stationSequences.set(candidate.targetStation, stationSequence + 1);

    return {
      id: candidate.id,
      targetStation: candidate.targetStation,
      batchType: candidate.batchType,
      capacity: candidate.capacity,
      sequence,
      stationSequence,
      isFull: candidate.workUnits.length === candidate.capacity,
      workUnitIds: candidate.workUnits.map((workUnit) => workUnit.workUnitId),
      workUnits: candidate.workUnits.map(cloneScheduledWorkUnit),
    };
  });

  return {
    batchCount: batches.length,
    batchIds: batches.map((batch) => batch.id),
    batchedWorkUnitIds: [...schedulerPlan.scheduledWorkUnitIds],
    batches,
  };
}

function buildPizzaOvenBatchCandidates(
  scheduledWorkUnits: readonly ScheduledWorkUnit[],
): BatchCandidate[] {
  const candidates: BatchCandidate[] = [];

  for (let index = 0; index < scheduledWorkUnits.length; index += PIZZA_OVEN_CAPACITY) {
    const workUnits = scheduledWorkUnits.slice(index, index + PIZZA_OVEN_CAPACITY);
    const firstWorkUnit = workUnits[0];
    if (!firstWorkUnit) continue;

    candidates.push({
      id: `batch:four:pizza_oven:${firstWorkUnit.workUnitId}`,
      targetStation: "four",
      batchType: "pizza_oven",
      capacity: PIZZA_OVEN_CAPACITY,
      firstWorkUnitSequence: firstWorkUnit.sequence,
      workUnits,
    });
  }

  return candidates;
}

function buildSingleWorkUnitBatchCandidate(scheduledWorkUnit: ScheduledWorkUnit): BatchCandidate {
  return {
    id: `batch:${scheduledWorkUnit.targetStation}:single_work_unit:${scheduledWorkUnit.workUnitId}`,
    targetStation: scheduledWorkUnit.targetStation,
    batchType: "single_work_unit",
    capacity: 1,
    firstWorkUnitSequence: scheduledWorkUnit.sequence,
    workUnits: [scheduledWorkUnit],
  };
}

function isPizzaOvenCookingWorkUnit(scheduledWorkUnit: ScheduledWorkUnit) {
  return (
    scheduledWorkUnit.targetStation === "four" &&
    scheduledWorkUnit.workflowNodeId === "pizza.cooking" &&
    scheduledWorkUnit.workUnit.productKind === "pizza"
  );
}

function compareBatchCandidates(left: BatchCandidate, right: BatchCandidate) {
  return (
    left.firstWorkUnitSequence - right.firstWorkUnitSequence ||
    left.targetStation.localeCompare(right.targetStation) ||
    left.batchType.localeCompare(right.batchType) ||
    left.id.localeCompare(right.id)
  );
}

function compareScheduledWorkUnits(left: ScheduledWorkUnit, right: ScheduledWorkUnit) {
  return (
    left.sequence - right.sequence ||
    left.targetStation.localeCompare(right.targetStation) ||
    left.stationSequence - right.stationSequence ||
    left.workUnitId.localeCompare(right.workUnitId)
  );
}

function cloneScheduledWorkUnit(scheduledWorkUnit: ScheduledWorkUnit): ScheduledWorkUnit {
  return {
    ...scheduledWorkUnit,
    workUnit: cloneWorkUnit(scheduledWorkUnit.workUnit),
  };
}

function cloneWorkUnit(workUnit: WorkUnit): WorkUnit {
  return {
    ...workUnit,
    dependsOn: [...workUnit.dependsOn],
  };
}
