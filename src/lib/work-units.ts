import type { ProductionUnit, ProductionUnitKind, ProductionUnitStatus } from "./production-units";

export type WorkUnitType =
  | "preparation"
  | "cooking"
  | "finishing"
  | "assembly"
  | "packaging"
  | "handover";

export type WorkUnitStatus =
  | "blocked"
  | "available"
  | "reserved"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled";

export type WorkUnitStation =
  | "pizzaiolo"
  | "four"
  | "panino"
  | "fish_fryer"
  | "fries_fryer"
  | "handover";

export type WorkUnitStatusSource =
  | "production_unit_status"
  | "legacy_item_status"
  | "dependency_projection";

export interface WorkUnit {
  id: string;
  productionUnitId: string;
  orderId: string;
  sourceProductionUnitStatus: ProductionUnitStatus;
  workflowNodeId: string;
  type: WorkUnitType;
  station: WorkUnitStation;
  status: WorkUnitStatus;
  statusSource: WorkUnitStatusSource;
  dependsOn: readonly string[];
  productKind: ProductionUnitKind;
  productName: string;
  requestedTime: string | null;
  customerName: string | null;
  estimatedDurationSec: number | null;
  executionProfileId: string | null;
}

export interface BuildWorkUnitsParams {
  productionUnits: readonly ProductionUnit[];
}

interface WorkUnitBlueprint {
  workflowNodeId: string;
  type: WorkUnitType;
  station: WorkUnitStation;
  dependsOnNodeIds: readonly string[];
  executionProfileId: string | null;
}

interface PizzaWorkflowDefinition {
  aliases: readonly string[];
  hasPostCooking: boolean;
}

const PIZZA_WORKFLOW_REGISTRY: readonly PizzaWorkflowDefinition[] = [
  { aliases: ["truffe_parme"], hasPostCooking: true },
  { aliases: ["vegetarienne"], hasPostCooking: true },
  { aliases: ["carbonara"], hasPostCooking: true },
  { aliases: ["fromages"], hasPostCooking: true },
  { aliases: ["chevre_miel"], hasPostCooking: true },
  { aliases: ["margherita", "marguerita"], hasPostCooking: false },
  { aliases: ["regina"], hasPostCooking: false },
  { aliases: ["piccante"], hasPostCooking: false },
  { aliases: ["savoyarde"], hasPostCooking: false },
  { aliases: ["calzone"], hasPostCooking: false },
];

export function buildWorkUnits({ productionUnits }: BuildWorkUnitsParams): WorkUnit[] {
  return productionUnits.flatMap(buildProductionUnitWorkUnits);
}

export function workUnitId(productionUnitId: string, workflowNodeId: string) {
  return `work_unit:${productionUnitId}:${workflowNodeId}`;
}

function buildProductionUnitWorkUnits(productionUnit: ProductionUnit): WorkUnit[] {
  const blueprints = workUnitBlueprintsFor(productionUnit);

  return blueprints.map((blueprint) => {
    const status = resolveWorkUnitStatus(productionUnit, blueprint);
    return {
      id: workUnitId(productionUnit.id, blueprint.workflowNodeId),
      productionUnitId: productionUnit.id,
      orderId: productionUnit.orderId,
      sourceProductionUnitStatus: productionUnit.status,
      workflowNodeId: blueprint.workflowNodeId,
      type: blueprint.type,
      station: blueprint.station,
      status,
      statusSource: resolveWorkUnitStatusSource(productionUnit, status),
      dependsOn: blueprint.dependsOnNodeIds.map((nodeId) => workUnitId(productionUnit.id, nodeId)),
      productKind: productionUnit.kind,
      productName: productionUnit.productName,
      requestedTime: productionUnit.requestedTime,
      customerName: productionUnit.customerName,
      estimatedDurationSec: null,
      executionProfileId: blueprint.executionProfileId,
    };
  });
}

function workUnitBlueprintsFor(productionUnit: ProductionUnit): WorkUnitBlueprint[] {
  switch (productionUnit.kind) {
    case "pizza":
      return pizzaWorkUnitBlueprintsFor(productionUnit);
    case "panino":
      return [
        blueprint("panino.bread", "preparation", "pizzaiolo", []),
        blueprint("panino.filling", "cooking", "panino", []),
        blueprint("panino.assembly", "assembly", "panino", ["panino.bread", "panino.filling"]),
        blueprint("panino.packaging", "packaging", "panino", ["panino.assembly"]),
      ];
    case "fish_no":
      return [
        blueprint("fish_no.fish_cooking", "cooking", "fish_fryer", []),
        blueprint(
          "fish_no.side_cooking",
          "cooking",
          "fries_fryer",
          [],
          `fish_no.side.${normalizeProfilePart(productionUnit.panino?.side ?? productionUnit.panino?.friesMode)}`,
        ),
        blueprint("fish_no.assembly", "assembly", "panino", [
          "fish_no.fish_cooking",
          "fish_no.side_cooking",
        ]),
        blueprint("fish_no.packaging", "packaging", "panino", ["fish_no.assembly"]),
      ];
    case "fries":
      return [
        blueprint("fries.cooking", "cooking", "fries_fryer", []),
        blueprint("fries.packaging", "packaging", "panino", ["fries.cooking"]),
      ];
    case "grenailles":
      return [
        blueprint("grenailles.cooking", "cooking", "fries_fryer", []),
        blueprint("grenailles.packaging", "packaging", "panino", ["grenailles.cooking"]),
      ];
    case "other":
      return [];
  }
}

function pizzaWorkUnitBlueprintsFor(productionUnit: ProductionUnit): WorkUnitBlueprint[] {
  if (!pizzaRequiresPostCooking(productionUnit)) {
    return [
      blueprint("pizza.preparation", "preparation", "pizzaiolo", []),
      blueprint("pizza.cooking", "cooking", "four", ["pizza.preparation"]),
      blueprint("pizza.packaging", "packaging", "four", ["pizza.cooking"]),
    ];
  }

  return [
    blueprint("pizza.preparation", "preparation", "pizzaiolo", []),
    blueprint("pizza.cooking", "cooking", "four", ["pizza.preparation"]),
    blueprint("pizza.finishing", "finishing", "four", ["pizza.cooking"]),
    blueprint("pizza.packaging", "packaging", "four", ["pizza.finishing"]),
  ];
}

function pizzaRequiresPostCooking(productionUnit: ProductionUnit) {
  const normalizedName = normalizeProfilePart(productionUnit.productName);
  const definition = PIZZA_WORKFLOW_REGISTRY.find((candidate) =>
    candidate.aliases.includes(normalizedName),
  );
  return definition?.hasPostCooking ?? false;
}

function blueprint(
  workflowNodeId: string,
  type: WorkUnitType,
  station: WorkUnitStation,
  dependsOnNodeIds: readonly string[],
  executionProfileId: string | null = workflowNodeId,
): WorkUnitBlueprint {
  return {
    workflowNodeId,
    type,
    station,
    dependsOnNodeIds,
    executionProfileId,
  };
}

function resolveWorkUnitStatus(
  productionUnit: ProductionUnit,
  blueprint: WorkUnitBlueprint,
): WorkUnitStatus {
  if (productionUnit.status === "cancelled") return "cancelled";
  if (productionUnit.status === "failed") return "failed";
  if (productionUnit.status === "ready" || productionUnit.status === "delivered") {
    return "completed";
  }

  if (productionUnit.status === "in_progress") {
    return resolveInProgressWorkUnitStatus(productionUnit, blueprint);
  }

  return blueprint.dependsOnNodeIds.length === 0 ? "available" : "blocked";
}

function resolveInProgressWorkUnitStatus(
  productionUnit: ProductionUnit,
  blueprint: WorkUnitBlueprint,
): WorkUnitStatus {
  switch (productionUnit.kind) {
    case "pizza":
      if (blueprint.workflowNodeId === "pizza.preparation") return "completed";
      if (productionUnit.statusSource === "legacy_prepared") {
        if (blueprint.workflowNodeId === "pizza.cooking") return "available";
        return "blocked";
      }
      if (blueprint.workflowNodeId === "pizza.cooking") return "in_progress";
      return "blocked";
    case "panino":
      if (blueprint.workflowNodeId === "panino.filling") return "in_progress";
      if (blueprint.workflowNodeId === "panino.bread") return "available";
      return "blocked";
    case "fish_no":
      if (
        blueprint.workflowNodeId === "fish_no.fish_cooking" ||
        blueprint.workflowNodeId === "fish_no.side_cooking"
      ) {
        return "available";
      }
      return "blocked";
    case "fries":
      if (blueprint.workflowNodeId === "fries.cooking") return "in_progress";
      return "blocked";
    case "grenailles":
      if (blueprint.workflowNodeId === "grenailles.cooking") return "in_progress";
      return "blocked";
    case "other":
      if (blueprint.workflowNodeId === "other.preparation") return "in_progress";
      return "blocked";
  }
}

function resolveWorkUnitStatusSource(
  productionUnit: ProductionUnit,
  status: WorkUnitStatus,
): WorkUnitStatusSource {
  if (status === "blocked" || status === "available") return "dependency_projection";
  if (productionUnit.statusSource === "legacy_prepared") return "legacy_item_status";
  return "production_unit_status";
}

function normalizeProfilePart(value: string | null | undefined) {
  if (!value) return "unknown";
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
