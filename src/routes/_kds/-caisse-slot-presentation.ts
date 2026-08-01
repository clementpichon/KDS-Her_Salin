import type { CashierSlotOption } from "../../lib/cashier-flow";
import { TARGET_SPONTANEOUS_CAPACITY_RESERVE } from "../../lib/cashier-flow";

type DraftBatchPlacement = {
  fullBatchCount: number;
  partialBatchCount: number;
  completesExistingFullBatch: boolean;
  formsFullBatchFromCart: boolean;
};

export function slotShortReason(slot: CashierSlotOption) {
  const warnings = normalizeForDecision(slot.warnings.join(" "));
  const batchReason = draftBatchReason(classifyDraftBatchPlacement(slot));
  const highLoad = slot.level === "charge" || slot.level === "tendu";
  const kitchenPressure =
    warnings.includes("deja prevue") ||
    warnings.includes("creneau dense") ||
    warnings.includes("tres charge") ||
    (highLoad && !slot.fries.mixedLoad);

  if (warnings.includes("retard") || warnings.includes("fenetre")) return "Risque de retard";
  if (kitchenPressure) return "Cuisine déjà chargée";
  if (slot.fries.mixedLoad) return "Frites et grenailles à coordonner";
  if (batchReason) return batchReason;
  if (slotHasLowMargin(slot)) return "Marge faible";
  if (slot.pizza.added > 0 && slot.pizza.reserveAfterOrder >= TARGET_SPONTANEOUS_CAPACITY_RESERVE) {
    return "Encore de la marge";
  }
  if (slot.level === "calme") return "Créneau confortable";
  return "Possible sans surcharge";
}

export function classifyDraftBatchPlacement(
  slot: Pick<CashierSlotOption, "pizza">,
): DraftBatchPlacement {
  const draftBatches = slot.pizza.batches.filter((batch) => batch.draftPizzas > 0);
  const fullBatches = draftBatches.filter((batch) => batch.totalPizzas === batch.capacity);
  const partialBatches = draftBatches.filter((batch) => batch.totalPizzas < batch.capacity);

  return {
    fullBatchCount: fullBatches.length,
    partialBatchCount: partialBatches.length,
    completesExistingFullBatch: fullBatches.some((batch) => batch.existingPizzas > 0),
    formsFullBatchFromCart: fullBatches.some((batch) => batch.existingPizzas === 0),
  };
}

function draftBatchReason(placement: DraftBatchPlacement) {
  if (placement.fullBatchCount === 0) return null;
  if (placement.partialBatchCount > 0) return "Fournée complète + fournée ouverte";
  if (placement.fullBatchCount > 1) return "Fournées complètes";
  if (placement.completesExistingFullBatch) return "Complète bien une fournée";
  if (placement.formsFullBatchFromCart) return "Fournée complète";
  return null;
}

function slotHasLowMargin(slot: CashierSlotOption) {
  return slot.pizza.added > 0 && slot.pizza.reserveAfterOrder < TARGET_SPONTANEOUS_CAPACITY_RESERVE;
}

function normalizeForDecision(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr");
}
