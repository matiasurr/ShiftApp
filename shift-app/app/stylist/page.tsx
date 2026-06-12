import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import type { Stylist } from "@/types/database";

type SearchParams = Promise<{ date?: string }>;

type AppointmentRow = {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  service: { name: string; duration_minutes: number } | null;
};

function isoDate(d: Date): string {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function StylistSchedulePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { date } = await searchParams;
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : isoDate(new Date());

  const supabase = await createClient();

  // proxy.ts guards this route, but double-check here for safety.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: stylist } = await supabase
    .from("stylists")
    .select("id, user_id, full_name, active")
    .eq("user_id", user.id)
    .maybeSingle<Stylist>();

  // Day boundaries (UTC) derived from the selected date.
  const dayStart = `${day}T00:00:00.000Z`;
  const dayEnd = `${addDays(day, 1)}T00:00:00.000Z`;

  const { data: appts } = await supabase
    .from("appointments")
    .select(
      "id, client_name, client_phone, client_email, starts_at, ends_at, status, notes, service:services(name, duration_minutes)",
    )
    .eq("status", "booked")
    .gte("starts_at", dayStart)
    .lt("starts_at", dayEnd)
    .order("starts_at", { ascending: true })
    .overrideTypes<AppointmentRow[]>();

  const appointments = appts ?? [];
  const dayLabel = new Date(`${day}T00:00:00`).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Signed in as
            </p>
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">
              {stylist?.full_name ?? user.email}
            </p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-4">
        {!stylist && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Your account isn&apos;t linked to a stylist record yet. Ask an admin
            to set <code>stylists.user_id</code> to your user id.
          </div>
        )}

        {/* Date navigation */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <a
            href={`/stylist?date=${addDays(day, -1)}`}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ← Prev
          </a>
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {dayLabel}
            </p>
            <a
              href="/stylist"
              className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
            >
              Today
            </a>
          </div>
          <a
            href={`/stylist?date=${addDays(day, 1)}`}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Next →
          </a>
        </div>

        {appointments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            No appointments for this day.
          </p>
        ) : (
          <ul className="space-y-2">
            {appointments.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-baseline justify-between">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatTime(a.starts_at)} – {formatTime(a.ends_at)}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {a.service?.name ?? "Service"}
                  </p>
                </div>
                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                  {a.client_name}
                </p>
                <a
                  href={`tel:${a.client_phone}`}
                  className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  {a.client_phone}
                </a>
                {a.notes && (
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {a.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
