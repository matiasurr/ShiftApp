"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { AvailableSlot } from "@/types/database";

// ---------------------------------------------------------------------------
// getSlots: fetch available slot start times for a service on a date.
// Wraps the get_available_slots() RPC. Callable with the anon key.
// ---------------------------------------------------------------------------
const getSlotsSchema = z.object({
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
});

export type GetSlotsResult =
  | { ok: true; slots: AvailableSlot[] }
  | { ok: false; error: string };

export async function getSlots(
  serviceId: string,
  date: string,
): Promise<GetSlotsResult> {
  const parsed = getSlotsSchema.safeParse({ serviceId, date });
  if (!parsed.success) {
    return { ok: false, error: "Invalid request." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_service_id: parsed.data.serviceId,
    p_date: parsed.data.date,
  });

  if (error) {
    return { ok: false, error: "Could not load availability." };
  }

  return { ok: true, slots: (data ?? []) as AvailableSlot[] };
}

// ---------------------------------------------------------------------------
// createBooking: book an appointment via the book_appointment() RPC.
// Designed for useActionState: (prevState, formData) => state.
// ---------------------------------------------------------------------------
const createBookingSchema = z.object({
  serviceId: z.string().uuid({ message: "Please choose a service." }),
  startsAt: z.string().datetime({ message: "Please choose a time." }),
  clientName: z.string().trim().min(1, "Name is required.").max(120),
  clientPhone: z.string().trim().min(3, "Phone is required.").max(40),
  clientEmail: z
    .union([z.string().trim().email("Invalid email."), z.literal("")])
    .optional(),
  stylistId: z
    .union([z.string().uuid(), z.literal("")])
    .optional(),
});

export type CreateBookingState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; appointmentId: string };

export async function createBooking(
  _prevState: CreateBookingState,
  formData: FormData,
): Promise<CreateBookingState> {
  const parsed = createBookingSchema.safeParse({
    serviceId: formData.get("serviceId"),
    startsAt: formData.get("startsAt"),
    clientName: formData.get("clientName"),
    clientPhone: formData.get("clientPhone"),
    clientEmail: formData.get("clientEmail") ?? "",
    stylistId: formData.get("stylistId") ?? "",
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid input.";
    return { status: "error", message: first };
  }

  const { serviceId, startsAt, clientName, clientPhone, clientEmail, stylistId } =
    parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("book_appointment", {
    p_service_id: serviceId,
    p_starts_at: startsAt,
    p_client_name: clientName,
    p_client_phone: clientPhone,
    p_client_email: clientEmail ? clientEmail : null,
    p_stylist_id: stylistId ? stylistId : null,
  });

  if (error) {
    // RPC raises friendly messages (e.g. "No capacity at the selected time").
    return {
      status: "error",
      message: error.message || "Could not complete booking. Please try again.",
    };
  }

  return { status: "success", appointmentId: data as string };
}
