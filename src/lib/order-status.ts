import type { Order } from "./kds-types";

export function isOrderActive(order: Pick<Order, "status">) {
  return order.status !== "delivered" && order.status !== "cancelled";
}

export function isOrderVisibleInWorkload(order: Pick<Order, "status">) {
  return order.status !== "cancelled";
}

