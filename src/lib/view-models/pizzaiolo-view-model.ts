import type { ProductionPlan } from "../production-plan";
import type { ProductionUnit, ProductionUnitKind } from "../production-units";
import type { ScheduledWorkUnit } from "../scheduler-core";
import type { WorkUnit, WorkUnitStatus, WorkUnitType } from "../work-units";

export interface PizzaioloPizzaDetailsView {
  base: string | null;
  extras: readonly string[];
  removed: readonly string[];
  cutInto: number | null;
}

export interface PizzaioloWorkUnitView {
  id: string;
  productionUnitId: string;
  orderId: string;
  workflowNodeId: string;
  type: WorkUnitType;
  productKind: ProductionUnitKind;
  productName: string;
  status: WorkUnitStatus;
  sourceItemId: string | null;
  requestedTime: string | null;
  customerName: string | null;
  pizza: PizzaioloPizzaDetailsView | null;
  dependsOn: readonly string[];
  completedDependencyIds: readonly string[];
  blockedDependencyIds: readonly string[];
  schedulerSequence: number | null;
  stationSequence: number | null;
  isScheduled: boolean;
}

export interface PizzaioloOrderGroup {
  orderId: string;
  customerName: string | null;
  requestedTime: string | null;
  productionUnitIds: readonly string[];
  workUnitIds: readonly string[];
  availableWorkUnitIds: readonly string[];
  blockedWorkUnitIds: readonly string[];
  completedWorkUnitIds: readonly string[];
  productKinds: readonly ProductionUnitKind[];
  productNames: readonly string[];
  isCompleted: boolean;
  isMixedOrder: boolean;
}

export interface PizzaioloSelectionModel {
  selectableWorkUnitIds: readonly string[];
  selectableOrderIds: readonly string[];
  hasSelectableWorkUnits: boolean;
}

export interface PizzaioloViewModelRecommendation {
  code: "follow_scheduler_order";
  workUnitIds: readonly string[];
  reason: string;
}

export interface PizzaioloViewModel {
  planId: string;
  planUsable: boolean;
  station: "pizzaiolo";
  availableWorkUnits: readonly PizzaioloWorkUnitView[];
  pizzasReadyToPrepare: readonly PizzaioloWorkUnitView[];
  groupedOrders: readonly PizzaioloOrderGroup[];
  completedDependencies: readonly string[];
  blockedWorkUnits: readonly PizzaioloWorkUnitView[];
  recommendations: readonly PizzaioloViewModelRecommendation[];
  selection: PizzaioloSelectionModel;
  diagnostics: readonly string[];
}

const PIZZAIOLO_STATION = "pizzaiolo";

export function buildPizzaioloViewModel(plan: ProductionPlan): PizzaioloViewModel {
  const workUnitsById = new Map(plan.workUnits.map((workUnit) => [workUnit.id, workUnit]));
  const productionUnitsById = new Map(
    plan.productionUnits.map((productionUnit) => [productionUnit.id, productionUnit]),
  );
  const scheduledPizzaioloWorkUnits = scheduledWorkUnitsForPizzaiolo(plan);
  const selectableScheduledPizzaioloWorkUnits = plan.isUsable ? scheduledPizzaioloWorkUnits : [];
  const scheduledByWorkUnitId = new Map(
    selectableScheduledPizzaioloWorkUnits.map((scheduledWorkUnit) => [
      scheduledWorkUnit.workUnitId,
      scheduledWorkUnit,
    ]),
  );
  const selectableWorkUnitIds = selectableScheduledPizzaioloWorkUnits.map(
    (scheduledWorkUnit) => scheduledWorkUnit.workUnitId,
  );
  const selectableWorkUnitIdSet = new Set(selectableWorkUnitIds);

  const availableWorkUnits = selectableScheduledPizzaioloWorkUnits.map((scheduledWorkUnit) =>
    workUnitViewFrom(
      scheduledWorkUnit.workUnit,
      workUnitsById,
      productionUnitsById,
      scheduledWorkUnit,
    ),
  );
  const blockedWorkUnits = plan.workUnits
    .filter((workUnit) => workUnit.station === PIZZAIOLO_STATION && workUnit.status === "blocked")
    .sort(compareWorkUnitsForView)
    .map((workUnit) =>
      workUnitViewFrom(
        workUnit,
        workUnitsById,
        productionUnitsById,
        scheduledByWorkUnitId.get(workUnit.id),
      ),
    );
  const groupedOrders = buildGroupedOrders(
    plan.productionUnits,
    plan.workUnits,
    productionUnitsById,
    workUnitsById,
    selectableWorkUnitIdSet,
  );
  const selectableOrderIds = uniqueValues(
    selectableScheduledPizzaioloWorkUnits.map((scheduledWorkUnit) => scheduledWorkUnit.orderId),
  );

  return {
    planId: plan.id,
    planUsable: plan.isUsable,
    station: PIZZAIOLO_STATION,
    availableWorkUnits,
    pizzasReadyToPrepare: availableWorkUnits.filter(
      (workUnit) =>
        workUnit.productKind === "pizza" && workUnit.workflowNodeId === "pizza.preparation",
    ),
    groupedOrders,
    completedDependencies: completedDependencyIds(plan.workUnits),
    blockedWorkUnits,
    recommendations: buildRecommendations(availableWorkUnits),
    selection: {
      selectableWorkUnitIds,
      selectableOrderIds,
      hasSelectableWorkUnits: selectableWorkUnitIds.length > 0,
    },
    diagnostics: plan.blockingIssues.map((issue) => `${issue.type}: ${issue.message}`),
  };
}

function scheduledWorkUnitsForPizzaiolo(plan: ProductionPlan) {
  return (
    plan.schedulerPlan.stationPlans.find(
      (stationPlan) => stationPlan.targetStation === PIZZAIOLO_STATION,
    )?.workUnits ?? []
  );
}

function workUnitViewFrom(
  workUnit: WorkUnit,
  workUnitsById: ReadonlyMap<string, WorkUnit>,
  productionUnitsById: ReadonlyMap<string, ProductionUnit>,
  scheduledWorkUnit: ScheduledWorkUnit | undefined,
): PizzaioloWorkUnitView {
  const productionUnit = productionUnitsById.get(workUnit.productionUnitId) ?? null;

  return {
    id: workUnit.id,
    productionUnitId: workUnit.productionUnitId,
    orderId: workUnit.orderId,
    workflowNodeId: workUnit.workflowNodeId,
    type: workUnit.type,
    productKind: workUnit.productKind,
    productName: workUnit.productName,
    status: workUnit.status,
    sourceItemId: productionUnit?.sourceItemId ?? null,
    requestedTime: workUnit.requestedTime,
    customerName: workUnit.customerName,
    pizza: pizzaDetailsFrom(productionUnit),
    dependsOn: [...workUnit.dependsOn],
    completedDependencyIds: workUnit.dependsOn.filter(
      (dependencyId) => workUnitsById.get(dependencyId)?.status === "completed",
    ),
    blockedDependencyIds: workUnit.dependsOn.filter(
      (dependencyId) => workUnitsById.get(dependencyId)?.status !== "completed",
    ),
    schedulerSequence: scheduledWorkUnit?.sequence ?? null,
    stationSequence: scheduledWorkUnit?.stationSequence ?? null,
    isScheduled: scheduledWorkUnit !== undefined,
  };
}

function buildGroupedOrders(
  productionUnits: readonly ProductionUnit[],
  workUnits: readonly WorkUnit[],
  productionUnitsById: ReadonlyMap<string, ProductionUnit>,
  workUnitsById: ReadonlyMap<string, WorkUnit>,
  selectableWorkUnitIds: ReadonlySet<string>,
): PizzaioloOrderGroup[] {
  const groupsByOrderId = new Map<string, WorkUnit[]>();

  for (const workUnit of workUnits) {
    if (workUnit.station !== PIZZAIOLO_STATION) continue;
    groupsByOrderId.set(workUnit.orderId, [
      ...(groupsByOrderId.get(workUnit.orderId) ?? []),
      workUnit,
    ]);
  }

  return [...groupsByOrderId.entries()]
    .map(([orderId, orderWorkUnits]) =>
      orderGroupFrom(
        orderId,
        orderWorkUnits.sort(compareWorkUnitsForView),
        productionUnits.filter((productionUnit) => productionUnit.orderId === orderId),
        productionUnitsById,
        workUnitsById,
        selectableWorkUnitIds,
      ),
    )
    .sort(compareOrderGroups);
}

function orderGroupFrom(
  orderId: string,
  orderWorkUnits: readonly WorkUnit[],
  orderProductionUnits: readonly ProductionUnit[],
  productionUnitsById: ReadonlyMap<string, ProductionUnit>,
  workUnitsById: ReadonlyMap<string, WorkUnit>,
  selectableWorkUnitIds: ReadonlySet<string>,
): PizzaioloOrderGroup {
  const firstProductionUnit = orderProductionUnits[0] ?? null;
  const firstWorkUnit = orderWorkUnits[0] ?? null;
  const workUnitViews = orderWorkUnits.map((workUnit) =>
    workUnitViewFrom(workUnit, workUnitsById, productionUnitsById, undefined),
  );
  const productKinds = uniqueValues(
    orderProductionUnits.map((productionUnit) => productionUnit.kind),
  );

  return {
    orderId,
    customerName: firstProductionUnit?.customerName ?? firstWorkUnit?.customerName ?? null,
    requestedTime: firstProductionUnit?.requestedTime ?? firstWorkUnit?.requestedTime ?? null,
    productionUnitIds: uniqueValues(
      orderProductionUnits.map((productionUnit) => productionUnit.id),
    ),
    workUnitIds: workUnitViews.map((workUnit) => workUnit.id),
    availableWorkUnitIds: workUnitViews
      .filter((workUnit) => selectableWorkUnitIds.has(workUnit.id))
      .map((workUnit) => workUnit.id),
    blockedWorkUnitIds: workUnitViews
      .filter((workUnit) => workUnit.status === "blocked")
      .map((workUnit) => workUnit.id),
    completedWorkUnitIds: workUnitViews
      .filter((workUnit) => workUnit.status === "completed")
      .map((workUnit) => workUnit.id),
    productKinds,
    productNames: uniqueValues(
      orderProductionUnits.length > 0
        ? orderProductionUnits.map((productionUnit) => productionUnit.productName)
        : orderWorkUnits.map(
            (workUnit) =>
              productionUnitsById.get(workUnit.productionUnitId)?.productName ??
              workUnit.productName,
          ),
    ),
    isCompleted:
      orderWorkUnits.length > 0 &&
      orderWorkUnits.every((workUnit) => workUnit.status === "completed"),
    isMixedOrder: productKinds.length > 1,
  };
}

function pizzaDetailsFrom(productionUnit: ProductionUnit | null): PizzaioloPizzaDetailsView | null {
  if (!productionUnit?.pizza) return null;

  return {
    base: productionUnit.pizza.base,
    extras: [...productionUnit.pizza.extras],
    removed: [...productionUnit.pizza.removed],
    cutInto: productionUnit.pizza.cutInto,
  };
}

function buildRecommendations(
  availableWorkUnits: readonly PizzaioloWorkUnitView[],
): PizzaioloViewModelRecommendation[] {
  if (availableWorkUnits.length === 0) return [];

  return [
    {
      code: "follow_scheduler_order",
      workUnitIds: availableWorkUnits.map((workUnit) => workUnit.id),
      reason: "Ordre issu du Scheduler du ProductionPlan.",
    },
  ];
}

function completedDependencyIds(workUnits: readonly WorkUnit[]) {
  const completedWorkUnitIds = new Set(
    workUnits.filter((workUnit) => workUnit.status === "completed").map((workUnit) => workUnit.id),
  );
  return uniqueValues(
    workUnits.flatMap((workUnit) =>
      workUnit.dependsOn.filter((dependencyId) => completedWorkUnitIds.has(dependencyId)),
    ),
  ).sort();
}

function compareOrderGroups(left: PizzaioloOrderGroup, right: PizzaioloOrderGroup) {
  return (
    compareNullableString(left.requestedTime, right.requestedTime) ||
    left.orderId.localeCompare(right.orderId)
  );
}

function compareWorkUnitsForView(left: WorkUnit, right: WorkUnit) {
  return (
    compareNullableString(left.requestedTime, right.requestedTime) ||
    left.orderId.localeCompare(right.orderId) ||
    left.productionUnitId.localeCompare(right.productionUnitId) ||
    left.workflowNodeId.localeCompare(right.workflowNodeId) ||
    left.id.localeCompare(right.id)
  );
}

function compareNullableString(left: string | null, right: string | null) {
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left.localeCompare(right);
}

function uniqueValues<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
