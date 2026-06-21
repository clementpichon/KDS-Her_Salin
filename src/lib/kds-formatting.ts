export function friesLabel(mode: string | null | undefined): string | null {
  if (mode === "interieur") return "🍟 Frites à l'intérieur";
  if (mode === "cornet") return "🍟 Frites séparées en cornet";
  return null;
}

export function paninoDisplayName(productKey: string, productName?: string): string {
  if (productKey === "cornet_frites") return "🍟 Cornet de frites";
  return productName ?? productKey;
}
