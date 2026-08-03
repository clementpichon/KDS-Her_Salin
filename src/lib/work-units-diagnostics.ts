import type { ProductionUnit, ProductionUnitKind } from "./production-units";
import type { WorkUnit, WorkUnitStatus } from "./work-units";

export interface DiagnoseWorkUnitsParams {
  productionUnits: readonly ProductionUnit[];
  workUnits: readonly WorkUnit[];
}

export interface WorkUnitDuplicateIdIssue {
  id: string;
  count: number;
}

export interface WorkUnitMissingDependencyIssue {
  workUnitId: string;
  missingDependencyId: string;
}

export interface WorkUnitCycleIssue {
  cycle: readonly string[];
}

export interface WorkUnitAvailabilityIssue {
  workUnitId: string;
  dependencyId: string;
  dependencyStatus: WorkUnitStatus;
}

export interface ProductionUnitWithoutWorkUnitIssue {
  productionUnitId: string;
  kind: ProductionUnitKind;
  productName: string;
}

export interface EmptySupportedWorkflowIssue {
  productionUnitId: string;
  kind: ProductionUnitKind;
  productName: string;
}

export interface WorkUnitsDiagnostic {
  productionUnitCount: number;
  workUnitCount: number;
  workUnitsByKind: Record<ProductionUnitKind, number>;
  workUnitsByStatus: Record<WorkUnitStatus, number>;
  duplicateWorkUnitIds: WorkUnitDuplicateIdIssue[];
  missingDependencyIssues: WorkUnitMissingDependencyIssue[];
  cycleIssues: WorkUnitCycleIssue[];
  availabilityIssues: WorkUnitAvailabilityIssue[];
  productionUnitsWithoutWorkUnits: ProductionUnitWithoutWorkUnitIssue[];
  emptyWorkflowForSupportedProducts: EmptySupportedWorkflowIssue[];
  isConsistent: boolean;
}

const PRODUCTION_UNIT_KINDS: readonly ProductionUnitKind[] = [
  "pizza",
  "panino",
  "fish_no",
  "fries",
  "grenailles",
  "other",
];

const WORK_UNIT_STATUSES: readonly WorkUnitStatus[] = [
  "blocked",
  "available",
  "reserved",
  "in_progress",
  "completed",
  "failed",
  "cancelled",
];

const SUPPORTED_WORKFLOW_KINDS = new Set<ProductionUnitKind>([
  "pizza",
  "panino",
  "fish_no",
  "fries",
  "grenailles",
]);

export function diagnoseWorkUnits({
  productionUnits,
  workUnits,
}: DiagnoseWorkUnitsParams): WorkUnitsDiagnostic {
  const duplicateWorkUnitIds = detectDuplicateWorkUnitIds(workUnits);
  const workUnitsById = indexFirstWorkUnitById(workUnits);
  const productionUnitsWithoutWorkUnits = detectProductionUnitsWithoutWorkUnits(
    productionUnits,
    workUnits,
  );
  const emptyWorkflowForSupportedProducts = productionUnitsWithoutWorkUnits.filter((issue) =>
    SUPPORTED_WORKFLOW_KINDS.has(issue.kind),
  );
  const missingDependencyIssues = detectMissingDependencies(workUnits, workUnitsById);
  const cycleIssues = detectCycles(workUnitsById);
  const availabilityIssues = detectAvailabilityIssues(workUnits, workUnitsById);

  return {
    productionUnitCount: productionUnits.length,
    workUnitCount: workUnits.length,
    workUnitsByKind: countByKind(workUnits),
    workUnitsByStatus: countByStatus(workUnits),
    duplicateWorkUnitIds,
    missingDependencyIssues,
    cycleIssues,
    availabilityIssues,
    productionUnitsWithoutWorkUnits,
    emptyWorkflowForSupportedProducts,
    isConsistent:
      duplicateWorkUnitIds.length === 0 &&
      missingDependencyIssues.length === 0 &&
      cycleIssues.length === 0 &&
      availabilityIssues.length === 0 &&
      productionUnitsWithoutWorkUnits.length === 0 &&
      emptyWorkflowForSupportedProducts.length === 0,
  };
}

function detectDuplicateWorkUnitIds(workUnits: readonly WorkUnit[]): WorkUnitDuplicateIdIssue[] {
  const counts = new Map<string, number>();

  for (const workUnit of workUnits) {
    counts.set(workUnit.id, (counts.get(workUnit.id) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id, count]) => ({ id, count }));
}

function indexFirstWorkUnitById(workUnits: readonly WorkUnit[]) {
  const workUnitsById = new Map<string, WorkUnit>();

  for (const workUnit of workUnits) {
    if (!workUnitsById.has(workUnit.id)) {
      workUnitsById.set(workUnit.id, workUnit);
    }
  }

  return workUnitsById;
}

function detectProductionUnitsWithoutWorkUnits(
  productionUnits: readonly ProductionUnit[],
  workUnits: readonly WorkUnit[],
): ProductionUnitWithoutWorkUnitIssue[] {
  const productionUnitIdsWithWorkUnit = new Set(
    workUnits.map((workUnit) => workUnit.productionUnitId),
  );

  return productionUnits
    .filter((productionUnit) => !productionUnitIdsWithWorkUnit.has(productionUnit.id))
    .map((productionUnit) => ({
      productionUnitId: productionUnit.id,
      kind: productionUnit.kind,
      productName: productionUnit.productName,
    }));
}

function detectMissingDependencies(
  workUnits: readonly WorkUnit[],
  workUnitsById: ReadonlyMap<string, WorkUnit>,
): WorkUnitMissingDependencyIssue[] {
  return workUnits.flatMap((workUnit) =>
    workUnit.dependsOn
      .filter((dependencyId) => !workUnitsById.has(dependencyId))
      .map((missingDependencyId) => ({
        workUnitId: workUnit.id,
        missingDependencyId,
      })),
  );
}

function detectCycles(workUnitsById: ReadonlyMap<string, WorkUnit>): WorkUnitCycleIssue[] {
  const state = new Map<string, "visiting" | "visited">();
  const stack: string[] = [];
  const cycleKeys = new Set<string>();
  const cycleIssues: WorkUnitCycleIssue[] = [];

  const visit = (workUnitId: string) => {
    const currentState = state.get(workUnitId);
    if (currentState === "visited") return;

    if (currentState === "visiting") {
      const startIndex = stack.indexOf(workUnitId);
      if (startIndex >= 0) {
        const cycle = [...stack.slice(startIndex), workUnitId];
        const key = canonicalCycleKey(cycle);
        if (!cycleKeys.has(key)) {
          cycleKeys.add(key);
          cycleIssues.push({ cycle });
        }
      }
      return;
    }

    const workUnit = workUnitsById.get(workUnitId);
    if (!workUnit) return;

    state.set(workUnitId, "visiting");
    stack.push(workUnitId);

    for (const dependencyId of workUnit.dependsOn) {
      if (workUnitsById.has(dependencyId)) {
        visit(dependencyId);
      }
    }

    stack.pop();
    state.set(workUnitId, "visited");
  };

  for (const workUnitId of workUnitsById.keys()) {
    visit(workUnitId);
  }

  return cycleIssues;
}

function canonicalCycleKey(cycle: readonly string[]) {
  const openCycle = cycle[0] === cycle[cycle.length - 1] ? cycle.slice(0, -1) : [...cycle];
  const rotations = openCycle.map((_, index) => [
    ...openCycle.slice(index),
    ...openCycle.slice(0, index),
  ]);
  return rotations.map((rotation) => rotation.join("->")).sort()[0] ?? "";
}

function detectAvailabilityIssues(
  workUnits: readonly WorkUnit[],
  workUnitsById: ReadonlyMap<string, WorkUnit>,
): WorkUnitAvailabilityIssue[] {
  return workUnits.flatMap((workUnit) => {
    if (workUnit.status !== "available") return [];

    return workUnit.dependsOn.flatMap((dependencyId) => {
      const dependency = workUnitsById.get(dependencyId);
      if (!dependency || dependency.status === "completed") return [];

      return [
        {
          workUnitId: workUnit.id,
          dependencyId,
          dependencyStatus: dependency.status,
        },
      ];
    });
  });
}

function countByKind(workUnits: readonly WorkUnit[]): Record<ProductionUnitKind, number> {
  const counts = Object.fromEntries(PRODUCTION_UNIT_KINDS.map((kind) => [kind, 0])) as Record<
    ProductionUnitKind,
    number
  >;

  for (const workUnit of workUnits) {
    counts[workUnit.productKind] += 1;
  }

  return counts;
}

function countByStatus(workUnits: readonly WorkUnit[]): Record<WorkUnitStatus, number> {
  const counts = Object.fromEntries(WORK_UNIT_STATUSES.map((status) => [status, 0])) as Record<
    WorkUnitStatus,
    number
  >;

  for (const workUnit of workUnits) {
    counts[workUnit.status] += 1;
  }

  return counts;
}
