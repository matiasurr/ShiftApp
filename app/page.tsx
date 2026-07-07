import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Service, Stylist, StylistService } from "@/types/database";
import { BookingFlow } from "@/app/book/booking-flow";

export default async function Home() {
  const supabase = await createClient();

  const [servicesRes, stylistsRes, skillsRes] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, duration_minutes, price_cents, active")
      .eq("active", true)
      .order("name"),
    supabase
      .from("stylists")
      .select("id, user_id, full_name, active")
      .eq("active", true)
      .order("full_name"),
    supabase.from("stylist_services").select("stylist_id, service_id"),
  ]);

  const services = (servicesRes.data ?? []) as Service[];
  const stylists = (stylistsRes.data ?? []) as Stylist[];
  const skills = (skillsRes.data ?? []) as StylistService[];

  const configError =
    servicesRes.error || stylistsRes.error || skillsRes.error;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Salon Booking
          </h1>
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Stylist login
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {configError || services.length === 0 ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <p className="font-medium">Booking is not available yet.</p>
            <p className="mt-1">
              Make sure Supabase is configured (see{" "}
              <code>supabase/README.md</code>): set <code>.env.local</code>, run
              the migrations, and seed the demo data.
            </p>
          </div>
        ) : (
          <BookingFlow services={services} stylists={stylists} skills={skills} />
        )}
      </main>
    </div>
  );
}
