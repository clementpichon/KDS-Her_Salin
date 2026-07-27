import type { Order, OrderItem, PaninoOrderItem } from "./kds-types";
import { formatTime } from "./scheduling";

export type PizzaioloQueueJob = {
  id: string;
  customer_name: string;
  requested_time: string;
  prep_start_time: string | null;
  orders: Order[];
  items: OrderItem[];
  paninos: PaninoOrderItem[];
};

type QueueOptions = {
  excludeStarted?: boolean;
};

export function buildPaninoItemsByOrder(paninoItems: PaninoOrderItem[]) {
  const map = new Map<string, PaninoOrderItem[]>();
  for (const item of paninoItems) {
    if (item.status === "done") continue;
    const list = map.get(item.order_id) ?? [];
    list.push(item);
    map.set(item.order_id, list);
  }
  return map;
}

export function buildPizzaioloQueue(
  orders: Order[],
  paninoItems: PaninoOrderItem[],
  options: QueueOptions = {},
): PizzaioloQueueJob[] {
  const paninoByOrder = buildPaninoItemsByOrder(paninoItems);
  const jobs = new Map<string, PizzaioloQueueJob>();

  for (const order of orders) {
    const hasPizzas = (order.items?.length ?? 0) > 0;
    const paninos = paninoByOrder.get(order.id) ?? [];
    const breadCount = paninos.filter((item) => item.product_key === "panino").length;
    const pizzasDone = !hasPizzas || order.status !== "to_prepare";
    const painsDone =
      breadCount === 0 ||
      (!!order.pains_panino_status && order.pains_panino_status !== "a_preparer");

    if (pizzasDone && painsDone) continue;
    if (!hasPizzas && breadCount === 0) continue;
    if (options.excludeStarted && isStartedForPizzaiolo(order, paninos)) continue;

    const key = pizzaioloJobKey(order);
    const existing = jobs.get(key);
    const orderItems = order.status === "to_prepare" ? order.items ?? [] : [];

    if (!existing) {
      jobs.set(key, {
        id: key,
        customer_name: order.customer_name,
        requested_time: order.requested_time,
        prep_start_time: order.prep_start_time,
        orders: [order],
        items: [...orderItems],
        paninos: [...paninos],
      });
      continue;
    }

    existing.orders.push(order);
    existing.items.push(...orderItems);
    existing.paninos.push(...paninos);
    if (order.requested_time.localeCompare(existing.requested_time) < 0) {
      existing.requested_time = order.requested_time;
    }
    if (
      order.prep_start_time &&
      (!existing.prep_start_time || order.prep_start_time.localeCompare(existing.prep_start_time) < 0)
    ) {
      existing.prep_start_time = order.prep_start_time;
    }
  }

  return Array.from(jobs.values()).sort((a, b) => a.requested_time.localeCompare(b.requested_time));
}

function isStartedForPizzaiolo(order: Order, paninos: PaninoOrderItem[]) {
  const pizzasStarted = (order.items ?? []).some((item) => item.prepared);
  const hasBread = paninos.some((item) => item.product_key === "panino");
  const breadStarted = hasBread && !!order.pains_panino_status && order.pains_panino_status !== "a_preparer";
  return pizzasStarted || breadStarted;
}

function pizzaioloJobKey(order: Order) {
  const customer = order.customer_name.trim().toLocaleLowerCase("fr");
  const requested = new Date(order.requested_time);
  const day = requested.toISOString().slice(0, 10);
  return `${day}-${formatTime(order.requested_time)}-${customer}`;
}
