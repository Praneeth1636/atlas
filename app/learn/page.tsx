"use client";

import Link from "next/link";

import { useAtlasStore } from "@/app/lib/store";

export default function LearnPage() {
  const ingestionData = useAtlasStore((state) => state.ingestionData);

  if (!ingestionData) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_28%)]" />
        <div className="relative w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-10 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_32px_120px_rgba(15,23,42,0.45)] backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.4em] text-white/45">
            Atlas
          </p>
          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-white">
            No repository loaded.
          </h1>
          <p className="mt-4 text-white/65">
            Start from the homepage to analyze a repository first.
          </p>
          <Link
            className="mt-8 inline-flex rounded-2xl border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-100 transition hover:border-zinc-500"
            href="/"
          >
            Back home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_28%)]" />
      <div className="relative mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            className="text-sm uppercase tracking-[0.4em] text-white/55 transition hover:text-white"
            href="/"
          >
            Atlas
          </Link>
          <p className="text-sm text-white/60">{ingestionData.metadata.fullName}</p>
        </header>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_32px_120px_rgba(15,23,42,0.45)] backdrop-blur-xl">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-indigo-200">
            Ingestion preview (debug)
          </p>
          <div className="mt-6 space-y-6">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white">
                {ingestionData.metadata.name}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-white/70">
                {ingestionData.metadata.description || "No description available."}
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-white/70">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {ingestionData.metadata.language || "Unknown language"}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {ingestionData.metadata.stars.toLocaleString()} stars
                </span>
                <a
                  className="rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-indigo-100 transition hover:bg-indigo-400/15"
                  href={ingestionData.metadata.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open repository
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-950/60 p-5">
              <h2 className="text-sm font-medium uppercase tracking-[0.22em] text-white/55">
                README
              </h2>
              <pre className="mt-4 max-h-96 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-white/75">
                {ingestionData.readme || "README not available."}
              </pre>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-950/60 p-5">
              <h2 className="text-sm font-medium uppercase tracking-[0.22em] text-white/55">
                File tree
              </h2>
              <ul className="mt-4 space-y-2 text-sm text-white/75">
                {ingestionData.fileTree.map((entry) => (
                  <li
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2"
                    key={entry.path}
                  >
                    <span className="flex items-center gap-3 truncate">
                      <span aria-hidden="true">
                        {entry.type === "dir" ? "📁" : "📄"}
                      </span>
                      <span className="truncate">{entry.name}</span>
                    </span>
                    <span className="text-xs uppercase tracking-[0.18em] text-white/40">
                      {entry.type}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
