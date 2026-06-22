import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Package,
  Sliders,
  Carrot,
  Pizza as PizzaIcon,
  Store,
  Monitor,
  Bell,
  ShieldAlert,
  KeyRound,
  Sandwich,
  Zap,
} from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useSettings, useOrders, useIngredients, usePaninoOrderItems } from "@/hooks/use-kds-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { KDS_AUTH_KEY, resetKdsPassword, updateKdsPassword, verifyKdsCredentials } from "@/lib/kds-auth";
import { computeStock } from "@/lib/scheduling";
import type { Settings, Pizza, Ingredient, PaninoProduct, SystemMode } from "@/lib/kds-types";


type SettingsForm = Omit<Settings, "id" | "paton_losses">;

const SHARED_INGREDIENT_PRODUCT_KEYS = ["panino", "fishno"];
const BASE_PIZZAIOLO_PREP_TIME_SEC = 120;

type LocalControlSettings = {
  serviceOpen: boolean;
  testMode: boolean;
  compactKitchen: boolean;
  highContrast: boolean;
  soundNewOrder: boolean;
  soundLateOrder: boolean;
  lockStations: boolean;
  stockWarningThreshold: number;
  lateWarningMinutes: number;
  disabledPaninoKeys: string[];
};

const LOCAL_CONTROL_KEY = "hersalin_control_settings_v1";
const DEFAULT_LOCAL_CONTROL: LocalControlSettings = {
  serviceOpen: true,
  testMode: false,
  compactKitchen: true,
  highContrast: false,
  soundNewOrder: true,
  soundLateOrder: true,
  lockStations: false,
  stockWarningThreshold: 20,
  lateWarningMinutes: 5,
  disabledPaninoKeys: [],
};

export const Route = createFileRoute("/_kds/reglages")({
  head: () => ({
    meta: [
      { title: "Réglages — Her Salin" },
      { name: "description", content: "Réglages Her Salin : stock initial de pâtons, capacité du four, temps de cuisson et reset de journée." },
      { property: "og:title", content: "Réglages du système" },
      { property: "og:description", content: "Stock pâtons, paramètres de production et reset journée." },
    ],
    links: [{ rel: "canonical", href: "/reglages" }],
  }),
  component: Reglages,
});

function Reglages() {
  const settings = useSettings();
  const { orders } = useOrders();
  const { items: paninoItems } = usePaninoOrderItems();
  const [localSettings, setLocalSettings] = useLocalControlSettings();
  const [form, setForm] = useState<Partial<SettingsForm>>({});
  const [resetCode, setResetCode] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  useEffect(() => {
    if (settings)
      setForm({
        oven_capacity: settings.oven_capacity,
        cook_time_sec: settings.cook_time_sec,
        prep_time_per_pizza_sec: settings.prep_time_per_pizza_sec,
        boxing_time_sec: settings.boxing_time_sec,
        safety_margin_sec: settings.safety_margin_sec,
        batch_interval_sec: settings.batch_interval_sec,
        initial_paton_stock: settings.initial_paton_stock,
        system_mode: settings.system_mode,
      });
  }, [settings]);

  if (!settings) return <div className="p-8">Chargement…</div>;

  const stock = computeStock(orders, settings, paninoItems);
  const activeOrders = orders.filter((order) => order.status !== "delivered");
  const pendingPizzaCount = activeOrders.reduce((total, order) => total + (order.items?.length ?? 0), 0);
  const pendingPaninoCount = paninoItems.filter((item) => item.status !== "done").length;
  const pizzaioloPace = prepTimeToPacePercent(form.prep_time_per_pizza_sec);

  const save = async () => {
    const { error } = await supabase.from("settings").update(form).eq("id", 1);
    if (error && isMissingSystemModeColumn(error.message)) {
      const legacyForm = { ...form };
      delete legacyForm.system_mode;
      if (Object.keys(legacyForm).length > 0) {
        const { error: legacyError } = await supabase.from("settings").update(legacyForm).eq("id", 1);
        if (legacyError) return toast.error("Erreur");
      }
      toast.warning("Réglages enregistrés, mais la migration du mode système doit être appliquée dans Supabase.");
      return;
    }
    if (error) return toast.error("Erreur");
    toast.success("Réglages enregistrés");
  };

  const resetDay = async () => {
    if (resetCode.trim().toUpperCase() !== "RESET") {
      toast.error("Tapez RESET pour confirmer la réinitialisation");
      return;
    }
    const { data: ordersToDelete } = await supabase.from("orders").select("id");
    const ids = (ordersToDelete ?? []).map((o) => o.id);
    if (ids.length > 0) {
      await supabase.from("order_items").delete().in("order_id", ids);
      await supabase.from("panino_order_items").delete().in("order_id", ids);
      await supabase.from("orders").delete().in("id", ids);
    }
    await supabase.from("settings").update({ paton_losses: 0 }).eq("id", 1);
    setResetCode("");
    toast.success("Journée réinitialisée — stock pâtons complet");
  };

  const savePassword = () => {
    const current = passwordForm.current;
    const next = passwordForm.next;
    const confirm = passwordForm.confirm;

    if (!current || !next || !confirm) {
      toast.error("Remplissez les 3 champs mot de passe");
      return;
    }
    if (!verifyKdsCredentials("Her Salin", current)) {
      toast.error("Mot de passe actuel incorrect");
      return;
    }
    if (next.length < 8) {
      toast.error("Le nouveau mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (next !== confirm) {
      toast.error("La confirmation ne correspond pas");
      return;
    }

    updateKdsPassword(next);
    try {
      window.localStorage.removeItem(KDS_AUTH_KEY);
    } catch {}
    setPasswordForm({ current: "", next: "", confirm: "" });
    toast.success("Mot de passe modifié — reconnectez-vous avec le nouveau mot de passe");
  };

  const resetPassword = () => {
    if (!window.confirm("Restaurer le mot de passe initial du KDS sur cette tablette ?")) return;
    resetKdsPassword();
    try {
      window.localStorage.removeItem(KDS_AUTH_KEY);
    } catch {}
    setPasswordForm({ current: "", next: "", confirm: "" });
    toast.success("Mot de passe initial restauré");
  };


  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8 space-y-4">
      <h1 className="text-2xl md:text-3xl font-bold">Réglages du système</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Commandes" value={activeOrders.length} />
        <Stat label="Pizzas actives" value={pendingPizzaCount} />
        <Stat label="Pani'NO actifs" value={pendingPaninoCount} />
      </div>
      <Accordion type="single" collapsible className="space-y-3">
        <AccordionItem value="service" className="rounded-2xl border bg-card shadow-sm px-4 border-b">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-3"><Store className="h-5 w-5 text-primary" /><span className="text-lg font-bold">Service</span></span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <SystemModeSelector
                value={(form.system_mode ?? settings.system_mode) as SystemMode}
                onChange={(system_mode) => setForm({ ...form, system_mode })}
              />
              <ToggleRow
                label="Service ouvert"
                description="Indicateur de pilotage pour savoir si la prise de commande doit rester active."
                checked={localSettings.serviceOpen}
                onCheckedChange={(serviceOpen) => setLocalSettings({ ...localSettings, serviceOpen })}
              />
              <ToggleRow
                label="Verrouiller les postes"
                description="Préférence locale pour garder chaque tablette sur son poste pendant le service."
                checked={localSettings.lockStations}
                onCheckedChange={(lockStations) => setLocalSettings({ ...localSettings, lockStations })}
              />
              <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${localSettings.serviceOpen ? "border-secondary/40 bg-secondary/10 text-secondary" : "border-destructive/40 bg-destructive/10 text-destructive"}`}>
                {localSettings.serviceOpen ? "Service marqué ouvert" : "Service marqué fermé"}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="stock" className="rounded-2xl border bg-card shadow-sm px-4 border-b">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-3"><Package className="h-5 w-5 text-primary" /><span className="text-lg font-bold">Stock pâtons</span></span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground mb-4">Saisissez le stock initial en début de service.</p>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Stat label="Initial" value={settings.initial_paton_stock} />
              <Stat label="Pertes" value={settings.paton_losses} tone="destructive" />
              <Stat label="Restant" value={stock} tone={stock < localSettings.stockWarningThreshold ? "destructive" : "secondary"} />
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <div className="flex-1">
                <Label htmlFor="init">Stock initial</Label>
                <Input id="init" type="number" value={form.initial_paton_stock ?? 0} onChange={(e) => setForm({ ...form, initial_paton_stock: Number(e.target.value) })} className="h-11" />
              </div>
              <Button onClick={save} className="self-end h-11 font-bold"><Save className="mr-1 h-4 w-4" /> Enregistrer</Button>
            </div>
            <div className="mt-4 rounded-xl border bg-background p-3">
              <Field
                id="stock_warning"
                label="Alerte stock faible (pâtons restants)"
                value={localSettings.stockWarningThreshold}
                onChange={(stockWarningThreshold) => setLocalSettings({ ...localSettings, stockWarningThreshold })}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="prod" className="rounded-2xl border bg-card shadow-sm px-4 border-b">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-3"><Sliders className="h-5 w-5 text-primary" /><span className="text-lg font-bold">Paramètres production</span></span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <Button variant="outline" onClick={() => setForm({ ...form, cook_time_sec: 75, prep_time_per_pizza_sec: 100, boxing_time_sec: 120, safety_margin_sec: 90 })}>
                <Zap className="mr-1 h-4 w-4" /> Service rapide
              </Button>
              <Button variant="outline" onClick={() => setForm({ ...form, cook_time_sec: 90, prep_time_per_pizza_sec: 120, boxing_time_sec: 180, safety_margin_sec: 120 })}>
                Standard
              </Button>
              <Button variant="outline" onClick={() => setForm({ ...form, cook_time_sec: 110, prep_time_per_pizza_sec: 160, boxing_time_sec: 210, safety_margin_sec: 180 })}>
                Service chargé
              </Button>
            </div>
            <Field id="oven_capacity" label="Capacité four (pizzas simultanées)" value={form.oven_capacity} onChange={(v) => setForm({ ...form, oven_capacity: v })} />
            <PizzaioloPaceSlider
              value={pizzaioloPace}
              onChange={(pace) => setForm({ ...form, prep_time_per_pizza_sec: pacePercentToPrepTime(pace) })}
            />
            <Field id="cook_time_sec" label="Temps de cuisson (secondes)" value={form.cook_time_sec} onChange={(v) => setForm({ ...form, cook_time_sec: v })} />
            <Field id="prep_time_per_pizza_sec" label="Préparation par pizza (secondes)" value={form.prep_time_per_pizza_sec} onChange={(v) => setForm({ ...form, prep_time_per_pizza_sec: v })} />
            <Field id="boxing_time_sec" label="Mise en boîte (secondes)" value={form.boxing_time_sec} onChange={(v) => setForm({ ...form, boxing_time_sec: v })} />
            <Field id="batch_interval_sec" label="Intervalle entre enfournements (secondes)" value={form.batch_interval_sec} onChange={(v) => setForm({ ...form, batch_interval_sec: v })} />
            <Field id="safety_margin_sec" label="Marge de sécurité (secondes)" value={form.safety_margin_sec} onChange={(v) => setForm({ ...form, safety_margin_sec: v })} />
            <Field
              id="late_warning"
              label="Alerte retard cuisine (minutes)"
              value={localSettings.lateWarningMinutes}
              onChange={(lateWarningMinutes) => setLocalSettings({ ...localSettings, lateWarningMinutes })}
            />
            <Button onClick={save} className="w-full h-12 text-base font-bold"><Save className="mr-2 h-4 w-4" /> Enregistrer</Button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="display" className="rounded-2xl border bg-card shadow-sm px-4 border-b">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-3"><Monitor className="h-5 w-5 text-primary" /><span className="text-lg font-bold">Affichage cuisine</span></span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <ToggleRow
                label="Cartes compactes"
                description="Préférence pour afficher plus de commandes à l'écran."
                checked={localSettings.compactKitchen}
                onCheckedChange={(compactKitchen) => setLocalSettings({ ...localSettings, compactKitchen })}
              />
              <ToggleRow
                label="Contraste renforcé"
                description="Mode recommandé pour les tablettes en cuisine ou forte luminosité."
                checked={localSettings.highContrast}
                onCheckedChange={(highContrast) => setLocalSettings({ ...localSettings, highContrast })}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="notifications" className="rounded-2xl border bg-card shadow-sm px-4 border-b">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-3"><Bell className="h-5 w-5 text-primary" /><span className="text-lg font-bold">Notifications</span></span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <ToggleRow
                label="Son nouvelle commande"
                description="Préférence locale pour signaler une commande entrante."
                checked={localSettings.soundNewOrder}
                onCheckedChange={(soundNewOrder) => setLocalSettings({ ...localSettings, soundNewOrder })}
              />
              <ToggleRow
                label="Son commande en retard"
                description="Préférence locale pour attirer l'attention sur un retard."
                checked={localSettings.soundLateOrder}
                onCheckedChange={(soundLateOrder) => setLocalSettings({ ...localSettings, soundLateOrder })}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="security" className="rounded-2xl border bg-card shadow-sm px-4 border-b">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-3"><KeyRound className="h-5 w-5 text-primary" /><span className="text-lg font-bold">Mot de passe</span></span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Change le mot de passe d'accès au KDS sur cette tablette ou ce navigateur. Identifiant inchangé : <strong>Her Salin</strong>.
              </p>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="current-password">Mot de passe actuel</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={passwordForm.current}
                    onChange={(event) => setPasswordForm({ ...passwordForm, current: event.target.value })}
                    className="h-11"
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <Label htmlFor="new-password">Nouveau mot de passe</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={passwordForm.next}
                    onChange={(event) => setPasswordForm({ ...passwordForm, next: event.target.value })}
                    className="h-11"
                    autoComplete="new-password"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Minimum 8 caractères.</p>
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwordForm.confirm}
                    onChange={(event) => setPasswordForm({ ...passwordForm, confirm: event.target.value })}
                    className="h-11"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Button onClick={savePassword} className="h-11 font-bold">
                  <Save className="mr-2 h-4 w-4" /> Changer le mot de passe
                </Button>
                <Button variant="outline" onClick={resetPassword} className="h-11">
                  Restaurer l'initial
                </Button>
              </div>
              <div className="rounded-xl border border-status-prepare/40 bg-status-prepare/10 px-3 py-2 text-xs text-foreground/80">
                Note : cette protection reste locale à l'appareil. Pour une sécurité forte multi-postes, il faudra une authentification serveur.
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="panino-catalog" className="rounded-2xl border bg-card shadow-sm px-4 border-b">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-3"><Sandwich className="h-5 w-5 text-primary" /><span className="text-lg font-bold">Catalogue Pani'NO</span></span>
          </AccordionTrigger>
          <AccordionContent>
            <PaninoProductsManager />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="ingredients" className="rounded-2xl border bg-card shadow-sm px-4 border-b">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-3"><Carrot className="h-5 w-5 text-primary" /><span className="text-lg font-bold">Ingrédients</span></span>
          </AccordionTrigger>
          <AccordionContent>
            <IngredientsManager />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="pizzas" className="rounded-2xl border bg-card shadow-sm px-4 border-b">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-3"><PizzaIcon className="h-5 w-5 text-primary" /><span className="text-lg font-bold">Pizzas & ingrédients</span></span>
          </AccordionTrigger>
          <AccordionContent>
            <PizzasSection />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="danger" className="rounded-2xl border bg-card shadow-sm px-4 border-b">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-3"><ShieldAlert className="h-5 w-5 text-destructive" /><span className="text-lg font-bold">Zone sensible</span></span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <h2 className="font-bold text-destructive">Reset journée sécurisé</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Supprime <strong>toutes</strong> les commandes enregistrées (en cours et déjà
                remises, sans limite de date), les pizzas et produits Pani'NO associés, et remet
                les pertes pâtons à zéro. Action irréversible.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <Input
                  value={resetCode}
                  onChange={(event) => setResetCode(event.target.value)}
                  placeholder="Tapez RESET pour confirmer"
                  className="h-11"
                />
                <Button variant="destructive" onClick={resetDay} className="h-11" disabled={resetCode.trim().toUpperCase() !== "RESET"}>
                  <RotateCcw className="mr-1 h-4 w-4" /> Reset journée
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function useLocalControlSettings(): [
  LocalControlSettings,
  (next: LocalControlSettings) => void,
] {
  const [settings, setSettingsState] = useState<LocalControlSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_LOCAL_CONTROL;
    try {
      const stored = window.localStorage.getItem(LOCAL_CONTROL_KEY);
      return stored
        ? { ...DEFAULT_LOCAL_CONTROL, ...JSON.parse(stored) }
        : DEFAULT_LOCAL_CONTROL;
    } catch {
      return DEFAULT_LOCAL_CONTROL;
    }
  });

  const setSettings = (next: LocalControlSettings) => {
    setSettingsState(next);
    try {
      window.localStorage.setItem(LOCAL_CONTROL_KEY, JSON.stringify(next));
    } catch {}
  };

  return [settings, setSettings];
}

function isMissingSystemModeColumn(message: string) {
  return message.includes("system_mode") || message.includes("column");
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-background p-3">
      <div>
        <div className="font-semibold">{label}</div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SystemModeSelector({
  value,
  onChange,
}: {
  value: SystemMode;
  onChange: (mode: SystemMode) => void;
}) {
  const modes: Array<{ value: SystemMode; label: string; description: string }> = [
    {
      value: "test",
      label: "Test",
      description: "Les événements sont marqués test et exclus des données d'apprentissage.",
    },
    {
      value: "learning",
      label: "Apprentissage",
      description: "Le KDS collecte les données réelles pour entraîner les futures prédictions.",
    },
    {
      value: "normal",
      label: "Normal / IA",
      description: "Mode service simplifié, prêt pour les recommandations une fois les données mûres.",
    },
  ];

  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="mb-3">
        <div className="font-semibold">Mode système</div>
        <p className="text-sm text-muted-foreground">
          Ce mode est commun à tous les postes et détermine comment les événements sont enregistrés.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {modes.map((mode) => (
          <button
            key={mode.value}
            type="button"
            onClick={() => onChange(mode.value)}
            className={`rounded-lg border p-3 text-left transition ${
              value === mode.value
                ? "border-primary bg-primary/10 text-primary"
                : "bg-card hover:border-primary/50"
            }`}
          >
            <div className="font-black">{mode.label}</div>
            <div className="mt-1 text-xs text-muted-foreground">{mode.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PizzaioloPaceSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const tone =
    value < 90 ? "Fatigue élevée"
    : value > 110 ? "Très bonne cadence"
    : "Cadence normale";

  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <Label htmlFor="pizzaiolo_pace">Cadence pizzaiolo</Label>
          <p className="mt-1 text-sm text-muted-foreground">
            Le pizzaiolo ajuste selon sa fatigue. L'assistant devient plus prudent quand la cadence baisse.
          </p>
        </div>
        <div className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-black text-primary">
          {value}%
        </div>
      </div>
      <Slider
        id="pizzaiolo_pace"
        min={70}
        max={130}
        step={5}
        value={[value]}
        onValueChange={([next]) => onChange(next)}
      />
      <div className="mt-3 flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>Fatigué</span>
        <span className="rounded-full border bg-card px-2 py-1 text-foreground">{tone}</span>
        <span>En forme</span>
      </div>
    </div>
  );
}

function prepTimeToPacePercent(prepTimeSec: number | undefined) {
  const safePrepTime = Math.max(70, prepTimeSec || BASE_PIZZAIOLO_PREP_TIME_SEC);
  const pace = Math.round((BASE_PIZZAIOLO_PREP_TIME_SEC / safePrepTime) * 100);
  return Math.max(70, Math.min(130, Math.round(pace / 5) * 5));
}

function pacePercentToPrepTime(pacePercent: number) {
  const safePace = Math.max(70, Math.min(130, pacePercent));
  return Math.round(BASE_PIZZAIOLO_PREP_TIME_SEC * (100 / safePace));
}

function PaninoProductsManager() {
  const [products, setProducts] = useState<PaninoProduct[]>([]);
  const [localSettings, setLocalSettings] = useLocalControlSettings();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const reload = async () => {
    const { data, error } = await supabase
      .from("panino_products")
      .select("*")
      .order("sort_order");
    if (error) return toast.error("Impossible de charger les produits Pani'NO");
    setProducts((data as PaninoProduct[]) ?? []);
  };

  useEffect(() => {
    reload();
  }, []);

  const unavailableKeys = new Set(localSettings.disabledPaninoKeys);

  const add = async () => {
    const trimmed = name.trim();
    if (!trimmed) return toast.error("Nom requis");
    const key = slugify(trimmed);
    const maxOrder = products.reduce((max, product) => Math.max(max, product.sort_order), 0);
    const { error } = await supabase.from("panino_products").insert({
      key,
      name: trimmed,
      sort_order: maxOrder + 1,
      active: true,
    });
    if (error) return toast.error("Impossible d'ajouter ce produit");
    toast.success("Produit Pani'NO ajouté");
    setName("");
    reload();
  };

  const startEdit = (product: PaninoProduct) => {
    setEditingId(product.id);
    setEditName(product.name);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (!trimmed) return toast.error("Nom requis");
    const { error } = await supabase
      .from("panino_products")
      .update({ name: trimmed })
      .eq("id", editingId);
    if (error) return toast.error("Impossible de modifier ce produit");
    toast.success("Produit Pani'NO modifié");
    setEditingId(null);
    setEditName("");
    reload();
  };

  const toggleCheckoutAvailability = (product: PaninoProduct, available: boolean) => {
    const disabledPaninoKeys = available
      ? localSettings.disabledPaninoKeys.filter((key) => key !== product.key)
      : Array.from(new Set([...localSettings.disabledPaninoKeys, product.key]));
    setLocalSettings({ ...localSettings, disabledPaninoKeys });
    toast.success(available ? "Produit marqué disponible" : "Produit marqué indisponible");
  };

  const repairBaseProducts = async () => {
    const { error } = await supabase
      .from("panino_products")
      .update({ active: true })
      .in("key", ["panino", "fishno", "cornet_frites"]);
    if (error) return toast.error("Réparation impossible");
    toast.success("Produits Pani'NO de base réactivés");
    reload();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Marquez des produits comme indisponibles en caisse sans casser le catalogue technique ni les commandes en cours.
      </p>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
        <div className="font-semibold text-primary">Sécurité catalogue</div>
        <p className="mt-1 text-muted-foreground">
          Les interrupteurs ci-dessous n'écrivent plus dans le champ technique Supabase `active`.
          Ils servent uniquement d'indicateur de disponibilité locale.
        </p>
        <Button variant="outline" onClick={repairBaseProducts} className="mt-3 h-10">
          Réparer les produits de base
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nouveau produit Pani'NO…"
          className="h-11 flex-1"
          onKeyDown={(event) => event.key === "Enter" && add()}
        />
        <Button onClick={add} className="h-11 font-bold">
          <Plus className="mr-1 h-4 w-4" /> Ajouter
        </Button>
      </div>

      <div className="space-y-2">
        {products.map((product) => (
          <div key={product.id} className="flex items-center gap-2 rounded-xl border bg-background p-3">
            <Switch
              checked={!unavailableKeys.has(product.key)}
              disabled={!product.active}
              onCheckedChange={(available) => toggleCheckoutAvailability(product, available)}
            />
            <div className="min-w-0 flex-1">
              {editingId === product.id ? (
                <Input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="h-9"
                  onKeyDown={(event) => event.key === "Enter" && saveEdit()}
                />
              ) : (
                <>
                  <div className="font-bold">{product.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {!product.active
                      ? "Désactivé techniquement : utilisez Réparer les produits de base si nécessaire"
                      : unavailableKeys.has(product.key)
                        ? "Indisponible en caisse"
                        : "Disponible en caisse"} · clé : {product.key}
                  </div>
                </>
              )}
            </div>
            {editingId === product.id ? (
              <>
                <Button size="sm" variant="outline" onClick={saveEdit} className="h-9">
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-9">
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => startEdit(product)} className="h-9">
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        {products.length === 0 && (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aucun produit Pani'NO
          </div>
        )}
      </div>
    </div>
  );
}

function IngredientsManager() {
  const { ingredients, reload } = useIngredients();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [syncingStock, setSyncingStock] = useState(false);

  const normalizeIngredient = (value: string) => value.trim().toLowerCase();

  const syncNativeIngredientsIntoStock = async () => {
    setSyncingStock(true);
    try {
      const [{ data: pizzas }, { data: paninoOptions }, { data: stockRows }] = await Promise.all([
        supabase.from("pizzas").select("ingredients").eq("active", true),
        supabase
          .from("panino_options")
          .select("name, kind")
          .eq("active", true)
          .in("kind", ["base", "sauce", "removable", "extra"]),
        supabase.from("ingredients").select("id, name, active"),
      ]);

      const nativeNames = new Set<string>();
      for (const pizza of pizzas ?? []) {
        for (const ingredient of pizza.ingredients ?? []) {
          const trimmed = ingredient.trim();
          if (trimmed) nativeNames.add(trimmed);
        }
      }
      for (const option of paninoOptions ?? []) {
        const trimmed = option.name.trim();
        if (trimmed) nativeNames.add(trimmed);
      }

      const knownNames = new Set((stockRows ?? []).map((row) => normalizeIngredient(row.name)));
      const missing = Array.from(nativeNames)
        .filter((ingredientName) => !knownNames.has(normalizeIngredient(ingredientName)))
        .map((ingredientName) => ({ name: ingredientName, active: true }));

      if (missing.length > 0) {
        const { error } = await supabase.from("ingredients").insert(missing);
        if (error) throw error;
        await reload();
      }
    } catch (error) {
      console.error(error);
      toast.error("Impossible de synchroniser tous les ingrédients natifs");
    } finally {
      setSyncingStock(false);
    }
  };

  useEffect(() => {
    syncNativeIngredientsIntoStock();
  }, []);

  const syncPaninoExtras = async (ingredientName: string) => {
    const normalized = ingredientName.trim().toLowerCase();
    if (!normalized) return;

    const { data, error } = await supabase
      .from("panino_options")
      .select("id, product_key, name, active")
      .eq("kind", "extra")
      .in("product_key", SHARED_INGREDIENT_PRODUCT_KEYS);

    if (error) throw error;

    const existing = (data ?? []).filter((option) => option.name.trim().toLowerCase() === normalized);
    const existingKeys = new Set(existing.map((option) => option.product_key));
    const inactiveIds = existing.filter((option) => !option.active).map((option) => option.id);

    if (inactiveIds.length > 0) {
      const { error: reactivateError } = await supabase
        .from("panino_options")
        .update({ active: true, name: ingredientName.trim() })
        .in("id", inactiveIds);
      if (reactivateError) throw reactivateError;
    }

    const maxSortOrder = Math.max(0, ...(data ?? []).map((option) => Number(option.sort_order) || 0));
    const missing = SHARED_INGREDIENT_PRODUCT_KEYS
      .filter((productKey) => !existingKeys.has(productKey))
      .map((productKey, index) => ({
        product_key: productKey,
        kind: "extra",
        name: ingredientName.trim(),
        required: false,
        multi: true,
        sort_order: maxSortOrder + index + 1,
        active: true,
      }));

    if (missing.length > 0) {
      const { error: insertError } = await supabase.from("panino_options").insert(missing);
      if (insertError) throw insertError;
    }
  };

  const renamePaninoExtras = async (oldName: string, newName: string) => {
    const { error } = await supabase
      .from("panino_options")
      .update({ name: newName.trim(), active: true })
      .eq("kind", "extra")
      .in("product_key", SHARED_INGREDIENT_PRODUCT_KEYS)
      .ilike("name", oldName.trim());
    if (error) throw error;

    await syncPaninoExtras(newName);
  };

  const deactivatePaninoExtras = async (ingredientName: string) => {
    const { error } = await supabase
      .from("panino_options")
      .update({ active: false })
      .eq("kind", "extra")
      .in("product_key", SHARED_INGREDIENT_PRODUCT_KEYS)
      .ilike("name", ingredientName.trim());
    if (error) throw error;
  };

  const add = async () => {
    const trimmed = name.trim();
    if (!trimmed) return toast.error("Nom requis");

    const { data: existingRows, error: existingError } = await supabase
      .from("ingredients")
      .select("id, name, active");
    if (existingError) return toast.error("Erreur");

    const existing = (existingRows ?? []).find((row) => normalizeIngredient(row.name) === normalizeIngredient(trimmed));
    if (existing?.active) return toast.error("Cet ingrédient est déjà dans le stock");

    const { error } = existing
      ? await supabase.from("ingredients").update({ name: trimmed, active: true }).eq("id", existing.id)
      : await supabase.from("ingredients").insert({ name: trimmed });
    if (error) return toast.error("Erreur");

    try {
      await syncPaninoExtras(trimmed);
    } catch {
      toast.error("Ingrédient ajouté, mais pas synchronisé avec Pani'NO");
    }
    toast.success("Ingrédient ajouté partout");
    setName("");
    reload();
  };

  const startEdit = (ing: Ingredient) => {
    setEditingId(ing.id);
    setEditName(ing.name);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (!trimmed) return toast.error("Nom requis");
    const current = ingredients.find((ing) => ing.id === editingId);
    const { error } = await supabase.from("ingredients").update({ name: trimmed }).eq("id", editingId);
    if (error) return toast.error("Erreur");
    try {
      if (current) await renamePaninoExtras(current.name, trimmed);
      else await syncPaninoExtras(trimmed);
    } catch {
      toast.error("Ingrédient modifié, mais pas synchronisé avec Pani'NO");
    }
    toast.success("Ingrédient modifié partout");
    setEditingId(null);
    setEditName("");
    reload();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cet ingrédient ?")) return;
    const current = ingredients.find((ing) => ing.id === id);
    const { error } = await supabase.from("ingredients").update({ active: false }).eq("id", id);
    if (error) return toast.error("Erreur");
    try {
      if (current) await deactivatePaninoExtras(current.name);
    } catch {
      toast.error("Ingrédient supprimé, mais encore visible côté Pani'NO");
    }
    toast.success("Ingrédient retiré partout");
    if (editingId === id) { setEditingId(null); setEditName(""); }
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-bold">Stock ingrédients</div>
            <p className="text-sm text-muted-foreground">
              Liste commune utilisée pour les suppléments pizzas, Pani'NO et Fish & NO.
            </p>
          </div>
          <div className="rounded-full bg-background px-3 py-1 text-sm font-bold">
            {ingredients.length} ingrédient{ingredients.length > 1 ? "s" : ""}
          </div>
        </div>
        {syncingStock && (
          <div className="mt-2 text-xs text-muted-foreground">Synchronisation des ingrédients natifs…</div>
        )}
      </div>

      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nouvel ingrédient…" className="h-11 flex-1" onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button onClick={add} className="h-11 font-bold"><Plus className="mr-1 h-4 w-4" /> Ajouter</Button>
      </div>

      <div className="space-y-2">
        {ingredients.map((ing) => (
          <div key={ing.id} className="flex items-center gap-2 rounded-xl border bg-background p-3">
            {editingId === ing.id ? (
              <>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-10 flex-1" onKeyDown={(e) => e.key === "Enter" && saveEdit()} />
                <Button size="sm" variant="outline" className="h-10" onClick={saveEdit}><Check className="mr-1 h-4 w-4" /> OK</Button>
                <Button size="sm" variant="ghost" className="h-10" onClick={() => { setEditingId(null); setEditName(""); }}><X className="h-4 w-4" /></Button>
              </>
            ) : (
              <>
                <span className="flex-1 font-medium">{ing.name}</span>
                <Button size="sm" variant="outline" className="h-9" onClick={() => startEdit(ing)}><Pencil className="mr-1 h-4 w-4" /> Modifier</Button>
                <Button size="sm" variant="destructive" className="h-9" onClick={() => remove(ing.id)}><Trash2 className="mr-1 h-4 w-4" /> Supprimer</Button>
              </>
            )}
          </div>
        ))}
        {ingredients.length === 0 && (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aucun ingrédient en stock
          </div>
        )}
      </div>
    </div>
  );
}

function PizzasSection() {
  const [pizzas, setPizzas] = useState<Pizza[]>([]);
  const [name, setName] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const reload = async () => {
    const { data } = await supabase.from("pizzas").select("*").eq("active", true).order("sort_order");
    setPizzas((data as Pizza[]) ?? []);
  };

  useEffect(() => { reload(); }, []);

  const allIngredients = Array.from(new Set(pizzas.flatMap((p) => p.ingredients))).sort();

  const resetForm = () => { setName(""); setIngredients(""); setEditingId(null); };

  const save = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return toast.error("Nom requis");
    const ing = ingredients.split(",").map((s) => s.trim()).filter(Boolean);
    if (editingId) {
      const { error } = await supabase.from("pizzas").update({ name: trimmedName, ingredients: ing }).eq("id", editingId);
      if (error) return toast.error("Erreur");
      toast.success("Pizza modifiée");
    } else {
      const maxOrder = pizzas.reduce((m, p) => Math.max(m, p.sort_order), 0);
      const { error } = await supabase.from("pizzas").insert({ name: trimmedName, ingredients: ing, sort_order: maxOrder + 1 });
      if (error) return toast.error("Erreur");
      toast.success("Pizza ajoutée");
    }
    resetForm();
    reload();
  };

  const edit = (p: Pizza) => {
    setEditingId(p.id);
    setName(p.name);
    setIngredients(p.ingredients.join(", "));
  };

  const remove = async (p: Pizza) => {
    if (!confirm(`Supprimer "${p.name}" ?`)) return;
    const { error } = await supabase.from("pizzas").update({ active: false }).eq("id", p.id);
    if (error) return toast.error("Erreur");
    toast.success("Pizza supprimée");
    if (editingId === p.id) resetForm();
    reload();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Ajoutez ou modifiez les pizzas. Les ingrédients listés ici alimentent automatiquement les extras possibles en caisse.</p>



      <div className="rounded-xl border bg-background p-4 space-y-3">
        <div>
          <Label htmlFor="pizza-name">Nom de la pizza</Label>
          <Input id="pizza-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Margherita" className="h-11" />
        </div>
        <div>
          <Label htmlFor="pizza-ing">Ingrédients (séparés par des virgules)</Label>
          <Input id="pizza-ing" value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder="Ex : mozzarella, tomate, basilic" className="h-11" />
        </div>
        <div className="flex gap-2">
          <Button onClick={save} className="flex-1 h-11 font-bold">
            <Plus className="mr-1 h-4 w-4" />{editingId ? "Modifier" : "Ajouter"}
          </Button>
          {editingId && (
            <Button variant="outline" onClick={resetForm} className="h-11">Annuler</Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {pizzas.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-xl border bg-background p-3">
            <div className="flex-1 min-w-0">
              <div className="font-bold">{p.name}</div>
              <div className="text-xs text-muted-foreground truncate">{p.ingredients.join(" · ") || "Aucun ingrédient"}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => edit(p)} className="h-9"><Pencil className="h-4 w-4" /></Button>
            <Button size="sm" variant="destructive" onClick={() => remove(p)} className="h-9"><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        {pizzas.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">Aucune pizza</div>}
      </div>

      <IngredientsManager />

    </div>
  );
}


function Field({ id, label, value, onChange }: { id: string; label: string; value: number | undefined; onChange: (v: number) => void }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} className="h-11" />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "destructive" | "secondary" }) {
  const color = tone === "destructive" ? "text-destructive" : tone === "secondary" ? "text-secondary" : "text-foreground";
  return (
    <div className="rounded-xl border bg-background p-3 text-center">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}
