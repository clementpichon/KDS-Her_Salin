import { buildProductionPlan, type ProductionPlan } from "./production-plan";
import {
  diagnoseProductionUnits,
  type ProductionUnitsDiagnostic,
} from "./production-units-diagnostics";
import type {
  ProductionUnit,
  ProductionUnitKind,
  ProductionUnitOrderInput,
  ProductionUnitOrderItemInput,
  ProductionUnitPaninoItemInput,
  ProductionUnitStatusSource,
} from "./production-units";
import type { WorkUnitStation } from "./work-units";

export type ProductionPlanSnapshotSource = "kds_runtime" | "json_export" | "fixture";

export type ShadowValidationClassification =
  | "match"
  | "warning"
  | "blocking_difference"
  | "unsupported";

export interface ProductionPlanSnapshotSensitiveFields {
  phone?: string | null;
  customer_phone?: string | null;
  customer_phone_number?: string | null;
  external_id?: string | null;
  external_order_id?: string | null;
  external_item_id?: string | null;
  notes?: string | null;
  comment?: string | null;
  comments?: string | null;
  customer_notes?: string | null;
  internal_notes?: string | null;
}

export type ProductionPlanSnapshotOrder = ProductionUnitOrderInput &
  ProductionPlanSnapshotSensitiveFields & {
    pains_panino_status?: string | null;
    panino_bread_status?: string | null;
  };

export type ProductionPlanSnapshotOrderItem = ProductionUnitOrderItemInput &
  ProductionPlanSnapshotSensitiveFields & {
    quantity?: number | null;
  };

export type ProductionPlanSnapshotPaninoItem = ProductionUnitPaninoItemInput &
  ProductionPlanSnapshotSensitiveFields & {
    quantity?: number | null;
  };

export interface ProductionPlanShadowScalarCounts {
  orders: number;
  physicalProducts: number;
  pizzas: number;
  paninos: number;
  fishNo: number;
  fries: number;
  grenailles: number;
  readyProducts: number;
  inProgressProducts: number;
  cancelledProducts: number;
  pizzasCurrentlyPreparable: number;
  pizzasReadyForOven: number;
  productsWithoutWorkflow: number;
  mixedOrders: number;
  workUnitsWithInvalidDependencies: number;
}

export interface ProductionPlanShadowCounts extends ProductionPlanShadowScalarCounts {
  activeLoadByStation: Record<WorkUnitStation, number>;
}

export interface ProductionPlanLegacySnapshot {
  counts?: Partial<ProductionPlanShadowScalarCounts>;
  activeLoadByStation?: Partial<Record<WorkUnitStation, number>>;
}

export interface ProductionPlanSnapshot {
  snapshotId: string;
  capturedAt: string | null;
  source: ProductionPlanSnapshotSource;
  orders: readonly ProductionPlanSnapshotOrder[];
  orderItems?: readonly ProductionPlanSnapshotOrderItem[];
  paninoItems?: readonly ProductionPlanSnapshotPaninoItem[];
  legacy?: ProductionPlanLegacySnapshot;
}

type ComparableValue =
  | string
  | number
  | boolean
  | null
  | readonly string[]
  | Readonly<Record<string, number>>;

export interface ProductionPlanShadowFinding {
  code: string;
  classification: ShadowValidationClassification;
  label: string;
  sourceValue?: ComparableValue;
  planValue?: ComparableValue;
  legacyValue?: ComparableValue;
  details?: string;
}

export interface ProductionPlanShadowValidationReport {
  snapshotId: string;
  planId: string;
  planUsable: boolean;
  counts: {
    source: ProductionPlanShadowCounts;
    plan: ProductionPlanShadowCounts;
    legacy: ProductionPlanLegacySnapshot | null;
  };
  matches: readonly ProductionPlanShadowFinding[];
  warnings: readonly ProductionPlanShadowFinding[];
  blockingDifferences: readonly ProductionPlanShadowFinding[];
  unsupportedCases: readonly ProductionPlanShadowFinding[];
}

export interface ProductionPlanSnapshotFieldRequirement {
  table: "orders" | "order_items" | "panino_order_items";
  field: string;
  utilization: string;
  required: boolean;
  legacyPossible: string;
  absenceBehavior: string;
}

const WORK_UNIT_STATIONS: readonly WorkUnitStation[] = [
  "pizzaiolo",
  "four",
  "panino",
  "fish_fryer",
  "fries_fryer",
  "handover",
];

const PRODUCTION_PLAN_SHADOW_COUNT_FIELDS = [
  "orders",
  "physicalProducts",
  "pizzas",
  "paninos",
  "fishNo",
  "fries",
  "grenailles",
  "readyProducts",
  "inProgressProducts",
  "cancelledProducts",
  "pizzasCurrentlyPreparable",
  "pizzasReadyForOven",
  "productsWithoutWorkflow",
  "mixedOrders",
  "workUnitsWithInvalidDependencies",
] as const satisfies readonly (keyof ProductionPlanShadowScalarCounts)[];

export const PRODUCTION_PLAN_SNAPSHOT_FIELD_REQUIREMENTS: readonly ProductionPlanSnapshotFieldRequirement[] =
  [
    {
      table: "orders",
      field: "id",
      utilization: "Relier les lignes produit a leur commande.",
      required: true,
      legacyPossible: "Toujours present en base.",
      absenceBehavior: "Le snapshot est inexploitable pour les articles lies a cette commande.",
    },
    {
      table: "orders",
      field: "customer_name",
      utilization: "Conserver le contexte de commande dans les projections et diagnostics.",
      required: false,
      legacyPossible: "Nom absent ou anonymise.",
      absenceBehavior: "ProductionUnit.customerName vaut null.",
    },
    {
      table: "orders",
      field: "requested_time",
      utilization: "Ordonner les Work Units et comparer la charge par horaire.",
      required: false,
      legacyPossible: "Anciennes commandes sans heure exploitable.",
      absenceBehavior: "Les taches sont classees apres les taches datees.",
    },
    {
      table: "orders",
      field: "status",
      utilization: "Appliquer les fallbacks ready, delivered et cancelled au niveau commande.",
      required: false,
      legacyPossible: "Statut manquant ou ancien libelle.",
      absenceBehavior: "Les statuts individuels puis le statut created sont utilises.",
    },
    {
      table: "orders",
      field: "cancelled_at",
      utilization: "Detecter une annulation meme si status est incomplet.",
      required: false,
      legacyPossible: "Null pour les commandes actives.",
      absenceBehavior: "Seul orders.status peut annuler la commande.",
    },
    {
      table: "orders",
      field: "pains_panino_status / panino_bread_status",
      utilization: "Etat legacy global du pain Pani'NO, seulement signale comme non modelise.",
      required: false,
      legacyPossible: "Present sur certains exports historiques.",
      absenceBehavior: "Aucun cas unsupported n'est ajoute pour le pain Pani'NO.",
    },
    {
      table: "order_items",
      field: "id",
      utilization: "Identifiant source stable de la ProductionUnit pizza.",
      required: true,
      legacyPossible: "Toujours present en base.",
      absenceBehavior: "Impossible de produire un identifiant deterministe.",
    },
    {
      table: "order_items",
      field: "order_id",
      utilization: "Relier la pizza a la commande et son horaire.",
      required: true,
      legacyPossible: "Peut pointer vers une commande absente dans un export incomplet.",
      absenceBehavior: "Une difference bloquante source_item_missing_order est signalee.",
    },
    {
      table: "order_items",
      field: "pizza_name",
      utilization: "Identifier le produit et le workflow de post-cuisson.",
      required: true,
      legacyPossible: "Nom catalogue historique.",
      absenceBehavior: "Le produit ne peut pas etre projete correctement.",
    },
    {
      table: "order_items",
      field: "pizza_id",
      utilization: "Conserver le lien catalogue lorsque disponible.",
      required: false,
      legacyPossible: "Null sur certaines commandes anciennes.",
      absenceBehavior: "ProductionUnit.pizza.pizzaId vaut null.",
    },
    {
      table: "order_items",
      field: "base / default_base_snapshot / explicit_base_snapshot",
      utilization: "Conserver la base reelle demandee pour les controles metier.",
      required: false,
      legacyPossible: "Champs absents avant la migration base.",
      absenceBehavior: "Les champs de base restent null sans bloquer le plan.",
    },
    {
      table: "order_items",
      field: "extras / removed",
      utilization: "Conserver les supplements et retraits importants.",
      required: false,
      legacyPossible: "Tableaux absents ou vides.",
      absenceBehavior: "Les listes sont normalisees a vide.",
    },
    {
      table: "order_items",
      field: "prepared",
      utilization: "Statut legacy prudent pour une pizza preparee avant le four.",
      required: false,
      legacyPossible: "Boolean historique ambigu.",
      absenceBehavior: "Ne declenche pas le statut legacy_prepared.",
    },
    {
      table: "order_items",
      field: "production_status",
      utilization: "Statut individuel pizza: to_prepare, in_oven, ready.",
      required: false,
      legacyPossible: "Absent sur commandes anciennes.",
      absenceBehavior: "Fallback order ready puis prepared puis created.",
    },
    {
      table: "order_items",
      field: "ready_at",
      utilization: "Detecter les incoherences temporelles ready/non-ready.",
      required: false,
      legacyPossible: "Null tant que la pizza n'est pas prete.",
      absenceBehavior: "Un statut ready sans ready_at genere un diagnostic temporel.",
    },
    {
      table: "panino_order_items",
      field: "id",
      utilization: "Identifiant source stable de la ProductionUnit Pani'NO/Fish/frites.",
      required: true,
      legacyPossible: "Toujours present en base.",
      absenceBehavior: "Impossible de produire un identifiant deterministe.",
    },
    {
      table: "panino_order_items",
      field: "order_id",
      utilization: "Relier le produit a la commande et son horaire.",
      required: true,
      legacyPossible: "Peut pointer vers une commande absente dans un export incomplet.",
      absenceBehavior: "Une difference bloquante source_item_missing_order est signalee.",
    },
    {
      table: "panino_order_items",
      field: "product_key",
      utilization: "Classifier panino, fish_no, frites, grenailles ou other.",
      required: true,
      legacyPossible: "Alias legacy fishno/fish_no/frites/fries.",
      absenceBehavior: "Produit classe other et signale sans workflow.",
    },
    {
      table: "panino_order_items",
      field: "product_name",
      utilization: "Libelle produit conserve dans les diagnostics.",
      required: true,
      legacyPossible: "Nom libre historique.",
      absenceBehavior: "Le produit ne peut pas etre explique correctement.",
    },
    {
      table: "panino_order_items",
      field: "base / fries_mode / side",
      utilization: "Projeter le pain Pani'NO et l'accompagnement Fish & NO.",
      required: false,
      legacyPossible: "Null ou libelle historique.",
      absenceBehavior: "Workflow conserve, profil d'execution moins precis.",
    },
    {
      table: "panino_order_items",
      field: "sauces / extras / removed",
      utilization: "Conserver les modifications de preparation.",
      required: false,
      legacyPossible: "Tableaux absents ou vides.",
      absenceBehavior: "Les listes sont normalisees a vide.",
    },
    {
      table: "panino_order_items",
      field: "status",
      utilization: "Statut individuel Pani'NO/Fish/frites.",
      required: false,
      legacyPossible: "pending, in_progress, done ou absent.",
      absenceBehavior: "Fallback order ready puis created.",
    },
    {
      table: "panino_order_items",
      field: "done_at",
      utilization: "Detecter les incoherences temporelles done/non-done.",
      required: false,
      legacyPossible: "Null tant que le produit n'est pas termine.",
      absenceBehavior: "Un statut done sans done_at genere un diagnostic temporel.",
    },
  ];

export function compareProductionPlanWithLegacy(
  snapshot: ProductionPlanSnapshot,
): ProductionPlanShadowValidationReport {
  const plan = buildProductionPlan({
    orders: snapshot.orders,
    orderItems: snapshot.orderItems,
    paninoItems: snapshot.paninoItems,
    idSeed: snapshot.snapshotId,
  });
  const productionUnitDiagnostic = diagnoseProductionUnits({
    orders: snapshot.orders,
    orderItems: snapshot.orderItems,
    paninoItems: snapshot.paninoItems,
    productionUnits: plan.productionUnits,
  });
  const sourceCounts = countSourceSnapshot(snapshot, productionUnitDiagnostic);
  const planCounts = countProductionPlan(plan);
  const findings = [
    ...compareSourceCounts(sourceCounts, planCounts),
    ...compareLegacyCounts(snapshot.legacy ?? null, planCounts),
    ...findSourceDiagnosticIssues(productionUnitDiagnostic),
    ...findPlanBlockingIssues(plan),
    ...findUnsupportedCases(snapshot),
    ...findAmbiguousStatusWarnings(plan),
    ...findIncompleteLegacyWarnings(snapshot),
    ...findOrderItemStatusDivergences(snapshot),
    ...findOrdersWithoutProducts(snapshot),
  ];

  return {
    snapshotId: snapshot.snapshotId,
    planId: plan.id,
    planUsable: plan.isUsable,
    counts: {
      source: sourceCounts,
      plan: planCounts,
      legacy: snapshot.legacy ?? null,
    },
    matches: findings.filter((finding) => finding.classification === "match"),
    warnings: findings.filter((finding) => finding.classification === "warning"),
    blockingDifferences: findings.filter(
      (finding) => finding.classification === "blocking_difference",
    ),
    unsupportedCases: findings.filter((finding) => finding.classification === "unsupported"),
  };
}

export function anonymizeProductionPlanSnapshot(
  snapshot: ProductionPlanSnapshot,
): ProductionPlanSnapshot {
  const orderIdMap = new Map<string, string>();
  const pizzaItemIdMap = new Map<string, string>();
  const paninoItemIdMap = new Map<string, string>();

  const anonymizeOrderId = (id: string) => deterministicMappedId(orderIdMap, id, "order");
  const anonymizePizzaItemId = (id: string) =>
    deterministicMappedId(pizzaItemIdMap, id, "pizza-item");
  const anonymizePaninoItemId = (id: string) =>
    deterministicMappedId(paninoItemIdMap, id, "panino-item");

  const orders = snapshot.orders.map((order, index) =>
    anonymizeOrder(order, anonymizeOrderId, anonymizePizzaItemId, index),
  );
  const orderItems = snapshot.orderItems?.map((item) =>
    anonymizePizzaItem(item, anonymizeOrderId, anonymizePizzaItemId),
  );
  const paninoItems = snapshot.paninoItems?.map((item) =>
    anonymizePaninoItem(item, anonymizeOrderId, anonymizePaninoItemId),
  );

  return {
    snapshotId: "snapshot-anonymized",
    capturedAt: snapshot.capturedAt,
    source: snapshot.source,
    orders,
    ...(orderItems ? { orderItems } : {}),
    ...(paninoItems ? { paninoItems } : {}),
    ...(snapshot.legacy ? { legacy: cloneLegacySnapshot(snapshot.legacy) } : {}),
  };
}

function countSourceSnapshot(
  snapshot: ProductionPlanSnapshot,
  diagnostic: ProductionUnitsDiagnostic,
): ProductionPlanShadowCounts {
  const orderItems = snapshot.orderItems ?? snapshot.orders.flatMap((order) => order.items ?? []);
  const paninoItems = snapshot.paninoItems ?? [];
  const ordersById = new Map(snapshot.orders.map((order) => [order.id, order]));
  const productionUnits = buildSourceProductionUnits(snapshot);

  return {
    orders: snapshot.orders.length,
    physicalProducts: orderItems.length + paninoItems.length,
    pizzas: orderItems.length,
    paninos: paninoItems.filter((item) => resolveSourcePaninoKind(item.product_key) === "panino")
      .length,
    fishNo: paninoItems.filter((item) => resolveSourcePaninoKind(item.product_key) === "fish_no")
      .length,
    fries: paninoItems.filter((item) => resolveSourcePaninoKind(item.product_key) === "fries")
      .length,
    grenailles: paninoItems.filter(
      (item) => resolveSourcePaninoKind(item.product_key) === "grenailles",
    ).length,
    readyProducts: productionUnits.filter((unit) => unit.status === "ready").length,
    inProgressProducts: productionUnits.filter((unit) => unit.status === "in_progress").length,
    cancelledProducts: productionUnits.filter((unit) => unit.status === "cancelled").length,
    activeLoadByStation: emptyStationCounts(),
    pizzasCurrentlyPreparable: countSourcePizzaItems(orderItems, ordersById, (item, order) =>
      isSourcePizzaCurrentlyPreparable(item, order),
    ),
    pizzasReadyForOven: countSourcePizzaItems(orderItems, ordersById, (item, order) =>
      isSourcePizzaReadyForOven(item, order),
    ),
    productsWithoutWorkflow: paninoItems.filter(
      (item) => resolveSourcePaninoKind(item.product_key) === "other",
    ).length,
    mixedOrders: countMixedOrders(orderItems, paninoItems),
    workUnitsWithInvalidDependencies: 0,
  };
}

function countProductionPlan(plan: ProductionPlan): ProductionPlanShadowCounts {
  const workUnitsByStation = emptyStationCounts();
  for (const view of plan.stationViews) {
    workUnitsByStation[view.targetStation] = view.scheduledWorkUnitCount;
  }

  return {
    orders: uniqueValues(plan.productionUnits.map((unit) => unit.orderId)).length,
    physicalProducts: plan.productionUnits.length,
    pizzas: countProductionUnitsByKind(plan.productionUnits, "pizza"),
    paninos: countProductionUnitsByKind(plan.productionUnits, "panino"),
    fishNo: countProductionUnitsByKind(plan.productionUnits, "fish_no"),
    fries: countProductionUnitsByKind(plan.productionUnits, "fries"),
    grenailles: countProductionUnitsByKind(plan.productionUnits, "grenailles"),
    readyProducts: plan.productionUnits.filter((unit) => unit.status === "ready").length,
    inProgressProducts: plan.productionUnits.filter((unit) => unit.status === "in_progress").length,
    cancelledProducts: plan.productionUnits.filter((unit) => unit.status === "cancelled").length,
    activeLoadByStation: workUnitsByStation,
    pizzasCurrentlyPreparable: plan.workUnits.filter(
      (workUnit) =>
        workUnit.workflowNodeId === "pizza.preparation" && workUnit.status === "available",
    ).length,
    pizzasReadyForOven: plan.workUnits.filter(
      (workUnit) => workUnit.workflowNodeId === "pizza.cooking" && workUnit.status === "available",
    ).length,
    productsWithoutWorkflow: plan.workUnitDiagnostic.productionUnitsWithoutWorkUnits.length,
    mixedOrders: countMixedProductionUnitOrders(plan.productionUnits),
    workUnitsWithInvalidDependencies:
      plan.workUnitDiagnostic.missingDependencyIssues.length +
      plan.workUnitDiagnostic.availabilityIssues.length,
  };
}

function compareSourceCounts(
  sourceCounts: ProductionPlanShadowCounts,
  planCounts: ProductionPlanShadowCounts,
): ProductionPlanShadowFinding[] {
  return PRODUCTION_PLAN_SHADOW_COUNT_FIELDS.flatMap((field) => {
    if (field === "orders") {
      if (sourceCounts[field] === planCounts[field]) {
        return [
          matchFinding(
            `count.${field}`,
            "Nombre de commandes present dans le snapshot.",
            sourceCounts[field],
            planCounts[field],
          ),
        ];
      }

      return [
        {
          code: `count.${field}`,
          classification: "warning",
          label: "Nombre de commandes different entre le snapshot et les produits projetes.",
          sourceValue: sourceCounts[field],
          planValue: planCounts[field],
          details: "Une commande sans produit peut etre normale dans un export incomplet.",
        },
      ];
    }

    if (sourceCounts[field] === planCounts[field]) {
      return [matchFinding(`count.${field}`, `Compteur coherent: ${field}.`, sourceCounts[field])];
    }

    return [
      {
        code: `count.${field}`,
        classification: countDifferenceClassification(field),
        label: `Compteur divergent: ${field}.`,
        sourceValue: sourceCounts[field],
        planValue: planCounts[field],
      },
    ];
  });
}

function compareLegacyCounts(
  legacy: ProductionPlanLegacySnapshot | null,
  planCounts: ProductionPlanShadowCounts,
): ProductionPlanShadowFinding[] {
  if (!legacy) return [];

  const scalarFindings = Object.entries(legacy.counts ?? {}).map(([field, legacyValue]) => {
    const typedField = field as keyof ProductionPlanShadowScalarCounts;
    const planValue = planCounts[typedField];
    if (legacyValue === planValue) {
      return matchFinding(`legacy.${field}`, `Compteur legacy coherent: ${field}.`, planValue);
    }

    return {
      code: `legacy.${field}`,
      classification: countDifferenceClassification(typedField),
      label: `Compteur legacy divergent: ${field}.`,
      legacyValue,
      planValue,
    } satisfies ProductionPlanShadowFinding;
  });

  const stationFindings = Object.entries(legacy.activeLoadByStation ?? {}).map(
    ([station, legacyValue]) => {
      const typedStation = station as WorkUnitStation;
      const planValue = planCounts.activeLoadByStation[typedStation] ?? 0;
      if (legacyValue === planValue) {
        return matchFinding(
          `legacy.activeLoadByStation.${station}`,
          `Charge legacy coherente pour ${station}.`,
          planValue,
        );
      }

      return {
        code: `legacy.activeLoadByStation.${station}`,
        classification: "warning",
        label: `Charge active legacy divergente pour ${station}.`,
        legacyValue,
        planValue,
        details:
          "La charge par poste depend encore de regles legacy non remplacees par le ProductionPlan.",
      } satisfies ProductionPlanShadowFinding;
    },
  );

  return [...scalarFindings, ...stationFindings];
}

function findSourceDiagnosticIssues(
  diagnostic: ProductionUnitsDiagnostic,
): ProductionPlanShadowFinding[] {
  return [
    ...diagnostic.missingOrders.map((orderId) => ({
      code: "source_item_missing_order",
      classification: "blocking_difference" as const,
      label: "Un article reference une commande absente du snapshot.",
      sourceValue: orderId,
    })),
    ...diagnostic.duplicateProductionUnitIds.map((id) => ({
      code: "duplicate_production_unit_id",
      classification: "blocking_difference" as const,
      label: "Identifiant ProductionUnit duplique.",
      sourceValue: id,
    })),
    ...diagnostic.duplicateSourceItems.map((sourceItemId) => ({
      code: "duplicate_source_item",
      classification: "blocking_difference" as const,
      label: "Article source duplique.",
      sourceValue: sourceItemId,
    })),
    ...diagnostic.aggregatedQuantitySourceItems.map((issue) => ({
      code: "aggregated_quantity_not_supported",
      classification: "unsupported" as const,
      label: "Quantite agregee non decomposee dans cette passe.",
      sourceValue: issue.quantity,
      details: `${issue.sourceTable}:${issue.sourceItemId}`,
    })),
    ...diagnostic.temporalIssues.map((issue) => ({
      code: `temporal.${issue.reason}`,
      classification: "warning" as const,
      label: "Incoherence temporelle legacy detectee.",
      sourceValue: issue.timestampValue,
      details: `${issue.sourceTable}:${issue.sourceItemId} ${issue.statusField}=${issue.statusValue}`,
    })),
  ];
}

function findPlanBlockingIssues(plan: ProductionPlan): ProductionPlanShadowFinding[] {
  return [
    ...(!plan.isUsable
      ? [
          {
            code: "plan_unusable",
            classification: "blocking_difference" as const,
            label: "Le ProductionPlan contient au moins une anomalie bloquante.",
            planValue: plan.blockingIssues.length,
          },
        ]
      : []),
    ...plan.blockingIssues.map((issue) => ({
      code: `plan.${issue.type}`,
      classification: "blocking_difference" as const,
      label: issue.message,
      planValue: issue.type,
      details: JSON.stringify(issue.refs),
    })),
  ];
}

function findUnsupportedCases(snapshot: ProductionPlanSnapshot): ProductionPlanShadowFinding[] {
  return snapshot.orders.flatMap((order) => {
    const breadState = order.pains_panino_status ?? order.panino_bread_status ?? null;
    if (!breadState) return [];

    return [
      {
        code: "legacy_panino_bread_state_not_modelled",
        classification: "unsupported" as const,
        label: "Etat global du pain Pani'NO non encore modelise en WorkUnit persistante.",
        sourceValue: breadState,
        details: `order:${order.id}`,
      },
    ];
  });
}

function findAmbiguousStatusWarnings(plan: ProductionPlan): ProductionPlanShadowFinding[] {
  const ambiguousSources = new Set<ProductionUnitStatusSource>(["legacy_prepared"]);

  return plan.productionUnits
    .filter((unit) => ambiguousSources.has(unit.statusSource))
    .map((unit) => ({
      code: "ambiguous_legacy_status",
      classification: "warning" as const,
      label: "Statut legacy ambigu projete prudemment.",
      planValue: unit.status,
      details: unit.id,
    }));
}

function findIncompleteLegacyWarnings(
  snapshot: ProductionPlanSnapshot,
): ProductionPlanShadowFinding[] {
  return snapshot.orders.flatMap((order) => {
    const findings: ProductionPlanShadowFinding[] = [];

    if (!("requested_time" in order) || order.requested_time === null) {
      findings.push({
        code: "missing_requested_time",
        classification: "warning",
        label: "Commande sans heure demandee.",
        sourceValue: order.id,
      });
    }

    if (!("status" in order) || order.status === null) {
      findings.push({
        code: "missing_order_status",
        classification: "warning",
        label: "Commande sans statut explicite.",
        sourceValue: order.id,
      });
    }

    return findings;
  });
}

function findOrderItemStatusDivergences(
  snapshot: ProductionPlanSnapshot,
): ProductionPlanShadowFinding[] {
  const orderItems = snapshot.orderItems ?? snapshot.orders.flatMap((order) => order.items ?? []);
  const paninoItems = snapshot.paninoItems ?? [];
  const ordersById = new Map(snapshot.orders.map((order) => [order.id, order]));

  return [
    ...orderItems.flatMap((item) => {
      const order = ordersById.get(item.order_id);
      if (!order) return [];
      if (!isTerminalOrderStatus(order.status)) return [];
      if (order.status === "cancelled" || order.status === "delivered") return [];
      if (!item.production_status || item.production_status === "ready") return [];

      return [
        {
          code: "order_item_status_divergence",
          classification: "warning" as const,
          label: "Statut commande et statut pizza divergents.",
          sourceValue: `${order.status}/${item.production_status}`,
          details: `${order.id}:${item.id}`,
        },
      ];
    }),
    ...paninoItems.flatMap((item) => {
      const order = ordersById.get(item.order_id);
      if (!order) return [];
      if (!isTerminalOrderStatus(order.status)) return [];
      if (order.status === "cancelled" || order.status === "delivered") return [];
      if (!item.status || item.status === "done") return [];

      return [
        {
          code: "order_item_status_divergence",
          classification: "warning" as const,
          label: "Statut commande et statut produit Pani'NO divergents.",
          sourceValue: `${order.status}/${item.status}`,
          details: `${order.id}:${item.id}`,
        },
      ];
    }),
  ];
}

function findOrdersWithoutProducts(
  snapshot: ProductionPlanSnapshot,
): ProductionPlanShadowFinding[] {
  const orderItems = snapshot.orderItems ?? snapshot.orders.flatMap((order) => order.items ?? []);
  const paninoItems = snapshot.paninoItems ?? [];
  const orderIdsWithProducts = new Set([
    ...orderItems.map((item) => item.order_id),
    ...paninoItems.map((item) => item.order_id),
  ]);

  return snapshot.orders
    .filter((order) => !orderIdsWithProducts.has(order.id))
    .map((order) => ({
      code: "order_without_products",
      classification: "warning" as const,
      label: "Commande presente dans le snapshot sans produit physique.",
      sourceValue: order.id,
    }));
}

function buildSourceProductionUnits(snapshot: ProductionPlanSnapshot): ProductionUnit[] {
  return buildProductionPlan({
    orders: snapshot.orders,
    orderItems: snapshot.orderItems,
    paninoItems: snapshot.paninoItems,
    idSeed: `${snapshot.snapshotId}:source-counts`,
  }).productionUnits as ProductionUnit[];
}

function countMixedOrders(
  orderItems: readonly ProductionPlanSnapshotOrderItem[],
  paninoItems: readonly ProductionPlanSnapshotPaninoItem[],
) {
  const kindsByOrder = new Map<string, Set<ProductionUnitKind>>();

  for (const item of orderItems) {
    addOrderKind(kindsByOrder, item.order_id, "pizza");
  }
  for (const item of paninoItems) {
    addOrderKind(kindsByOrder, item.order_id, resolveSourcePaninoKind(item.product_key));
  }

  return [...kindsByOrder.values()].filter((kinds) => kinds.size > 1).length;
}

function countMixedProductionUnitOrders(productionUnits: readonly ProductionUnit[]) {
  const kindsByOrder = new Map<string, Set<ProductionUnitKind>>();
  for (const unit of productionUnits) {
    addOrderKind(kindsByOrder, unit.orderId, unit.kind);
  }
  return [...kindsByOrder.values()].filter((kinds) => kinds.size > 1).length;
}

function addOrderKind(
  kindsByOrder: Map<string, Set<ProductionUnitKind>>,
  orderId: string,
  kind: ProductionUnitKind,
) {
  const kinds = kindsByOrder.get(orderId) ?? new Set<ProductionUnitKind>();
  kinds.add(kind);
  kindsByOrder.set(orderId, kinds);
}

function countProductionUnitsByKind(
  productionUnits: readonly ProductionUnit[],
  kind: ProductionUnitKind,
) {
  return productionUnits.filter((unit) => unit.kind === kind).length;
}

function countSourcePizzaItems(
  orderItems: readonly ProductionPlanSnapshotOrderItem[],
  ordersById: ReadonlyMap<string, ProductionPlanSnapshotOrder>,
  predicate: (
    item: ProductionPlanSnapshotOrderItem,
    order: ProductionPlanSnapshotOrder | undefined,
  ) => boolean,
) {
  return orderItems.filter((item) => predicate(item, ordersById.get(item.order_id))).length;
}

function isSourcePizzaCurrentlyPreparable(
  item: ProductionPlanSnapshotOrderItem,
  order: ProductionPlanSnapshotOrder | undefined,
) {
  if (isOrderCancelled(order) || order?.status === "delivered" || order?.status === "ready") {
    return false;
  }
  if (item.production_status) return item.production_status === "to_prepare";
  return item.prepared !== true;
}

function isSourcePizzaReadyForOven(
  item: ProductionPlanSnapshotOrderItem,
  order: ProductionPlanSnapshotOrder | undefined,
) {
  if (isOrderCancelled(order) || order?.status === "delivered" || order?.status === "ready") {
    return false;
  }
  if (item.production_status) return false;
  return item.prepared === true;
}

function resolveSourcePaninoKind(productKey: string): ProductionUnitKind {
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
  if (normalizedKey === "grenailles" || normalizedKey === "pommes_grenailles") {
    return "grenailles";
  }
  return "other";
}

function isOrderCancelled(order: ProductionPlanSnapshotOrder | undefined) {
  return order?.status === "cancelled" || Boolean(order?.cancelled_at);
}

function isTerminalOrderStatus(status: ProductionPlanSnapshotOrder["status"] | null | undefined) {
  return status === "ready" || status === "delivered" || status === "cancelled";
}

function countDifferenceClassification(
  field: keyof ProductionPlanShadowScalarCounts,
): ShadowValidationClassification {
  if (
    field === "physicalProducts" ||
    field === "pizzas" ||
    field === "paninos" ||
    field === "fishNo" ||
    field === "fries" ||
    field === "grenailles" ||
    field === "productsWithoutWorkflow" ||
    field === "workUnitsWithInvalidDependencies"
  ) {
    return "blocking_difference";
  }
  return "warning";
}

function matchFinding(
  code: string,
  label: string,
  value: ComparableValue,
  planValue: ComparableValue = value,
): ProductionPlanShadowFinding {
  return {
    code,
    classification: "match",
    label,
    sourceValue: value,
    planValue,
  };
}

function emptyStationCounts(): Record<WorkUnitStation, number> {
  return Object.fromEntries(WORK_UNIT_STATIONS.map((station) => [station, 0])) as Record<
    WorkUnitStation,
    number
  >;
}

function uniqueValues(values: readonly string[]) {
  return [...new Set(values)];
}

function deterministicMappedId(map: Map<string, string>, originalId: string, prefix: string) {
  const existing = map.get(originalId);
  if (existing) return existing;
  const mapped = `${prefix}-${String(map.size + 1).padStart(3, "0")}`;
  map.set(originalId, mapped);
  return mapped;
}

function anonymizeOrder(
  order: ProductionPlanSnapshotOrder,
  anonymizeOrderId: (id: string) => string,
  anonymizePizzaItemId: (id: string) => string,
  index: number,
): ProductionPlanSnapshotOrder {
  return stripSensitiveFields({
    ...order,
    id: anonymizeOrderId(order.id),
    customer_name: `Client ${String(index + 1).padStart(3, "0")}`,
    items: order.items?.map((item) =>
      anonymizePizzaItem(item, anonymizeOrderId, anonymizePizzaItemId),
    ),
  });
}

function anonymizePizzaItem(
  item: ProductionPlanSnapshotOrderItem,
  anonymizeOrderId: (id: string) => string,
  anonymizePizzaItemId: (id: string) => string,
): ProductionPlanSnapshotOrderItem {
  return stripSensitiveFields({
    ...item,
    id: anonymizePizzaItemId(item.id),
    order_id: anonymizeOrderId(item.order_id),
  });
}

function anonymizePaninoItem(
  item: ProductionPlanSnapshotPaninoItem,
  anonymizeOrderId: (id: string) => string,
  anonymizePaninoItemId: (id: string) => string,
): ProductionPlanSnapshotPaninoItem {
  return stripSensitiveFields({
    ...item,
    id: anonymizePaninoItemId(item.id),
    order_id: anonymizeOrderId(item.order_id),
  });
}

function stripSensitiveFields<T extends ProductionPlanSnapshotSensitiveFields>(value: T): T {
  return {
    ...value,
    phone: null,
    customer_phone: null,
    customer_phone_number: null,
    external_id: null,
    external_order_id: null,
    external_item_id: null,
    notes: null,
    comment: null,
    comments: null,
    customer_notes: null,
    internal_notes: null,
  };
}

function cloneLegacySnapshot(legacy: ProductionPlanLegacySnapshot): ProductionPlanLegacySnapshot {
  return {
    ...(legacy.counts ? { counts: { ...legacy.counts } } : {}),
    ...(legacy.activeLoadByStation
      ? { activeLoadByStation: { ...legacy.activeLoadByStation } }
      : {}),
  };
}
