import type {
  Order,
  OrderItem,
  OrderStatus,
  PaninoOrderItem,
  PaninoProductKey,
  PaninoStatus,
  PizzaProductionStatus,
} from "./kds-types";

export type ProductionUnitKind = "pizza" | "panino" | "fish_no" | "fries" | "grenailles" | "other";

export type ProductionUnitStatus =
  | "created"
  | "in_progress"
  | "ready"
  | "delivered"
  | "failed"
  | "cancelled";

export type ProductionUnitStatusSource =
  | "order_cancelled"
  | "order_delivered"
  | "item_status"
  | "order_ready_fallback"
  | "legacy_prepared"
  | "default_created";

export type ProductionUnitSourceTable = "order_items" | "panino_order_items";

export interface ProductionUnitPizzaDetails {
  pizzaId: string | null;
  base: string | null;
  defaultBaseSnapshot: string | null;
  explicitBaseSnapshot: string | null;
  baseResolution: string | null;
  baseConfidence: number | null;
  extras: readonly string[];
  removed: readonly string[];
  cutInto: number | null;
  ovenBatchId: string | null;
  sentToOvenAt: string | null;
  readyAt: string | null;
  productionStatus: PizzaProductionStatus | null;
  prepared: boolean | null;
}

export interface ProductionUnitPaninoDetails {
  productKey: string;
  base: string | null;
  friesMode: string | null;
  side: string | null;
  sauces: readonly string[];
  removed: readonly string[];
  extras: readonly string[];
  doneAt: string | null;
  itemStatus: PaninoStatus | null;
}

export interface ProductionUnit {
  id: string;
  kind: ProductionUnitKind;
  status: ProductionUnitStatus;
  statusSource: ProductionUnitStatusSource;
  sourceTable: ProductionUnitSourceTable;
  sourceItemId: string;
  sourceQuantityIndex: number | null;
  orderId: string;
  customerName: string | null;
  requestedTime: string | null;
  orderStatus: OrderStatus | null;
  productKey: string | null;
  productName: string;
  quantity: 1;
  pizza: ProductionUnitPizzaDetails | null;
  panino: ProductionUnitPaninoDetails | null;
}

export type ProductionUnitOrderItemInput = Pick<OrderItem, "id" | "order_id" | "pizza_name"> &
  Partial<Omit<OrderItem, "id" | "order_id" | "pizza_name">>;

export type ProductionUnitPaninoItemInput = Pick<
  PaninoOrderItem,
  "id" | "order_id" | "product_key" | "product_name"
> &
  Partial<Omit<PaninoOrderItem, "id" | "order_id" | "product_key" | "product_name">>;

export type ProductionUnitOrderInput = Pick<Order, "id"> &
  Partial<Omit<Order, "id" | "items">> & {
    items?: readonly ProductionUnitOrderItemInput[];
  };

export interface BuildProductionUnitsParams {
  orders: readonly ProductionUnitOrderInput[];
  orderItems?: readonly ProductionUnitOrderItemInput[];
  paninoItems?: readonly ProductionUnitPaninoItemInput[];
}

export function buildProductionUnits({
  orders,
  orderItems,
  paninoItems = [],
}: BuildProductionUnitsParams): ProductionUnit[] {
  const ordersById = new Map(orders.map((order) => [order.id, order]));
  const pizzaItems = orderItems ?? orders.flatMap((order) => order.items ?? []);

  return [
    ...pizzaItems.map((item) => buildPizzaProductionUnit(item, ordersById.get(item.order_id))),
    ...paninoItems.map((item) => buildPaninoProductionUnit(item, ordersById.get(item.order_id))),
  ];
}

export function productionUnitId(
  sourceTable: ProductionUnitSourceTable,
  sourceItemId: string,
  sourceQuantityIndex: number | null = null,
) {
  return sourceQuantityIndex === null
    ? `${sourceTable}:${sourceItemId}`
    : `${sourceTable}:${sourceItemId}:${sourceQuantityIndex}`;
}

function buildPizzaProductionUnit(
  item: ProductionUnitOrderItemInput,
  order: ProductionUnitOrderInput | undefined,
): ProductionUnit {
  const resolvedStatus = resolvePizzaProductionUnitStatus(item, order);

  return {
    id: productionUnitId("order_items", item.id),
    kind: "pizza",
    status: resolvedStatus.status,
    statusSource: resolvedStatus.statusSource,
    sourceTable: "order_items",
    sourceItemId: item.id,
    sourceQuantityIndex: null,
    orderId: item.order_id,
    customerName: order?.customer_name ?? null,
    requestedTime: order?.requested_time ?? null,
    orderStatus: order?.status ?? null,
    productKey: null,
    productName: item.pizza_name,
    quantity: 1,
    pizza: {
      pizzaId: item.pizza_id ?? null,
      base: item.base ?? null,
      defaultBaseSnapshot: item.default_base_snapshot ?? null,
      explicitBaseSnapshot: item.explicit_base_snapshot ?? null,
      baseResolution: item.base_resolution ?? null,
      baseConfidence: item.base_confidence ?? null,
      extras: [...(item.extras ?? [])],
      removed: [...(item.removed ?? [])],
      cutInto: item.cut_into ?? null,
      ovenBatchId: item.oven_batch_id ?? null,
      sentToOvenAt: item.sent_to_oven_at ?? null,
      readyAt: item.ready_at ?? null,
      productionStatus: item.production_status ?? null,
      prepared: item.prepared ?? null,
    },
    panino: null,
  };
}

function buildPaninoProductionUnit(
  item: ProductionUnitPaninoItemInput,
  order: ProductionUnitOrderInput | undefined,
): ProductionUnit {
  const resolvedStatus = resolvePaninoProductionUnitStatus(item, order);

  return {
    id: productionUnitId("panino_order_items", item.id),
    kind: resolvePaninoKind(item.product_key),
    status: resolvedStatus.status,
    statusSource: resolvedStatus.statusSource,
    sourceTable: "panino_order_items",
    sourceItemId: item.id,
    sourceQuantityIndex: null,
    orderId: item.order_id,
    customerName: order?.customer_name ?? null,
    requestedTime: order?.requested_time ?? null,
    orderStatus: order?.status ?? null,
    productKey: item.product_key,
    productName: item.product_name,
    quantity: 1,
    pizza: null,
    panino: {
      productKey: item.product_key,
      base: item.base ?? null,
      friesMode: item.fries_mode ?? null,
      side: item.side ?? null,
      sauces: [...(item.sauces ?? [])],
      removed: [...(item.removed ?? [])],
      extras: [...(item.extras ?? [])],
      doneAt: item.done_at ?? null,
      itemStatus: item.status ?? null,
    },
  };
}

function resolvePizzaProductionUnitStatus(
  item: ProductionUnitOrderItemInput,
  order: ProductionUnitOrderInput | undefined,
): Pick<ProductionUnit, "status" | "statusSource"> {
  const orderStatus = order?.status ?? null;
  if (orderStatus === "cancelled" || order?.cancelled_at) {
    return { status: "cancelled", statusSource: "order_cancelled" };
  }
  if (orderStatus === "delivered") {
    return { status: "delivered", statusSource: "order_delivered" };
  }

  const itemStatus = item.production_status ?? null;
  if (itemStatus) {
    return {
      status: mapPizzaItemStatus(itemStatus),
      statusSource: "item_status",
    };
  }

  if (orderStatus === "ready") {
    return { status: "ready", statusSource: "order_ready_fallback" };
  }
  if (item.prepared === true) {
    return { status: "in_progress", statusSource: "legacy_prepared" };
  }

  return { status: "created", statusSource: "default_created" };
}

function resolvePaninoProductionUnitStatus(
  item: ProductionUnitPaninoItemInput,
  order: ProductionUnitOrderInput | undefined,
): Pick<ProductionUnit, "status" | "statusSource"> {
  const orderStatus = order?.status ?? null;
  if (orderStatus === "cancelled" || order?.cancelled_at) {
    return { status: "cancelled", statusSource: "order_cancelled" };
  }
  if (orderStatus === "delivered") {
    return { status: "delivered", statusSource: "order_delivered" };
  }

  const itemStatus = item.status ?? null;
  if (itemStatus) {
    return {
      status: mapPaninoItemStatus(itemStatus),
      statusSource: "item_status",
    };
  }

  if (orderStatus === "ready") {
    return { status: "ready", statusSource: "order_ready_fallback" };
  }

  return { status: "created", statusSource: "default_created" };
}

function mapPizzaItemStatus(status: PizzaProductionStatus): ProductionUnitStatus {
  if (status === "ready") return "ready";
  if (status === "in_oven") return "in_progress";
  return "created";
}

function mapPaninoItemStatus(status: PaninoStatus): ProductionUnitStatus {
  if (status === "done") return "ready";
  if (status === "in_progress") return "in_progress";
  return "created";
}

function resolvePaninoKind(productKey: PaninoProductKey): ProductionUnitKind {
  const normalizedKey = productKey.toLowerCase();
  if (normalizedKey === "panino") return "panino";
  if (normalizedKey === "fishno" || normalizedKey === "fish_no") return "fish_no";
  if (
    normalizedKey === "cornet_frites" ||
    normalizedKey === "frites" ||
    normalizedKey === "fries"
  ) {
    return "fries";
  }
  if (normalizedKey === "grenailles" || normalizedKey === "pommes_grenailles") return "grenailles";
  return "other";
}
