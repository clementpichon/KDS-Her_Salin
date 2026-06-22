export type OrderStatus = "to_prepare" | "in_oven" | "ready" | "delivered";
export type SystemMode = "test" | "learning" | "normal";

export interface Pizza {
  id: string;
  name: string;
  ingredients: string[];
  image_path: string | null;
  sort_order: number;
  active: boolean;
}

export interface Settings {
  id: number;
  oven_capacity: number;
  cook_time_sec: number;
  prep_time_per_pizza_sec: number;
  boxing_time_sec: number;
  safety_margin_sec: number;
  batch_interval_sec: number;
  initial_paton_stock: number;
  paton_losses: number;
  system_mode: SystemMode;
}

export interface ProductionEvent {
  id: string;
  created_at: string;
  event_type: string;
  station: string;
  order_id: string | null;
  order_item_id: string | null;
  product_type: string | null;
  product_name: string | null;
  mode: SystemMode;
  is_training_data: boolean;
  metadata: Record<string, unknown> | null;
}

export interface PhoneStatus {
  id: number;
  is_ringing: boolean;
  is_on_call: boolean;
  current_phone_number: string | null;
  device_id: string | null;
  call_started_at: string | null;
  matched_order_id: string | null;
  matched_customer_name: string | null;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  pizza_id: string | null;
  pizza_name: string;
  extras: string[];
  removed: string[];
  prepared: boolean;
  cut_into: number | null;
}

export type PainsPaninoStatus = "a_preparer" | "en_cours" | "pret";

export interface Order {
  id: string;
  customer_name: string;
  requested_time: string;
  status: OrderStatus;
  prep_start_time: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
  pains_panino_status: PainsPaninoStatus | null;
  customer_phone_hash: string | null;
  customer_phone: string | null;
  items?: OrderItem[];
}


export interface Ingredient {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface DraftItem {
  pizza_id: string;
  pizza_name: string;
  extras: string[];
  removed: string[];
  cut_into?: number | null;
}

// ---------- Pani'NO ----------

export type PaninoStatus = "pending" | "in_progress" | "done";
export type PaninoProductKey = "panino" | "fishno" | "cornet_frites" | string;
export type PaninoOptionKind =
  | "base"
  | "fries_mode"
  | "side"
  | "sauce"
  | "removable"
  | "extra";

export interface PaninoProduct {
  id: string;
  key: PaninoProductKey;
  name: string;
  sort_order: number;
  active: boolean;
}

export interface PaninoOption {
  id: string;
  product_key: PaninoProductKey;
  kind: PaninoOptionKind;
  name: string;
  required: boolean;
  multi: boolean;
  sort_order: number;
  active: boolean;
}

export interface PaninoOrderItem {
  id: string;
  order_id: string;
  product_key: PaninoProductKey;
  product_name: string;
  base: string | null;
  fries_mode: string | null;
  side: string | null;
  sauces: string[];
  removed: string[];
  extras: string[];
  status: PaninoStatus;
  done_at: string | null;
  created_at: string;
}

export interface DraftPaninoItem {
  product_key: PaninoProductKey;
  product_name: string;
  base?: string | null;
  fries_mode?: string | null;
  side?: string | null;
  sauces: string[];
  removed: string[];
  extras: string[];
}
