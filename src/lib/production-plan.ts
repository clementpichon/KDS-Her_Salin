import { buildBatchPlan, type BatchBuilderPlan, type PlannedBatchType } from "./batch-builder";
import {
  buildProductionUnits,
  type BuildProductionUnitsParams,
  type ProductionUnit,
  type ProductionUnitKind,
} from "./production-units";
import { buildSchedulerPlan, type SchedulerExecutionPlan } from "./scheduler-core";
import { buildWorkUnits, type WorkUnit, type WorkUnitStation } from "./work-units";
import { diagnoseWorkUnits, type WorkUnitsDiagnostic } from "./work-units-diagnostics";

export type ProductionPlanBlockingIssueType =
  | "duplicate_work_unit_id"
  | "missing_dependency"
  | "cycle"
  | "available_dependency_not_completed"
  | "production_unit_without_work_unit"
  | "empty_supported_workflow"
  | "batch_work_unit_order_mismatch";

export interface ProductionPlanBlockingIssue {
  type: ProductionPlanBlockingIssueType;
  message: string;
  refs: Readonly<Record<string, string | number | readonly string[]>>;
}

export interface ProductionPlanCounters {
  productionUnitCount: number;
  workUnitCount: number;
  scheduledWorkUnitCount: number;
  batchCount: number;
  blockingIssueCount: number;
  productionUnitsByKind: Record<ProductionUnitKind, number>;
  workUnitsByKind: Record<ProductionUnitKind, number>;
  workUnitsByStatus: WorkUnitsDiagnostic["workUnitsByStatus"];
  batchesByType: Record<PlannedBatchType, number>;
}

export interface ProductionPlanStationView {
  targetStation: WorkUnitStation;
  scheduledWorkUnitIds: readonly string[];
  batchIds: readonly string[];
  scheduledWorkUnitCount: number;
  batchCount: number;
}

export interface ProductionPlan {
  id: string;
  productionUnits: readonly ProductionUnit[];
  workUnits: readonly WorkUnit[];
  workUnitDiagnostic: WorkUnitsDiagnostic;
  schedulerPlan: SchedulerExecutionPlan;
  batchPlan: BatchBuilderPlan;
  counters: ProductionPlanCounters;
  stationViews: readonly ProductionPlanStationView[];
  blockingIssues: readonly ProductionPlanBlockingIssue[];
  isUsable: boolean;
}

export interface BuildProductionPlanParams extends BuildProductionUnitsParams {
  idSeed?: string;
}

export interface AssembleProductionPlanParams {
  idSeed?: string;
  productionUnits: readonly ProductionUnit[];
  workUnits: readonly WorkUnit[];
  workUnitDiagnostic: WorkUnitsDiagnostic;
  schedulerPlan: SchedulerExecutionPlan;
  batchPlan: BatchBuilderPlan;
}

const PRODUCTION_UNIT_KINDS: readonly ProductionUnitKind[] = [
  "pizza",
  "panino",
  "fish_no",
  "fries",
  "grenailles",
  "other",
];

const BATCH_TYPES: readonly PlannedBatchType[] = ["pizza_oven", "single_work_unit"];

const STATION_ORDER: readonly WorkUnitStation[] = [
  "pizzaiolo",
  "four",
  "panino",
  "fish_fryer",
  "fries_fryer",
  "handover",
];

export function buildProductionPlan(params: BuildProductionPlanParams): ProductionPlan {
  const productionUnits = buildProductionUnits(params);
  const workUnits = buildWorkUnits({ productionUnits });
  const workUnitDiagnostic = diagnoseWorkUnits({ productionUnits, workUnits });
  const schedulerPlan = buildSchedulerPlan({ workUnits });
  const batchPlan = buildBatchPlan({ schedulerPlan });

  return assembleProductionPlan({
    idSeed: params.idSeed,
    productionUnits,
    workUnits,
    workUnitDiagnostic,
    schedulerPlan,
    batchPlan,
  });
}

export function assembleProductionPlan({
  idSeed = "memory",
  productionUnits,
  workUnits,
  workUnitDiagnostic,
  schedulerPlan,
  batchPlan,
}: AssembleProductionPlanParams): ProductionPlan {
  const clonedProductionUnits = productionUnits.map(cloneProductionUnit);
  const clonedWorkUnits = workUnits.map(cloneWorkUnit);
  const clonedDiagnostic = cloneWorkUnitsDiagnostic(workUnitDiagnostic);
  const clonedSchedulerPlan = cloneSchedulerPlan(schedulerPlan);
  const clonedBatchPlan = cloneBatchPlan(batchPlan);
  const blockingIssues = buildBlockingIssues(
    clonedDiagnostic,
    clonedSchedulerPlan,
    clonedBatchPlan,
  );
  const counters = buildCounters(
    clonedProductionUnits,
    clonedWorkUnits,
    clonedDiagnostic,
    clonedSchedulerPlan,
    clonedBatchPlan,
    blockingIssues,
  );

  return {
    id: productionPlanId(
      idSeed,
      clonedProductionUnits,
      clonedWorkUnits,
      clonedDiagnostic,
      clonedSchedulerPlan,
      clonedBatchPlan,
    ),
    productionUnits: clonedProductionUnits,
    workUnits: clonedWorkUnits,
    workUnitDiagnostic: clonedDiagnostic,
    schedulerPlan: clonedSchedulerPlan,
    batchPlan: clonedBatchPlan,
    counters,
    stationViews: buildStationViews(clonedSchedulerPlan, clonedBatchPlan),
    blockingIssues,
    isUsable: blockingIssues.length === 0,
  };
}

function buildCounters(
  productionUnits: readonly ProductionUnit[],
  workUnits: readonly WorkUnit[],
  diagnostic: WorkUnitsDiagnostic,
  schedulerPlan: SchedulerExecutionPlan,
  batchPlan: BatchBuilderPlan,
  blockingIssues: readonly ProductionPlanBlockingIssue[],
): ProductionPlanCounters {
  return {
    productionUnitCount: productionUnits.length,
    workUnitCount: workUnits.length,
    scheduledWorkUnitCount: schedulerPlan.scheduledWorkUnitCount,
    batchCount: batchPlan.batchCount,
    blockingIssueCount: blockingIssues.length,
    productionUnitsByKind: countProductionUnitsByKind(productionUnits),
    workUnitsByKind: { ...diagnostic.workUnitsByKind },
    workUnitsByStatus: { ...diagnostic.workUnitsByStatus },
    batchesByType: countBatchesByType(batchPlan),
  };
}

function buildStationViews(
  schedulerPlan: SchedulerExecutionPlan,
  batchPlan: BatchBuilderPlan,
): ProductionPlanStationView[] {
  return STATION_ORDER.map((targetStation) => {
    const stationPlan = schedulerPlan.stationPlans.find(
      (plan) => plan.targetStation === targetStation,
    );
    const stationBatches = batchPlan.batches.filter(
      (batch) => batch.targetStation === targetStation,
    );

    return {
      targetStation,
      scheduledWorkUnitIds: stationPlan?.workUnits.map((workUnit) => workUnit.workUnitId) ?? [],
      batchIds: stationBatches.map((batch) => batch.id),
      scheduledWorkUnitCount: stationPlan?.workUnits.length ?? 0,
      batchCount: stationBatches.length,
    };
  });
}

function buildBlockingIssues(
  diagnostic: WorkUnitsDiagnostic,
  schedulerPlan: SchedulerExecutionPlan,
  batchPlan: BatchBuilderPlan,
): ProductionPlanBlockingIssue[] {
  return [
    ...diagnostic.duplicateWorkUnitIds.map((issue) => ({
      type: "duplicate_work_unit_id" as const,
      message: `WorkUnit dupliquee: ${issue.id}`,
      refs: { workUnitId: issue.id, count: issue.count },
    })),
    ...diagnostic.missingDependencyIssues.map((issue) => ({
      type: "missing_dependency" as const,
      message: `Dependance absente pour ${issue.workUnitId}`,
      refs: {
        workUnitId: issue.workUnitId,
        missingDependencyId: issue.missingDependencyId,
      },
    })),
    ...diagnostic.cycleIssues.map((issue) => ({
      type: "cycle" as const,
      message: "Cycle detecte dans les Work Units",
      refs: { cycle: [...issue.cycle] },
    })),
    ...diagnostic.availabilityIssues.map((issue) => ({
      type: "available_dependency_not_completed" as const,
      message: `WorkUnit disponible avec dependance non terminee: ${issue.workUnitId}`,
      refs: {
        workUnitId: issue.workUnitId,
        dependencyId: issue.dependencyId,
        dependencyStatus: issue.dependencyStatus,
      },
    })),
    ...diagnostic.productionUnitsWithoutWorkUnits.map((issue) => ({
      type: "production_unit_without_work_unit" as const,
      message: `ProductionUnit sans WorkUnit: ${issue.productionUnitId}`,
      refs: {
        productionUnitId: issue.productionUnitId,
        kind: issue.kind,
        productName: issue.productName,
      },
    })),
    ...diagnostic.emptyWorkflowForSupportedProducts.map((issue) => ({
      type: "empty_supported_workflow" as const,
      message: `Workflow vide pour produit supporte: ${issue.productionUnitId}`,
      refs: {
        productionUnitId: issue.productionUnitId,
        kind: issue.kind,
        productName: issue.productName,
      },
    })),
    ...detectBatchOrderIssues(schedulerPlan, batchPlan),
  ];
}

function detectBatchOrderIssues(
  schedulerPlan: SchedulerExecutionPlan,
  batchPlan: BatchBuilderPlan,
): ProductionPlanBlockingIssue[] {
  if (sameStringSequence(schedulerPlan.scheduledWorkUnitIds, batchPlan.batchedWorkUnitIds)) {
    return [];
  }

  return [
    {
      type: "batch_work_unit_order_mismatch",
      message: "Le BatchPlan ne conserve pas exactement l'ordre global du Scheduler",
      refs: {
        scheduledWorkUnitIds: [...schedulerPlan.scheduledWorkUnitIds],
        batchedWorkUnitIds: [...batchPlan.batchedWorkUnitIds],
      },
    },
  ];
}

function countProductionUnitsByKind(
  productionUnits: readonly ProductionUnit[],
): Record<ProductionUnitKind, number> {
  const counts = Object.fromEntries(PRODUCTION_UNIT_KINDS.map((kind) => [kind, 0])) as Record<
    ProductionUnitKind,
    number
  >;

  for (const productionUnit of productionUnits) {
    counts[productionUnit.kind] += 1;
  }

  return counts;
}

function countBatchesByType(batchPlan: BatchBuilderPlan): Record<PlannedBatchType, number> {
  const counts = Object.fromEntries(BATCH_TYPES.map((batchType) => [batchType, 0])) as Record<
    PlannedBatchType,
    number
  >;

  for (const batch of batchPlan.batches) {
    counts[batch.batchType] += 1;
  }

  return counts;
}

function productionPlanId(
  idSeed: string,
  productionUnits: readonly ProductionUnit[],
  workUnits: readonly WorkUnit[],
  diagnostic: WorkUnitsDiagnostic,
  schedulerPlan: SchedulerExecutionPlan,
  batchPlan: BatchBuilderPlan,
) {
  const payload = [
    idSeed,
    productionUnits.map((unit) => unit.id).join("|"),
    workUnits.map((unit) => unit.id).join("|"),
    diagnostic.isConsistent ? "consistent" : "inconsistent",
    schedulerPlan.scheduledWorkUnitIds.join("|"),
    batchPlan.batchIds.join("|"),
    batchPlan.batchedWorkUnitIds.join("|"),
  ].join("::");

  return `production_plan:${stableHash(payload)}`;
}

function stableHash(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36);
}

function sameStringSequence(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function cloneProductionUnit(productionUnit: ProductionUnit): ProductionUnit {
  return {
    ...productionUnit,
    pizza: productionUnit.pizza
      ? {
          ...productionUnit.pizza,
          extras: [...productionUnit.pizza.extras],
          removed: [...productionUnit.pizza.removed],
        }
      : null,
    panino: productionUnit.panino
      ? {
          ...productionUnit.panino,
          sauces: [...productionUnit.panino.sauces],
          removed: [...productionUnit.panino.removed],
          extras: [...productionUnit.panino.extras],
        }
      : null,
  };
}

function cloneWorkUnit(workUnit: WorkUnit): WorkUnit {
  return {
    ...workUnit,
    dependsOn: [...workUnit.dependsOn],
  };
}

function cloneWorkUnitsDiagnostic(diagnostic: WorkUnitsDiagnostic): WorkUnitsDiagnostic {
  return {
    productionUnitCount: diagnostic.productionUnitCount,
    workUnitCount: diagnostic.workUnitCount,
    workUnitsByKind: { ...diagnostic.workUnitsByKind },
    workUnitsByStatus: { ...diagnostic.workUnitsByStatus },
    duplicateWorkUnitIds: diagnostic.duplicateWorkUnitIds.map((issue) => ({ ...issue })),
    missingDependencyIssues: diagnostic.missingDependencyIssues.map((issue) => ({ ...issue })),
    cycleIssues: diagnostic.cycleIssues.map((issue) => ({ cycle: [...issue.cycle] })),
    availabilityIssues: diagnostic.availabilityIssues.map((issue) => ({ ...issue })),
    productionUnitsWithoutWorkUnits: diagnostic.productionUnitsWithoutWorkUnits.map((issue) => ({
      ...issue,
    })),
    emptyWorkflowForSupportedProducts: diagnostic.emptyWorkflowForSupportedProducts.map(
      (issue) => ({
        ...issue,
      }),
    ),
    isConsistent: diagnostic.isConsistent,
  };
}

function cloneSchedulerPlan(schedulerPlan: SchedulerExecutionPlan): SchedulerExecutionPlan {
  return {
    scheduledWorkUnitCount: schedulerPlan.scheduledWorkUnitCount,
    scheduledWorkUnitIds: [...schedulerPlan.scheduledWorkUnitIds],
    stationPlans: schedulerPlan.stationPlans.map((stationPlan) => ({
      targetStation: stationPlan.targetStation,
      workUnits: stationPlan.workUnits.map((scheduledWorkUnit) => ({
        ...scheduledWorkUnit,
        workUnit: cloneWorkUnit(scheduledWorkUnit.workUnit),
      })),
    })),
  };
}

function cloneBatchPlan(batchPlan: BatchBuilderPlan): BatchBuilderPlan {
  return {
    batchCount: batchPlan.batchCount,
    batchIds: [...batchPlan.batchIds],
    batchedWorkUnitIds: [...batchPlan.batchedWorkUnitIds],
    batches: batchPlan.batches.map((batch) => ({
      ...batch,
      workUnitIds: [...batch.workUnitIds],
      workUnits: batch.workUnits.map((scheduledWorkUnit) => ({
        ...scheduledWorkUnit,
        workUnit: cloneWorkUnit(scheduledWorkUnit.workUnit),
      })),
    })),
  };
}
