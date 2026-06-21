import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PaninoProductInput = z.object({
  key: z.string().min(1).max(80),
  name: z.string().min(1).max(80),
  bases: z.array(z.string()).default([]),
  fries_modes: z.array(z.string()).default([]),
  sides: z.array(z.string()).default([]),
  sauces: z.array(z.string()).default([]),
  removables: z.array(z.string()).default([]),
  extras: z.array(z.string()).default([]),
});

const InputSchema = z.object({
  imageDataUrl: z.string().min(20).max(8_000_000),
  pizzaNames: z.array(z.string().min(1).max(80)).min(1).max(200),
  paninoProducts: z.array(PaninoProductInput).max(50).default([]),
});

const ParsedItem = z.object({
  pizza_name: z.string(),
  quantity: z.number().int().min(1).max(50).default(1),
  extras: z.array(z.string()).default([]),
  removed: z.array(z.string()).default([]),
  cut_into: z.number().int().nullable().optional(),
});

const ParsedPaninoItem = z.object({
  product_name: z.string(),
  quantity: z.number().int().min(1).max(50).default(1),
  base: z.string().nullable().optional(),
  fries_mode: z.string().nullable().optional(),
  side: z.string().nullable().optional(),
  sauces: z.array(z.string()).default([]),
  removed: z.array(z.string()).default([]),
  extras: z.array(z.string()).default([]),
});

const ParsedResponse = z.object({
  customer_name: z.string().nullable().optional(),
  requested_time: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(ParsedItem).default([]),
  panino_items: z.array(ParsedPaninoItem).default([]),
});

export const scanOrderTicket = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "OCR indisponible (clé manquante)" };
    }

    const paninoCatalogText = data.paninoProducts.length
      ? data.paninoProducts
          .map(
            (p) =>
              `- ${p.name} (key=${p.key})` +
              (p.bases.length ? ` | bases: ${p.bases.join(", ")}` : "") +
              (p.fries_modes.length ? ` | modes frites: ${p.fries_modes.join(", ")}` : "") +
              (p.sides.length ? ` | accompagnements: ${p.sides.join(", ")}` : "") +
              (p.sauces.length ? ` | sauces: ${p.sauces.join(", ")}` : "") +
              (p.removables.length ? ` | retraits: ${p.removables.join(", ")}` : "") +
              (p.extras.length ? ` | suppléments: ${p.extras.join(", ")}` : ""),
          )
          .join("\n")
      : "(aucun)";

    const systemPrompt = `Tu es un assistant qui lit des bons de commande d'une pizzeria/snack, IMPRIMÉS ET/OU ANNOTÉS À LA MAIN.
Tu DOIS répondre via l'appel de la fonction "extract_order".

Catalogue PIZZAS (orthographe exacte) : ${data.pizzaNames.join(", ")}.

Catalogue PANI'NO / produits snack :
${paninoCatalogText}

RÈGLE ABSOLUE : toute pizza ou tout produit Pani'NO lu (imprimé OU manuscrit) DOIT apparaître dans "items" (pizzas) ou "panino_items" (paninos / fish'no / cornet de frites…). N'écris JAMAIS un produit ou un supplément dans "notes". Le champ "notes" sert UNIQUEMENT aux annotations qui ne concernent ni un produit ni un supplément (ex: "à emporter", "bien cuite", "sonner").

PIZZAS :
- Choisis le nom exact dans le catalogue pizzas.
- Quantité (ex: "2x Regina") → "quantity".
- "sans X" / "no X" → "removed". "+ X" / "supp X" / "extra X" → "extras".
- Découpage manuscrit ("à couper en 4/6/8", "/8") → "cut_into" (4, 6 ou 8). Si la mention concerne toute la commande, applique-la à toutes les pizzas.

PANI'NO / SNACK :
- Repère tout produit du catalogue Pani'NO (panino, fish'no, cornet de frites…) imprimé OU manuscrit.
- "product_name" = nom exact du produit du catalogue.
- Si une base est mentionnée (ex: "base crème", "base tomate"), choisis-la EXACTEMENT parmi les bases proposées pour ce produit → "base".
- Si une sauce est mentionnée (ex: "sauce andalouse", "samouraï"), choisis-la EXACTEMENT parmi les sauces proposées pour ce produit → "sauces" (tableau, peut contenir 1 ou 2 sauces si "moitié/moitié").
- Mode frites ("frites dans le panino", "cornet séparé") → "fries_mode" si proposé pour ce produit.
- Accompagnement ("frites", "potatoes"…) → "side" si proposé.
- "sans X" → "removed". "+ X" / "extra X" / "supp X" → "extras".
- Quantité → "quantity".

Si un nom (client) ou une heure est visible, renseigne "customer_name" et "requested_time" (format HH:MM).
Ignore tout ce qui n'est pas un produit du catalogue, un supplément, un retrait, un découpage, un nom ou une heure.`;

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Extrais la commande de ce bon." },
            { type: "image_url", image_url: { url: data.imageDataUrl } },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_order",
            description: "Retourne la commande extraite du bon.",
            parameters: {
              type: "object",
              properties: {
                customer_name: { type: "string" },
                requested_time: { type: "string", description: "HH:MM" },
                notes: { type: "string", description: "Annotations générales uniquement (ex: 'à emporter')." },
                items: {
                  type: "array",
                  description: "Pizzas commandées.",
                  items: {
                    type: "object",
                    properties: {
                      pizza_name: { type: "string", description: `Nom exact parmi: ${data.pizzaNames.join(", ")}` },
                      quantity: { type: "integer" },
                      extras: { type: "array", items: { type: "string" } },
                      removed: { type: "array", items: { type: "string" } },
                      cut_into: { type: "integer", description: "Nombre de parts (4, 6 ou 8)." },
                    },
                    required: ["pizza_name", "quantity"],
                  },
                },
                panino_items: {
                  type: "array",
                  description: "Produits Pani'NO / snack commandés.",
                  items: {
                    type: "object",
                    properties: {
                      product_name: { type: "string", description: "Nom exact du produit Pani'NO." },
                      quantity: { type: "integer" },
                      base: { type: "string" },
                      fries_mode: { type: "string" },
                      side: { type: "string" },
                      sauces: { type: "array", items: { type: "string" } },
                      removed: { type: "array", items: { type: "string" } },
                      extras: { type: "array", items: { type: "string" } },
                    },
                    required: ["product_name", "quantity"],
                  },
                },
              },
              required: [],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_order" } },
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) return { ok: false as const, error: "Trop de requêtes, réessayez dans un instant." };
      if (res.status === 402) return { ok: false as const, error: "Crédits IA épuisés." };
      console.error("OCR gateway error", res.status, text);
      return { ok: false as const, error: `Erreur OCR (${res.status})` };
    }

    const json = await res.json();
    const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    if (!argsStr) return { ok: false as const, error: "Aucune commande détectée." };

    try {
      const parsed = ParsedResponse.parse(JSON.parse(argsStr));
      return { ok: true as const, parsed };
    } catch (e) {
      console.error("OCR parse error", e, argsStr);
      return { ok: false as const, error: "Réponse IA invalide." };
    }
  });
