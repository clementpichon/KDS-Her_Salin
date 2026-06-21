import type { DraftItem, DraftPaninoItem, Order, PaninoOrderItem, Settings } from "./kds-types";

export type WorkloadLevel = "calme" | "actif" | "tendu" | "sature";

export type StationKey =
  | "pizzaiolo"
  | "four"
  | "finition"
  | "panino"
  | "friteuse_frites"
  | "friteuse_poisson"
  | "caisse";

export type StationLoad = {
  key: StationKey;
  label: string;
  load: number;
  capacity: number;
  ratio: number;
  level: WorkloadLevel;
  details: string;
};

export type BrainSnapshot = {
  stations: StationLoad[];
  bottleneck: StationLoad;
  globalLevel: WorkloadLevel;
  advice: string[];
  orderImpact: StationLoad[];
};

type ComputeBrainInput = {
  orders: Order[];
  paninoItems: PaninoOrderItem[];
  settings: Settings;
  cart: DraftItem[];
  paninoCart: DraftPaninoItem[];
  readyOrders: number;
  urgentCashierCount: number;
};

const PIZZA_PREP_WEIGHTS: Record<string, number> = {
  "margherita": 1,
  "marguerita": 1,
  "chevre miel": 1,
  "chèvre miel": 1,
  "regina": 2,
  "piccante": 2,
  "fromage": 2,
  "fromages": 2,
  "carbonara": 2,
  "truffe parme": 2,
  "napolitaine": 2,
  "saumon": 2,
  "vegetarienne": 3,
  "végétarienne": 3,
  "savoyarde": 4,
  "calzon": 5,
  "calzone": 5,
};

const PIZZA_FINISH_WEIGHTS: Record<string, number> = {
  "margherita": 0,
  "marguerita": 0,
  "regina": 0,
  "piccante": 0,
  "calzon": 0,
  "calzone": 0,
  "savoyarde": 0,
  "fromage": 1,
  "fromages": 1,
  "carbonara": 1,
  "chevre miel": 1,
  "chèvre miel": 1,
  "saumon": 2,
  "truffe parme": 3,
  "napolitaine": 3,
  "vegetarienne": 3,
  "végétarienne": 3,
};

export function computeBrainSnapshot({
  orders,
  paninoItems,
  settings,
  cart,
  paninoCart,
  readyOrders,
  urgentCashierCount,
}: ComputeBrainInput): BrainSnapshot {
  const activeOrders = orders.filter((order) => order.status !== "delivered");
  const pizzasToPrepare = activeOrders.flatMap((order) => (
    order.status === "to_prepare" ? order.items ?? [] : []
  ));
  const pizzasInOven = activeOrders.flatMap((order) => (
    order.status === "in_oven" ? order.items ?? [] : []
  ));
  const pizzasReady = activeOrders.flatMap((order) => (
    order.status === "ready" ? order.items ?? [] : []
  ));
  const paninosPending = paninoItems.filter((item) => item.status === "pending");
  const paninosInProgress = paninoItems.filter((item) => item.status === "in_progress");
  const activePaninoItems = [...paninosPending, ...paninosInProgress];

  const pizzaioloLoad =
    pizzasToPrepare.reduce((total, item) => total + pizzaPrepWeight(item.pizza_name), 0) +
    paninosPending.filter((item) => item.product_key === "panino").length * 1.5;

  const fourLoad =
    pizzasInOven.length +
    activeOrders.filter((order) => order.pains_panino_status === "en_cours").length;

  const finitionLoad =
    pizzasInOven.reduce((total, item) => total + pizzaFinishWeight(item.pizza_name), 0) +
    pizzasReady.length * 0.5;

  const paninoLoad =
    paninosPending.filter((item) => item.product_key !== "cornet_frites").length +
    paninosInProgress.length * 1.5;

  const fryer = computeFryerLoad(activePaninoItems);

  const fishLoad =
    activePaninoItems.filter((item) => item.product_key === "fishno").length;

  const cashierLoad = readyOrders * 1.5 + urgentCashierCount * 1.25 + Math.max(0, activeOrders.length - 8) * 0.25;

  const stations = [
    station("pizzaiolo", "Pizzaiolo", pizzaioloLoad, 4, "Préparation pizzas + pains Pani'NO"),
    station("four", "Four", fourLoad, Math.max(1, settings.oven_capacity), "Cuisson pizzas et pains"),
    station("finition", "Finition", finitionLoad, 4, "Défournage, garniture, mise en boîte"),
    station("panino", "Pani'NO", paninoLoad, 2, "Assemblage Pani'NO / Fish & NO"),
    station("friteuse_frites", "Friteuse frites", fryer.load, 6, fryer.details),
    station("friteuse_poisson", "Friteuse poisson", fishLoad, 3, "Fish & NO, jusqu'à 3 portions par bain"),
    station("caisse", "Caisse", cashierLoad, 3, "Remises, clients urgents, flux comptoir"),
  ];

  const cartFryer = computeFryerLoad(paninoCart);

  const orderImpact = [
    station("pizzaiolo", "Pizzaiolo", cart.reduce((total, item) => total + pizzaPrepWeight(item.pizza_name), 0) + paninoCart.filter((item) => item.product_key === "panino").length * 1.5, 4, "Impact du panier"),
    station("four", "Four", cart.length + paninoCart.filter((item) => item.product_key === "panino").length, Math.max(1, settings.oven_capacity), "Impact du panier"),
    station("finition", "Finition", cart.reduce((total, item) => total + pizzaFinishWeight(item.pizza_name), 0), 4, "Impact du panier"),
    station("panino", "Pani'NO", paninoCart.filter((item) => item.product_key !== "cornet_frites").length, 2, "Impact du panier"),
    station("friteuse_frites", "Friteuse frites", cartFryer.load, 6, cartFryer.details),
    station("friteuse_poisson", "Friteuse poisson", paninoCart.filter((item) => item.product_key === "fishno").length, 3, "Impact du panier"),
  ].filter((load) => load.load > 0);

  const bottleneck = stations.reduce((worst, current) => current.ratio > worst.ratio ? current : worst, stations[0]);
  const globalLevel = bottleneck.level;
  const advice = buildAdvice(stations, orderImpact);

  return { stations, bottleneck, globalLevel, advice, orderImpact };
}

function station(key: StationKey, label: string, load: number, capacity: number, details: string): StationLoad {
  const safeCapacity = Math.max(1, capacity);
  const ratio = load / safeCapacity;
  return {
    key,
    label,
    load,
    capacity: safeCapacity,
    ratio,
    level: levelFromRatio(ratio),
    details,
  };
}

function buildAdvice(stations: StationLoad[], orderImpact: StationLoad[]) {
  const advice: string[] = [];
  const bottleneck = stations.reduce((worst, current) => current.ratio > worst.ratio ? current : worst, stations[0]);

  if (bottleneck.level === "sature") {
    advice.push(`${bottleneck.label} saturé : proposer un créneau plus large et prévenir l'équipe.`);
  } else if (bottleneck.level === "tendu") {
    advice.push(`${bottleneck.label} tendu : rester prudent sur les prochains horaires.`);
  } else {
    advice.push("Service maîtrisé : la prise de commande peut continuer normalement.");
  }

  const panino = stations.find((load) => load.key === "panino");
  const caisse = stations.find((load) => load.key === "caisse");
  if (panino && caisse && panino.level === "calme" && (caisse.level === "tendu" || caisse.level === "sature")) {
    advice.push("Renfort caisse recommandé : le poste Pani'NO peut aider quelques minutes.");
  }

  const strongImpact = orderImpact.find((load) => load.ratio >= 1);
  if (strongImpact) {
    advice.push(`Ce panier sollicite fortement ${strongImpact.label}. Conseiller un horaire avec marge.`);
  }

  const friesStation = stations.find((load) => load.key === "friteuse_frites");
  if (friesStation?.details.includes("cuissons séparées")) {
    advice.push("Friteuse frites : frites et pommes grenailles doivent passer en deux bains séparés.");
  }

  return advice.slice(0, 3);
}

function computeFryerLoad(items: Array<Pick<PaninoOrderItem, "product_key" | "fries_mode" | "side" | "extras">>) {
  const fries = items.filter(usesFries).length;
  const grenailles = items.filter(usesGrenailles).length;
  const mixed = fries > 0 && grenailles > 0;
  const portions = mixed ? fries + grenailles : Math.max(fries, grenailles);
  const details = mixed
    ? `${fries} frite${fries > 1 ? "s" : ""} + ${grenailles} pomme${grenailles > 1 ? "s" : ""} grenailles : cuissons séparées`
    : grenailles > 0
      ? `${grenailles} portion${grenailles > 1 ? "s" : ""} de pommes grenailles`
      : `${fries} portion${fries > 1 ? "s" : ""} de frites`;

  return { load: portions, fries, grenailles, mixed, details };
}

function usesFries(item: Pick<PaninoOrderItem, "product_key" | "fries_mode" | "side" | "extras">) {
  return (
    item.product_key === "cornet_frites" ||
    Boolean(item.fries_mode) ||
    textIncludes(item.side, "frite") ||
    item.extras.some((extra) => textIncludes(extra, "frite"))
  );
}

function usesGrenailles(item: Pick<PaninoOrderItem, "side" | "extras">) {
  return textIncludes(item.side, "grenaille") || item.extras.some((extra) => textIncludes(extra, "grenaille"));
}

function textIncludes(value: string | null | undefined, pattern: string) {
  return normalizeName(value ?? "").includes(pattern);
}

function levelFromRatio(ratio: number): WorkloadLevel {
  if (ratio >= 1.25) return "sature";
  if (ratio >= 0.85) return "tendu";
  if (ratio >= 0.35) return "actif";
  return "calme";
}

function pizzaPrepWeight(name: string) {
  return PIZZA_PREP_WEIGHTS[normalizeName(name)] ?? 2;
}

function pizzaFinishWeight(name: string) {
  return PIZZA_FINISH_WEIGHTS[normalizeName(name)] ?? 1;
}

function normalizeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
