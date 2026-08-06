import type { Order, OrderItem, PaninoOrderItem, Pizza } from "../kds-types";
import { buildPizzaioloQueue } from "../pizzaiolo-queue";
import {
  getPizzaDisplayDetails,
  normalizePizzaBaseKey,
  pizzaProductionStatus,
  type PizzaBaseKey,
} from "../pizza-production";
import type { PizzaioloViewModel, PizzaioloWorkUnitView } from "./pizzaiolo-view-model";

export type PizzaioloLegacyShadowIssueKind =
  | "match"
  | "warning"
  | "blocking_difference"
  | "unsupported";

export interface LegacyPizzaioloPizzaSnapshot {
  itemId: string;
  orderId: string;
  jobId: string;
  pizzaName: string;
  status: "to_prepare" | "in_oven" | "ready";
  actionable: boolean;
  base: PizzaBaseKey;
  extras: readonly string[];
  removed: readonly string[];
  cutInto: number | null;
  orderSequence: number;
  pizzaSequence: number;
}

export interface LegacyPizzaioloJobSnapshot {
  id: string;
  customerName: string;
  requestedTime: string;
  orderIds: readonly string[];
  pizzaItemIds: readonly string[];
  actionablePizzaItemIds: readonly string[];
  paninoItemIds: readonly string[];
  productKinds: readonly string[];
  isMixedOrder: boolean;
  queuePosition: number | null;
  sequence: number;
}

export interface LegacyPizzaioloSnapshot {
  visibleOrderIds: readonly string[];
  actionableOrderIds: readonly string[];
  visiblePizzaItemIds: readonly string[];
  actionablePizzaItemIds: readonly string[];
  jobs: readonly LegacyPizzaioloJobSnapshot[];
  pizzas: readonly LegacyPizzaioloPizzaSnapshot[];
  ambiguousPizzaItemIds: readonly string[];
}

export interface BuildLegacyPizzaioloSnapshotParams {
  orders: readonly Order[];
  paninoItems: readonly PaninoOrderItem[];
  pizzas: readonly Pizza[];
}

export interface ComparePizzaioloViewModelWithLegacyParams {
  legacy: LegacyPizzaioloSnapshot;
  viewModel: PizzaioloViewModel;
}

export interface PizzaioloLegacyShadowIssue {
  kind: PizzaioloLegacyShadowIssueKind;
  code: string;
  message: string;
  refs: Readonly<Record<string, string | number | boolean | readonly string[] | null>>;
}

export interface PizzaioloLegacyShadowSummary {
  legacyVisibleOrders: number;
  viewModelVisibleOrders: number;
  legacyActionableOrders: number;
  viewModelSelectableOrders: number;
  legacyVisiblePizzas: number;
  legacyActionablePizzas: number;
  viewModelActionablePizzas: number;
  matches: number;
  warnings: number;
  blockingDifferences: number;
  unsupported: number;
  isConsistent: boolean;
}

export interface PizzaioloLegacyShadowComparison {
  matches: readonly PizzaioloLegacyShadowIssue[];
  warnings: readonly PizzaioloLegacyShadowIssue[];
  blockingDifferences: readonly PizzaioloLegacyShadowIssue[];
  unsupported: readonly PizzaioloLegacyShadowIssue[];
  summary: PizzaioloLegacyShadowSummary;
}

export function buildLegacyPizzaioloSnapshot({
  orders,
  paninoItems,
  pizzas,
}: BuildLegacyPizzaioloSnapshotParams): LegacyPizzaioloSnapshot {
  const jobs = buildPizzaioloQueue([...orders], [...paninoItems]);
  const pizzaSnapshots: LegacyPizzaioloPizzaSnapshot[] = [];
  const ambiguousPizzaItemIds: string[] = [];

  const jobSnapshots = jobs.map((job, sequence): LegacyPizzaioloJobSnapshot => {
    const jobPizzaSnapshots = job.items.map((item, index) => {
      const details = getPizzaDisplayDetails(cloneOrderItem(item), [...pizzas]);
      const status = pizzaProductionStatus(
        item,
        job.orders.find((order) => order.id === item.order_id),
      );
      const snapshot: LegacyPizzaioloPizzaSnapshot = {
        itemId: item.id,
        orderId: item.order_id,
        jobId: job.id,
        pizzaName: item.pizza_name,
        status,
        actionable: status === "to_prepare",
        base: details.base.key,
        extras: [...details.extras],
        removed: [...details.removed],
        cutInto: item.cut_into ?? null,
        orderSequence: sequence,
        pizzaSequence: index,
      };
      if (snapshot.base === "unknown") ambiguousPizzaItemIds.push(item.id);
      pizzaSnapshots.push(snapshot);
      return snapshot;
    });
    const productKinds = productKindsFor(job.items, job.paninos);

    return {
      id: job.id,
      customerName: job.customer_name,
      requestedTime: job.requested_time,
      orderIds: job.orders.map((order) => order.id),
      pizzaItemIds: jobPizzaSnapshots.map((pizza) => pizza.itemId),
      actionablePizzaItemIds: jobPizzaSnapshots
        .filter((pizza) => pizza.actionable)
        .map((pizza) => pizza.itemId),
      paninoItemIds: job.paninos.map((item) => item.id),
      productKinds,
      isMixedOrder: productKinds.length > 1,
      queuePosition: job.queue_position,
      sequence,
    };
  });

  return {
    visibleOrderIds: uniqueValues(jobSnapshots.flatMap((job) => job.orderIds)),
    actionableOrderIds: uniqueValues(
      jobSnapshots
        .filter(
          (job) => job.actionablePizzaItemIds.length > 0 || job.productKinds.includes("panino"),
        )
        .flatMap((job) => job.orderIds),
    ),
    visiblePizzaItemIds: pizzaSnapshots.map((pizza) => pizza.itemId),
    actionablePizzaItemIds: pizzaSnapshots
      .filter((pizza) => pizza.actionable)
      .map((pizza) => pizza.itemId),
    jobs: jobSnapshots,
    pizzas: pizzaSnapshots,
    ambiguousPizzaItemIds,
  };
}

export function comparePizzaioloViewModelWithLegacy({
  legacy,
  viewModel,
}: ComparePizzaioloViewModelWithLegacyParams): PizzaioloLegacyShadowComparison {
  const issues: PizzaioloLegacyShadowIssue[] = [];
  const viewActionablePizzas = viewModel.pizzasReadyToPrepare.filter(
    (workUnit): workUnit is PizzaioloWorkUnitView & { sourceItemId: string } =>
      workUnit.sourceItemId !== null,
  );
  const viewActionablePizzaItemIds = viewActionablePizzas.map((workUnit) => workUnit.sourceItemId);
  const viewVisibleOrderIds = visibleOrderIdsFromViewModel(viewModel);
  const legacyPizzaById = new Map(legacy.pizzas.map((pizza) => [pizza.itemId, pizza]));
  const viewPizzaBySourceItemId = new Map(
    viewActionablePizzas.map((workUnit) => [workUnit.sourceItemId, workUnit]),
  );

  compareSequences({
    legacyIds: legacy.visibleOrderIds,
    viewModelIds: viewVisibleOrderIds,
    entity: "order",
    sameSetCode: "visible_order_set_matches",
    differentSetCode: "visible_order_set_differs",
    sameOrderCode: "visible_order_order_matches",
    differentOrderCode: "visible_order_order_differs",
    missingFromViewCode: "legacy_visible_order_missing_in_view_model",
    missingFromLegacyCode: "view_model_visible_order_missing_in_legacy",
    missingKind: "blocking_difference",
    orderDifferenceKind: "warning",
    issues,
  });

  compareSequences({
    legacyIds: legacy.actionableOrderIds,
    viewModelIds: viewModel.selection.selectableOrderIds,
    entity: "order",
    sameSetCode: "actionable_order_set_matches",
    differentSetCode: "actionable_order_set_differs",
    sameOrderCode: "actionable_order_order_matches",
    differentOrderCode: "actionable_order_order_differs",
    missingFromViewCode: "legacy_actionable_order_missing_in_view_model",
    missingFromLegacyCode: "view_model_selectable_order_missing_in_legacy",
    missingKind: "blocking_difference",
    orderDifferenceKind: "warning",
    issues,
  });

  compareSequences({
    legacyIds: legacy.actionablePizzaItemIds,
    viewModelIds: viewActionablePizzaItemIds,
    entity: "pizza",
    sameSetCode: "actionable_pizza_set_matches",
    differentSetCode: "actionable_pizza_set_differs",
    sameOrderCode: "actionable_pizza_order_matches",
    differentOrderCode: "actionable_pizza_order_differs",
    missingFromViewCode: "legacy_pizza_missing_in_view_model",
    missingFromLegacyCode: "view_model_pizza_missing_in_legacy",
    missingKind: "blocking_difference",
    orderDifferenceKind: "warning",
    issues,
  });

  for (const itemId of intersection(legacy.actionablePizzaItemIds, viewActionablePizzaItemIds)) {
    const legacyPizza = legacyPizzaById.get(itemId);
    const viewPizza = viewPizzaBySourceItemId.get(itemId);
    if (!legacyPizza || !viewPizza) continue;
    comparePizzaDetails(legacyPizza, viewPizza, issues);
  }

  compareMixedOrderContext(legacy, viewModel, issues);

  for (const itemId of legacy.ambiguousPizzaItemIds) {
    issues.push(
      issue("unsupported", "legacy_ambiguous_pizza_base", "Base legacy ambigue pour une pizza", {
        itemId,
      }),
    );
  }

  return reportFromIssues({
    issues,
    legacy,
    viewModelVisibleOrderIds: viewVisibleOrderIds,
    viewModelActionablePizzaItemIds: viewActionablePizzaItemIds,
    viewModelSelectableOrderIds: viewModel.selection.selectableOrderIds,
  });
}

function visibleOrderIdsFromViewModel(viewModel: PizzaioloViewModel) {
  return viewModel.groupedOrders
    .filter((group) => group.availableWorkUnitIds.length > 0 || group.blockedWorkUnitIds.length > 0)
    .map((group) => group.orderId);
}

function compareSequences({
  legacyIds,
  viewModelIds,
  entity,
  sameSetCode,
  differentSetCode,
  sameOrderCode,
  differentOrderCode,
  missingFromViewCode,
  missingFromLegacyCode,
  missingKind,
  orderDifferenceKind,
  issues,
}: {
  legacyIds: readonly string[];
  viewModelIds: readonly string[];
  entity: "order" | "pizza";
  sameSetCode: string;
  differentSetCode: string;
  sameOrderCode: string;
  differentOrderCode: string;
  missingFromViewCode: string;
  missingFromLegacyCode: string;
  missingKind: PizzaioloLegacyShadowIssueKind;
  orderDifferenceKind: PizzaioloLegacyShadowIssueKind;
  issues: PizzaioloLegacyShadowIssue[];
}) {
  const legacySet = new Set(legacyIds);
  const viewModelSet = new Set(viewModelIds);
  const missingFromView = legacyIds.filter((id) => !viewModelSet.has(id));
  const missingFromLegacy = viewModelIds.filter((id) => !legacySet.has(id));

  for (const id of missingFromView) {
    issues.push(
      issue(missingKind, missingFromViewCode, `${entity} legacy absent du ViewModel`, {
        id,
      }),
    );
  }

  for (const id of missingFromLegacy) {
    issues.push(
      issue(missingKind, missingFromLegacyCode, `${entity} ViewModel absent du legacy`, {
        id,
      }),
    );
  }

  if (!sameStringSet(legacyIds, viewModelIds)) {
    issues.push(
      issue(missingKind, differentSetCode, `Ensemble ${entity} different`, {
        legacyIds: [...legacyIds],
        viewModelIds: [...viewModelIds],
        missingFromView,
        missingFromLegacy,
      }),
    );
    return;
  }

  issues.push(
    issue("match", sameSetCode, `Ensemble ${entity} identique`, {
      ids: [...legacyIds],
    }),
  );

  if (sameStringSequence(legacyIds, viewModelIds)) {
    issues.push(
      issue("match", sameOrderCode, `Ordre ${entity} identique`, {
        ids: [...legacyIds],
      }),
    );
    return;
  }

  issues.push(
    issue(
      orderDifferenceKind,
      differentOrderCode,
      `Ordre ${entity} different entre legacy et Scheduler`,
      {
        legacyIds: [...legacyIds],
        viewModelIds: [...viewModelIds],
      },
    ),
  );
}

function comparePizzaDetails(
  legacyPizza: LegacyPizzaioloPizzaSnapshot,
  viewPizza: PizzaioloWorkUnitView & { sourceItemId: string },
  issues: PizzaioloLegacyShadowIssue[],
) {
  const viewBase = normalizePizzaBaseKey(viewPizza.pizza?.base) ?? "unknown";
  let hasBlockingDifference = false;
  let hasUnsupported = false;

  if (legacyPizza.status !== "to_prepare" || viewPizza.status !== "available") {
    hasBlockingDifference = true;
    issues.push(
      issue("blocking_difference", "pizza_status_differs", "Statut pizza different", {
        itemId: legacyPizza.itemId,
        legacyStatus: legacyPizza.status,
        viewModelStatus: viewPizza.status,
      }),
    );
  }

  if (legacyPizza.base !== "unknown" && viewBase !== "unknown" && legacyPizza.base !== viewBase) {
    hasBlockingDifference = true;
    issues.push(
      issue("blocking_difference", "pizza_base_differs", "Base pizza differente", {
        itemId: legacyPizza.itemId,
        legacyBase: legacyPizza.base,
        viewModelBase: viewBase,
      }),
    );
  } else if (legacyPizza.base === "unknown" || viewBase === "unknown") {
    hasUnsupported = true;
    issues.push(
      issue(
        "unsupported",
        "pizza_base_ambiguous",
        "Base pizza impossible a comparer avec certitude",
        {
          itemId: legacyPizza.itemId,
          legacyBase: legacyPizza.base,
          viewModelBase: viewBase,
        },
      ),
    );
  }

  if (
    compareStringArrays(
      "pizza_extras",
      legacyPizza.itemId,
      legacyPizza.extras,
      viewPizza.pizza?.extras,
      issues,
    )
  ) {
    hasBlockingDifference = true;
  }
  if (
    compareStringArrays(
      "pizza_removed",
      legacyPizza.itemId,
      legacyPizza.removed,
      viewPizza.pizza?.removed,
      issues,
    )
  ) {
    hasBlockingDifference = true;
  }

  if (legacyPizza.cutInto !== (viewPizza.pizza?.cutInto ?? null)) {
    hasBlockingDifference = true;
    issues.push(
      issue("blocking_difference", "pizza_cut_differs", "Decoupe pizza differente", {
        itemId: legacyPizza.itemId,
        legacyCutInto: legacyPizza.cutInto,
        viewModelCutInto: viewPizza.pizza?.cutInto ?? null,
      }),
    );
  }

  if (!hasBlockingDifference && !hasUnsupported) {
    issues.push(
      issue("match", "pizza_details_match", "Details pizza coherents", {
        itemId: legacyPizza.itemId,
      }),
    );
  }
}

function compareStringArrays(
  codePrefix: string,
  itemId: string,
  legacyValues: readonly string[],
  viewValues: readonly string[] | undefined,
  issues: PizzaioloLegacyShadowIssue[],
) {
  const viewModelValues = viewValues ?? [];
  if (sameStringSequence(legacyValues, viewModelValues)) return false;

  issues.push(
    issue("blocking_difference", `${codePrefix}_differs`, "Liste pizza differente", {
      itemId,
      legacyValues: [...legacyValues],
      viewModelValues: [...viewModelValues],
    }),
  );
  return true;
}

function compareMixedOrderContext(
  legacy: LegacyPizzaioloSnapshot,
  viewModel: PizzaioloViewModel,
  issues: PizzaioloLegacyShadowIssue[],
) {
  const viewGroupsByOrderId = new Map(
    viewModel.groupedOrders.map((group) => [group.orderId, group]),
  );

  for (const job of legacy.jobs) {
    for (const orderId of job.orderIds) {
      const viewGroup = viewGroupsByOrderId.get(orderId);
      if (!viewGroup) continue;
      if (job.isMixedOrder === viewGroup.isMixedOrder) {
        if (job.isMixedOrder) {
          issues.push(
            issue("match", "mixed_order_context_matches", "Contexte commande mixte conserve", {
              orderId,
            }),
          );
        }
        continue;
      }
      issues.push(
        issue("warning", "mixed_order_context_differs", "Contexte commande mixte different", {
          orderId,
          legacyMixed: job.isMixedOrder,
          viewModelMixed: viewGroup.isMixedOrder,
        }),
      );
    }
  }
}

function reportFromIssues({
  issues,
  legacy,
  viewModelVisibleOrderIds,
  viewModelActionablePizzaItemIds,
  viewModelSelectableOrderIds,
}: {
  issues: readonly PizzaioloLegacyShadowIssue[];
  legacy: LegacyPizzaioloSnapshot;
  viewModelVisibleOrderIds: readonly string[];
  viewModelActionablePizzaItemIds: readonly string[];
  viewModelSelectableOrderIds: readonly string[];
}): PizzaioloLegacyShadowComparison {
  const matches = issues.filter((issue) => issue.kind === "match");
  const warnings = issues.filter((issue) => issue.kind === "warning");
  const blockingDifferences = issues.filter((issue) => issue.kind === "blocking_difference");
  const unsupported = issues.filter((issue) => issue.kind === "unsupported");

  return {
    matches,
    warnings,
    blockingDifferences,
    unsupported,
    summary: {
      legacyVisibleOrders: legacy.visibleOrderIds.length,
      viewModelVisibleOrders: viewModelVisibleOrderIds.length,
      legacyActionableOrders: legacy.actionableOrderIds.length,
      viewModelSelectableOrders: viewModelSelectableOrderIds.length,
      legacyVisiblePizzas: legacy.visiblePizzaItemIds.length,
      legacyActionablePizzas: legacy.actionablePizzaItemIds.length,
      viewModelActionablePizzas: viewModelActionablePizzaItemIds.length,
      matches: matches.length,
      warnings: warnings.length,
      blockingDifferences: blockingDifferences.length,
      unsupported: unsupported.length,
      isConsistent: blockingDifferences.length === 0,
    },
  };
}

function productKindsFor(
  pizzaItems: readonly OrderItem[],
  paninoItems: readonly PaninoOrderItem[],
) {
  return uniqueValues([
    ...(pizzaItems.length > 0 ? ["pizza"] : []),
    ...paninoItems.map((item) => productKindForPaninoKey(item.product_key)),
  ]);
}

function productKindForPaninoKey(productKey: string) {
  const normalized = productKey.toLowerCase();
  if (normalized === "panino") return "panino";
  if (normalized === "fishno" || normalized === "fish_no") return "fish_no";
  if (normalized === "cornet_frites" || normalized === "frites" || normalized === "fries") {
    return "fries";
  }
  if (normalized === "grenailles" || normalized === "pommes_grenailles") return "grenailles";
  return "other";
}

function cloneOrderItem(item: OrderItem): OrderItem {
  return {
    ...item,
    extras: [...item.extras],
    removed: [...item.removed],
  };
}

function issue(
  kind: PizzaioloLegacyShadowIssueKind,
  code: string,
  message: string,
  refs: PizzaioloLegacyShadowIssue["refs"],
): PizzaioloLegacyShadowIssue {
  return { kind, code, message, refs };
}

function sameStringSet(left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

function sameStringSequence(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function intersection(left: readonly string[], right: readonly string[]) {
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value));
}

function uniqueValues<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
