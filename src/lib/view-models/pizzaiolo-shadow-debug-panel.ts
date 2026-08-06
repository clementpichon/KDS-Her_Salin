import type { PizzaioloRuntimeShadowReport } from "./pizzaiolo-runtime-shadow";

export interface PizzaioloShadowDebugPanelRow {
  label: string;
  value: string;
}

export interface PizzaioloShadowDebugPanelView {
  title: "Shadow Pizzaiolo";
  badge: "DEBUG";
  rows: readonly PizzaioloShadowDebugPanelRow[];
  diagnosticCodes: readonly string[];
}

export interface BuildPizzaioloShadowDebugPanelViewParams {
  debugEnabled: boolean;
  report: PizzaioloRuntimeShadowReport | null;
}

export function shouldRenderPizzaioloShadowDebugPanel(debugEnabled: boolean): boolean {
  return debugEnabled;
}

export function buildPizzaioloShadowDebugPanelView({
  debugEnabled,
  report,
}: BuildPizzaioloShadowDebugPanelViewParams): PizzaioloShadowDebugPanelView | null {
  if (!shouldRenderPizzaioloShadowDebugPanel(debugEnabled)) return null;

  const summary = report?.summary;
  const rows: PizzaioloShadowDebugPanelRow[] = [
    { label: "Status", value: report?.status ?? "waiting" },
    { label: "Plan usable", value: formatNullableBoolean(report?.planUsable ?? null) },
    { label: "Legacy visible orders", value: formatNumber(summary?.legacyVisibleOrders) },
    { label: "ViewModel visible orders", value: formatNumber(summary?.viewModelVisibleOrders) },
    { label: "Legacy actionable orders", value: formatNumber(summary?.legacyActionableOrders) },
    {
      label: "ViewModel selectable orders",
      value: formatNumber(summary?.viewModelSelectableOrders),
    },
    { label: "Legacy actionable pizzas", value: formatNumber(summary?.legacyActionablePizzas) },
    {
      label: "ViewModel actionable pizzas",
      value: formatNumber(summary?.viewModelActionablePizzas),
    },
    { label: "Matches", value: formatNumber(summary?.matches) },
    { label: "Warnings", value: formatNumber(report?.warningCount) },
    { label: "Blocking diagnostics", value: formatNumber(report?.blockingDifferenceCount) },
    { label: "Unsupported", value: formatNumber(report?.unsupportedCount) },
    { label: "Duration", value: report ? `${report.durationMs} ms` : "n/a" },
  ];

  return {
    title: "Shadow Pizzaiolo",
    badge: "DEBUG",
    rows,
    diagnosticCodes: report ? [...report.diagnosticCodes] : [],
  };
}

function formatNumber(value: number | undefined) {
  return typeof value === "number" ? String(value) : "n/a";
}

function formatNullableBoolean(value: boolean | null) {
  if (value === null) return "n/a";
  return value ? "yes" : "no";
}
