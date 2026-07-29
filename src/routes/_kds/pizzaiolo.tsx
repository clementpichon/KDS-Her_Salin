import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpDown,
  Clock,
  Fish,
  Flame,
  GripVertical,
  Minus,
  MoreVertical,
  RotateCcw,
  Sandwich,
  Send,
  Sparkles,
  Trash2,
  User,
  Utensils,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState, type DragEvent } from "react";
import { useOrders, usePaninoOrderItems, usePizzas, useSettings } from "@/hooks/use-kds-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { computeStock, formatTime } from "@/lib/scheduling";
import { logProductionEvent } from "@/lib/production-events";
import {
  buildPaninoItemsByOrder,
  buildPizzaioloQueue,
  type PizzaioloQueueJob,
} from "@/lib/pizzaiolo-queue";
import { buildSmartBatchPlan, type PlannedPizza } from "@/lib/pizzaiolo-batch-planner";
import {
  getPizzaBaseInfo,
  getPizzaDisplayDetails,
  pizzaProductionStatus,
  type PizzaDisplayDetails,
} from "@/lib/pizza-production";
import type { Order, OrderItem, Pizza } from "@/lib/kds-types";

export const Route = createFileRoute("/_kds/pizzaiolo")({
  head: () => ({
    meta: [
      { title: "Pizzaiolo — Plan de travail — Her Salin" },
      {
        name: "description",
        content:
          "Poste pizzaiolo Her Salin : plan de travail tactile, selection libre des pizzas et envoi par fournee.",
      },
      { property: "og:title", content: "Pizzaiolo — Plan de travail" },
      {
        property: "og:description",
        content: "Plan de travail tactile du pizzaiolo et file compacte des commandes.",
      },
    ],
    links: [{ rel: "canonical", href: "/pizzaiolo" }],
  }),
  component: Pizzaiolo,
});

type WorkbenchSlot = {
  id: number;
  item: OrderItem | null;
  job: PizzaioloQueueJob | null;
};

function createInitialSlots(): WorkbenchSlot[] {
  return [0, 1, 2, 3].map((id) => ({ id, item: null, job: null }));
}

function Pizzaiolo() {
  const { orders } = useOrders();
  const pizzas = usePizzas();
  const settings = useSettings();
  const { items: paninoItems } = usePaninoOrderItems();
  const stock = settings ? computeStock(orders, settings, paninoItems) : 0;
  const [slots, setSlots] = useState<WorkbenchSlot[]>(() => createInitialSlots());
  const [activeSlotId, setActiveSlotId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [reorderJobId, setReorderJobId] = useState<string | null>(null);
  const [dragJobId, setDragJobId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    jobId: string;
    placement: "before" | "after";
  } | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<PizzaioloQueueJob | null>(null);

  const paninoByOrder = useMemo(() => buildPaninoItemsByOrder(paninoItems), [paninoItems]);
  const list = useMemo(() => buildPizzaioloQueue(orders, paninoItems), [orders, paninoItems]);
  const selectedIds = useMemo(
    () => new Set(slots.flatMap((slot) => (slot.item ? [slot.item.id] : []))),
    [slots],
  );
  const selectedSlots = slots.filter((slot) => slot.item && slot.job);
  const freeCount = slots.filter((slot) => !slot.item).length;

  const suggestion = useMemo(
    () => buildSmartBatchPlan({ jobs: list, pizzas, selectedIds, capacity: freeCount }),
    [list, pizzas, selectedIds, freeCount],
  );

  const saveManualQueueOrder = async (orderedJobs: PizzaioloQueueJob[]) => {
    const updates = orderedJobs.flatMap((job, index) => {
      const position = (index + 1) * 1000;
      return job.orders.map((order) =>
        supabase.from("orders").update({ pizzaiolo_queue_position: position }).eq("id", order.id),
      );
    });

    const results = await Promise.all(updates);
    if (results.some((result) => result.error)) {
      toast.error("Impossible d'enregistrer le nouvel ordre");
      return false;
    }

    toast.success("Nouvel ordre enregistre");
    return true;
  };

  const reorderJob = async (
    sourceJobId: string,
    targetJobId: string,
    placement: "before" | "after",
  ) => {
    if (sourceJobId === targetJobId) return;
    const source = list.find((job) => job.id === sourceJobId);
    if (!source) return;

    const withoutSource = list.filter((job) => job.id !== sourceJobId);
    const insertionTargetIndex = withoutSource.findIndex((job) => job.id === targetJobId);
    if (insertionTargetIndex < 0) return;
    const insertAt = placement === "before" ? insertionTargetIndex : insertionTargetIndex + 1;
    const next = [...withoutSource];
    next.splice(Math.max(0, insertAt), 0, source);

    const saved = await saveManualQueueOrder(next);
    if (saved) {
      setReorderJobId(null);
      setDragJobId(null);
      setDropTarget(null);
    }
  };

  const cancelJob = async (job: PizzaioloQueueJob) => {
    const orderIds = job.orders.map((order) => order.id);
    const { error } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        pizzaiolo_queue_position: null,
      })
      .in("id", orderIds);

    if (error) {
      toast.error("Impossible de supprimer la commande");
      return;
    }

    void Promise.all(
      job.orders.map((order) =>
        logProductionEvent({
          settings,
          eventType: "ORDER_CANCELLED",
          station: "pizzaiolo",
          orderId: order.id,
          productType: "order",
          metadata: { source: "pizzaiolo_menu" },
        }),
      ),
    );

    setSlots((current) =>
      current.map((slot) => (slot.job?.id === job.id ? { ...slot, item: null, job: null } : slot)),
    );
    if (reorderJobId === job.id) setReorderJobId(null);
    setDeleteCandidate(null);
    toast.success("Commande retiree du KDS");
  };

  const startDrag = (event: DragEvent<HTMLElement>, jobId: string) => {
    if (reorderJobId !== jobId) {
      event.preventDefault();
      return;
    }
    event.stopPropagation();
    setDragJobId(jobId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", jobId);
  };

  const handleDrop = async (
    event: DragEvent<HTMLElement>,
    targetJobId: string,
    placement: "before" | "after",
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const sourceJobId = dragJobId ?? event.dataTransfer.getData("text/plain");
    if (!sourceJobId) return;
    await reorderJob(sourceJobId, targetJobId, placement);
  };

  const loseDough = async () => {
    if (!settings) return;
    await supabase
      .from("settings")
      .update({ paton_losses: settings.paton_losses + 1 })
      .eq("id", 1);
    toast("Paton retire du stock");
  };

  const clearSlot = (slotId: number) => {
    setSlots((current) =>
      current.map((slot) => (slot.id === slotId ? { ...slot, item: null, job: null } : slot)),
    );
  };

  const moveSlot = (slotId: number, direction: -1 | 1) => {
    const index = slots.findIndex((slot) => slot.id === slotId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= slots.length) return;
    setSlots((current) => {
      const next = [...current];
      const source = next[index];
      const target = next[nextIndex];
      next[index] = { ...source, item: target.item, job: target.job };
      next[nextIndex] = { ...target, item: source.item, job: source.job };
      return next;
    });
    setActiveSlotId(slots[nextIndex]?.id ?? null);
  };

  const selectPizza = (job: PizzaioloQueueJob, item: OrderItem) => {
    if (selectedIds.has(item.id)) {
      setSlots((current) =>
        current.map((slot) =>
          slot.item?.id === item.id ? { ...slot, item: null, job: null } : slot,
        ),
      );
      return;
    }

    const freeSlot = slots.find((slot) => !slot.item);
    const targetSlot =
      freeSlot ?? (activeSlotId !== null ? slots.find((slot) => slot.id === activeSlotId) : null);

    if (!targetSlot) {
      toast.warning(
        "Les 4 disques sont occupes. Liberez une place ou touchez le disque a remplacer.",
      );
      return;
    }

    if (targetSlot.item) toast("Pizza remplacee sur le plan de travail");
    setSlots((current) =>
      current.map((slot) => (slot.id === targetSlot.id ? { ...slot, item, job } : slot)),
    );
    setActiveSlotId(targetSlot.id);
  };

  const placePlannedPizzas = (planned: PlannedPizza[]) => {
    const openSlots = slots.filter((slot) => !slot.item);
    if (openSlots.length === 0) {
      toast.warning("Aucun disque libre");
      return;
    }

    setSlots((current) => {
      const next = current.map((slot) => ({ ...slot }));
      let cursor = 0;
      for (const slot of next) {
        if (slot.item) continue;
        const entry = planned[cursor];
        if (!entry) break;
        slot.item = entry.item;
        slot.job = entry.job;
        cursor += 1;
      }
      return next;
    });
  };

  const selectWholeJob = (job: PizzaioloQueueJob) => {
    const available = job.items.filter((item) => !selectedIds.has(item.id));
    if (available.length === 0) return;
    const openSlots = slots.filter((slot) => !slot.item);
    if (openSlots.length === 0) {
      toast.warning("Aucun disque libre pour ajouter cette commande");
      return;
    }

    const plan = buildSmartBatchPlan({
      jobs: list,
      pizzas,
      selectedIds,
      capacity: openSlots.length,
      preferredJobId: job.id,
    });
    if (plan.items.length === 0) return;

    placePlannedPizzas(plan.items);

    const selectedFromJob = plan.items.filter((entry) => entry.job.id === job.id).length;
    if (available.length > selectedFromJob) {
      toast.warning(
        `${available.length - selectedFromJob} pizza(s) restent pour une prochaine fournee`,
      );
    } else if (plan.fillCount > 0) {
      toast.success(
        `Commande ajoutee et fournee completee avec ${plan.fillCount} pizza(s) suivante(s)`,
      );
    } else {
      toast.success("Commande ajoutee au plan de travail");
    }
  };

  const applySuggestion = () => {
    if (suggestion.items.length === 0) return;
    placePlannedPizzas(suggestion.items);
    toast.success("Suggestion placee sur le plan de travail");
  };

  const sendWorkbenchToOven = async () => {
    const batchSlots = slots.filter(
      (slot): slot is WorkbenchSlot & { item: OrderItem; job: PizzaioloQueueJob } =>
        !!slot.item && !!slot.job,
    );
    if (batchSlots.length === 0 || busy) return;

    setBusy(true);
    const now = new Date().toISOString();
    const batchId = createBatchId();
    const selectedItemIds = batchSlots.map((slot) => slot.item.id);
    const affectedOrders = uniqueOrders(batchSlots.flatMap((slot) => slot.job.orders));

    const { error: itemsError } = await supabase
      .from("order_items")
      .update({
        production_status: "in_oven",
        oven_batch_id: batchId,
        sent_to_oven_at: now,
        prepared: false,
      })
      .in("id", selectedItemIds);

    if (itemsError) {
      toast.error(
        itemsError.message.includes("production_status")
          ? "Migration Supabase manquante : appliquez la migration des pizzas individuelles."
          : "Impossible d'envoyer la fournee au four",
      );
      setBusy(false);
      return;
    }

    const completeOrderIds: string[] = [];
    const partialOrderIds: string[] = [];
    for (const order of affectedOrders) {
      const remainingToPrepare = (order.items ?? []).some(
        (item) =>
          !selectedItemIds.includes(item.id) && pizzaProductionStatus(item, order) === "to_prepare",
      );
      if (remainingToPrepare) partialOrderIds.push(order.id);
      else completeOrderIds.push(order.id);
    }

    const orderUpdates = [];
    if (completeOrderIds.length > 0) {
      orderUpdates.push(
        supabase
          .from("orders")
          .update({ status: "in_oven", pizzaiolo_queue_position: null })
          .in("id", completeOrderIds),
      );
    }
    if (partialOrderIds.length > 0) {
      orderUpdates.push(
        supabase.from("orders").update({ status: "to_prepare" }).in("id", partialOrderIds),
      );
    }

    const orderResults = await Promise.all(orderUpdates);
    if (orderResults.some((result) => result.error)) {
      toast.warning("Fournee envoyee, mais certaines commandes n'ont pas ete synchronisees");
    }

    void Promise.all(
      batchSlots.map((slot) =>
        logProductionEvent({
          settings,
          eventType: "PIZZA_SENT_TO_OVEN",
          station: "pizzaiolo",
          orderId: slot.item.order_id,
          orderItemId: slot.item.id,
          productType: "pizza",
          productName: slot.item.pizza_name,
          metadata: {
            batch_id: batchId,
            workbench_slot: slot.id + 1,
            base: getPizzaBaseInfo(slot.item, pizzas).label,
            split_order: partialOrderIds.includes(slot.item.order_id),
          },
        }),
      ),
    );

    setSlots(createInitialSlots());
    setActiveSlotId(null);
    setBusy(false);
    toast.success(`${batchSlots.length} pizza(s) envoyee(s) au four`);
  };

  const sendBreadToOven = async (job: PizzaioloQueueJob) => {
    const breadOrderIds = job.orders
      .filter((order) => {
        const orderBreadCount = (paninoByOrder.get(order.id) ?? []).filter(
          (item) => item.product_key === "panino",
        ).length;
        return (
          orderBreadCount > 0 &&
          (!order.pains_panino_status || order.pains_panino_status === "a_preparer")
        );
      })
      .map((order) => order.id);

    if (breadOrderIds.length === 0) return;
    const { error } = await supabase
      .from("orders")
      .update({ pains_panino_status: "en_cours" })
      .in("id", breadOrderIds);

    if (error) {
      toast.error("Impossible d'envoyer les pains au four");
      return;
    }

    void Promise.all(
      breadOrderIds.flatMap((orderId) => [
        logProductionEvent({
          settings,
          eventType: "PANINO_BREAD_PREP_STARTED",
          station: "pizzaiolo",
          orderId,
          productType: "panino_bread",
          productName: "Pain Pani'NO",
        }),
        logProductionEvent({
          settings,
          eventType: "PANINO_BREAD_SENT_TO_OVEN",
          station: "pizzaiolo",
          orderId,
          productType: "panino_bread",
          productName: "Pain Pani'NO",
        }),
      ]),
    );
    toast.success("Pain(s) Pani'NO envoyes au four");
  };

  return (
    <div className="p-2 min-[900px]:p-3 lg:p-4">
      <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border bg-card p-2.5 shadow-sm lg:p-4">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-black lg:text-xl">
            <Flame className="text-status-prepare" />
            Pizzaiolo
          </h1>
          <p className="text-xs font-semibold text-muted-foreground lg:text-sm">
            Plan de travail tactile · {list.length} commande(s) disponibles
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase text-muted-foreground">Patons</div>
            <div
              className={`text-xl font-bold ${stock < 20 ? "text-destructive" : "text-secondary"}`}
            >
              {stock}
            </div>
          </div>
          <Button variant="outline" onClick={loseDough} className="h-10 lg:h-11">
            <Minus className="mr-1 h-4 w-4" />1 paton
          </Button>
        </div>
      </div>

      <div className="grid gap-3 min-[900px]:grid-cols-[minmax(0,2.2fr)_minmax(300px,1fr)] min-[900px]:items-start min-[900px]:gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(21rem,3fr)]">
        <section className="min-[900px]:sticky min-[900px]:top-20 min-[900px]:self-start xl:top-24">
          <div className="rounded-3xl border bg-card p-3 shadow-sm xl:p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3 lg:mb-4">
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-primary">
                  Plan de travail
                </div>
                <h2 className="text-xl font-black xl:text-2xl">4 disques de preparation</h2>
                <p className="text-xs font-semibold text-muted-foreground lg:text-sm">
                  Touchez une pizza a droite pour la poser sur le premier disque libre.
                </p>
              </div>
              <Button
                onClick={sendWorkbenchToOven}
                disabled={busy || selectedSlots.length === 0}
                className="h-10 min-w-40 bg-status-oven text-sm font-black hover:bg-status-oven/90 lg:h-12 lg:min-w-44 lg:text-base"
              >
                <Send className="mr-2 h-5 w-5" />
                {busy ? "Envoi..." : "Envoyer au four"}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:gap-5">
              {slots.map((slot) => (
                <WorkbenchDisc
                  key={slot.id}
                  slot={slot}
                  active={activeSlotId === slot.id}
                  details={slot.item ? getPizzaDisplayDetails(slot.item, pizzas) : null}
                  onSelect={() => setActiveSlotId(slot.id)}
                  onClear={() => clearSlot(slot.id)}
                  onMoveLeft={() => moveSlot(slot.id, -1)}
                  onMoveRight={() => moveSlot(slot.id, 1)}
                />
              ))}
            </div>

            <div className="mt-3 grid gap-3 min-[900px]:grid-cols-[1fr_auto] lg:mt-4">
              <div className="rounded-2xl border bg-background p-2.5 lg:p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-black">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Suggestion intelligente
                </div>
                {suggestion.items.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-black ${suggestion.base.badgeClassName}`}
                    >
                      Base {suggestion.base.label}
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-black ${
                        suggestion.isFull
                          ? "bg-status-ready/15 text-status-ready"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {suggestion.items.length}/{freeCount} disques
                    </span>
                    <span className="font-semibold text-muted-foreground">{suggestion.label}</span>
                    {suggestion.fillCount > 0 && (
                      <span className="text-xs font-bold text-primary">
                        + {suggestion.fillCount} pizza{suggestion.fillCount > 1 ? "s" : ""} commande
                        suivante
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-muted-foreground">
                    Aucune suggestion disponible.
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={applySuggestion}
                disabled={suggestion.items.length === 0}
                className="h-full min-h-11 font-black lg:min-h-14"
              >
                Appliquer
              </Button>
            </div>

            {selectedSlots.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSlots(createInitialSlots());
                  setActiveSlotId(null);
                }}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
              >
                <RotateCcw className="h-4 w-4" />
                Vider le plan de travail
              </button>
            )}
          </div>
        </section>

        <aside className="min-h-0 min-[900px]:sticky min-[900px]:top-20 min-[900px]:self-start xl:top-24">
          <div className="rounded-3xl border bg-card p-3 shadow-sm min-[900px]:rounded-2xl">
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <div>
                <h2 className="text-lg font-black">Commandes</h2>
                <p className="text-xs font-semibold text-muted-foreground">
                  Selection libre des pizzas
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">
                {list.length}
              </span>
            </div>

            {reorderJobId && (
              <div className="mb-3 rounded-2xl border-2 border-primary/40 bg-primary/10 p-3 text-xs font-bold text-primary">
                Mode reorganisation actif. Glissez avec la poignee ou touchez une zone de depot.
              </div>
            )}

            {list.length === 0 ? (
              <EmptyState text="Aucune pizza a preparer" />
            ) : (
              <div className="max-h-[calc(100dvh-12rem)] space-y-2 overflow-y-auto pr-1 min-[900px]:max-h-[calc(100dvh-11rem)]">
                {list.map((job) => (
                  <CompactOrderCard
                    key={job.id}
                    job={job}
                    pizzas={pizzas}
                    selectedIds={selectedIds}
                    reorderJobId={reorderJobId}
                    dragJobId={dragJobId}
                    dropTarget={dropTarget}
                    onSelectPizza={selectPizza}
                    onSelectWholeJob={selectWholeJob}
                    onStartReorder={(jobId) => {
                      setReorderJobId(jobId);
                      toast("Mode reorganisation active");
                    }}
                    onCancelReorder={() => {
                      setReorderJobId(null);
                      setDragJobId(null);
                      setDropTarget(null);
                    }}
                    onDelete={() => setDeleteCandidate(job)}
                    onSendBread={() => sendBreadToOven(job)}
                    onDragStart={startDrag}
                    onDragEnd={() => {
                      setDragJobId(null);
                      setDropTarget(null);
                    }}
                    onDrop={handleDrop}
                    onDragOver={(jobId, placement) => setDropTarget({ jobId, placement })}
                    onDropZoneClick={(targetJobId, placement) => {
                      if (reorderJobId) void reorderJob(reorderJobId, targetJobId, placement);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      <AlertDialog
        open={!!deleteCandidate}
        onOpenChange={(open) => {
          if (!open) setDeleteCandidate(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette commande ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCandidate
                ? `Confirmer la suppression de la commande ${deleteCandidate.orders.length > 1 ? `groupee de ${deleteCandidate.customer_name}` : `n°${deleteCandidate.orders[0]?.id.slice(0, 8)}`} ? Cette action la retirera de tous les postes du KDS.`
                : "Cette action retirera la commande de tous les postes du KDS."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteCandidate) void cancelJob(deleteCandidate);
              }}
            >
              Supprimer la commande
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function WorkbenchDisc({
  slot,
  active,
  details,
  onSelect,
  onClear,
  onMoveLeft,
  onMoveRight,
}: {
  slot: WorkbenchSlot;
  active: boolean;
  details: PizzaDisplayDetails | null;
  onSelect: () => void;
  onClear: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}) {
  const filled = !!slot.item && !!slot.job;

  return (
    <div className="flex flex-col items-center gap-1.5 xl:gap-2">
      <button
        type="button"
        onClick={onSelect}
        className={`relative flex aspect-square w-full max-w-[18rem] flex-col items-center justify-center rounded-full border-[5px] bg-background p-3 text-center shadow-inner transition min-[900px]:max-w-[13.5rem] min-[1100px]:max-w-[15.5rem] xl:max-w-[18rem] xl:border-[6px] xl:p-5 ${
          filled
            ? (details?.base.ringClassName ?? "border-primary/50")
            : "border-dashed border-muted-foreground/35"
        } ${active ? "ring-4 ring-primary/30" : "hover:ring-4 hover:ring-primary/10"}`}
        aria-label={
          filled ? `Disque ${slot.id + 1}, ${slot.item?.pizza_name}` : `Disque ${slot.id + 1} vide`
        }
      >
        <span className="absolute left-3 top-3 rounded-full bg-muted px-2 py-1 text-[11px] font-black text-muted-foreground xl:left-4 xl:top-4 xl:text-xs">
          {slot.id + 1}
        </span>
        {filled ? (
          <>
            <div className="text-lg font-black leading-tight min-[900px]:text-xl xl:text-2xl">
              {slot.job.customer_name}
            </div>
            <div className="mt-1 text-base font-black leading-tight text-primary min-[900px]:text-lg xl:text-xl">
              {slot.item.pizza_name}
            </div>
            {details && (
              <span
                className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black uppercase xl:mt-3 xl:text-[11px] ${details.base.badgeClassName}`}
              >
                <span className={`h-2 w-2 rounded-full ${details.base.dotClassName}`} />
                {details.base.label}
              </span>
            )}
            {details &&
              (details.extras.length > 0 || details.removed.length > 0 || slot.item.cut_into) && (
                <div className="mt-1 max-w-full text-[11px] font-semibold text-muted-foreground xl:mt-2 xl:text-xs">
                  {details.extras.length > 0 && (
                    <div className="truncate text-secondary">+ {details.extras.join(", ")}</div>
                  )}
                  {details.removed.length > 0 && (
                    <div className="truncate text-destructive">
                      Sans {details.removed.join(", ")}
                    </div>
                  )}
                  {slot.item.cut_into && (
                    <div className="font-black text-primary">A couper en {slot.item.cut_into}</div>
                  )}
                </div>
              )}
          </>
        ) : (
          <span className="text-xs font-black uppercase tracking-wide text-muted-foreground/70 lg:text-sm">
            Disque vide
          </span>
        )}
      </button>

      {filled && (
        <div className="flex flex-wrap justify-center gap-1.5">
          <button
            type="button"
            onClick={onMoveLeft}
            className="rounded-lg border px-2 py-1 text-xs font-black hover:bg-accent"
          >
            ←
          </button>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-black text-destructive hover:bg-destructive/10"
          >
            <X className="h-3.5 w-3.5" />
            Retirer
          </button>
          <button
            type="button"
            onClick={onMoveRight}
            className="rounded-lg border px-2 py-1 text-xs font-black hover:bg-accent"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}

function CompactOrderCard({
  job,
  pizzas,
  selectedIds,
  reorderJobId,
  dragJobId,
  dropTarget,
  onSelectPizza,
  onSelectWholeJob,
  onStartReorder,
  onCancelReorder,
  onDelete,
  onSendBread,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
  onDropZoneClick,
}: {
  job: PizzaioloQueueJob;
  pizzas: Pizza[];
  selectedIds: Set<string>;
  reorderJobId: string | null;
  dragJobId: string | null;
  dropTarget: { jobId: string; placement: "before" | "after" } | null;
  onSelectPizza: (job: PizzaioloQueueJob, item: OrderItem) => void;
  onSelectWholeJob: (job: PizzaioloQueueJob) => void;
  onStartReorder: (jobId: string) => void;
  onCancelReorder: () => void;
  onDelete: () => void;
  onSendBread: () => void;
  onDragStart: (event: DragEvent<HTMLElement>, jobId: string) => void;
  onDragEnd: () => void;
  onDrop: (
    event: DragEvent<HTMLElement>,
    targetJobId: string,
    placement: "before" | "after",
  ) => void;
  onDragOver: (jobId: string, placement: "before" | "after") => void;
  onDropZoneClick: (targetJobId: string, placement: "before" | "after") => void;
}) {
  const isReordering = reorderJobId === job.id;
  const isDragging = dragJobId === job.id;
  const paninos = job.paninos;
  const breadCount = paninos.filter((item) => item.product_key === "panino").length;
  const fishCount = paninos.filter((item) => item.product_key === "fishno").length;
  const friesCount = paninos.filter((item) => item.product_key === "cornet_frites").length;
  const selectedPizzaCount = job.items.filter((item) => selectedIds.has(item.id)).length;
  const allPizzasSelected = job.items.length > 0 && selectedPizzaCount === job.items.length;
  const selectionLabel =
    selectedPizzaCount === 0
      ? null
      : allPizzasSelected
        ? "Commande sélectionnée"
        : `${selectedPizzaCount}/${job.items.length} sélectionnée`;
  const pendingBread = job.orders.some((order) => {
    const orderBreadCount = paninos.filter(
      (item) => item.order_id === order.id && item.product_key === "panino",
    ).length;
    return (
      orderBreadCount > 0 &&
      (!order.pains_panino_status || order.pains_panino_status === "a_preparer")
    );
  });

  return (
    <div className={reorderJobId ? "space-y-2" : ""}>
      <QueueDropZone
        active={!!reorderJobId && reorderJobId !== job.id}
        highlighted={dropTarget?.jobId === job.id && dropTarget.placement === "before"}
        label={`Deposer avant ${job.customer_name}`}
        onDragOver={(event) => {
          event.preventDefault();
          onDragOver(job.id, "before");
        }}
        onDrop={(event) => onDrop(event, job.id, "before")}
        onClick={() => onDropZoneClick(job.id, "before")}
      />

      <article
        draggable={isReordering}
        onDragStart={(event) => onDragStart(event, job.id)}
        onDragEnd={onDragEnd}
        className={`rounded-2xl border bg-background p-3 shadow-sm transition ${
          isReordering ? "ring-4 ring-primary/40" : ""
        } ${isDragging ? "opacity-50" : ""}`}
      >
        <header className="mb-2 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 text-base font-black">
              <User className="h-4 w-4 shrink-0" />
              <span className="truncate">{job.customer_name}</span>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {isReordering && (
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => onDragStart(event, job.id)}
                  className="rounded-full bg-primary/15 p-2 text-primary"
                  aria-label="Poignee pour deplacer la commande"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded-full bg-muted p-2 text-muted-foreground hover:bg-muted/80"
                    aria-label="Menu de la commande"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem
                    onSelect={() => (isReordering ? onCancelReorder() : onStartReorder(job.id))}
                  >
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    {isReordering ? "Terminer la reorganisation" : "Reorganiser la commande"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={onDelete}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer la commande
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatTime(job.requested_time)}
              {job.orders.length > 1 && <span>· {job.orders.length} tickets</span>}
              {selectionLabel && (
                <span
                  className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                    allPizzasSelected
                      ? "bg-primary/15 text-primary"
                      : "bg-status-oven/10 text-status-oven"
                  }`}
                >
                  {selectionLabel}
                </span>
              )}
            </div>
            {job.items.length > 0 && (
              <Button
                type="button"
                variant={selectedPizzaCount > 0 ? "secondary" : "default"}
                size="sm"
                onClick={() => onSelectWholeJob(job)}
                disabled={allPizzasSelected}
                className="h-8 px-2 text-xs font-black"
              >
                Tout sélectionner
              </Button>
            )}
          </div>
        </header>

        {job.items.length > 0 && (
          <ul className="space-y-1.5">
            {job.items.map((item) => {
              const selected = selectedIds.has(item.id);
              const details = getPizzaDisplayDetails(item, pizzas);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelectPizza(job, item)}
                    className={`w-full rounded-xl border px-2.5 py-2 text-left transition ${
                      selected
                        ? "border-primary bg-primary/10"
                        : "bg-card hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 ${selected ? "border-primary bg-primary" : "border-muted-foreground/40"}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-black leading-tight">{item.pizza_name}</span>
                          <span
                            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-black uppercase ${details.base.badgeClassName}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${details.base.dotClassName}`}
                            />
                            {details.base.label}
                          </span>
                        </div>
                        {details.extras.length > 0 && (
                          <div className="truncate text-xs font-semibold text-secondary">
                            + {details.extras.join(", ")}
                          </div>
                        )}
                        {details.removed.length > 0 && (
                          <div className="truncate text-xs font-semibold text-destructive">
                            Sans {details.removed.join(", ")}
                          </div>
                        )}
                        {item.cut_into && (
                          <div className="text-xs font-black text-primary">
                            A couper en {item.cut_into}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {(breadCount > 0 || fishCount > 0 || friesCount > 0) && (
          <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 px-2.5 py-2 text-xs font-bold text-primary">
            <div className="flex flex-wrap gap-2">
              {breadCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Sandwich className="h-3.5 w-3.5" />
                  {breadCount} pain{breadCount > 1 ? "s" : ""}
                </span>
              )}
              {fishCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Fish className="h-3.5 w-3.5" />
                  {fishCount} Fish
                </span>
              )}
              {friesCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Utensils className="h-3.5 w-3.5" />
                  {friesCount} frites
                </span>
              )}
            </div>
            {pendingBread && (
              <button
                type="button"
                onClick={onSendBread}
                className="mt-2 rounded-lg bg-primary px-2 py-1 text-[11px] font-black text-primary-foreground"
              >
                Pain Pani'NO au four
              </button>
            )}
          </div>
        )}
      </article>

      <QueueDropZone
        active={!!reorderJobId && reorderJobId !== job.id}
        highlighted={dropTarget?.jobId === job.id && dropTarget.placement === "after"}
        label={`Deposer apres ${job.customer_name}`}
        onDragOver={(event) => {
          event.preventDefault();
          onDragOver(job.id, "after");
        }}
        onDrop={(event) => onDrop(event, job.id, "after")}
        onClick={() => onDropZoneClick(job.id, "after")}
      />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed p-8 text-center text-sm font-semibold text-muted-foreground">
      {text}
    </div>
  );
}

function QueueDropZone({
  active,
  highlighted,
  label,
  onDragOver,
  onDrop,
  onClick,
}: {
  active: boolean;
  highlighted: boolean;
  label: string;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onClick: () => void;
}) {
  if (!active) return null;

  return (
    <div
      role="button"
      tabIndex={-1}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`flex min-h-12 items-center justify-center rounded-xl border-2 border-dashed text-xs font-black uppercase transition ${
        highlighted
          ? "border-primary bg-primary/15 text-primary"
          : "border-muted-foreground/30 bg-muted/40 text-muted-foreground"
      }`}
    >
      {label}
    </div>
  );
}

function uniqueOrders(orders: Order[]) {
  const byId = new Map<string, Order>();
  for (const order of orders) byId.set(order.id, order);
  return Array.from(byId.values());
}

function createBatchId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `00000000-0000-4000-8000-${Date.now().toString().padStart(12, "0").slice(-12)}`;
}
