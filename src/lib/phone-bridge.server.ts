import { createHash } from "node:crypto";
import process from "node:process";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { SystemMode } from "@/lib/kds-types";
import { normalizePhoneNumber } from "@/lib/phone-utils";

type PhoneBridgePayload = {
  event_type?: unknown;
  phone_number?: unknown;
  timestamp?: unknown;
  duration_sec?: unknown;
  device_id?: unknown;
};

type MatchedOrder = {
  id: string;
  customer_name: string;
};

const EVENT_TYPES = new Set([
  "PING",
  "PHONE_RINGING",
  "PHONE_ANSWERED",
  "PHONE_ENDED",
  "PHONE_MISSED",
  "PHONE_CALL_INCOMING",
  "PHONE_CALL_ANSWERED",
  "PHONE_CALL_ENDED",
  "PHONE_CALL_MISSED",
]);

export async function handlePhoneEventsRequest(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: jsonHeaders() });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
  }

  const expectedToken = process.env.PHONE_EVENTS_TOKEN;
  if (!expectedToken) {
    console.error("[PhoneBridge] PHONE_EVENTS_TOKEN missing");
    return jsonResponse({ ok: false, error: "server_not_configured" }, 500);
  }

  const providedToken = request.headers.get("X-KDS-PHONE-TOKEN");
  if (!providedToken || providedToken !== expectedToken) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }

  let payload: PhoneBridgePayload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400);
  }

  const eventType = typeof payload.event_type === "string" ? payload.event_type : "";
  if (!EVENT_TYPES.has(eventType)) {
    return jsonResponse({ ok: false, error: "invalid_event_type" }, 400);
  }

  if (eventType === "PING") {
    return jsonResponse({ ok: true, event_type: "PING" });
  }

  const normalizedPhone = normalizePhoneNumber(typeof payload.phone_number === "string" ? payload.phone_number : "");
  const occurredAt = parseTimestamp(payload.timestamp);
  const durationSec = parseDuration(payload.duration_sec);
  const deviceId = typeof payload.device_id === "string" && payload.device_id.trim() ? payload.device_id.trim() : null;
  const phoneHash = normalizedPhone ? hashPhoneNumber(normalizedPhone) : null;
  const mode = await loadSystemMode();
  const matchedOrder = normalizedPhone ? await findMatchingOrder(normalizedPhone) : null;

  const { error } = await supabaseAdmin.from("phone_events").insert({
    event_type: eventType,
    phone_number: normalizedPhone || null,
    phone_number_hash: phoneHash,
    duration_sec: durationSec,
    call_duration_seconds: durationSec,
    device_id: deviceId,
    order_id: matchedOrder?.id ?? null,
    occurred_at: occurredAt,
    mode,
    is_training_data: mode === "learning",
  });

  if (error) {
    console.error("[PhoneBridge] phone_events insert failed", error);
    return jsonResponse({ ok: false, error: "insert_failed" }, 500);
  }

  if (matchedOrder && phoneHash) {
    await supabaseAdmin
      .from("orders")
      .update({ customer_phone_hash: phoneHash })
      .eq("id", matchedOrder.id)
      .is("customer_phone_hash", null);
  }

  const statusError = await updatePhoneStatus({
    eventType,
    normalizedPhone,
    deviceId,
    occurredAt,
    matchedOrder,
  });
  if (statusError) {
    console.error("[PhoneBridge] phone_status update failed", statusError);
    return jsonResponse({ ok: false, error: "status_update_failed" }, 500);
  }

  return jsonResponse({
    ok: true,
    event_type: eventType,
    matched_order_id: matchedOrder?.id ?? null,
    matched_customer_name: matchedOrder?.customer_name ?? null,
  });
}

async function loadSystemMode(): Promise<SystemMode> {
  const { data } = await supabaseAdmin
    .from("settings")
    .select("system_mode")
    .eq("id", 1)
    .maybeSingle();
  const mode = data?.system_mode;
  return mode === "learning" || mode === "normal" ? mode : "test";
}

async function findMatchingOrder(normalizedPhone: string): Promise<MatchedOrder | null> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id, customer_name")
    .neq("status", "delivered")
    .eq("customer_phone", normalizedPhone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[PhoneBridge] order matching failed", error.message);
    return null;
  }
  return data ?? null;
}

async function updatePhoneStatus({
  eventType,
  normalizedPhone,
  deviceId,
  occurredAt,
  matchedOrder,
}: {
  eventType: string;
  normalizedPhone: string;
  deviceId: string | null;
  occurredAt: string;
  matchedOrder: MatchedOrder | null;
}) {
  const ringing = eventType === "PHONE_RINGING" || eventType === "PHONE_CALL_INCOMING";
  const answered = eventType === "PHONE_ANSWERED" || eventType === "PHONE_CALL_ANSWERED";
  const ended =
    eventType === "PHONE_ENDED" ||
    eventType === "PHONE_MISSED" ||
    eventType === "PHONE_CALL_ENDED" ||
    eventType === "PHONE_CALL_MISSED";

  const next = ringing || answered
    ? {
        is_ringing: ringing,
        is_on_call: answered,
        current_phone_number: normalizedPhone || null,
        device_id: deviceId,
        call_started_at: occurredAt,
        matched_order_id: matchedOrder?.id ?? null,
        matched_customer_name: matchedOrder?.customer_name ?? null,
        updated_at: new Date().toISOString(),
      }
    : ended
      ? {
          is_ringing: false,
          is_on_call: false,
          current_phone_number: null,
          device_id: deviceId,
          call_started_at: null,
          matched_order_id: null,
          matched_customer_name: null,
          updated_at: new Date().toISOString(),
        }
      : null;

  if (!next) return null;
  const { error } = await supabaseAdmin
    .from("phone_status")
    .upsert({ id: 1, ...next }, { onConflict: "id" });
  return error;
}

function parseTimestamp(value: unknown) {
  if (typeof value !== "string") return new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function parseDuration(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

function hashPhoneNumber(normalizedPhone: string) {
  const pepper = process.env.PHONE_HASH_PEPPER;
  if (!pepper) return null;
  return createHash("sha256").update(`${pepper}:${normalizedPhone}`).digest("hex");
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders(),
  });
}

function jsonHeaders() {
  return {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-kds-phone-token",
  };
}
