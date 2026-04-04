export default function MarketingHomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="max-w-4xl rounded-[20px] border border-white/70 bg-white/75 p-10 shadow-xl shadow-emerald-950/5 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-shield">
          CertShield
        </p>
        <h1 className="mt-4 text-5xl font-semibold leading-tight text-slate-950">
          Marketing app scaffolded for the GTM site.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600">
          This standalone Next.js app is ready for Agent 1 to build pricing, feature,
          and conversion pages without affecting the authenticated product surface.
        </p>
      </section>
    </main>
  );
}
