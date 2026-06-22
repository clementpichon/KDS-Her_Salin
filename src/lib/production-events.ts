import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { Settings, SystemMode } from "@/lib/kds-types";

type ProductionEventInput = {
  settings: Pick<Settings, "system_mode"> | null | undefined;
  eventType: string;
  station: string;
  orderId?: string | null;
  orderItemId?: string | null;
  productType?: string | null;
  productName?: string | null;
  metadata?: Json;
};

export async function logProductionEvent({
  settings,
  eventType,
  station,
  orderId = null,
  orderItemId = null,
  productType = null,
  productName = null,
  metadata = {},
}: ProductionEventInput) {
  const mode: SystemMode = settings?.system_mode ?? "test";
  const { error } = await supabase.from("production_events").insert({
    event_type: eventType,
    station,
    order_id: orderId,
    order_item_id: orderItemId,
    product_type: productType,
    product_name: productName,
    mode,
    is_training_data: mode === "learning",
    metadata,
  });

  if (error) {
    console.warn("[KDS] production event not recorded", eventType, error.message);
    return false;
  }
  return true;
}
