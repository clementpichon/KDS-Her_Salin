import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  anonymizeProductionPlanSnapshot,
  compareProductionPlanWithLegacy,
  PRODUCTION_PLAN_SNAPSHOT_SOURCES,
  type ProductionPlanShadowFinding,
  type ProductionPlanShadowValidationReport,
  type ProductionPlanSnapshot,
} from "../src/lib/production-plan-shadow-validation";

interface CliOptions {
  inputPath: string;
  jsonOutPath: string;
  anonymizedOutPath: string | null;
}

const DEFAULT_JSON_OUT_PATH = ".local/production-plan/shadow-report.json";

function main() {
  const options = parseArgs(process.argv.slice(2));
  const rawSnapshot = readSnapshot(options.inputPath);
  assertProductionPlanSnapshot(rawSnapshot);

  const anonymizedSnapshot = anonymizeProductionPlanSnapshot(rawSnapshot);
  if (options.anonymizedOutPath) {
    writeJson(options.anonymizedOutPath, anonymizedSnapshot);
  }

  const report = compareProductionPlanWithLegacy(anonymizedSnapshot);
  printHumanSummary(report);
  writeJson(options.jsonOutPath, report);

  if (report.blockingDifferences.length > 0) {
    process.exitCode = 1;
  }
}

function parseArgs(args: readonly string[]): CliOptions {
  const [inputPath, ...rest] = args;
  if (!inputPath || inputPath === "--help" || inputPath === "-h") {
    printUsage();
    process.exit(inputPath ? 0 : 1);
  }

  let jsonOutPath = DEFAULT_JSON_OUT_PATH;
  let anonymizedOutPath: string | null = null;

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    const next = rest[index + 1];

    if (arg === "--json-out" && next) {
      jsonOutPath = next;
      index += 1;
      continue;
    }

    if (arg === "--anonymized-out" && next) {
      anonymizedOutPath = next;
      index += 1;
      continue;
    }

    throw new Error(`Argument inconnu ou incomplet: ${arg}`);
  }

  return {
    inputPath,
    jsonOutPath,
    anonymizedOutPath,
  };
}

function printUsage() {
  console.log(`Usage:
  npm run validate:production-plan -- <snapshot.json> [--json-out <report.json>] [--anonymized-out <snapshot.anonymized.json>]

Exemple:
  npm run validate:production-plan -- .local/production-plan/supabase-export.raw.json --anonymized-out .local/production-plan/supabase-export.anonymized.json

Le script lit uniquement des fichiers locaux, anonymise en memoire, n'appelle pas Supabase et n'ecrit jamais dans le KDS.`);
}

function readSnapshot(path: string): unknown {
  const absolutePath = resolve(path);
  try {
    return JSON.parse(readFileSync(absolutePath, "utf8")) as unknown;
  } catch (error) {
    throw new Error(
      `Impossible de lire ou parser le snapshot ${absolutePath}: ${messageOf(error)}`,
    );
  }
}

function assertProductionPlanSnapshot(value: unknown): asserts value is ProductionPlanSnapshot {
  if (!isRecord(value)) {
    throw new Error("Snapshot invalide: la racine doit etre un objet JSON.");
  }

  assertString(value.snapshotId, "snapshotId");
  assertNullableString(value.capturedAt, "capturedAt");
  assertOneOf(value.source, PRODUCTION_PLAN_SNAPSHOT_SOURCES, "source");
  assertArray(value.orders, "orders");

  for (const [index, order] of value.orders.entries()) {
    assertRecord(order, `orders[${index}]`);
    assertString(order.id, `orders[${index}].id`);
  }

  if ("orderItems" in value) {
    assertArray(value.orderItems, "orderItems");
    for (const [index, item] of value.orderItems.entries()) {
      assertRecord(item, `orderItems[${index}]`);
      assertString(item.id, `orderItems[${index}].id`);
      assertString(item.order_id, `orderItems[${index}].order_id`);
      assertString(item.pizza_name, `orderItems[${index}].pizza_name`);
    }
  }

  if ("paninoItems" in value) {
    assertArray(value.paninoItems, "paninoItems");
    for (const [index, item] of value.paninoItems.entries()) {
      assertRecord(item, `paninoItems[${index}]`);
      assertString(item.id, `paninoItems[${index}].id`);
      assertString(item.order_id, `paninoItems[${index}].order_id`);
      assertString(item.product_key, `paninoItems[${index}].product_key`);
      assertString(item.product_name, `paninoItems[${index}].product_name`);
    }
  }
}

function printHumanSummary(report: ProductionPlanShadowValidationReport) {
  console.log("");
  console.log("ProductionPlan shadow validation");
  console.log("--------------------------------");
  console.log(`Snapshot: ${report.snapshotId}`);
  console.log(`Plan: ${report.planId}`);
  console.log(`Commandes: ${report.counts.plan.orders}`);
  console.log(`Produits physiques: ${report.counts.plan.physicalProducts}`);
  console.log(`Plan exploitable: ${report.planUsable ? "oui" : "non"}`);
  console.log(`Matchs: ${report.matches.length}`);
  console.log(`Warnings: ${report.warnings.length}`);
  console.log(`Differences bloquantes: ${report.blockingDifferences.length}`);
  console.log(`Cas non supportes: ${report.unsupportedCases.length}`);
  console.log("");

  printFindings("Warnings", report.warnings);
  printFindings("Differences bloquantes", report.blockingDifferences);
  printFindings("Cas non supportes", report.unsupportedCases);
}

function printFindings(title: string, findings: readonly ProductionPlanShadowFinding[]) {
  if (findings.length === 0) return;

  console.log(title);
  console.log("-".repeat(title.length));

  for (const finding of findings) {
    const explanation = explainFinding(finding);
    console.log(`Type : ${finding.classification}`);
    console.log(`Code : ${finding.code}`);
    console.log(`Commande ou article concerne : ${finding.details ?? "non precise"}`);
    console.log(`Donnee source : ${formatValue(finding.sourceValue)}`);
    console.log(`Interpretation legacy : ${formatValue(finding.legacyValue)}`);
    console.log(`Interpretation ProductionPlan : ${formatValue(finding.planValue)}`);
    console.log(`Cause probable : ${explanation.cause}`);
    console.log(`Risque terrain : ${explanation.risk}`);
    console.log(`Correction necessaire : ${explanation.correction}`);
    console.log(`Document concerne : ${explanation.document}`);
    console.log("");
  }
}

function explainFinding(finding: ProductionPlanShadowFinding) {
  if (finding.code.includes("source_item_missing_order")) {
    return {
      cause: "Export incomplet ou article orphelin.",
      risk: "La commande projetee perd son horaire ou son contexte client.",
      correction: "Corriger l'export ou la donnee source avant migration d'un poste.",
      document: "docs/02_MODELE_DE_DONNEES.md",
    };
  }

  if (finding.code.includes("production_unit_without_work_unit")) {
    return {
      cause: "Produit support non encore modelise dans les workflows.",
      risk: "Le produit pourrait disparaitre de la projection de production.",
      correction: "Ajouter un workflow ou confirmer que le produit doit rester unsupported.",
      document: "docs/14_ARCHITECTURE_WORK_UNITS.md",
    };
  }

  if (finding.code.includes("legacy_panino_bread_state")) {
    return {
      cause: "Etat pain Pani'NO encore porte par la commande legacy.",
      risk: "Projection prudente mais pas assez fine pour remplacer le poste Pani'NO.",
      correction: "Conserver comme unsupported jusqu'a modelisation explicite.",
      document: "docs/08_POSTE_PANINO.md",
    };
  }

  if (finding.code.includes("ambiguous_legacy_status")) {
    return {
      cause: "Ancien champ prepared interprete prudemment.",
      risk: "Faible tant que le nouveau plan reste en lecture seule.",
      correction: "Comparer sur export terrain avant toute bascule.",
      document: "docs/09_REGLES_METIER.md",
    };
  }

  if (finding.code.includes("order_item_status_divergence")) {
    return {
      cause: "Statut commande et statut article ne racontent pas exactement la meme chose.",
      risk: "Risque de charge active differente entre legacy et ProjectionPlan.",
      correction: "Analyser la source avant de modifier l'adaptateur.",
      document: "docs/10_SYNCHRONISATION.md",
    };
  }

  return {
    cause: "Ecart detecte par la comparaison silencieuse.",
    risk: "A evaluer avant tout branchement sur un poste.",
    correction: "Ne pas corriger automatiquement sans preuve metier.",
    document: "docs/13_ETAT_DU_PROJET.md",
  };
}

function writeJson(path: string, value: unknown) {
  const absolutePath = resolve(path);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  console.log(`Rapport JSON ecrit : ${absolutePath}`);
}

function assertArray(value: unknown, label: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Snapshot invalide: ${label} doit etre un tableau.`);
  }
}

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Snapshot invalide: ${label} doit etre un objet.`);
  }
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Snapshot invalide: ${label} doit etre une chaine non vide.`);
  }
}

function assertNullableString(value: unknown, label: string): asserts value is string | null {
  if (value !== null && typeof value !== "string") {
    throw new Error(`Snapshot invalide: ${label} doit etre une chaine ou null.`);
  }
}

function assertOneOf<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  label: string,
): asserts value is T {
  if (typeof value !== "string" || !allowedValues.includes(value as T)) {
    throw new Error(`Snapshot invalide: ${label} doit valoir ${allowedValues.join(", ")}.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatValue(value: unknown) {
  if (value === undefined) return "non fourni";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

try {
  main();
} catch (error) {
  console.error(messageOf(error));
  process.exitCode = 1;
}
