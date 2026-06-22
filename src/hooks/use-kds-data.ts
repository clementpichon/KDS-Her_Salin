import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Order, OrderItem, Pizza, Settings, Ingredient, PaninoProduct, PaninoOption, PaninoOrderItem } from "@/lib/kds-types";

const DEFAULT_SETTINGS: Settings = {
  id: 1,
  oven_capacity: 4,
  cook_time_sec: 90,
  prep_time_per_pizza_sec: 120,
  boxing_time_sec: 180,
  safety_margin_sec: 120,
  batch_interval_sec: 40,
  initial_paton_stock: 120,
  paton_losses: 0,
  system_mode: "test",
};

export function usePizzas() {
  const [pizzas, setPizzas] = useState<Pizza[]>([]);
  useEffect(() => {
    supabase
      .from("pizzas")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => setPizzas((data as Pizza[]) ?? []));
  }, []);
  return pizzas;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (!mounted) return;

      if (data) {
        setSettings({ ...DEFAULT_SETTINGS, ...(data as Settings) });
        return;
      }

      setSettings(DEFAULT_SETTINGS);
      if (error) console.error("[KDS] Chargement des réglages impossible", error);

      await supabase
        .from("settings")
        .upsert(DEFAULT_SETTINGS, { onConflict: "id" });
    };

    load();

    const channel = supabase
      .channel("settings-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings" },
        (payload) => {
          if (payload.new) setSettings({ ...DEFAULT_SETTINGS, ...(payload.new as Settings) });
        },
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return settings;
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);

  const reload = async () => {
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .order("requested_time", { ascending: true });
    const { data: itemsData } = await supabase.from("order_items").select("*");
    const items = (itemsData as OrderItem[]) ?? [];
    const ordersWithItems: Order[] = ((ordersData as Order[]) ?? []).map((o) => ({
      ...o,
      items: items.filter((i) => i.order_id === o.id),
    }));
    setOrders(ordersWithItems);
  };

  useEffect(() => {
    reload();
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => reload(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => reload(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { orders, reload };
}

export function useIngredients() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  const reload = async () => {
    const { data } = await supabase
      .from("ingredients")
      .select("*")
      .eq("active", true)
      .order("name");
    setIngredients((data as Ingredient[]) ?? []);
  };

  useEffect(() => {
    reload();
    const channel = supabase
      .channel("ingredients-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ingredients" },
        () => reload(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { ingredients, reload };
}

export function usePaninoCatalog() {
  const [products, setProducts] = useState<PaninoProduct[]>([]);
  const [options, setOptions] = useState<PaninoOption[]>([]);

  const reload = async () => {
    const [{ data: p }, { data: o }] = await Promise.all([
      supabase.from("panino_products").select("*").order("sort_order"),
      supabase.from("panino_options").select("*").eq("active", true).order("sort_order"),
    ]);
    setProducts((p as PaninoProduct[]) ?? []);
    setOptions((o as PaninoOption[]) ?? []);
  };

  useEffect(() => {
    reload();
    const ch = supabase
      .channel("panino-catalog")
      .on("postgres_changes", { event: "*", schema: "public", table: "panino_products" }, () => reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "panino_options" }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return { products, options, reload };
}

export function usePaninoOrderItems() {
  const [items, setItems] = useState<PaninoOrderItem[]>([]);

  const reload = async () => {
    const { data } = await supabase
      .from("panino_order_items")
      .select("*")
      .order("created_at", { ascending: true });
    setItems((data as PaninoOrderItem[]) ?? []);
  };

  useEffect(() => {
    reload();
    const ch = supabase
      .channel("panino-items")
      .on("postgres_changes", { event: "*", schema: "public", table: "panino_order_items" }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return { items, reload };
}
