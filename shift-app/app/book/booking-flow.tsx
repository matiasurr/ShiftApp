"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createBooking,
  getSlots,
  type CreateBookingState,
} from "@/app/actions/booking";
import type { AvailableSlot, Service, Stylist, StylistService } from "@/types/database";

type Props = {
  services: Service[];
  stylists: Stylist[];
  skills: StylistService[];
};

const initialState: CreateBookingState = { status: "idle" };

function todayISODate(): string {
  const now = new Date();
  const off = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - off).toISOString().slice(0, 10);
}

function formatPrice(cents: number | null): string {
  if (cents == null) return "";
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function BookingFlow({ services, stylists, skills }: Props) {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [serviceId, setServiceId] = useState<string>("");
  const [date, setDate] = useState<string>(todayISODate());
  const [stylistId, setStylistId] = useState<string>(""); // "" = Any
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string>("");

  const [state, formAction, pending] = useActionState(
    createBooking,
    initialState,
  );

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId),
    [services, serviceId],
  );

  // Stylists who can perform the selected service.
  const capableStylists = useMemo(() => {
    if (!serviceId) return [];
    const ids = new Set(
      skills.filter((k) => k.service_id === serviceId).map((k) => k.stylist_id),
    );
    return stylists.filter((s) => ids.has(s.id));
  }, [serviceId, skills, stylists]);

  // Load slots for the chosen service + date, then advance to the time step.
  // Done in an event handler (not an effect) to avoid cascading renders.
  async function loadSlotsAndContinue() {
    if (!serviceId || !date) return;
    setStep(3);
    setSlotsLoading(true);
    setSlotsError("");
    setSelectedSlot("");
    setSlots([]);
    const res = await getSlots(serviceId, date);
    if (res.ok) {
      setSlots(res.slots);
    } else {
      setSlotsError(res.error);
    }
    setSlotsLoading(false);
  }

  // On success, go to the confirmation page.
  useEffect(() => {
    if (state.status === "success" && selectedService && selectedSlot) {
      const params = new URLSearchParams({
        ref: state.appointmentId,
        service: selectedService.name,
        at: selectedSlot,
      });
      router.push(`/book/confirmation?${params.toString()}`);
    }
  }, [state, selectedService, selectedSlot, router]);

  return (
    <div>
      <Stepper step={step} />

      {/* Step 1: choose a service */}
      {step === 1 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Choose a service
          </h2>
          <div className="grid gap-2">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setServiceId(s.id);
                  setStylistId("");
                  setStep(2);
                }}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
              >
                <span>
                  <span className="block font-medium text-zinc-900 dark:text-zinc-100">
                    {s.name}
                  </span>
                  <span className="block text-sm text-zinc-500 dark:text-zinc-400">
                    {s.duration_minutes} min{" "}
                    {s.price_cents != null && `· ${formatPrice(s.price_cents)}`}
                  </span>
                </span>
                <span aria-hidden className="text-zinc-400">
                  →
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Step 2: date + stylist preference */}
      {step === 2 && selectedService && (
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Pick a date
          </h2>
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
              Date
            </span>
            <input
              type="date"
              value={date}
              min={todayISODate()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
              Stylist preference
            </span>
            <select
              value={stylistId}
              onChange={(e) => setStylistId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="">Any available stylist</option>
              {capableStylists.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </label>

          <NavButtons
            onBack={() => setStep(1)}
            onNext={loadSlotsAndContinue}
            nextLabel="See times"
          />
        </section>
      )}

      {/* Step 3: choose a slot */}
      {step === 3 && selectedService && (
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Choose a time
          </h2>
          {slotsLoading && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Loading availability…
            </p>
          )}
          {!slotsLoading && slotsError && (
            <p className="text-sm text-red-600 dark:text-red-400">{slotsError}</p>
          )}
          {!slotsLoading && !slotsError && slots.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No available times for this date. Try another day.
            </p>
          )}
          {!slotsLoading && slots.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => {
                const active = selectedSlot === slot.slot_start;
                return (
                  <button
                    key={slot.slot_start}
                    type="button"
                    onClick={() => {
                      setSelectedSlot(slot.slot_start);
                      setStep(4);
                    }}
                    className={`rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-300 bg-white text-zinc-900 hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    {formatTime(slot.slot_start)}
                  </button>
                );
              })}
            </div>
          )}
          <NavButtons onBack={() => setStep(2)} />
        </section>
      )}

      {/* Step 4: details + confirm */}
      {step === 4 && selectedService && selectedSlot && (
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Your details
          </h2>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <Summary
              service={selectedService.name}
              when={selectedSlot}
              stylist={
                stylistId
                  ? capableStylists.find((s) => s.id === stylistId)?.full_name
                  : "Any available stylist"
              }
            />
          </div>

          <form action={formAction} className="space-y-3">
            <input type="hidden" name="serviceId" value={serviceId} />
            <input type="hidden" name="startsAt" value={selectedSlot} />
            <input type="hidden" name="stylistId" value={stylistId} />

            <Field label="Name" name="clientName" type="text" required />
            <Field label="Phone" name="clientPhone" type="tel" required />
            <Field label="Email (optional)" name="clientEmail" type="email" />

            {state.status === "error" && (
              <p
                aria-live="polite"
                className="text-sm text-red-600 dark:text-red-400"
              >
                {state.message}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                {pending ? "Booking…" : "Confirm booking"}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ["Service", "Date", "Time", "Details"];
  return (
    <ol className="mb-6 flex items-center gap-2 text-xs">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full font-semibold ${
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : done
                    ? "bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                    : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
              }`}
            >
              {n}
            </span>
            <span
              className={
                active
                  ? "font-medium text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-400 dark:text-zinc-500"
              }
            >
              {label}
            </span>
            {n < labels.length && <span className="text-zinc-300">·</span>}
          </li>
        );
      })}
    </ol>
  );
}

function NavButtons({
  onBack,
  onNext,
  nextLabel,
}: {
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Back
      </button>
      {onNext && (
        <button
          type="button"
          onClick={onNext}
          className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {nextLabel ?? "Next"}
        </button>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  type,
  required,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />
    </label>
  );
}

function Summary({
  service,
  when,
  stylist,
}: {
  service: string;
  when: string;
  stylist?: string;
}) {
  const d = new Date(when);
  return (
    <dl className="space-y-1">
      <Row label="Service" value={service} />
      <Row
        label="When"
        value={d.toLocaleString([], {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      />
      {stylist && <Row label="Stylist" value={stylist} />}
    </dl>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="font-medium text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  );
}
