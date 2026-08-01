import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  Check,
  ScanLine,
  Loader2,
  Pizza as PizzaIcon,
  Sandwich,
  Search,
} from "lucide-react";
import {
  usePizzas,
  useOrders,
  useSettings,
  useIngredients,
  usePaninoCatalog,
  usePaninoOrderItems,
  usePhoneStatus,
} from "@/hooks/use-kds-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getPizzaImage } from "@/lib/pizza-images";
import { computeStock, computePrepStart, formatTime } from "@/lib/scheduling";
import { friesLabel, paninoDisplayName } from "@/lib/kds-formatting";
import { formatPhoneNumber, normalizePhoneNumber } from "@/lib/phone-utils";
import {
  analyzeCashierSlot,
  buildCashierSlotOptions,
  isSlotHighlyLoaded,
  summarizeCashierDraft,
  TARGET_SPONTANEOUS_CAPACITY_RESERVE,
  type CashierCatalogTab,
  type CashierFlowStep,
  type CashierLoadLevel,
  type CashierSlotOption,
} from "@/lib/cashier-flow";
import {
  getDefaultPizzaBaseKey,
  getPizzaBaseInfoFromKey,
  getPizzaBaseInfoFromText,
  inferRequestedBase,
  PIZZA_BASE_OPTIONS,
  type PizzaBaseKey,
} from "@/lib/pizza-production";
import { scanOrderTicket } from "@/lib/api/ocr.functions";
import { logProductionEvent } from "@/lib/production-events";
import type {
  DraftItem,
  Pizza,
  PaninoProduct,
  PaninoOption,
  DraftPaninoItem,
} from "@/lib/kds-types";

const LOCAL_CONTROL_KEY = "hersalin_control_settings_v1";

export const Route = createFileRoute("/_kds/caisse")({
  head: () => ({
    meta: [
      { title: "Caisse — Prise de commande — Her Salin" },
      {
        name: "description",
        content:
          "Écran caisse Her Salin : saisie des commandes, scan de bons, choix du créneau et envoi en préparation.",
      },
      { property: "og:title", content: "Caisse — Prise de commande" },
      {
        property: "og:description",
        content: "Saisie de commandes, scan de bons et choix du créneau de four.",
      },
    ],
    links: [{ rel: "canonical", href: "/caisse" }],
  }),
  component: Caisse,
});

function Caisse() {
  const pizzas = usePizzas();
  const { orders, reload } = useOrders();
  const settings = useSettings();
  const { status: phoneStatus } = usePhoneStatus();
  const { products: paninoProducts, options: paninoOptions } = usePaninoCatalog();
  const { items: paninoItems, reload: reloadPanino } = usePaninoOrderItems();

  const [flowStep, setFlowStep] = useState<CashierFlowStep>("products");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [requestedTime, setRequestedTime] = useState(defaultTime());
  const [cart, setCart] = useState<DraftItem[]>([]);
  const [paninoCart, setPaninoCart] = useState<DraftPaninoItem[]>([]);
  const [orderNotes, setOrderNotes] = useState("");
  const [editing, setEditing] = useState<{ pizza: Pizza } | null>(null);
  const [editingPanino, setEditingPanino] = useState<PaninoProduct | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [catalogTab, setCatalogTab] = useState<CashierCatalogTab>("pizzas");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedSlotSeverityRef = useRef<{ id: string; severity: number } | null>(null);
  const runOcr = useServerFn(scanOrderTicket);

  const stock = settings ? computeStock(orders, settings, paninoItems) : 0;
  const draftSummary = useMemo(() => summarizeCashierDraft(cart, paninoCart), [cart, paninoCart]);
  const pendingPaninoDoughs = draftSummary.paninoCount;

  useEffect(() => {
    const incomingPhone = phoneStatus?.current_phone_number;
    if (!incomingPhone || customerPhone.trim()) return;
    setCustomerPhone(incomingPhone);
  }, [phoneStatus?.current_phone_number, customerPhone]);

  useEffect(() => {
    if (draftSummary.totalProducts === 0 && flowStep !== "products") {
      setFlowStep("products");
      setSelectedSlotId(null);
    }
  }, [draftSummary.totalProducts, flowStep]);

  const handleScanFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Fichier image requis");
    if (file.size > 6 * 1024 * 1024) return toast.error("Image trop volumineuse (max 6 Mo)");
    if (pizzas.length === 0) return toast.error("Catalogue non chargé");
    setScanning(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      const paninoCatalog = availablePaninoProducts.map((p) => {
        const opts = paninoOptions.filter((o) => o.product_key === p.key);
        const byKind = (k: string) => opts.filter((o) => o.kind === k).map((o) => o.name);
        return {
          key: p.key,
          name: p.name,
          bases: byKind("base"),
          fries_modes: byKind("fries_mode"),
          sides: byKind("side"),
          sauces: byKind("sauce"),
          removables: byKind("removable"),
          extras: byKind("extra"),
        };
      });
      const result = await runOcr({
        data: {
          imageDataUrl: dataUrl,
          pizzaNames: pizzas.map((p) => p.name),
          pizzaBases: PIZZA_BASE_OPTIONS.map((base) => base.label),
          paninoProducts: paninoCatalog,
        },
      });
      if (!result.ok) return toast.error(result.error);
      const { parsed } = result;
      const byName = new Map(pizzas.map((p) => [p.name.toLowerCase(), p]));
      const added: DraftItem[] = [];
      const unknown: string[] = [];
      for (const it of parsed.items) {
        const pizza = byName.get(it.pizza_name.toLowerCase());
        if (!pizza) {
          unknown.push(it.pizza_name);
          continue;
        }
        const cut = it.cut_into && [4, 6, 8].includes(it.cut_into) ? it.cut_into : null;
        for (let i = 0; i < Math.max(1, it.quantity); i++) {
          added.push(
            buildPizzaDraftItem(
              pizza,
              getPizzaBaseInfoFromText(it.base)?.key ?? null,
              it.extras ?? [],
              it.removed ?? [],
              cut,
            ),
          );
        }
      }

      // Pani'NO items
      const paninoByName = new Map(availablePaninoProducts.map((p) => [p.name.toLowerCase(), p]));
      const addedPanino: DraftPaninoItem[] = [];
      for (const it of parsed.panino_items ?? []) {
        const prod = paninoByName.get(it.product_name.toLowerCase());
        if (!prod) {
          unknown.push(it.product_name);
          continue;
        }
        const opts = paninoOptions.filter((o) => o.product_key === prod.key);
        const matchOne = (kind: string, value?: string | null) => {
          if (!value) return null;
          const found = opts.find(
            (o) => o.kind === kind && o.name.toLowerCase() === value.toLowerCase(),
          );
          return found ? found.name : null;
        };
        const matchMany = (kind: string, values: string[]) => {
          const pool = opts.filter((o) => o.kind === kind);
          return values
            .map((v) => pool.find((o) => o.name.toLowerCase() === v.toLowerCase())?.name)
            .filter((v): v is string => !!v);
        };
        for (let i = 0; i < Math.max(1, it.quantity); i++) {
          addedPanino.push({
            product_key: prod.key,
            product_name: prod.name,
            base: matchOne("base", it.base),
            fries_mode: matchOne("fries_mode", it.fries_mode),
            side: matchOne("side", it.side),
            sauces: matchMany("sauce", it.sauces ?? []),
            removed: matchMany("removable", it.removed ?? []),
            extras: matchMany("extra", it.extras ?? []),
          });
        }
      }

      if (added.length === 0 && addedPanino.length === 0)
        return toast.error("Aucun produit reconnu.");
      if (added.length) setCart((c) => [...c, ...added]);
      if (addedPanino.length) setPaninoCart((c) => [...c, ...addedPanino]);
      setSelectedSlotId(null);
      setFlowStep("products");
      if (parsed.customer_name && !customerName.trim()) setCustomerName(parsed.customer_name);
      if (parsed.requested_time && /^\d{2}:\d{2}$/.test(parsed.requested_time)) {
        setRequestedTime(parsed.requested_time);
      }
      if (parsed.notes && parsed.notes.trim()) {
        setOrderNotes((prev) => (prev ? `${prev} · ${parsed.notes}` : parsed.notes!.trim()));
      }
      const parts: string[] = [];
      if (added.length) parts.push(`${added.length} pizza(s)`);
      if (addedPanino.length) parts.push(`${addedPanino.length} Pani'NO`);
      toast.success(
        `${parts.join(" + ")} ajouté(s)${unknown.length ? ` (ignoré : ${unknown.join(", ")})` : ""}`,
      );
    } catch (e) {
      console.error(e);
      toast.error("Échec de l'analyse du bon");
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const { ingredients: allIngredientsList } = useIngredients();
  const allIngredients = useMemo(() => {
    return allIngredientsList
      .map((ingredient) => ingredient.name.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "fr"));
  }, [allIngredientsList]);

  const normalizedCatalogQuery = catalogQuery.trim().toLocaleLowerCase("fr");
  const disabledPaninoKeys = readDisabledPaninoKeys();
  const availablePaninoProducts = paninoProducts.filter(
    (product) => product.active && !disabledPaninoKeys.has(product.key),
  );
  const filteredPizzas = pizzas.filter((pizza) =>
    `${pizza.name} ${pizza.ingredients.join(" ")}`
      .toLocaleLowerCase("fr")
      .includes(normalizedCatalogQuery),
  );
  const filteredPaninoProducts = availablePaninoProducts.filter((product) => {
    if (getPaninoCatalogTab(product.key) !== catalogTab) return false;
    return product.name.toLocaleLowerCase("fr").includes(normalizedCatalogQuery);
  });
  const requestedDate = isValidLocalTime(requestedTime) ? parseLocalTime(requestedTime) : null;
  const slotOptions =
    settings && draftSummary.totalProducts > 0
      ? buildCashierSlotOptions({
          orders,
          paninoItems,
          settings,
          cart,
          paninoCart,
          fromTime: new Date(),
        })
      : [];
  const selectedSlot =
    selectedSlotId && settings && requestedDate
      ? analyzeCashierSlot({
          orders,
          paninoItems,
          settings,
          cart,
          paninoCart,
          requestedTime: requestedDate,
        })
      : null;

  const goToSlots = () => {
    if (draftSummary.totalProducts === 0) return toast.error("Panier vide");
    setSelectedSlotId(null);
    setExpandedSlotId(null);
    setFlowStep("slot");
  };

  const selectSlot = (slot: CashierSlotOption) => {
    setRequestedTime(toLocalInput(slot.time));
    setSelectedSlotId(slot.id);
  };

  const selectedSlotEffectId = selectedSlot?.id ?? null;
  const selectedSlotEffectLabel = selectedSlot?.label ?? "";
  const selectedSlotEffectLevel = selectedSlot?.level ?? null;
  const selectedSlotEffectPizzaTotal = selectedSlot?.pizza.total ?? 0;

  const continueWithSelectedSlot = () => {
    if (!selectedSlot) return toast.error("Choisissez un créneau");
    setFlowStep("client");
  };

  const changeDraft = (change: () => void) => {
    change();
    setSelectedSlotId(null);
  };

  useEffect(() => {
    if (
      !selectedSlotEffectId ||
      !selectedSlotEffectLevel ||
      (flowStep !== "slot" && flowStep !== "client")
    ) {
      selectedSlotSeverityRef.current = null;
      return;
    }

    const severity = slotSeverity(selectedSlotEffectLevel);
    const previous = selectedSlotSeverityRef.current;
    if (previous && previous.id === selectedSlotEffectId && severity > previous.severity) {
      toast.warning(
        `${selectedSlotEffectLabel} devient ${loadLabel(selectedSlotEffectLevel).toLowerCase()}.`,
      );
    }
    selectedSlotSeverityRef.current = { id: selectedSlotEffectId, severity };
  }, [
    flowStep,
    selectedSlotEffectId,
    selectedSlotEffectLabel,
    selectedSlotEffectLevel,
    selectedSlotEffectPizzaTotal,
  ]);

  const submit = async () => {
    if (submitting) return;
    if (!customerName.trim()) return toast.error("Nom du client requis");
    if (cart.length === 0 && paninoCart.length === 0) return toast.error("Panier vide");
    if (!selectedSlotId) return toast.error("Choisissez un créneau");
    if (!isValidLocalTime(requestedTime)) return toast.error("Heure demandée invalide");
    if (!settings) return;
    const doughsNeeded = cart.length + pendingPaninoDoughs;
    const projectedStock = stock - doughsNeeded;
    if (doughsNeeded > 0 && projectedStock < 0) {
      toast.warning(
        `Conseil : stock pâtons serré (${stock} restant${stock > 1 ? "s" : ""} pour ${doughsNeeded} nécessaire${doughsNeeded > 1 ? "s" : ""}).`,
      );
    }
    const reqDate = parseLocalTime(requestedTime);
    const finalSlotCheck = analyzeCashierSlot({
      orders,
      paninoItems,
      settings,
      cart,
      paninoCart,
      requestedTime: reqDate,
    });
    if (isSlotHighlyLoaded(finalSlotCheck)) {
      toast.warning(`${slotShortReason(finalSlotCheck)}. Commande créée si la caisse confirme.`);
    }

    setSubmitting(true);
    let createdOrderId: string | null = null;

    try {
      const prepStart = cart.length > 0 ? computePrepStart(reqDate, cart.length, settings) : null;
      const breadCount = paninoCart.filter((p) => p.product_key === "panino").length;
      const normalizedCustomerPhone = normalizePhoneNumber(customerPhone);
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          customer_name: customerName.trim(),
          customer_phone: normalizedCustomerPhone || null,
          requested_time: reqDate.toISOString(),
          prep_start_time: prepStart ? prepStart.toISOString() : null,
          notes: orderNotes.trim() || null,
          pains_panino_status: breadCount > 0 ? "a_preparer" : null,
        })
        .select()
        .single();

      if (error || !order) throw error ?? new Error("Erreur création");
      createdOrderId = order.id;

      if (cart.length > 0) {
        const items = cart.map((c) => ({
          order_id: order.id,
          pizza_id: c.pizza_id,
          pizza_name: c.pizza_name,
          base: c.base ?? null,
          default_base_snapshot: c.default_base_snapshot ?? null,
          explicit_base_snapshot: c.explicit_base_snapshot ?? null,
          base_resolution: c.base_resolution ?? null,
          base_confidence: c.base_confidence ?? null,
          extras: c.extras,
          removed: c.removed,
          cut_into: c.cut_into ?? null,
        }));
        const { error: itemsError } = await supabase.from("order_items").insert(items);
        if (itemsError) {
          if (!isMissingOrderItemBaseColumn(itemsError)) throw itemsError;

          const baseOnlyItems = cart.map((c) => ({
            order_id: order.id,
            pizza_id: c.pizza_id,
            pizza_name: c.pizza_name,
            base: c.base ?? null,
            extras: c.extras,
            removed: c.removed,
            cut_into: c.cut_into ?? null,
          }));
          const { error: baseOnlyError } = await supabase.from("order_items").insert(baseOnlyItems);
          if (baseOnlyError) {
            if (!isMissingOrderItemBaseColumn(baseOnlyError)) throw baseOnlyError;

            const legacyItems = cart.map((c) => ({
              order_id: order.id,
              pizza_id: c.pizza_id,
              pizza_name: c.pizza_name,
              extras: c.extras,
              removed: c.removed,
              cut_into: c.cut_into ?? null,
            }));
            const { error: legacyItemsError } = await supabase
              .from("order_items")
              .insert(legacyItems);
            if (legacyItemsError) throw legacyItemsError;
          }
          toast.warning(
            "Commande créée. Migration Supabase à appliquer pour mémoriser toute la résolution des bases pizzas.",
          );
        }
      }

      if (paninoCart.length > 0) {
        const pItems = paninoCart.map((p) => ({
          order_id: order.id,
          product_key: p.product_key,
          product_name: p.product_name,
          base: p.base ?? null,
          fries_mode: p.fries_mode ?? null,
          side: p.side ?? null,
          sauces: p.sauces,
          removed: p.removed,
          extras: p.extras,
        }));
        const { error: paninoError } = await supabase.from("panino_order_items").insert(pItems);
        if (paninoError) throw paninoError;
      }

      void logProductionEvent({
        settings,
        eventType: "ORDER_CREATED",
        station: "caisse",
        orderId: order.id,
        metadata: {
          requested_time: reqDate.toISOString(),
          pizza_count: cart.length,
          panino_count: paninoCart.filter((item) => item.product_key === "panino").length,
          fish_count: paninoCart.filter((item) => item.product_key === "fishno").length,
          fries_count: paninoCart.filter((item) => item.product_key === "cornet_frites").length,
          source: "kds_caisse",
          addition_sync_required: true,
        },
      });

      toast.success(
        `Commande ${customerName} validée pour ${formatTime(reqDate)} · À enregistrer dans L'Addition`,
      );
      setCart([]);
      setPaninoCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setOrderNotes("");
      setRequestedTime(defaultTime());
      setSelectedSlotId(null);
      setExpandedSlotId(null);
      setFlowStep("products");
      reload();
      reloadPanino();
    } catch (error) {
      console.error(error);
      if (createdOrderId) {
        await supabase.from("panino_order_items").delete().eq("order_id", createdOrderId);
        await supabase.from("order_items").delete().eq("order_id", createdOrderId);
        await supabase.from("orders").delete().eq("id", createdOrderId);
      }
      toast.error("Commande non créée : aucune commande partielle conservée");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2 p-2 pb-20 lg:p-3">
      <h2 className="sr-only">Caisse — Prise de commande</h2>
      <CashierStepper step={flowStep} />

      {flowStep === "products" && (
        <ProductsStep
          catalogTab={catalogTab}
          catalogQuery={catalogQuery}
          pizzas={filteredPizzas}
          paninoProducts={filteredPaninoProducts}
          cart={cart}
          paninoCart={paninoCart}
          draftSummary={draftSummary}
          scanning={scanning}
          onCatalogTabChange={setCatalogTab}
          onSearchChange={setCatalogQuery}
          onScanClick={() => fileInputRef.current?.click()}
          onEditPizza={(pizza) => setEditing({ pizza })}
          onEditPanino={setEditingPanino}
          onRemovePizza={(index) =>
            changeDraft(() => setCart((current) => current.filter((_, i) => i !== index)))
          }
          onDuplicatePizza={(index) =>
            changeDraft(() => setCart((current) => [...current, current[index]]))
          }
          onRemovePanino={(index) =>
            changeDraft(() => setPaninoCart((current) => current.filter((_, i) => i !== index)))
          }
          onDuplicatePanino={(index) =>
            changeDraft(() => setPaninoCart((current) => [...current, current[index]]))
          }
          onValidateProducts={goToSlots}
        />
      )}

      {flowStep === "slot" && (
        <SlotChoiceStep
          summary={draftSummary}
          slotOptions={slotOptions}
          selectedSlot={selectedSlot}
          selectedSlotId={selectedSlotId}
          expandedSlotId={expandedSlotId}
          onBack={() => setFlowStep("products")}
          onSelect={selectSlot}
          onContinue={continueWithSelectedSlot}
          onToggleDetails={(slotId) =>
            setExpandedSlotId((current) => (current === slotId ? null : slotId))
          }
        />
      )}

      {flowStep === "client" && (
        <ClientStep
          summary={draftSummary}
          selectedSlot={selectedSlot}
          customerName={customerName}
          customerPhone={customerPhone}
          submitting={submitting}
          onBack={() => setFlowStep("slot")}
          onChangeProducts={() => {
            setSelectedSlotId(null);
            setFlowStep("products");
          }}
          onCustomerNameChange={setCustomerName}
          onCustomerPhoneChange={setCustomerPhone}
          onSubmit={submit}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleScanFile(file);
        }}
      />

      <PizzaCustomizer
        open={!!editing}
        pizza={editing?.pizza ?? null}
        allIngredients={allIngredients}
        onClose={() => setEditing(null)}
        onAdd={(item) => {
          setCart((current) => [...current, item]);
          setSelectedSlotId(null);
          setEditing(null);
          toast.success(`${item.pizza_name} ajoutée`);
        }}
      />

      <PaninoCustomizer
        product={editingPanino}
        options={paninoOptions}
        allIngredients={allIngredients}
        onClose={() => setEditingPanino(null)}
        onAdd={(item) => {
          setPaninoCart((current) => [...current, item]);
          setSelectedSlotId(null);
          setEditingPanino(null);
          toast.success(`${item.product_name} ajouté`);
        }}
      />
    </div>
  );
}

function CashierStepper({ step }: { step: CashierFlowStep }) {
  const steps: Array<{ id: CashierFlowStep; label: string }> = [
    { id: "products", label: "Produits" },
    { id: "slot", label: "Créneau" },
    { id: "client", label: "Client" },
  ];
  const currentIndex = steps.findIndex((item) => item.id === step);

  return (
    <ol className="mx-auto flex max-w-lg items-center justify-center gap-2 rounded-full border bg-card/80 px-3 py-1.5 text-xs shadow-sm">
      {steps.map((item, index) => {
        const active = item.id === step;
        const done = index < currentIndex;
        return (
          <li key={item.id} className="flex items-center gap-2">
            <span
              className={`font-black ${
                active ? "text-primary" : done ? "text-secondary" : "text-muted-foreground"
              }`}
            >
              {done ? "✓" : active ? "●" : "○"} {item.label}
            </span>
            {index < steps.length - 1 && <span className="text-muted-foreground/40">/</span>}
          </li>
        );
      })}
    </ol>
  );
}

function ProductsStep({
  catalogTab,
  catalogQuery,
  pizzas,
  paninoProducts,
  cart,
  paninoCart,
  draftSummary,
  scanning,
  onCatalogTabChange,
  onSearchChange,
  onScanClick,
  onEditPizza,
  onEditPanino,
  onRemovePizza,
  onDuplicatePizza,
  onRemovePanino,
  onDuplicatePanino,
  onValidateProducts,
}: {
  catalogTab: CashierCatalogTab;
  catalogQuery: string;
  pizzas: Pizza[];
  paninoProducts: PaninoProduct[];
  cart: DraftItem[];
  paninoCart: DraftPaninoItem[];
  draftSummary: ReturnType<typeof summarizeCashierDraft>;
  scanning: boolean;
  onCatalogTabChange: (tab: CashierCatalogTab) => void;
  onSearchChange: (value: string) => void;
  onScanClick: () => void;
  onEditPizza: (pizza: Pizza) => void;
  onEditPanino: (product: PaninoProduct) => void;
  onRemovePizza: (index: number) => void;
  onDuplicatePizza: (index: number) => void;
  onRemovePanino: (index: number) => void;
  onDuplicatePanino: (index: number) => void;
  onValidateProducts: () => void;
}) {
  const emptyCatalog = catalogTab === "pizzas" ? pizzas.length === 0 : paninoProducts.length === 0;

  return (
    <div className="grid gap-3 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] min-[900px]:items-start">
      <section className="min-w-0 rounded-2xl border bg-card p-2 shadow-sm sm:p-3">
        <div className="sticky top-[3.55rem] z-20 mb-2 rounded-2xl border bg-background/95 p-2 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-2 min-[760px]:flex-row min-[760px]:items-center">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 min-[520px]:grid-cols-4 min-[760px]:w-auto">
              {[
                { id: "pizzas", label: "Pizzas", icon: PizzaIcon },
                { id: "panino", label: "Pani'NO", icon: Sandwich },
                { id: "fishno", label: "Fish & NO", icon: Sandwich },
                { id: "frites", label: "Frites", icon: Sandwich },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onCatalogTabChange(tab.id as CashierCatalogTab)}
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition active:scale-[0.98] ${
                      catalogTab === tab.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Rechercher un produit</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={catalogQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Rechercher…"
                className="h-12 bg-card pl-9"
              />
            </label>
            <Button variant="outline" className="h-12" onClick={onScanClick} disabled={scanning}>
              {scanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyse…
                </>
              ) : (
                <>
                  <ScanLine className="mr-2 h-4 w-4" />
                  Scanner
                </>
              )}
            </Button>
          </div>
        </div>

        {catalogTab === "pizzas" ? (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 2xl:grid-cols-3">
            {pizzas.map((pizza) => (
              <button
                key={pizza.id}
                type="button"
                onClick={() => onEditPizza(pizza)}
                className="group flex min-h-24 overflow-hidden rounded-2xl border bg-background text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
              >
                <div className="h-auto w-24 shrink-0 overflow-hidden bg-muted sm:w-28">
                  {getPizzaImage(pizza.image_path) && (
                    <img
                      src={getPizzaImage(pizza.image_path)}
                      alt={pizza.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center p-3">
                  <div className="font-bold leading-tight">{pizza.name}</div>
                  <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {pizza.ingredients.join(" · ")}
                  </div>
                  <div className="mt-2 inline-flex items-center text-xs font-bold text-primary">
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Ajouter
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 2xl:grid-cols-3">
            {paninoProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => onEditPanino(product)}
                className="group flex min-h-24 overflow-hidden rounded-2xl border bg-background text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
              >
                <div className="flex w-24 shrink-0 items-center justify-center bg-primary/10 text-primary sm:w-28">
                  <Sandwich className="h-11 w-11" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center p-3">
                  <div className="font-bold leading-tight">
                    {paninoDisplayName(product.key, product.name)}
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {productDescription(product.key)}
                  </div>
                  <div className="mt-2 inline-flex items-center text-xs font-bold text-primary">
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Ajouter
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {emptyCatalog && (
          <div className="rounded-2xl border border-dashed bg-background px-4 py-12 text-center">
            <Search className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 font-semibold">Aucun produit trouvé</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Essayez une autre catégorie ou recherche.
            </p>
          </div>
        )}
      </section>

      <DraftBasketCard
        cart={cart}
        paninoCart={paninoCart}
        draftSummary={draftSummary}
        onRemovePizza={onRemovePizza}
        onDuplicatePizza={onDuplicatePizza}
        onRemovePanino={onRemovePanino}
        onDuplicatePanino={onDuplicatePanino}
        onValidateProducts={onValidateProducts}
      />
    </div>
  );
}

function DraftBasketCard({
  cart,
  paninoCart,
  draftSummary,
  onRemovePizza,
  onDuplicatePizza,
  onRemovePanino,
  onDuplicatePanino,
  onValidateProducts,
}: {
  cart: DraftItem[];
  paninoCart: DraftPaninoItem[];
  draftSummary: ReturnType<typeof summarizeCashierDraft>;
  onRemovePizza: (index: number) => void;
  onDuplicatePizza: (index: number) => void;
  onRemovePanino: (index: number) => void;
  onDuplicatePanino: (index: number) => void;
  onValidateProducts: () => void;
}) {
  const cartEmpty = draftSummary.totalProducts === 0;

  return (
    <aside className="rounded-2xl border bg-card p-3 shadow-sm min-[900px]:sticky min-[900px]:top-[4.75rem] sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">Panier</h2>
          <CompactDraftSummary summary={draftSummary} />
        </div>
        <span className="rounded-full bg-primary px-3 py-1 text-sm font-black text-primary-foreground">
          {draftSummary.totalProducts}
        </span>
      </div>

      {cartEmpty ? (
        <div className="mt-3 rounded-xl border border-dashed bg-muted/35 px-3 py-8 text-center">
          <p className="text-sm font-semibold text-muted-foreground">Panier vide</p>
          <p className="mt-1 text-xs text-muted-foreground">Touchez un produit pour commencer.</p>
        </div>
      ) : (
        <ul className="mt-3 max-h-[46vh] space-y-2 overflow-auto pr-1">
          {cart.map((item, index) => (
            <li key={`pizza-${index}`} className="rounded-xl border bg-background p-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-bold">🍕 {item.pizza_name}</div>
                  <ProductDetails item={item} />
                </div>
                <QuantityControls
                  onDuplicate={() => onDuplicatePizza(index)}
                  onRemove={() => onRemovePizza(index)}
                />
              </div>
            </li>
          ))}
          {paninoCart.map((item, index) => (
            <li key={`panino-${index}`} className="rounded-xl border bg-background p-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-bold">
                    {paninoDisplayName(item.product_key, item.product_name)}
                  </div>
                  <PaninoDetails item={item} />
                </div>
                <QuantityControls
                  onDuplicate={() => onDuplicatePanino(index)}
                  onRemove={() => onRemovePanino(index)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button
        onClick={onValidateProducts}
        className="mt-3 h-14 w-full text-base font-black"
        disabled={cartEmpty}
      >
        Continuer
      </Button>
    </aside>
  );
}

function SlotChoiceStep({
  summary,
  slotOptions,
  selectedSlot,
  selectedSlotId,
  expandedSlotId,
  onBack,
  onSelect,
  onContinue,
  onToggleDetails,
}: {
  summary: ReturnType<typeof summarizeCashierDraft>;
  slotOptions: CashierSlotOption[];
  selectedSlot: CashierSlotOption | null;
  selectedSlotId: string | null;
  expandedSlotId: string | null;
  onBack: () => void;
  onSelect: (slot: CashierSlotOption) => void;
  onContinue: () => void;
  onToggleDetails: (slotId: string) => void;
}) {
  const recommendedSlots = slotOptions.filter((slot) => slot.recommended);
  const otherSlots = slotOptions.filter((slot) => !slot.recommended);
  const selectedSlotReason = selectedSlot ? slotShortReason(selectedSlot) : "";

  return (
    <section className="mx-auto max-w-5xl space-y-2 pb-28">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" className="h-10 px-2" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Retour
        </Button>
        <CompactDraftSummary summary={summary} />
      </div>

      {recommendedSlots.length > 0 && (
        <SlotGroup title="Créneaux recommandés">
          {recommendedSlots.map((slot) => (
            <SlotOptionCard
              key={slot.id}
              slot={slot}
              summary={summary}
              selected={selectedSlotId === slot.id}
              expanded={expandedSlotId === slot.id}
              onSelect={() => onSelect(slot)}
              onToggleDetails={() => onToggleDetails(slot.id)}
            />
          ))}
        </SlotGroup>
      )}

      {otherSlots.length > 0 && (
        <SlotGroup title={recommendedSlots.length > 0 ? "Autres créneaux" : "Créneaux"}>
          {otherSlots.map((slot) => (
            <SlotOptionCard
              key={slot.id}
              slot={slot}
              summary={summary}
              selected={selectedSlotId === slot.id}
              expanded={expandedSlotId === slot.id}
              onSelect={() => onSelect(slot)}
              onToggleDetails={() => onToggleDetails(slot.id)}
            />
          ))}
        </SlotGroup>
      )}

      {slotOptions.length === 0 && (
        <div className="rounded-2xl border border-dashed bg-card px-4 py-10 text-center text-muted-foreground">
          Aucun créneau calculable pour le moment.
        </div>
      )}

      {selectedSlot && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-black uppercase text-muted-foreground">
                Créneau sélectionné
              </div>
              <div className="truncate text-lg font-black">
                {selectedSlot.label} · {loadLabel(selectedSlot.level)} · {selectedSlotReason}
              </div>
            </div>
            <Button className="h-12 shrink-0 px-6 text-base font-black" onClick={onContinue}>
              Continuer →
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function SlotGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h1 className="px-1 text-lg font-black">{title}</h1>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </div>
  );
}

function SlotOptionCard({
  slot,
  summary,
  selected,
  expanded,
  onToggleDetails,
  onSelect,
}: {
  slot: CashierSlotOption;
  summary: ReturnType<typeof summarizeCashierDraft>;
  selected: boolean;
  expanded: boolean;
  onToggleDetails: () => void;
  onSelect: () => void;
}) {
  const tone = loadTone(slot.level);
  const decision = loadLabel(slot.level);
  const reason = slotShortReason(slot);
  const cartImpact = slotCartImpact(summary);
  const relevantOrders = slot.existingOrders.filter((order) => isOrderRelevantForSlot(order, slot));
  const marginText = slotMarginText(slot);
  const pickupPizzasAfterOrder = slot.pizza.planned + slot.pizza.added;
  const pickupRemainingAfterOrder = slot.pizza.remaining + slot.pizza.added;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`cursor-pointer rounded-2xl border p-3 shadow-sm transition active:scale-[0.99] ${
        selected ? "border-primary bg-primary/15 ring-2 ring-primary/25" : tone.card
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-3xl font-black leading-none">{slot.label}</div>
            {selected && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-black uppercase text-primary-foreground">
                Sélectionné
              </span>
            )}
          </div>
          <p className="mt-2 text-base font-black">{reason}</p>
          {cartImpact && (
            <p className="mt-0.5 text-sm font-bold text-muted-foreground">{cartImpact}</p>
          )}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-black uppercase ${tone.badge}`}>
          {decision}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleDetails();
          }}
          className="rounded-full border bg-background px-3 py-2 text-xs font-black text-muted-foreground active:scale-[0.98]"
        >
          {expanded ? "Masquer" : "Pourquoi ce conseil ?"}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 rounded-xl border bg-background p-2">
          <div className="rounded-lg border bg-card px-3 py-2 text-xs">
            <div className="mb-1 font-black uppercase text-muted-foreground">
              Pourquoi ce conseil ?
            </div>
            <div className="space-y-1 text-muted-foreground">
              {cartImpact && <DetailLine label="Panier ajouté" value={cartImpact} />}
              <DetailLine label="Conseil" value={reason} />
              {slot.pizza.added > 0 && (
                <>
                  <DetailLine
                    label="À remettre à cette heure"
                    value={`${pickupPizzasAfterOrder} pizza${pickupPizzasAfterOrder > 1 ? "s" : ""}`}
                  />
                  <DetailLine
                    label="Encore à produire"
                    value={`${pickupRemainingAfterOrder} pizza${pickupRemainingAfterOrder > 1 ? "s" : ""}`}
                  />
                </>
              )}
              {marginText && <DetailLine label="Marge cuisine" value={marginText} />}
            </div>
          </div>

          {slot.pizza.batches.length > 0 && (
            <div className="rounded-lg border bg-card px-3 py-2 text-xs">
              <div className="mb-1 font-black uppercase text-muted-foreground">
                Fournées projetées pertinentes
              </div>
              <div className="space-y-1">
                {slot.pizza.batches.map((batch) => (
                  <div key={batch.time.toISOString()} className="flex justify-between gap-2">
                    <span className="font-bold">{batch.label}</span>
                    <span className="text-muted-foreground">
                      {batch.existingPizzas} déjà · +{batch.draftPizzas} · {batch.totalPizzas}/
                      {batch.capacity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {relevantOrders.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted-foreground">
              Aucune commande proche directement liée à ce créneau.
            </p>
          ) : (
            relevantOrders.map((order) => (
              <div key={order.id} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">{order.customerName}</span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {formatTime(order.requestedTime)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {order.pizzaCount} pizza{order.pizzaCount > 1 ? "s" : ""}
                  {order.remainingPizzaCount !== order.pizzaCount &&
                    ` · ${order.remainingPizzaCount} restante${order.remainingPizzaCount > 1 ? "s" : ""}`}
                  {order.paninoCount > 0 && ` · ${order.paninoCount} Pani'NO`}
                  {order.fishCount > 0 && ` · ${order.fishCount} Fish & NO`}
                  {order.friesCount > 0 && ` · ${order.friesCount} frites`}
                  {order.grenaillesCount > 0 && ` · ${order.grenaillesCount} grenailles`}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </article>
  );
}

function ClientStep({
  summary,
  selectedSlot,
  customerName,
  customerPhone,
  submitting,
  onBack,
  onChangeProducts,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onSubmit,
}: {
  summary: ReturnType<typeof summarizeCashierDraft>;
  selectedSlot: CashierSlotOption | null;
  customerName: string;
  customerPhone: string;
  submitting: boolean;
  onBack: () => void;
  onChangeProducts: () => void;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="mx-auto max-w-3xl space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" className="h-10 px-2" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Retour
        </Button>
        <div className="text-right">
          <CompactDraftSummary summary={summary} />
          {selectedSlot && (
            <div className="text-xs font-bold text-muted-foreground">
              {selectedSlot.label} · {loadLabel(selectedSlot.level)} ·{" "}
              {slotShortReason(selectedSlot)}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="cashier-customer-name">Nom de la commande</Label>
            <Input
              id="cashier-customer-name"
              value={customerName}
              onChange={(event) => onCustomerNameChange(event.target.value)}
              placeholder="Ex : Martin"
              className="mt-1 h-14 text-lg font-bold"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="cashier-customer-phone">Numéro de téléphone (facultatif)</Label>
            <Input
              id="cashier-customer-phone"
              value={customerPhone}
              onChange={(event) => onCustomerPhoneChange(event.target.value)}
              placeholder="Ex : 06 12 34 56 78"
              inputMode="tel"
              className="mt-1 h-14 text-lg"
            />
            {customerPhone && (
              <p className="mt-1 text-xs text-muted-foreground">
                Enregistré comme {formatPhoneNumber(customerPhone)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" className="h-12" onClick={onChangeProducts}>
              Modifier les produits
            </Button>
          </div>
          <Button
            className="h-14 px-8 text-base font-black"
            onClick={onSubmit}
            disabled={!customerName.trim() || submitting || !selectedSlot}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Création…
              </>
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
                Créer la commande
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}

function CompactDraftSummary({ summary }: { summary: ReturnType<typeof summarizeCashierDraft> }) {
  const parts = [
    summary.pizzaCount > 0
      ? `${summary.pizzaCount} pizza${summary.pizzaCount > 1 ? "s" : ""}`
      : null,
    summary.paninoCount > 0 ? `${summary.paninoCount} Pani'NO` : null,
    summary.fishCount > 0 ? `${summary.fishCount} Fish & NO` : null,
    summary.friesCount + summary.grenaillesCount > 0
      ? `${summary.friesCount + summary.grenaillesCount} frite${summary.friesCount + summary.grenaillesCount > 1 ? "s" : ""}`
      : null,
  ].filter(Boolean);

  return (
    <div className="text-sm font-black text-foreground">
      {parts.length > 0 ? parts.join(" • ") : "Panier vide"}
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="font-semibold">{label}</span>
      <span className="text-right font-bold text-foreground">{value}</span>
    </div>
  );
}

function slotCartImpact(summary: ReturnType<typeof summarizeCashierDraft>) {
  const parts = [
    summary.pizzaCount > 0
      ? `+${summary.pizzaCount} pizza${summary.pizzaCount > 1 ? "s" : ""}`
      : null,
    summary.paninoCount > 0 ? `+${summary.paninoCount} Pani'NO` : null,
    summary.fishCount > 0 ? `+${summary.fishCount} Fish & NO` : null,
    summary.friesCount > 0
      ? `+${summary.friesCount} portion${summary.friesCount > 1 ? "s" : ""} de frites`
      : null,
    summary.grenaillesCount > 0
      ? `+${summary.grenaillesCount} portion${summary.grenaillesCount > 1 ? "s" : ""} de grenailles`
      : null,
  ].filter(Boolean);

  return parts.join(" · ");
}

function slotShortReason(slot: CashierSlotOption) {
  const warnings = normalizeForDecision(slot.warnings.join(" "));
  const completesBatch = slotCompletesBatch(slot);
  const highLoad = slot.level === "charge" || slot.level === "tendu";
  const kitchenPressure =
    warnings.includes("deja prevue") ||
    warnings.includes("creneau dense") ||
    warnings.includes("tres charge") ||
    (highLoad && !slot.fries.mixedLoad);

  if (warnings.includes("retard") || warnings.includes("fenetre")) return "Risque de retard";
  if (kitchenPressure) return "Cuisine déjà chargée";
  if (slot.fries.mixedLoad) return "Frites et grenailles à coordonner";
  if (slotHasLowMargin(slot) && !completesBatch) return "Marge faible";
  if (completesBatch) return "Complète bien une fournée";
  if (slot.pizza.added > 0 && slot.pizza.reserveAfterOrder >= TARGET_SPONTANEOUS_CAPACITY_RESERVE) {
    return "Encore de la marge";
  }
  if (slot.level === "calme") return "Créneau confortable";
  return "Possible sans surcharge";
}

function slotMarginText(slot: CashierSlotOption) {
  if (slot.pizza.added <= 0) return null;
  if (slotCompletesBatch(slot)) return "Fournée bien remplie";
  if (slot.pizza.reserveAfterOrder >= TARGET_SPONTANEOUS_CAPACITY_RESERVE) {
    return "Marge confortable";
  }
  if (slot.pizza.reserveAfterOrder > 0) return "Marge limitée";
  return "Marge faible";
}

function isOrderRelevantForSlot(
  order: CashierSlotOption["existingOrders"][number],
  slot: CashierSlotOption,
) {
  const orderTime = new Date(order.requestedTime);
  if (Number.isNaN(orderTime.getTime())) return false;

  const samePickupTime = formatTime(order.requestedTime) === slot.label;
  const closeToSlot = Math.abs(orderTime.getTime() - slot.time.getTime()) <= 12 * 60 * 1000;
  const hasLinkedSideLoad =
    order.paninoCount > 0 ||
    order.fishCount > 0 ||
    order.friesCount > 0 ||
    order.grenaillesCount > 0;

  return samePickupTime || (closeToSlot && hasLinkedSideLoad);
}

function slotCompletesBatch(slot: CashierSlotOption) {
  return slot.pizza.batches.some(
    (batch) =>
      batch.existingPizzas > 0 && batch.draftPizzas > 0 && batch.totalPizzas === batch.capacity,
  );
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

function QuantityControls({
  onDuplicate,
  onRemove,
}: {
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        size="icon"
        variant="outline"
        aria-label="Ajouter une unité"
        className="h-9 w-9"
        onClick={onDuplicate}
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        aria-label="Retirer une unité"
        className="h-9 w-9 text-destructive"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ProductDetails({ item }: { item: DraftItem }) {
  const base = getPizzaBaseInfoFromKey(item.base);

  return (
    <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
      {item.base && <div>Base : {base.label}</div>}
      {item.extras.length > 0 && (
        <div className="font-semibold text-secondary">+ {item.extras.join(", ")}</div>
      )}
      {item.removed.length > 0 && (
        <div className="font-semibold text-destructive">Sans {item.removed.join(", ")}</div>
      )}
      {item.cut_into && (
        <div className="font-semibold text-primary">À couper en {item.cut_into}</div>
      )}
    </div>
  );
}

function PaninoDetails({ item }: { item: DraftPaninoItem }) {
  return (
    <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
      {item.base && <div>Base : {item.base}</div>}
      {friesLabel(item.fries_mode) && (
        <div className="font-semibold text-primary">{friesLabel(item.fries_mode)}</div>
      )}
      {item.side && <div>Accompagnement : {item.side}</div>}
      {item.sauces.length > 0 && (
        <div>
          Sauces :{" "}
          {item.sauces.length === 2
            ? `moitié ${item.sauces[0]} / moitié ${item.sauces[1]}`
            : item.sauces[0]}
        </div>
      )}
      {item.extras.length > 0 && (
        <div className="font-semibold text-secondary">+ {item.extras.join(", ")}</div>
      )}
      {item.removed.length > 0 && (
        <div className="font-semibold text-destructive">Sans {item.removed.join(", ")}</div>
      )}
    </div>
  );
}

function loadTone(level: CashierLoadLevel) {
  if (level === "tendu") {
    return {
      card: "border-destructive/45 bg-destructive/10",
      badge: "bg-destructive text-white",
    };
  }
  if (level === "charge") {
    return {
      card: "border-primary/35 bg-primary/10",
      badge: "bg-primary text-primary-foreground",
    };
  }
  if (level === "actif") {
    return {
      card: "border-status-prepare/40 bg-status-prepare/10",
      badge: "bg-status-prepare text-white",
    };
  }
  return {
    card: "border-secondary/35 bg-secondary/10",
    badge: "bg-secondary text-white",
  };
}

function loadLabel(level: CashierLoadLevel) {
  if (level === "tendu") return "À éviter";
  if (level === "charge") return "Possible";
  if (level === "actif") return "Bon créneau";
  return "À proposer";
}

function slotSeverity(level: CashierLoadLevel) {
  if (level === "tendu") return 3;
  if (level === "charge") return 2;
  if (level === "actif") return 1;
  return 0;
}

function getPaninoCatalogTab(productKey: string): Exclude<CashierCatalogTab, "pizzas"> {
  if (productKey === "fishno") return "fishno";
  if (productKey === "cornet_frites") return "frites";
  return "panino";
}

function productDescription(productKey: string) {
  if (productKey === "panino") return "Pain Pani'NO, steak, sauces et options";
  if (productKey === "fishno") return "Poisson pané, accompagnement et sauces";
  if (productKey === "cornet_frites") return "Cornet de frites";
  return "Produit personnalisable";
}

function PizzaCustomizer({
  open,
  pizza,
  allIngredients,
  onClose,
  onAdd,
}: {
  open: boolean;
  pizza: Pizza | null;
  allIngredients: string[];
  onClose: () => void;
  onAdd: (item: DraftItem) => void;
}) {
  const defaultBase = pizza
    ? getDefaultPizzaBaseKey({ pizza_id: pizza.id, pizza_name: pizza.name }, [pizza])
    : "unknown";
  const selectableDefaultBase =
    defaultBase === "none" || defaultBase === "unknown" ? null : defaultBase;
  const [base, setBase] = useState<PizzaBaseKey | null>(selectableDefaultBase);
  const [extras, setExtras] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [cutInto, setCutInto] = useState<number | null>(null);

  useEffect(() => {
    setBase(selectableDefaultBase);
    setExtras([]);
    setRemoved([]);
    setCutInto(null);
  }, [pizza?.id, selectableDefaultBase]);

  if (!pizza) return null;

  const toggle = (arr: string[], setArr: (v: string[]) => void, v: string) =>
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">{pizza.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Section title="Base demandée">
            {PIZZA_BASE_OPTIONS.map((option) => (
              <Chip
                key={option.key}
                active={base === option.key}
                onClick={() => setBase(option.key)}
              >
                {option.label}
              </Chip>
            ))}
          </Section>
          <div>
            <div className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Minus className="h-4 w-4 text-destructive" /> Retirer
            </div>
            <div className="flex flex-wrap gap-2">
              {pizza.ingredients.map((ing) => (
                <button
                  key={ing}
                  onClick={() => toggle(removed, setRemoved, ing)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${removed.includes(ing) ? "border-destructive bg-destructive/10 text-destructive line-through" : "hover:bg-muted"}`}
                >
                  {ing}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Plus className="h-4 w-4 text-secondary" /> Suppléments
            </div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-auto">
              {allIngredients.map((ing) => (
                <button
                  key={ing}
                  onClick={() => toggle(extras, setExtras, ing)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${extras.includes(ing) ? "border-secondary bg-secondary/15 text-secondary font-semibold" : "hover:bg-muted"}`}
                >
                  + {ing}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold mb-2">À couper en</div>
            <div className="flex flex-wrap gap-2">
              {[4, 6, 8].map((n) => (
                <button
                  key={n}
                  onClick={() => setCutInto(cutInto === n ? null : n)}
                  className={`rounded-full border px-4 py-1.5 text-sm transition ${cutInto === n ? "border-primary bg-primary/15 text-primary font-semibold" : "hover:bg-muted"}`}
                >
                  {n} parts
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={() =>
              onAdd(
                buildPizzaDraftItem(
                  pizza,
                  base !== defaultBase ? base : null,
                  extras,
                  removed,
                  cutInto,
                ),
              )
            }
            className="h-11"
          >
            <Plus className="mr-2 h-4 w-4" /> Ajouter au panier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function defaultTime() {
  const d = new Date();
  const minutes = d.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 5) * 5;
  d.setMinutes(roundedMinutes, 0, 0);
  return toLocalInput(d);
}

function isMissingOrderItemBaseColumn(error: unknown) {
  const maybeError = error as { code?: string; message?: string; details?: string; hint?: string };
  const text = [maybeError.code, maybeError.message, maybeError.details, maybeError.hint]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("fr");

  return (
    text.includes("base") &&
    (text.includes("column") || text.includes("schema cache") || text.includes("pgrst204"))
  );
}

function buildPizzaDraftItem(
  pizza: Pizza,
  explicitBase: PizzaBaseKey | null,
  extras: string[],
  removed: string[],
  cutInto: number | null,
): DraftItem {
  const defaultBase = getDefaultPizzaBaseKey({ pizza_id: pizza.id, pizza_name: pizza.name }, [
    pizza,
  ]);
  const inference = inferRequestedBase({
    defaultBase,
    explicitBase,
    additions: extras,
    removals: removed,
  });

  return {
    pizza_id: pizza.id,
    pizza_name: pizza.name,
    base: inference.requestedBase,
    default_base_snapshot: inference.defaultBase,
    explicit_base_snapshot: explicitBase,
    base_resolution: inference.baseResolution,
    base_confidence: inference.baseConfidence,
    extras,
    removed,
    cut_into: cutInto,
  };
}

function toLocalInput(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
function isValidLocalTime(t: string): boolean {
  return /^\d{2}:\d{2}$/.test(t);
}
function parseLocalTime(t: string): Date {
  const [hh, mm] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(hh, mm, 0, 0);

  // Service du soir : une commande prise en soirée pour 00:15, 00:45 ou 01:00
  // correspond au lendemain, pas au matin déjà passé.
  const now = new Date();
  if (now.getHours() >= 12 && hh < 6 && d.getTime() < now.getTime()) {
    d.setDate(d.getDate() + 1);
  }

  return d;
}
function readDisabledPaninoKeys() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const stored = window.localStorage.getItem(LOCAL_CONTROL_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    return new Set<string>(
      Array.isArray(parsed.disabledPaninoKeys) ? parsed.disabledPaninoKeys : [],
    );
  } catch {
    return new Set<string>();
  }
}

function PaninoCustomizer({
  product,
  options,
  allIngredients,
  onClose,
  onAdd,
}: {
  product: PaninoProduct | null;
  options: PaninoOption[];
  allIngredients: string[];
  onClose: () => void;
  onAdd: (item: DraftPaninoItem) => void;
}) {
  const [base, setBase] = useState<string | null>(null);
  const [friesMode, setFriesMode] = useState<string | null>(null);
  const [side, setSide] = useState<string | null>(null);
  const [sauces, setSauces] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [extras, setExtras] = useState<string[]>([]);

  useEffect(() => {
    setBase(null);
    setFriesMode(null);
    setSide(null);
    setSauces([]);
    setRemoved([]);
    setExtras([]);
  }, [product?.id]);

  if (!product) return null;

  const opts = options.filter((o) => o.product_key === product.key);
  const byKind = (kind: string) =>
    opts.filter((o) => o.kind === kind).sort((a, b) => a.sort_order - b.sort_order);

  const bases = byKind("base");
  const friesModes = byKind("fries_mode");
  const sides = byKind("side");
  const saucesOpts = byKind("sauce");
  const removables = byKind("removable");
  const extrasOpts = byKind("extra");
  const sharedExtrasAllowed = product.key === "panino" || product.key === "fishno";
  const extraNames = Array.from(
    new Set(
      [...extrasOpts.map((option) => option.name), ...(sharedExtrasAllowed ? allIngredients : [])]
        .map((ingredient) => ingredient.trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));

  const toggleSauce = (name: string) => {
    setSauces((cur) => {
      if (cur.includes(name)) return cur.filter((s) => s !== name);
      if (cur.length >= 2) {
        toast.info("Maximum 2 sauces incluses");
        return cur;
      }
      return [...cur, name];
    });
  };
  const toggleIn = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const canSubmit =
    (bases.length === 0 || base !== null) &&
    (friesModes.length === 0 || friesMode !== null) &&
    (sides.length === 0 || side !== null);

  const handleAdd = () => {
    onAdd({
      product_key: product.key,
      product_name: product.name,
      base,
      fries_mode: friesMode,
      side,
      sauces,
      removed,
      extras,
    });
  };

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {bases.length > 0 && (
            <Section title="Base (obligatoire)">
              {bases.map((o) => (
                <Chip key={o.id} active={base === o.name} onClick={() => setBase(o.name)}>
                  {o.name}
                </Chip>
              ))}
            </Section>
          )}

          {friesModes.length > 0 && (
            <Section title="Service des frites (obligatoire)">
              {friesModes.map((o) => (
                <Chip key={o.id} active={friesMode === o.name} onClick={() => setFriesMode(o.name)}>
                  {o.name}
                </Chip>
              ))}
            </Section>
          )}

          {sides.length > 0 && (
            <Section title="Accompagnement (obligatoire)">
              {sides.map((o) => (
                <Chip key={o.id} active={side === o.name} onClick={() => setSide(o.name)}>
                  {o.name}
                </Chip>
              ))}
            </Section>
          )}

          {saucesOpts.length > 0 && (
            <Section title="Sauces (jusqu'à 2 — incluses, sans supplément)">
              {saucesOpts.map((o) => (
                <Chip
                  key={o.id}
                  active={sauces.includes(o.name)}
                  onClick={() => toggleSauce(o.name)}
                >
                  {o.name}
                </Chip>
              ))}
              {sauces.length === 2 && (
                <div className="w-full text-xs font-semibold text-primary mt-1">
                  MOITIÉ {sauces[0].toUpperCase()} / MOITIÉ {sauces[1].toUpperCase()}
                </div>
              )}
            </Section>
          )}

          {removables.length > 0 && (
            <Section title="Retirer" icon={<Minus className="h-4 w-4 text-destructive" />}>
              {removables.map((o) => (
                <button
                  key={o.id}
                  onClick={() => toggleIn(removed, setRemoved, o.name)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${removed.includes(o.name) ? "border-destructive bg-destructive/10 text-destructive line-through" : "hover:bg-muted"}`}
                >
                  {o.name}
                </button>
              ))}
            </Section>
          )}

          {extraNames.length > 0 && (
            <Section title="Suppléments" icon={<Plus className="h-4 w-4 text-secondary" />}>
              {extraNames.map((name) => (
                <button
                  key={name}
                  onClick={() => toggleIn(extras, setExtras, name)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${extras.includes(name) ? "border-secondary bg-secondary/15 text-secondary font-semibold" : "hover:bg-muted"}`}
                >
                  + {name}
                </button>
              ))}
            </Section>
          )}

          {bases.length === 0 &&
            friesModes.length === 0 &&
            sides.length === 0 &&
            saucesOpts.length === 0 &&
            removables.length === 0 &&
            extraNames.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                Produit simple — aucune option à configurer.
              </p>
            )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleAdd} disabled={!canSubmit} className="h-11">
            <Plus className="mr-2 h-4 w-4" /> Ajouter au panier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="text-sm font-semibold mb-2 flex items-center gap-2">
        {icon}
        {title}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition ${active ? "border-primary bg-primary/15 text-primary font-semibold" : "hover:bg-muted"}`}
    >
      {children}
    </button>
  );
}
