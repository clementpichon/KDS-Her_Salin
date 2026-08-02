import {
  buildProductionUnits,
  type BuildProductionUnitsParams,
  type ProductionUnit,
  type ProductionUnitKind,
  type ProductionUnitOrderItemInput,
  type ProductionUnitPaninoItemInput,
  type ProductionUnitSourceTable,
  type ProductionUnitStatus,
  type ProductionUnitStatusSource,
} from "./production-units";

export interface ProductionUnitStatusIssue {
  productionUnitId: string;
  sourceTable: ProductionUnitSourceTable;
  sourceItemId: string;
  expectedStatus: ProductionUnitStatus;
  actualStatus: ProductionUnitStatus;
  expectedStatusSource: ProductionUnitStatusSource;
  actualStatusSource: ProductionUnitStatusSource;
  reason: string;
}

export interface ProductionUnitOrphanIssue {
  sourceTable: ProductionUnitSourceTable;
  sourceItemId: string;
  orderId: string;
  reason: "source_item_missing_order" | "source_item_without_unit" | "unit_without_source_item";
}

export interface ProductionUnitQuantityIssue {
  sourceTable: ProductionUnitSourceTable;
  sourceItemId: string;
  quantity: number;
  reason: "aggregated_quantity_not_supported";
}

export interface ProductionUnitTemporalIssue {
  sourceTable: ProductionUnitSourceTable;
  sourceItemId: string;
  field: "ready_at" | "done_at";
  statusField: "production_status" | "status";
  statusValue: string | null;
  timestampValue: string | null;
  reason:
    | "ready_at_without_ready_status"
    | "ready_status_without_ready_at"
    | "done_at_without_done_status"
    | "done_status_without_done_at";
}

export interface ProductionUnitsDiagnostic {
  orderCount: number;
  sourcePizzaItemCount: number;
  sourcePaninoItemCount: number;
  productionUnitCount: number;
  unitsByKind: Record<ProductionUnitKind, number>;
  unitsByStatus: Record<ProductionUnitStatus, number>;
  unitsByStatusSource: Record<ProductionUnitStatusSource, number>;
  missingOrders: string[];
  duplicateProductionUnitIds: string[];
  duplicateSourceItems: string[];
  unknownProductKinds: string[];
  inconsistentStatuses: ProductionUnitStatusIssue[];
  orphanSourceItems: ProductionUnitOrphanIssue[];
  aggregatedQuantitySourceItems: ProductionUnitQuantityIssue[];
  temporalIssues: ProductionUnitTemporalIssue[];
  isConsistent: boolean;
}

export interface DiagnoseProductionUnitsParams extends BuildProductionUnitsParams {
  productionUnits?: readonly ProductionUnit[];
}

const PRODUCTION_UNIT_KINDS: ProductionUnitKind[] = [
  "pizza",
  "panino",
  "fish_no",
  "fries",
  "grenailles",
  "other",
];

const PRODUCTION_UNIT_STATUSES: ProductionUnitStatus[] = [
  "created",
  "in_progress",
  "ready",
  "delivered",
  "failed",
  "cancelled",
];

const PRODUCTION_UNIT_STATUS_SOURCES: ProductionUnitStatusSource[] = [
  "order_cancelled",
  "order_delivered",
  "item_status",
  "order_ready_fallback",
  "legacy_prepared",
  "default_created",
];

export function diagnoseProductionUnits({
  orders,
  orderItems,
  paninoItems = [],
  productionUnits,
}: DiagnoseProductionUnitsParams): ProductionUnitsDiagnostic {
  const expectedUnits = buildProductionUnits({ orders, orderItems, paninoItems });
  const units = productionUnits ?? expectedUnits;
  const pizzaItems = orderItems ?? orders.flatMap((order) => order.items ?? []);
  const ordersById = new Map(orders.map((order) => [order.id, order]));
  const sourceItems = [
    ...pizzaItems.map((item) => ({
      sourceTable: "order_items" as const,
      item,
      orderId: item.order_id,
      sourceItemId: item.id,
    })),
    ...paninoItems.map((item) => ({
      sourceTable: "panino_order_items" as const,
      item,
      orderId: item.order_id,
      sourceItemId: item.id,
    })),
  ];
  const sourceKeys = sourceItems.map((source) =>
    sourceItemKey(source.sourceTable, source.sourceItemId),
  );
  const unitSourceKeys = units.map((unit) => sourceItemKey(unit.sourceTable, unit.sourceItemId));

  const missingOrders = uniqueSorted([
    ...sourceItems
      .filter((source) => !ordersById.has(source.orderId))
      .map((source) => source.orderId),
    ...units.filter((unit) => !ordersById.has(unit.orderId)).map((unit) => unit.orderId),
  ]);

  const duplicateProductionUnitIds = duplicateValues(units.map((unit) => unit.id));
  const duplicateSourceItems = uniqueSorted([
    ...duplicateValues(sourceKeys),
    ...duplicateValues(unitSourceKeys),
  ]);
  const unknownProductKinds = uniqueSorted(
    units
      .filter((unit) => unit.kind === "other")
      .map((unit) => unit.productKey ?? unit.productName),
  );

  const orphanSourceItems = [
    ...sourceItems
      .filter((source) => !ordersById.has(source.orderId))
      .map(
        (source): ProductionUnitOrphanIssue => ({
          sourceTable: source.sourceTable,
          sourceItemId: source.sourceItemId,
          orderId: source.orderId,
          reason: "source_item_missing_order",
        }),
      ),
    ...sourceItems
      .filter(
        (source) =>
          !unitSourceKeys.includes(sourceItemKey(source.sourceTable, source.sourceItemId)),
      )
      .map(
        (source): ProductionUnitOrphanIssue => ({
          sourceTable: source.sourceTable,
          sourceItemId: source.sourceItemId,
          orderId: source.orderId,
          reason: "source_item_without_unit",
        }),
      ),
    ...units
      .filter((unit) => !sourceKeys.includes(sourceItemKey(unit.sourceTable, unit.sourceItemId)))
      .map(
        (unit): ProductionUnitOrphanIssue => ({
          sourceTable: unit.sourceTable,
          sourceItemId: unit.sourceItemId,
          orderId: unit.orderId,
          reason: "unit_without_source_item",
        }),
      ),
  ];

  const expectedUnitBySourceKey = new Map(
    expectedUnits.map((unit) => [sourceItemKey(unit.sourceTable, unit.sourceItemId), unit]),
  );
  const inconsistentStatuses = units.flatMap((unit) => {
    const expected = expectedUnitBySourceKey.get(
      sourceItemKey(unit.sourceTable, unit.sourceItemId),
    );
    if (!expected) return [];

    if (unit.status === expected.status && unit.statusSource === expected.statusSource) return [];

    return [
      {
        productionUnitId: unit.id,
        sourceTable: unit.sourceTable,
        sourceItemId: unit.sourceItemId,
        expectedStatus: expected.status,
        actualStatus: unit.status,
        expectedStatusSource: expected.statusSource,
        actualStatusSource: unit.statusSource,
        reason: "ProductionUnit status does not match legacy source state.",
      },
    ];
  });

  const temporalIssues = [
    ...pizzaItems.flatMap(diagnosePizzaTemporalIssues),
    ...paninoItems.flatMap(diagnosePaninoTemporalIssues),
  ];

  const aggregatedQuantitySourceItems = sourceItems.flatMap((source) => {
    const quantity = readNumericQuantity(source.item);
    if (quantity === null || quantity <= 1) return [];
    return [
      {
        sourceTable: source.sourceTable,
        sourceItemId: source.sourceItemId,
        quantity,
        reason: "aggregated_quantity_not_supported" as const,
      },
    ];
  });

  const productionUnitCountMatchesSources = units.length === pizzaItems.length + paninoItems.length;
  const isConsistent =
    productionUnitCountMatchesSources &&
    missingOrders.length === 0 &&
    duplicateProductionUnitIds.length === 0 &&
    duplicateSourceItems.length === 0 &&
    unknownProductKinds.length === 0 &&
    inconsistentStatuses.length === 0 &&
    orphanSourceItems.length === 0 &&
    aggregatedQuantitySourceItems.length === 0 &&
    temporalIssues.length === 0;

  return {
    orderCount: orders.length,
    sourcePizzaItemCount: pizzaItems.length,
    sourcePaninoItemCount: paninoItems.length,
    productionUnitCount: units.length,
    unitsByKind: countBy(
      PRODUCTION_UNIT_KINDS,
      units.map((unit) => unit.kind),
    ),
    unitsByStatus: countBy(
      PRODUCTION_UNIT_STATUSES,
      units.map((unit) => unit.status),
    ),
    unitsByStatusSource: countBy(
      PRODUCTION_UNIT_STATUS_SOURCES,
      units.map((unit) => unit.statusSource),
    ),
    missingOrders,
    duplicateProductionUnitIds,
    duplicateSourceItems,
    unknownProductKinds,
    inconsistentStatuses,
    orphanSourceItems,
    aggregatedQuantitySourceItems,
    temporalIssues,
    isConsistent,
  };
}

function countBy<T extends string>(keys: readonly T[], values: readonly T[]): Record<T, number> {
  const result = Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
  for (const value of values) result[value] += 1;
  return result;
}

function diagnosePizzaTemporalIssues(
  item: ProductionUnitOrderItemInput,
): ProductionUnitTemporalIssue[] {
  const productionStatus = item.production_status ?? null;
  const readyAt = item.ready_at ?? null;
  const hasReadyAt = readyAt !== null && readyAt !== "";

  if (hasReadyAt && productionStatus !== "ready") {
    return [
      {
        sourceTable: "order_items",
        sourceItemId: item.id,
        field: "ready_at",
        statusField: "production_status",
        statusValue: productionStatus,
        timestampValue: readyAt,
        reason: "ready_at_without_ready_status",
      },
    ];
  }
  if (productionStatus === "ready" && !hasReadyAt) {
    return [
      {
        sourceTable: "order_items",
        sourceItemId: item.id,
        field: "ready_at",
        statusField: "production_status",
        statusValue: productionStatus,
        timestampValue: readyAt,
        reason: "ready_status_without_ready_at",
      },
    ];
  }

  return [];
}

function diagnosePaninoTemporalIssues(
  item: ProductionUnitPaninoItemInput,
): ProductionUnitTemporalIssue[] {
  const status = item.status ?? null;
  const doneAt = item.done_at ?? null;
  const hasDoneAt = doneAt !== null && doneAt !== "";

  if (hasDoneAt && status !== "done") {
    return [
      {
        sourceTable: "panino_order_items",
        sourceItemId: item.id,
        field: "done_at",
        statusField: "status",
        statusValue: status,
        timestampValue: doneAt,
        reason: "done_at_without_done_status",
      },
    ];
  }
  if (status === "done" && !hasDoneAt) {
    return [
      {
        sourceTable: "panino_order_items",
        sourceItemId: item.id,
        field: "done_at",
        statusField: "status",
        statusValue: status,
        timestampValue: doneAt,
        reason: "done_status_without_done_at",
      },
    ];
  }

  return [];
}

function duplicateValues(values: readonly string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return uniqueSorted(
    Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([value]) => value),
  );
}

function uniqueSorted(values: readonly string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function sourceItemKey(sourceTable: ProductionUnitSourceTable, sourceItemId: string) {
  return `${sourceTable}:${sourceItemId}`;
}

function readNumericQuantity(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const quantity = (value as { quantity?: unknown }).quantity;
  return typeof quantity === "number" && Number.isFinite(quantity) ? quantity : null;
}
