import Link from "next/link";

type SearchParams = Promise<{
  ref?: string;
  service?: string;
  at?: string;
}>;

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { ref, service, at } = await searchParams;

  const when = at
    ? new Date(at).toLocaleString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl dark:bg-green-900/40">
          ✓
        </div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Booking confirmed
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          We&apos;ve reserved your appointment. See you soon!
        </p>

        {(service || when) && (
          <dl className="mt-6 space-y-2 rounded-xl bg-zinc-50 p-4 text-left text-sm dark:bg-zinc-800/50">
            {service && (
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Service</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                  {service}
                </dd>
              </div>
            )}
            {when && (
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">When</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                  {when}
                </dd>
              </div>
            )}
            {ref && (
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Reference</dt>
                <dd className="font-mono text-xs text-zinc-600 dark:text-zinc-300">
                  {ref.slice(0, 8)}
                </dd>
              </div>
            )}
          </dl>
        )}

        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Book another appointment
        </Link>
      </div>
    </div>
  );
}
