import type { Order, OrderItem, Pizza } from "./kds-types";

export type PizzaProductionStatus = "to_prepare" | "in_oven" | "ready";
export type PizzaBaseKey = "tomate" | "creme" | "chevre" | "truffe" | "speciale";

export type PizzaBaseInfo = {
  key: PizzaBaseKey;
  label: string;
  ringClassName: string;
  badgeClassName: string;
  dotClassName: string;
};

const BASE_INFO: Record<PizzaBaseKey, PizzaBaseInfo> = {
  tomate: {
    key: "tomate",
    label: "Tomate",
    ringClassName: "border-red-500/70",
    badgeClassName: "bg-red-500/10 text-red-700 border-red-500/30",
    dotClassName: "bg-red-500",
  },
  creme: {
    key: "creme",
    label: "Creme",
    ringClassName: "border-slate-300",
    badgeClassName: "bg-slate-100 text-slate-700 border-slate-300",
    dotClassName: "bg-slate-300",
  },
  chevre: {
    key: "chevre",
    label: "Chevre",
    ringClassName: "border-amber-400/80",
    badgeClassName: "bg-amber-400/15 text-amber-800 border-amber-400/40",
    dotClassName: "bg-amber-400",
  },
  truffe: {
    key: "truffe",
    label: "Truffe",
    ringClassName: "border-stone-700/70",
    badgeClassName: "bg-stone-700/10 text-stone-800 border-stone-700/30",
    dotClassName: "bg-stone-700",
  },
  speciale: {
    key: "speciale",
    label: "Base",
    ringClassName: "border-primary/50",
    badgeClassName: "bg-primary/10 text-primary border-primary/30",
    dotClassName: "bg-primary",
  },
};

export function pizzaProductionStatus(item: OrderItem, order?: Order): PizzaProductionStatus {
  if (item.production_status) return item.production_status;
  if (order?.status === "ready" || order?.status === "delivered") return "ready";
  if (order?.status === "in_oven") return "in_oven";
  return item.prepared ? "in_oven" : "to_prepare";
}

export function getPizzaBaseInfo(item: Pick<OrderItem, "pizza_id" | "pizza_name">, pizzas: Pizza[]): PizzaBaseInfo {
  const pizza = pizzas.find((candidate) => candidate.id === item.pizza_id || candidate.name === item.pizza_name);
  const haystack = [pizza?.name, ...(pizza?.ingredients ?? []), item.pizza_name]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("fr");

  if (haystack.includes("truffe")) return BASE_INFO.truffe;
  if (haystack.includes("chevre") || haystack.includes("chèvre")) return BASE_INFO.chevre;
  if (haystack.includes("creme") || haystack.includes("crème")) return BASE_INFO.creme;
  if (haystack.includes("tomate")) return BASE_INFO.tomate;
  return BASE_INFO.speciale;
}

