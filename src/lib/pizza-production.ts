import type { Order, OrderItem, Pizza } from "./kds-types";

export type PizzaProductionStatus = "to_prepare" | "in_oven" | "ready";
export type PizzaBaseKey = "tomato" | "cream" | "goat_cream" | "truffle_cream" | "none" | "unknown";
export type PizzaBaseResolution =
  | "default"
  | "explicit"
  | "inferred_replacement"
  | "removed_without_replacement"
  | "default_with_extra_base_ingredient"
  | "ambiguous"
  | "unknown";

export type PizzaBaseInfo = {
  key: PizzaBaseKey;
  label: string;
  ringClassName: string;
  badgeClassName: string;
  dotClassName: string;
};

type BaseModifierInput = string | { id?: string; text: string };

export type PizzaBaseInference = {
  requestedBase: PizzaBaseKey;
  defaultBase: PizzaBaseKey;
  baseResolution: PizzaBaseResolution;
  baseConfidence: number;
  consumedAdditionIds: string[];
  consumedRemovalIds: string[];
  remainingAdditions: string[];
  remainingRemovals: string[];
};

export type PizzaDisplayDetails = {
  base: PizzaBaseInfo;
  inference: PizzaBaseInference;
  extras: string[];
  removed: string[];
};

const BASE_INFO: Record<PizzaBaseKey, PizzaBaseInfo> = {
  tomato: {
    key: "tomato",
    label: "Tomate",
    ringClassName: "border-red-500/70",
    badgeClassName: "bg-red-500/10 text-red-700 border-red-500/30",
    dotClassName: "bg-red-500",
  },
  cream: {
    key: "cream",
    label: "Crème",
    ringClassName: "border-slate-300",
    badgeClassName: "bg-slate-100 text-slate-700 border-slate-300",
    dotClassName: "bg-slate-300",
  },
  goat_cream: {
    key: "goat_cream",
    label: "Crème de chèvre",
    ringClassName: "border-amber-400/80",
    badgeClassName: "bg-amber-400/15 text-amber-800 border-amber-400/40",
    dotClassName: "bg-amber-400",
  },
  truffle_cream: {
    key: "truffle_cream",
    label: "Crème de truffe",
    ringClassName: "border-stone-700/70",
    badgeClassName: "bg-stone-700/10 text-stone-800 border-stone-700/30",
    dotClassName: "bg-stone-700",
  },
  none: {
    key: "none",
    label: "Sans base",
    ringClassName: "border-destructive/60",
    badgeClassName: "bg-destructive/10 text-destructive border-destructive/30",
    dotClassName: "bg-destructive",
  },
  unknown: {
    key: "unknown",
    label: "Base à vérifier",
    ringClassName: "border-primary/50",
    badgeClassName: "bg-primary/10 text-primary border-primary/30",
    dotClassName: "bg-primary",
  },
};

export const PIZZA_BASE_OPTIONS: PizzaBaseInfo[] = [
  BASE_INFO.tomato,
  BASE_INFO.cream,
  BASE_INFO.goat_cream,
  BASE_INFO.truffle_cream,
];

export function pizzaProductionStatus(item: OrderItem, order?: Order): PizzaProductionStatus {
  if (item.production_status) return item.production_status;
  if (order?.status === "ready" || order?.status === "delivered") return "ready";
  if (order?.status === "in_oven") return "in_oven";
  return item.prepared ? "in_oven" : "to_prepare";
}

export function getPizzaBaseInfo(item: Pick<OrderItem, "pizza_id" | "pizza_name"> & PizzaBaseSource, pizzas: Pizza[]): PizzaBaseInfo {
  return getPizzaDisplayDetails({ ...item, extras: item.extras ?? [], removed: item.removed ?? [] }, pizzas).base;
}

export function getPizzaBaseInfoFromText(value: string | null | undefined): PizzaBaseInfo | null {
  const key = normalizePizzaBaseKey(value);
  return key ? BASE_INFO[key] : null;
}

export function getPizzaBaseInfoFromKey(key: PizzaBaseKey | string | null | undefined): PizzaBaseInfo {
  return BASE_INFO[normalizePizzaBaseKey(key) ?? "unknown"];
}

export function getDefaultPizzaBaseKey(item: Pick<OrderItem, "pizza_id" | "pizza_name">, pizzas: Pizza[]): PizzaBaseKey {
  const pizza = pizzas.find((candidate) => candidate.id === item.pizza_id || candidate.name === item.pizza_name);
  const configuredBase = normalizePizzaBaseKey(pizza?.default_base);
  if (configuredBase) return configuredBase;

  const haystack = [pizza?.name, ...(pizza?.ingredients ?? []), item.pizza_name]
    .filter(Boolean)
    .join(" ");

  return detectPizzaBase(haystack) ?? "unknown";
}

export function inferRequestedBase({
  defaultBase,
  explicitBase,
  additions = [],
  removals = [],
}: {
  defaultBase: PizzaBaseKey | string | null | undefined;
  explicitBase?: PizzaBaseKey | string | null;
  additions?: BaseModifierInput[];
  removals?: BaseModifierInput[];
}): PizzaBaseInference {
  const defaultKey = normalizePizzaBaseKey(defaultBase) ?? "unknown";
  const explicitKey = normalizePizzaBaseKey(explicitBase);
  const additionModifiers = normalizeModifiers(additions, "addition");
  const removalModifiers = normalizeModifiers(removals, "removal");

  if (explicitKey) {
    return buildInference({
      requestedBase: explicitKey,
      defaultBase: defaultKey,
      baseResolution: "explicit",
      baseConfidence: 1,
      additions: additionModifiers,
      removals: removalModifiers,
    });
  }

  const baseAdditions = additionModifiers.filter((modifier) => isConcreteBase(modifier.base));
  const defaultRemoval = isConcreteBase(defaultKey)
    ? removalModifiers.find((modifier) => modifier.base === defaultKey)
    : undefined;

  if (defaultRemoval) {
    if (baseAdditions.length === 0) {
      return buildInference({
        requestedBase: "none",
        defaultBase: defaultKey,
        baseResolution: "removed_without_replacement",
        baseConfidence: 0.9,
        additions: additionModifiers,
        removals: removalModifiers,
        consumedRemovalIds: [defaultRemoval.id],
      });
    }

    if (baseAdditions.length === 1) {
      return buildInference({
        requestedBase: baseAdditions[0].base,
        defaultBase: defaultKey,
        baseResolution: "inferred_replacement",
        baseConfidence: 0.9,
        additions: additionModifiers,
        removals: removalModifiers,
        consumedAdditionIds: [baseAdditions[0].id],
        consumedRemovalIds: [defaultRemoval.id],
      });
    }

    return buildInference({
      requestedBase: "unknown",
      defaultBase: defaultKey,
      baseResolution: "ambiguous",
      baseConfidence: 0.35,
      additions: additionModifiers,
      removals: removalModifiers,
    });
  }

  if (baseAdditions.length > 0) {
    return buildInference({
      requestedBase: defaultKey,
      defaultBase: defaultKey,
      baseResolution: "default_with_extra_base_ingredient",
      baseConfidence: defaultKey === "unknown" ? 0.45 : 0.8,
      additions: additionModifiers,
      removals: removalModifiers,
    });
  }

  return buildInference({
    requestedBase: defaultKey,
    defaultBase: defaultKey,
    baseResolution: defaultKey === "unknown" ? "unknown" : "default",
    baseConfidence: defaultKey === "unknown" ? 0.4 : 0.8,
    additions: additionModifiers,
    removals: removalModifiers,
  });
}

export function getPizzaDisplayDetails(item: PizzaBaseDisplaySource, pizzas: Pizza[]): PizzaDisplayDetails {
  const defaultBase = normalizePizzaBaseKey(item.default_base_snapshot) ?? getDefaultPizzaBaseKey(item, pizzas);
  const storedBase = normalizePizzaBaseKey(item.base);
  const explicitStoredBase = normalizePizzaBaseKey(item.explicit_base_snapshot);
  const storedResolution = normalizeBaseResolution(item.base_resolution);
  const inferredFromModifiers = inferRequestedBase({
    defaultBase,
    additions: item.extras,
    removals: item.removed,
  });

  let inference = inferredFromModifiers;

  if (storedResolution === "explicit" && (explicitStoredBase || storedBase)) {
    inference = inferRequestedBase({
      defaultBase,
      explicitBase: explicitStoredBase ?? storedBase,
      additions: item.extras,
      removals: item.removed,
    });
  } else if (storedResolution) {
    const canReuseModifierInference =
      storedResolution === inferredFromModifiers.baseResolution &&
      (!storedBase || storedBase === inferredFromModifiers.requestedBase || storedResolution === "ambiguous");

    inference = canReuseModifierInference
      ? { ...inferredFromModifiers, baseConfidence: item.base_confidence ?? inferredFromModifiers.baseConfidence }
      : buildInference({
          requestedBase: storedBase ?? inferredFromModifiers.requestedBase,
          defaultBase,
          baseResolution: storedResolution,
          baseConfidence: item.base_confidence ?? inferredFromModifiers.baseConfidence,
          additions: normalizeModifiers(item.extras, "addition"),
          removals: normalizeModifiers(item.removed, "removal"),
        });
  } else if (isStrongModifierResolution(inferredFromModifiers.baseResolution)) {
    inference = inferredFromModifiers;
  } else if (storedBase) {
    inference = {
      ...inferredFromModifiers,
      requestedBase: storedBase,
      baseResolution: storedBase === defaultBase ? inferredFromModifiers.baseResolution : "explicit",
    };
  }

  return {
    base: BASE_INFO[inference.requestedBase],
    inference,
    extras: inference.remainingAdditions,
    removed: inference.remainingRemovals,
  };
}

export function normalizePizzaBaseKey(value: string | null | undefined): PizzaBaseKey | null {
  const normalized = normalizeBaseText(value);
  if (!normalized) return null;

  if (["tomato", "tomate", "sauce tomate", "base tomate"].includes(normalized)) return "tomato";
  if (["cream", "creme", "creme fraiche", "base creme"].includes(normalized)) return "cream";
  if (["goat_cream", "goat cream", "chevre", "creme de chevre", "base chevre"].includes(normalized)) return "goat_cream";
  if (["truffle_cream", "truffle cream", "truffe", "creme de truffe", "creme de truffes", "base truffe"].includes(normalized)) return "truffle_cream";
  if (["none", "sans base", "pas de base", "no base"].includes(normalized)) return "none";
  if (["unknown", "base a verifier", "ambiguous"].includes(normalized)) return "unknown";

  return detectPizzaBase(normalized);
}

function detectPizzaBase(value: string | null | undefined): PizzaBaseKey | null {
  const normalized = normalizeBaseText(value);
  if (!normalized) return null;

  if (normalized.includes("sans base") || normalized.includes("pas de base") || normalized.includes("no base")) return "none";
  if (normalized.includes("truff")) return "truffle_cream";
  if (normalized.includes("chevre")) return "goat_cream";
  if (normalized.includes("creme") || normalized.includes("cream")) return "cream";
  if (normalized.includes("tomate") || normalized.includes("tomato")) return "tomato";
  return null;
}

function normalizeBaseResolution(value: string | null | undefined): PizzaBaseResolution | null {
  if (
    value === "default" ||
    value === "explicit" ||
    value === "inferred_replacement" ||
    value === "removed_without_replacement" ||
    value === "default_with_extra_base_ingredient" ||
    value === "ambiguous" ||
    value === "unknown"
  ) {
    return value;
  }
  return null;
}

function normalizeModifiers(values: BaseModifierInput[], prefix: "addition" | "removal") {
  return values.map((value, index) => {
    const text = typeof value === "string" ? value : value.text;
    return {
      id: typeof value === "string" ? `${prefix}-${index}` : value.id ?? `${prefix}-${index}`,
      text,
      base: detectPizzaBase(text) ?? "unknown",
    };
  });
}

function buildInference({
  requestedBase,
  defaultBase,
  baseResolution,
  baseConfidence,
  additions,
  removals,
  consumedAdditionIds = [],
  consumedRemovalIds = [],
}: {
  requestedBase: PizzaBaseKey;
  defaultBase: PizzaBaseKey;
  baseResolution: PizzaBaseResolution;
  baseConfidence: number;
  additions: ReturnType<typeof normalizeModifiers>;
  removals: ReturnType<typeof normalizeModifiers>;
  consumedAdditionIds?: string[];
  consumedRemovalIds?: string[];
}): PizzaBaseInference {
  const consumedAdditions = new Set(consumedAdditionIds);
  const consumedRemovals = new Set(consumedRemovalIds);

  return {
    requestedBase,
    defaultBase,
    baseResolution,
    baseConfidence,
    consumedAdditionIds,
    consumedRemovalIds,
    remainingAdditions: additions.filter((modifier) => !consumedAdditions.has(modifier.id)).map((modifier) => modifier.text),
    remainingRemovals: removals.filter((modifier) => !consumedRemovals.has(modifier.id)).map((modifier) => modifier.text),
  };
}

function normalizeBaseText(value: string | null | undefined) {
  return value
    ?.trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, " ")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("fr") ?? "";
}

function isConcreteBase(value: PizzaBaseKey): value is Exclude<PizzaBaseKey, "none" | "unknown"> {
  return value !== "none" && value !== "unknown";
}

function isStrongModifierResolution(resolution: PizzaBaseResolution) {
  return resolution === "inferred_replacement" || resolution === "removed_without_replacement" || resolution === "ambiguous";
}

type PizzaBaseSource = {
  base?: string | null;
  default_base_snapshot?: string | null;
  explicit_base_snapshot?: string | null;
  base_resolution?: string | null;
  base_confidence?: number | null;
  extras?: string[];
  removed?: string[];
};

type PizzaBaseDisplaySource = Pick<OrderItem, "pizza_id" | "pizza_name"> & PizzaBaseSource & {
  extras: string[];
  removed: string[];
};
