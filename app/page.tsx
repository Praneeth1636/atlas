"use client";

import { FormEvent, useState } from "react";

const GITHUB_REPO_URL_PATTERN =
  /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/;
const DEMO_REPO_URL = "https://github.com/karpathy/nanoGPT";

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitRepo = async (nextRepoUrl: string) => {
    const trimmedUrl = nextRepoUrl.trim();

    if (!GITHUB_REPO_URL_PATTERN.test(trimmedUrl)) {
      setError("Please enter a valid GitHub repository URL");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO(step-3): replace setTimeout with real fetch('/api/analyze') and route to /learn
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
      console.log("Analyzing repository:", trimmedUrl);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitRepo(repoUrl);
  };

  const handleDemo = async () => {
    setRepoUrl(DEMO_REPO_URL);
    await submitRepo(DEMO_REPO_URL);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_28%)]" />
      <div className="relative w-full max-w-3xl rounded-[2rem] border border-white/10 bg-white/5 p-10 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_32px_120px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div className="mb-10 inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-emerald-200">
          Phase 0 MVP
        </div>
        <div className="space-y-8">
          <p className="text-sm uppercase tracking-[0.4em] text-white/45">
            Atlas
          </p>
          <h1 className="text-5xl font-semibold tracking-[-0.04em] text-white sm:text-7xl">
            Learn any codebase, interactively.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
            Paste a GitHub repo and Atlas builds you a personalized lesson path
            — with diagrams, code, and quizzes that adapt to your level.
          </p>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error ? (
              <div className="text-sm text-red-400">{error}</div>
            ) : null}
            <input
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 px-4 py-3 text-base text-white outline-none transition focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              onChange={(event) => {
                setRepoUrl(event.target.value);
                if (error) {
                  setError(null);
                }
              }}
              placeholder="https://github.com/karpathy/nanoGPT"
              type="url"
              value={repoUrl}
            />
            {isLoading ? (
              <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/75">
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 animate-spin text-indigo-300"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    fill="none"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-90"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    fill="currentColor"
                    transform="translate(4 0)"
                  />
                </svg>
                <span>Analyzing repository…</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-500"
                  type="submit"
                >
                  Analyze repository
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-2xl border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-100 transition hover:border-zinc-500"
                  onClick={() => {
                    void handleDemo();
                  }}
                  type="button"
                >
                  Try demo
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
