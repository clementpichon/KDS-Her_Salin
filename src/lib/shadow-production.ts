import { buildBatchPlan as defaultBuildBatchPlan } from "./batch-builder";
import {
  assembleProductionPlan as defaultAssembleProductionPlan,
  type ProductionPlan,
  type ProductionPlanBlockingIssue,
} from "./production-plan";
import {
  buildProductionUnits as defaultBuildProductionUnits,
  type BuildProductionUnitsParams,
} from "./production-units";
import { buildSchedulerPlan as defaultBuildSchedulerPlan } from "./scheduler-core";
import { buildWorkUnits as defaultBuildWorkUnits } from "./work-units";
import { diagnoseWorkUnits as defaultDiagnoseWorkUnits } from "./work-units-diagnostics";

export const SHADOW_PRODUCTION_SLOW_THRESHOLD_MS = 100;

export type ShadowProductionPerformanceStatus = "ok" | "slow";

export type ShadowProductionWarningCode = "panino_items_not_included" | "shadow_production_slow";

export interface ShadowProductionCoverage {
  orders: boolean;
  orderItems: boolean;
  paninoItems: boolean;
}

export interface ShadowProductionWarning {
  code: ShadowProductionWarningCode;
  message: string;
}

export interface ShadowProductionPerformance {
  productionUnitsMs: number;
  workUnitsMs: number;
  diagnosticsMs: number;
  schedulerMs: number;
  batchBuilderMs: number;
  assemblePlanMs: number;
  productionPlanMs: number;
  totalMs: number;
}

export interface ShadowProductionReport {
  startedAt: string;
  durationMs: number;
  planUsable: boolean;
  coverage: ShadowProductionCoverage;
  orders: number;
  productionUnits: number;
  workUnits: number;
  batches: number;
  performanceStatus: ShadowProductionPerformanceStatus;
  warnings: number;
  blockingDifferences: number;
  warningDiagnostics: readonly string[];
  diagnostics: readonly string[];
  schedulerDiagnostics: readonly string[];
  batchDiagnostics: readonly string[];
  performance: ShadowProductionPerformance;
  planId: string | null;
  error: string | null;
}

export interface ShadowProductionClock {
  nowMs(): number;
  nowIso(): string;
}

export interface ShadowProductionLogger {
  log(message: string): void;
}

interface ShadowProductionDependencies {
  buildProductionUnits: typeof defaultBuildProductionUnits;
  buildWorkUnits: typeof defaultBuildWorkUnits;
  diagnoseWorkUnits: typeof defaultDiagnoseWorkUnits;
  buildSchedulerPlan: typeof defaultBuildSchedulerPlan;
  buildBatchPlan: typeof defaultBuildBatchPlan;
  assembleProductionPlan: typeof defaultAssembleProductionPlan;
}

export interface RunShadowProductionParams extends BuildProductionUnitsParams {
  idSeed?: string;
  debug?: boolean;
  coverage?: Partial<ShadowProductionCoverage>;
  clock?: ShadowProductionClock;
  logger?: ShadowProductionLogger;
  dependencies?: Partial<ShadowProductionDependencies>;
}

export interface ShadowProductionScheduler {
  schedule(params: RunShadowProductionParams): void;
}

export interface CreateShadowProductionSchedulerParams {
  enqueue?: (task: () => void) => void;
  run?: (params: RunShadowProductionParams) => ShadowProductionReport;
}

export interface ShouldRunShadowProductionAfterReloadParams {
  ordersError: unknown;
  orderItemsError: unknown;
}

let lastShadowProductionReport: ShadowProductionReport | null = null;

const DEFAULT_DEPENDENCIES: ShadowProductionDependencies = {
  buildProductionUnits: defaultBuildProductionUnits,
  buildWorkUnits: defaultBuildWorkUnits,
  diagnoseWorkUnits: defaultDiagnoseWorkUnits,
  buildSchedulerPlan: defaultBuildSchedulerPlan,
  buildBatchPlan: defaultBuildBatchPlan,
  assembleProductionPlan: defaultAssembleProductionPlan,
};

const DEFAULT_CLOCK: ShadowProductionClock = {
  nowMs: () =>
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now(),
  nowIso: () => new Date().toISOString(),
};

const defaultScheduler = createShadowProductionScheduler();

export function runShadowProduction(params: RunShadowProductionParams): ShadowProductionReport {
  const clock = params.clock ?? DEFAULT_CLOCK;
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...params.dependencies };
  const coverage = resolveCoverage(params);
  const initialWarnings = buildCoverageWarnings(coverage);
  const startedAt = clock.nowIso();
  const totalStart = clock.nowMs();

  try {
    const planStart = clock.nowMs();
    const productionUnits = measure(clock, () => dependencies.buildProductionUnits(params));
    const workUnits = measure(clock, () =>
      dependencies.buildWorkUnits({ productionUnits: productionUnits.value }),
    );
    const workUnitDiagnostic = measure(clock, () =>
      dependencies.diagnoseWorkUnits({
        productionUnits: productionUnits.value,
        workUnits: workUnits.value,
      }),
    );
    const schedulerPlan = measure(clock, () =>
      dependencies.buildSchedulerPlan({ workUnits: workUnits.value }),
    );
    const batchPlan = measure(clock, () =>
      dependencies.buildBatchPlan({ schedulerPlan: schedulerPlan.value }),
    );
    const productionPlan = measure(clock, () =>
      dependencies.assembleProductionPlan({
        idSeed: params.idSeed ?? "shadow-production",
        productionUnits: productionUnits.value,
        workUnits: workUnits.value,
        workUnitDiagnostic: workUnitDiagnostic.value,
        schedulerPlan: schedulerPlan.value,
        batchPlan: batchPlan.value,
      }),
    );
    const productionPlanMs = durationSince(clock, planStart);
    const durationMs = durationSince(clock, totalStart);

    const report = reportFromPlan({
      startedAt,
      durationMs,
      coverage,
      orders: params.orders.length,
      plan: productionPlan.value,
      performance: {
        productionUnitsMs: productionUnits.durationMs,
        workUnitsMs: workUnits.durationMs,
        diagnosticsMs: workUnitDiagnostic.durationMs,
        schedulerMs: schedulerPlan.durationMs,
        batchBuilderMs: batchPlan.durationMs,
        assemblePlanMs: productionPlan.durationMs,
        productionPlanMs,
        totalMs: durationMs,
      },
      initialWarnings,
    });

    return publishShadowProductionReport(report, params);
  } catch (error) {
    const durationMs = durationSince(clock, totalStart);
    const report = failureReport({
      startedAt,
      durationMs,
      coverage,
      orders: params.orders.length,
      error,
      initialWarnings,
    });

    return publishShadowProductionReport(report, params);
  }
}

export function scheduleShadowProductionRun(params: RunShadowProductionParams): void {
  defaultScheduler.schedule(params);
}

export function createShadowProductionScheduler({
  enqueue = enqueueShadowProductionTask,
  run = runShadowProduction,
}: CreateShadowProductionSchedulerParams = {}): ShadowProductionScheduler {
  let queued = false;
  let latestParams: RunShadowProductionParams | null = null;

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

export function shouldRunShadowProductionAfterReload({
  ordersError,
  orderItemsError,
}: ShouldRunShadowProductionAfterReloadParams) {
  return !ordersError && !orderItemsError;
}

export function getLastShadowProductionReport(): ShadowProductionReport | null {
  return lastShadowProductionReport ? cloneReport(lastShadowProductionReport) : null;
}

export function isShadowProductionDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;

  const debugWindow = window as Window & {
    __KDS_SHADOW_PRODUCTION_DEBUG__?: boolean;
  };

  if (debugWindow.__KDS_SHADOW_PRODUCTION_DEBUG__ === true) return true;

  try {
    if (debugWindow.localStorage.getItem("kds.shadowProduction.debug") === "1") return true;
  } catch {
    // Ignore storage access failures in private or restricted browser contexts.
  }

  try {
    return new URLSearchParams(debugWindow.location.search).get("shadowProductionDebug") === "1";
  } catch {
    return false;
  }
}

function reportFromPlan({
  startedAt,
  durationMs,
  coverage,
  orders,
  plan,
  performance,
  initialWarnings,
}: {
  startedAt: string;
  durationMs: number;
  coverage: ShadowProductionCoverage;
  orders: number;
  plan: ProductionPlan;
  performance: ShadowProductionPerformance;
  initialWarnings: readonly ShadowProductionWarning[];
}): ShadowProductionReport {
  const performanceStatus =
    performance.totalMs > SHADOW_PRODUCTION_SLOW_THRESHOLD_MS ? "slow" : "ok";
  const warningDiagnostics = [
    ...initialWarnings,
    ...buildPerformanceWarnings(performanceStatus, performance.totalMs),
  ].map(formatWarning);
  const blockingDiagnostics = plan.blockingIssues.map(formatBlockingIssue);

  return {
    startedAt,
    durationMs,
    planUsable: plan.isUsable,
    coverage,
    orders,
    productionUnits: plan.counters.productionUnitCount,
    workUnits: plan.counters.workUnitCount,
    batches: plan.counters.batchCount,
    performanceStatus,
    warnings: warningDiagnostics.length,
    blockingDifferences: plan.blockingIssues.length,
    warningDiagnostics,
    diagnostics: [...warningDiagnostics, ...blockingDiagnostics],
    schedulerDiagnostics: plan.blockingIssues
      .filter(isSchedulerBlockingIssue)
      .map(formatBlockingIssue),
    batchDiagnostics: plan.blockingIssues
      .filter((issue) => issue.type === "batch_work_unit_order_mismatch")
      .map(formatBlockingIssue),
    performance,
    planId: plan.id,
    error: null,
  };
}

function failureReport({
  startedAt,
  durationMs,
  coverage,
  orders,
  error,
  initialWarnings,
}: {
  startedAt: string;
  durationMs: number;
  coverage: ShadowProductionCoverage;
  orders: number;
  error: unknown;
  initialWarnings: readonly ShadowProductionWarning[];
}): ShadowProductionReport {
  const errorMessage = messageFromUnknown(error);
  const performanceStatus = durationMs > SHADOW_PRODUCTION_SLOW_THRESHOLD_MS ? "slow" : "ok";
  const warningDiagnostics = [
    ...initialWarnings,
    ...buildPerformanceWarnings(performanceStatus, durationMs),
  ].map(formatWarning);
  const failureDiagnostic = `shadow_production_failed: ${errorMessage}`;

  return {
    startedAt,
    durationMs,
    planUsable: false,
    coverage,
    orders,
    productionUnits: 0,
    workUnits: 0,
    batches: 0,
    performanceStatus,
    warnings: warningDiagnostics.length,
    blockingDifferences: 1,
    warningDiagnostics,
    diagnostics: [...warningDiagnostics, failureDiagnostic],
    schedulerDiagnostics: [],
    batchDiagnostics: [],
    performance: {
      productionUnitsMs: 0,
      workUnitsMs: 0,
      diagnosticsMs: 0,
      schedulerMs: 0,
      batchBuilderMs: 0,
      assemblePlanMs: 0,
      productionPlanMs: durationMs,
      totalMs: durationMs,
    },
    planId: null,
    error: errorMessage,
  };
}

function publishShadowProductionReport(
  report: ShadowProductionReport,
  params: Pick<RunShadowProductionParams, "debug" | "logger">,
) {
  lastShadowProductionReport = cloneReport(report);

  if (params.debug) {
    (params.logger ?? console).log(formatShadowProductionDebugReport(report));
  }

  return report;
}

function enqueueShadowProductionTask(task: () => void) {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(task);
    return;
  }

  setTimeout(task, 0);
}

function formatShadowProductionDebugReport(report: ShadowProductionReport) {
  return [
    "========== SHADOW PRODUCTION ==========",
    "",
    `ProductionPlan : ${report.planUsable ? "usable" : "unusable"}`,
    "",
    `Orders : ${report.orders}`,
    "",
    `ProductionUnits : ${report.productionUnits}`,
    "",
    `WorkUnits : ${report.workUnits}`,
    "",
    `Batches : ${report.batches}`,
    "",
    `Duration : ${report.durationMs} ms`,
    "",
    `Warnings : ${report.warnings}`,
    "",
    `Blocking : ${report.blockingDifferences}`,
    "",
    "=======================================",
  ].join("\n");
}

function resolveCoverage(params: RunShadowProductionParams): ShadowProductionCoverage {
  return {
    orders: params.coverage?.orders ?? true,
    orderItems:
      (params.coverage?.orderItems ?? Boolean(params.orderItems)) ||
      params.orders.some((order) => Array.isArray(order.items)),
    paninoItems: params.coverage?.paninoItems ?? params.paninoItems !== undefined,
  };
}

function buildCoverageWarnings(coverage: ShadowProductionCoverage): ShadowProductionWarning[] {
  if (coverage.paninoItems) return [];

  return [
    {
      code: "panino_items_not_included",
      message: "Les panino_order_items ne sont pas inclus dans ce calcul Shadow Production.",
    },
  ];
}

function buildPerformanceWarnings(
  performanceStatus: ShadowProductionPerformanceStatus,
  totalMs: number,
): ShadowProductionWarning[] {
  if (performanceStatus === "ok") return [];

  return [
    {
      code: "shadow_production_slow",
      message: `Calcul Shadow Production superieur au seuil de ${SHADOW_PRODUCTION_SLOW_THRESHOLD_MS} ms: ${totalMs} ms.`,
    },
  ];
}

function formatWarning(warning: ShadowProductionWarning) {
  return `${warning.code}: ${warning.message}`;
}

function formatBlockingIssue(issue: ProductionPlanBlockingIssue) {
  return `${issue.type}: ${issue.message}`;
}

function isSchedulerBlockingIssue(issue: ProductionPlanBlockingIssue) {
  return (
    issue.type === "missing_dependency" ||
    issue.type === "cycle" ||
    issue.type === "available_dependency_not_completed"
  );
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

function messageFromUnknown(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function cloneReport(report: ShadowProductionReport): ShadowProductionReport {
  return {
    ...report,
    coverage: { ...report.coverage },
    warningDiagnostics: [...report.warningDiagnostics],
    diagnostics: [...report.diagnostics],
    schedulerDiagnostics: [...report.schedulerDiagnostics],
    batchDiagnostics: [...report.batchDiagnostics],
    performance: { ...report.performance },
  };
}
