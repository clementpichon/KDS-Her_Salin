import type { Order, PaninoOrderItem, Pizza } from "../kds-types";
import {
  buildProductionPlan as defaultBuildProductionPlan,
  type ProductionPlan,
} from "../production-plan";
import {
  SHADOW_PRODUCTION_SLOW_THRESHOLD_MS,
  type ShadowProductionClock,
  type ShadowProductionLogger,
} from "../shadow-production";
import {
  buildLegacyPizzaioloSnapshot as defaultBuildLegacyPizzaioloSnapshot,
  comparePizzaioloViewModelWithLegacy as defaultComparePizzaioloViewModelWithLegacy,
  type PizzaioloLegacyShadowComparison,
  type PizzaioloLegacyShadowIssue,
  type PizzaioloLegacyShadowSummary,
} from "./pizzaiolo-legacy-shadow-comparison";
import {
  buildPizzaioloViewModel as defaultBuildPizzaioloViewModel,
  type PizzaioloViewModel,
} from "./pizzaiolo-view-model";

export type PizzaioloRuntimeShadowStatus = "success" | "skipped" | "failed";

export type PizzaioloRuntimeShadowWarningCode =
  | "pizzaiolo_comparison_orders_missing"
  | "pizzaiolo_comparison_order_items_missing"
  | "pizzaiolo_comparison_panino_data_missing"
  | "pizzaiolo_comparison_pizza_catalog_missing"
  | "pizzaiolo_comparison_plan_unusable"
  | "pizzaiolo_comparison_slow";

export interface PizzaioloRuntimeShadowCoverage {
  orders: boolean;
  orderItems: boolean;
  paninoItems: boolean;
  pizzas: boolean;
}

export interface PizzaioloRuntimeShadowPerformance {
  productionPlanMs: number;
  viewModelMs: number;
  legacySnapshotMs: number;
  comparisonMs: number;
  totalMs: number;
}

export interface PizzaioloRuntimeShadowReport {
  startedAt: string;
  durationMs: number;
  status: PizzaioloRuntimeShadowStatus;
  coverage: PizzaioloRuntimeShadowCoverage;
  planUsable: boolean | null;
  summary: PizzaioloLegacyShadowSummary | null;
  warnings: readonly string[];
  warningCount: number;
  blockingDifferenceCount: number;
  unsupportedCount: number;
  performance: PizzaioloRuntimeShadowPerformance;
  error: string | null;
}

export interface PizzaioloRuntimeShadowDependencies {
  buildProductionPlan: typeof defaultBuildProductionPlan;
  buildPizzaioloViewModel: typeof defaultBuildPizzaioloViewModel;
  buildLegacyPizzaioloSnapshot: typeof defaultBuildLegacyPizzaioloSnapshot;
  comparePizzaioloViewModelWithLegacy: typeof defaultComparePizzaioloViewModelWithLegacy;
}

export interface RunPizzaioloRuntimeShadowComparisonParams {
  orders?: readonly Order[];
  paninoItems?: readonly PaninoOrderItem[];
  pizzas?: readonly Pizza[];
  idSeed?: string;
  coverage?: Partial<PizzaioloRuntimeShadowCoverage>;
  debug?: boolean;
  clock?: ShadowProductionClock;
  logger?: ShadowProductionLogger;
  dependencies?: Partial<PizzaioloRuntimeShadowDependencies>;
}

export interface CreatePizzaioloRuntimeShadowSchedulerParams {
  enqueue?: (task: () => void) => void;
  run?: (params: RunPizzaioloRuntimeShadowComparisonParams) => PizzaioloRuntimeShadowReport;
}

export interface PizzaioloRuntimeShadowScheduler {
  schedule(params: RunPizzaioloRuntimeShadowComparisonParams): void;
}

let lastPizzaioloRuntimeShadowReport: PizzaioloRuntimeShadowReport | null = null;

const DEFAULT_CLOCK: ShadowProductionClock = {
  nowMs: () =>
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now(),
  nowIso: () => new Date().toISOString(),
};

const DEFAULT_DEPENDENCIES: PizzaioloRuntimeShadowDependencies = {
  buildProductionPlan: defaultBuildProductionPlan,
  buildPizzaioloViewModel: defaultBuildPizzaioloViewModel,
  buildLegacyPizzaioloSnapshot: defaultBuildLegacyPizzaioloSnapshot,
  comparePizzaioloViewModelWithLegacy: defaultComparePizzaioloViewModelWithLegacy,
};

const defaultScheduler = createPizzaioloRuntimeShadowScheduler();

export function runPizzaioloRuntimeShadowComparison(
  params: RunPizzaioloRuntimeShadowComparisonParams,
): PizzaioloRuntimeShadowReport {
  const clock = params.clock ?? DEFAULT_CLOCK;
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...params.dependencies };
  const coverage = resolveCoverage(params);
  const startedAt = clock.nowIso();
  const totalStart = clock.nowMs();
  const coverageWarnings = coverageWarningMessages(coverage);

  if (coverageWarnings.length > 0) {
    const durationMs = durationSince(clock, totalStart);
    return publishPizzaioloRuntimeShadowReport(
      skippedReport({
        startedAt,
        durationMs,
        coverage,
        warnings: coverageWarnings,
      }),
      params,
    );
  }

  try {
    const orders = params.orders ?? [];
    const paninoItems = params.paninoItems ?? [];
    const pizzas = params.pizzas ?? [];

    const productionPlan = measure(clock, () =>
      dependencies.buildProductionPlan({
        orders,
        paninoItems,
        idSeed: params.idSeed ?? "pizzaiolo-runtime-shadow",
      }),
    );
    const viewModel = measure(clock, () =>
      dependencies.buildPizzaioloViewModel(productionPlan.value),
    );
    const legacySnapshot = measure(clock, () =>
      dependencies.buildLegacyPizzaioloSnapshot({ orders, paninoItems, pizzas }),
    );
    const comparison = measure(clock, () =>
      dependencies.comparePizzaioloViewModelWithLegacy({
        legacy: legacySnapshot.value,
        viewModel: viewModel.value,
      }),
    );
    const durationMs = durationSince(clock, totalStart);
    const performance = {
      productionPlanMs: productionPlan.durationMs,
      viewModelMs: viewModel.durationMs,
      legacySnapshotMs: legacySnapshot.durationMs,
      comparisonMs: comparison.durationMs,
      totalMs: durationMs,
    };
    const warnings = [
      ...coverageWarnings,
      ...planWarnings(productionPlan.value),
      ...performanceWarnings(performance.totalMs),
    ];
    const report: PizzaioloRuntimeShadowReport = {
      startedAt,
      durationMs,
      status: "success",
      coverage,
      planUsable: productionPlan.value.isUsable,
      summary: cloneSummary(comparison.value.summary),
      warnings,
      warningCount: warnings.length + comparison.value.warnings.length,
      blockingDifferenceCount: comparison.value.blockingDifferences.length,
      unsupportedCount: comparison.value.unsupported.length,
      performance,
      error: null,
    };

    return publishPizzaioloRuntimeShadowReport(report, params, comparison.value);
  } catch (error) {
    const durationMs = durationSince(clock, totalStart);
    return publishPizzaioloRuntimeShadowReport(
      failureReport({
        startedAt,
        durationMs,
        coverage,
        warnings: coverageWarnings,
        error,
      }),
      params,
    );
  }
}

export function schedulePizzaioloRuntimeShadowComparison(
  params: RunPizzaioloRuntimeShadowComparisonParams,
): void {
  defaultScheduler.schedule(params);
}

export function shouldSchedulePizzaioloRuntimeShadowComparison(debugEnabled: boolean): boolean {
  return debugEnabled;
}

export function createPizzaioloRuntimeShadowScheduler({
  enqueue = enqueuePizzaioloRuntimeShadowTask,
  run = runPizzaioloRuntimeShadowComparison,
}: CreatePizzaioloRuntimeShadowSchedulerParams = {}): PizzaioloRuntimeShadowScheduler {
  let queued = false;
  let latestParams: RunPizzaioloRuntimeShadowComparisonParams | null = null;

  return {
    schedule(params) {
      latestParams = params;
      if (queued) return;

      queued = true;
      enqueue(() => {
        queued = false;
        const paramsToRun = latestParams;
        latestParams = null;
        if (!paramsToRun) return;
        run(paramsToRun);
      });
    },
  };
}

export function getLastPizzaioloRuntimeShadowReport(): PizzaioloRuntimeShadowReport | null {
  return lastPizzaioloRuntimeShadowReport ? cloneReport(lastPizzaioloRuntimeShadowReport) : null;
}

function resolveCoverage(
  params: RunPizzaioloRuntimeShadowComparisonParams,
): PizzaioloRuntimeShadowCoverage {
  return {
    orders: params.coverage?.orders ?? Array.isArray(params.orders),
    orderItems:
      params.coverage?.orderItems ??
      Boolean(params.orders?.some((order) => Array.isArray(order.items))),
    paninoItems: params.coverage?.paninoItems ?? Array.isArray(params.paninoItems),
    pizzas: params.coverage?.pizzas ?? Boolean(params.pizzas && params.pizzas.length > 0),
  };
}

function coverageWarningMessages(coverage: PizzaioloRuntimeShadowCoverage) {
  const warnings: string[] = [];
  if (!coverage.orders) {
    warnings.push("pizzaiolo_comparison_orders_missing: commandes non disponibles.");
  }
  if (!coverage.orderItems) {
    warnings.push("pizzaiolo_comparison_order_items_missing: pizzas commande non disponibles.");
  }
  if (!coverage.paninoItems) {
    warnings.push(
      "pizzaiolo_comparison_panino_data_missing: panino_order_items non disponibles pour les deux projections.",
    );
  }
  if (!coverage.pizzas) {
    warnings.push("pizzaiolo_comparison_pizza_catalog_missing: catalogue pizzas non disponible.");
  }
  return warnings;
}

function planWarnings(plan: ProductionPlan) {
  if (plan.isUsable) return [];
  return ["pizzaiolo_comparison_plan_unusable: ProductionPlan non exploitable."];
}

function performanceWarnings(totalMs: number) {
  if (totalMs <= SHADOW_PRODUCTION_SLOW_THRESHOLD_MS) return [];
  return [
    `pizzaiolo_comparison_slow: comparaison superieure au seuil de ${SHADOW_PRODUCTION_SLOW_THRESHOLD_MS} ms: ${totalMs} ms.`,
  ];
}

function skippedReport({
  startedAt,
  durationMs,
  coverage,
  warnings,
}: {
  startedAt: string;
  durationMs: number;
  coverage: PizzaioloRuntimeShadowCoverage;
  warnings: readonly string[];
}): PizzaioloRuntimeShadowReport {
  return {
    startedAt,
    durationMs,
    status: "skipped",
    coverage,
    planUsable: null,
    summary: null,
    warnings: [...warnings],
    warningCount: warnings.length,
    blockingDifferenceCount: 0,
    unsupportedCount: 0,
    performance: emptyPerformance(durationMs),
    error: null,
  };
}

function failureReport({
  startedAt,
  durationMs,
  coverage,
  warnings,
  error,
}: {
  startedAt: string;
  durationMs: number;
  coverage: PizzaioloRuntimeShadowCoverage;
  warnings: readonly string[];
  error: unknown;
}): PizzaioloRuntimeShadowReport {
  return {
    startedAt,
    durationMs,
    status: "failed",
    coverage,
    planUsable: null,
    summary: null,
    warnings: [...warnings],
    warningCount: warnings.length,
    blockingDifferenceCount: 1,
    unsupportedCount: 0,
    performance: emptyPerformance(durationMs),
    error: messageFromUnknown(error),
  };
}

function publishPizzaioloRuntimeShadowReport(
  report: PizzaioloRuntimeShadowReport,
  params: Pick<RunPizzaioloRuntimeShadowComparisonParams, "debug" | "logger">,
  comparison: PizzaioloLegacyShadowComparison | null = null,
) {
  lastPizzaioloRuntimeShadowReport = cloneReport(report);

  if (params.debug) {
    (params.logger ?? console).log(formatPizzaioloRuntimeShadowDebugReport(report, comparison));
  }

  return report;
}

function formatPizzaioloRuntimeShadowDebugReport(
  report: PizzaioloRuntimeShadowReport,
  comparison: PizzaioloLegacyShadowComparison | null,
) {
  const summary = report.summary;
  const lines = [
    "========== PIZZAIOLO SHADOW COMPARISON ==========",
    "",
    `Status: ${report.status}`,
    `Plan usable: ${report.planUsable === null ? "n/a" : String(report.planUsable)}`,
    "",
    `Legacy visible orders: ${summary?.legacyVisibleOrders ?? "n/a"}`,
    `ViewModel visible orders: ${summary?.viewModelVisibleOrders ?? "n/a"}`,
    "",
    `Legacy actionable orders: ${summary?.legacyActionableOrders ?? "n/a"}`,
    `ViewModel selectable orders: ${summary?.viewModelSelectableOrders ?? "n/a"}`,
    "",
    `Legacy actionable pizzas: ${summary?.legacyActionablePizzas ?? "n/a"}`,
    `ViewModel actionable pizzas: ${summary?.viewModelActionablePizzas ?? "n/a"}`,
    "",
    `Matches: ${summary?.matches ?? 0}`,
    `Warnings: ${report.warningCount}`,
    `Blocking diagnostics: ${report.blockingDifferenceCount}`,
    `Unsupported: ${report.unsupportedCount}`,
    "",
    `Duration: ${report.durationMs} ms`,
    "",
    "=================================================",
  ];

  const detailedDiagnostics = formatDetailedDiagnostics(report, comparison);
  if (detailedDiagnostics.length > 0) {
    lines.push("", "Diagnostics:", ...detailedDiagnostics);
  }

  return lines.join("\n");
}

function formatDetailedDiagnostics(
  report: PizzaioloRuntimeShadowReport,
  comparison: PizzaioloLegacyShadowComparison | null,
) {
  const diagnostics = [
    ...report.warnings.map((warning) => `warning: ${warning}`),
    ...(comparison?.warnings.map(formatIssue) ?? []),
    ...(comparison?.blockingDifferences.map(formatIssue) ?? []),
    ...(comparison?.unsupported.map(formatIssue) ?? []),
  ];
  return diagnostics;
}

function formatIssue(issue: PizzaioloLegacyShadowIssue) {
  return `${issue.kind}: ${issue.code} ${JSON.stringify(issue.refs)}`;
}

function enqueuePizzaioloRuntimeShadowTask(task: () => void) {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(task);
    return;
  }

  setTimeout(task, 0);
}

function measure<T>(clock: ShadowProductionClock, callback: () => T) {
  const start = clock.nowMs();
  const value = callback();
  return {
    value,
    durationMs: durationSince(clock, start),
  };
}

function durationSince(clock: ShadowProductionClock, start: number) {
  return roundDuration(clock.nowMs() - start);
}

function roundDuration(durationMs: number) {
  return Math.max(0, Math.round(durationMs * 1000) / 1000);
}

function emptyPerformance(durationMs: number): PizzaioloRuntimeShadowPerformance {
  return {
    productionPlanMs: 0,
    viewModelMs: 0,
    legacySnapshotMs: 0,
    comparisonMs: 0,
    totalMs: durationMs,
  };
}

function messageFromUnknown(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function cloneSummary(summary: PizzaioloLegacyShadowSummary): PizzaioloLegacyShadowSummary {
  return { ...summary };
}

function cloneReport(report: PizzaioloRuntimeShadowReport): PizzaioloRuntimeShadowReport {
  return {
    ...report,
    coverage: { ...report.coverage },
    summary: report.summary ? { ...report.summary } : null,
    warnings: [...report.warnings],
    performance: { ...report.performance },
  };
}
