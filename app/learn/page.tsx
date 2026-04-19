"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import MermaidDiagram from "@/app/components/MermaidDiagram";
import { normalizeLesson } from "@/app/lib/normalize";
import { useAtlasStore } from "@/app/lib/store";
import type { IngestionData, Lesson } from "@/app/lib/types";

const LOADING_MESSAGES = [
  "Analyzing the codebase…",
  "Finding the best starting point…",
  "Generating your first lesson…",
  "Drawing the architecture…",
];

function AtlasBackground() {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_28%)]" />
  );
}

function CenteredCardShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-24">
      <AtlasBackground />
      <div className="relative w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-10 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_32px_120px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        {children}
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <CenteredCardShell>
      <p className="text-sm uppercase tracking-[0.4em] text-white/45">Atlas</p>
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
        Start over
      </Link>
    </CenteredCardShell>
  );
}

function LoadingState() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [showLongWaitNote, setShowLongWaitNote] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((currentIndex) =>
        (currentIndex + 1) % LOADING_MESSAGES.length
      );
    }, 2000);
    const timeout = window.setTimeout(() => {
      setShowLongWaitNote(true);
    }, 25000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <CenteredCardShell>
      <p className="text-sm uppercase tracking-[0.4em] text-white/45">Atlas</p>
      <div className="mt-8 flex items-center justify-center gap-4 text-left">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-indigo-300" />
        <p className="text-base font-medium text-white" aria-live="polite">
          {LOADING_MESSAGES[messageIndex]}
        </p>
      </div>
      <p className="mt-4 text-sm text-white/60">
        Atlas is turning the repo into a lesson plan tailored for first contact.
      </p>
      {showLongWaitNote ? (
        <p className="mt-6 text-sm text-zinc-400">
          This can take up to 30 seconds — the agent is thinking carefully about
          the best way to teach this.
        </p>
      ) : null}
    </CenteredCardShell>
  );
}

function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <CenteredCardShell>
      <p className="text-sm uppercase tracking-[0.4em] text-white/45">Atlas</p>
      <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-white">
        We couldn&apos;t generate this lesson.
      </h1>
      <p className="mt-4 text-white/65">
        Try again or pick a different repo.
      </p>
      <p className="mt-3 text-sm text-zinc-500">{error}</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-500"
          onClick={onRetry}
          type="button"
        >
          Retry lesson
        </button>
        <Link
          className="inline-flex items-center justify-center rounded-2xl border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-100 transition hover:border-zinc-500"
          href="/"
        >
          Back home
        </Link>
      </div>
    </CenteredCardShell>
  );
}

function LessonLayout({
  ingestionData,
  lesson,
}: {
  ingestionData: IngestionData;
  lesson: Lesson;
}) {
  const explanationParagraphs = lesson.explanation
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <AtlasBackground />
      <div className="relative border-b border-white/10 bg-zinc-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            className="text-sm uppercase tracking-[0.4em] text-white/55 transition hover:text-white"
            href="/"
          >
            Atlas
          </Link>
          <a
            className="truncate text-sm text-zinc-300 transition hover:text-white"
            href={ingestionData.metadata.url}
            rel="noreferrer"
            target="_blank"
          >
            {ingestionData.metadata.fullName}
          </a>
        </div>
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-10 lg:self-start">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_80px_rgba(15,23,42,0.35)] backdrop-blur-xl">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
                Lessons
              </p>
              <div className="mt-4">
                <div className="flex items-center rounded-2xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-3 shadow-[inset_3px_0_0_0_rgba(129,140,248,0.9)]">
                  <span className="truncate text-sm font-medium text-indigo-100">
                    1. {lesson.title}
                  </span>
                </div>
              </div>
              <p className="mt-4 text-sm text-zinc-500">
                More lessons coming soon.
              </p>
            </div>
          </aside>

          <div className="space-y-8">
            <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_32px_120px_rgba(15,23,42,0.4)] backdrop-blur-xl">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
                Lesson 1
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                {lesson.title}
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                <span className="rounded-full border border-white/10 bg-zinc-950/70 px-3 py-1 text-zinc-200">
                  {ingestionData.metadata.language || "Unknown language"}
                </span>
                <span aria-hidden="true" className="text-zinc-600">
                  ·
                </span>
                <span>{ingestionData.metadata.stars.toLocaleString()} stars</span>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_80px_rgba(15,23,42,0.3)] backdrop-blur-xl">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-zinc-500">
                Explanation
              </p>
              <div className="mt-5 max-w-[65ch] text-base leading-8 text-zinc-200">
                {explanationParagraphs.map((paragraph, index) => (
                  <p className="mb-4 last:mb-0" key={`${index}-${paragraph}`}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            <MermaidDiagram chart={lesson.mermaidDiagram} />

            {lesson.codeSnippet ? (
              <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                <div className="flex items-center justify-end border-b border-zinc-800 px-4 py-3">
                  <span className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
                    {lesson.language?.toUpperCase() ?? "CODE"}
                  </span>
                </div>
                <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-6 text-zinc-200">
                  <code>{lesson.codeSnippet}</code>
                </pre>
              </section>
            ) : null}

            <section className="rounded-[2rem] border border-indigo-500/20 bg-indigo-500/5 p-8 shadow-[0_0_0_1px_rgba(99,102,241,0.06),0_24px_80px_rgba(15,23,42,0.25)]">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-indigo-200/85">
                Check your understanding
              </p>
              <p className="mt-4 text-lg text-zinc-100">{lesson.quiz.question}</p>
              <textarea
                className="mt-6 w-full rounded-2xl border border-indigo-400/15 bg-zinc-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:ring-2 focus:ring-indigo-500"
                placeholder="Type your answer here…"
                rows={4}
              />
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* TODO(step-7): wire this to /api/evaluate */}
                <button
                  className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white opacity-70"
                  disabled
                  title="Coming soon"
                  type="button"
                >
                  Check my answer
                </button>
                <p className="text-sm text-zinc-400">
                  Quiz checking ships in the next update.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LearnPage() {
  const ingestionData = useAtlasStore((state) => state.ingestionData);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!ingestionData) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    async function fetchLesson() {
      setIsLoading(true);
      setLesson(null);
      setError(null);

      try {
        const response = await fetch("/api/lesson", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(ingestionData),
          signal: controller.signal,
        });

        const payload = (await response.json().catch(() => null)) as
          | Record<string, unknown>
          | null;

        if (!response.ok) {
          throw new Error(
            typeof payload?.error === "string"
              ? payload.error
              : "Failed to generate lesson"
          );
        }

        if (isActive) {
          setLesson(normalizeLesson(payload));
        }
      } catch (nextError) {
        if (controller.signal.aborted || !isActive) {
          return;
        }

        setError(
          nextError instanceof Error
            ? nextError.message
            : "Failed to generate lesson"
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void fetchLesson();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [ingestionData, retryCount]);

  if (!ingestionData) {
    return <EmptyState />;
  }

  if (isLoading || (!error && !lesson)) {
    return <LoadingState />;
  }

  if (error || !lesson) {
    return (
      <ErrorState
        error={error ?? "Failed to generate lesson"}
        onRetry={() => {
          setRetryCount((count) => count + 1);
        }}
      />
    );
  }

  return <LessonLayout ingestionData={ingestionData} lesson={lesson} />;
}
