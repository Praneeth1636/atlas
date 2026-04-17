export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_28%)]" />
      <div className="relative w-full max-w-3xl rounded-[2rem] border border-white/10 bg-white/5 p-10 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_32px_120px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div className="mb-10 inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-emerald-200">
          Phase 0 MVP
        </div>
        <div className="space-y-6">
          <p className="text-sm uppercase tracking-[0.4em] text-white/45">
            Atlas
          </p>
          <h1 className="text-5xl font-semibold tracking-[-0.04em] text-white sm:text-7xl">
            Hello Atlas
          </h1>
          <p className="max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
            Deployment-first baseline for the Codex Creator Challenge build.
            This placeholder stays stable while the interactive learning agent
            ships in small, deployable steps.
          </p>
        </div>
      </div>
    </main>
  );
}
