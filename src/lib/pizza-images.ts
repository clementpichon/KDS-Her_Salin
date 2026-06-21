import marguerita from "@/assets/pizzas/marguerita.jpg";
import regina from "@/assets/pizzas/regina.jpg";
import piccante from "@/assets/pizzas/piccante.jpg";
import fromages from "@/assets/pizzas/fromages.jpg";
import truffeParme from "@/assets/pizzas/truffe-parme.jpg";
import napolitaine from "@/assets/pizzas/napolitaine.jpg";
import chevreMiel from "@/assets/pizzas/chevre-miel.jpg";
import carbonara from "@/assets/pizzas/carbonara.jpg";
import saumon from "@/assets/pizzas/saumon.jpg";
import calzon from "@/assets/pizzas/calzon.jpg";
import savoyarde from "@/assets/pizzas/savoyarde.jpg";
import vegetarienne from "@/assets/pizzas/vegetarienne.jpg";

export const PIZZA_IMAGES: Record<string, string> = {
  "marguerita.jpg": marguerita,
  "regina.jpg": regina,
  "piccante.jpg": piccante,
  "fromages.jpg": fromages,
  "truffe-parme.jpg": truffeParme,
  "napolitaine.jpg": napolitaine,
  "chevre-miel.jpg": chevreMiel,
  "carbonara.jpg": carbonara,
  "saumon.jpg": saumon,
  "calzon.jpg": calzon,
  "savoyarde.jpg": savoyarde,
  "vegetarienne.jpg": vegetarienne,
};

export function getPizzaImage(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return PIZZA_IMAGES[path];
}
