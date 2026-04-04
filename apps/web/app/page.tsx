export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-3xl rounded-lg border bg-white/80 p-10 shadow-sm backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-shield">
          CertShield Platform
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-slate-900">
          Workspace foundation is ready for dashboard and API implementation.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Agent 1 can build the product UI here, while Agent 2 can attach API routes,
          jobs, and Supabase-backed workflows against the shared package contracts.
        </p>
      </section>
    </main>
  );
}
