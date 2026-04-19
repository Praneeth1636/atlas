"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  CalloutBlock,
  CodeBlock,
  DiagramBlock,
  TableBlock,
  TextBlock,
} from "@/app/components/lesson";
import { normalizeLesson } from "@/app/lib/normalize";
import { useAtlasStore } from "@/app/lib/store";
import type { Depth, IngestionData, Lesson, LessonBlock } from "@/app/lib/types";

const LESSON_LOADING_MESSAGES = [
  "Analyzing the source…",
  "Finding the right lesson angle…",
  "Generating this lesson…",
  "Assembling the visual explanation…",
];

function AtlasBackground() {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_28%)]" />
  );
}

function TopBar({ ingestionData }: { ingestionData: IngestionData }) {
  return (
    <div className="relative border-b border-white/10 bg-zinc-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          className="text-sm uppercase tracking-[0.4em] text-white/55 transition hover:text-white"
          href="/"
        >
          Atlas
        </Link>
        {ingestionData.metadata.url ? (
          <a
            className="truncate text-sm text-zinc-300 transition hover:text-white"
            href={ingestionData.metadata.url}
            rel="noreferrer"
            target="_blank"
          >
            {ingestionData.metadata.fullName}
          </a>
        ) : (
          <p className="truncate text-sm text-zinc-300">
            {ingestionData.metadata.fullName}
          </p>
        )}
      </div>
    </div>
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

function BlockRenderer({ block }: { block: LessonBlock }) {
  switch (block.type) {
    case "text":
      return <TextBlock body={block.body} />;
    case "diagram":
      return (
        <DiagramBlock
          diagramType={block.diagramType}
          mermaid={block.mermaid}
          title={block.title}
        />
      );
    case "table":
      return (
        <TableBlock
          headers={block.headers}
          rows={block.rows}
          title={block.title}
        />
      );
    case "callout":
      return (
        <CalloutBlock
          body={block.body}
          title={block.title}
          variant={block.variant}
        />
      );
    case "code":
      return (
        <CodeBlock
          caption={block.caption}
          code={block.code}
          language={block.language}
        />
      );
    default:
      return null;
  }
}

function MetadataSummary({ ingestionData }: { ingestionData: IngestionData }) {
  if (ingestionData.sourceType === "pdf") {
    return ingestionData.metadata.pageCount ? (
      <span>{ingestionData.metadata.pageCount} pages</span>
    ) : null;
  }

  return (
    <>
      <span className="rounded-full border border-white/10 bg-zinc-950/70 px-3 py-1 text-zinc-200">
        {ingestionData.metadata.language || "Unknown language"}
      </span>
      <span aria-hidden="true" className="text-zinc-600">
        ·
      </span>
      <span>{ingestionData.metadata.stars.toLocaleString()} stars</span>
    </>
  );
}

function LessonLoadingPanel() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((currentIndex) =>
        (currentIndex + 1) % LESSON_LOADING_MESSAGES.length
      );
    }, 2000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_32px_120px_rgba(15,23,42,0.4)] backdrop-blur-xl">
      <div className="flex items-center justify-center gap-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-indigo-300" />
        <p className="text-base font-medium text-white" aria-live="polite">
          {LESSON_LOADING_MESSAGES[messageIndex]}
        </p>
      </div>
      <p className="mt-4 text-sm text-zinc-400">
        Atlas is generating this lesson on demand.
      </p>
    </section>
  );
}

function LessonErrorPanel({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_32px_120px_rgba(15,23,42,0.4)] backdrop-blur-xl">
      <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white">
        We couldn&apos;t generate this lesson.
      </h1>
      <p className="mt-4 text-white/65">
        Try again and Atlas will take another pass at it.
      </p>
      <p className="mt-3 text-sm text-zinc-500">{error}</p>
      <button
        className="mt-8 inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-500"
        onClick={onRetry}
        type="button"
      >
        Retry lesson
      </button>
    </section>
  );
}

function LessonNotFound() {
  return (
    <CenteredCardShell>
      <p className="text-sm uppercase tracking-[0.4em] text-white/45">Atlas</p>
      <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-white">
        Lesson not found.
      </h1>
      <p className="mt-4 text-white/65">
        Go back to the learning path and pick a valid lesson.
      </p>
      <Link
        className="mt-8 inline-flex rounded-2xl border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-100 transition hover:border-zinc-500"
        href="/plan"
      >
        Back to plan
      </Link>
    </CenteredCardShell>
  );
}

export default function LessonPage() {
  const params = useParams<{ lessonId: string }>();
  const router = useRouter();
  const ingestionData = useAtlasStore((state) => state.ingestionData);
  const learningPath = useAtlasStore((state) => state.learningPath);
  const depth = useAtlasStore((state) => state.depth);
  const lessonCache = useAtlasStore((state) => state.lessonCache);
  const cacheLesson = useAtlasStore((state) => state.cacheLesson);
  const setDepth = useAtlasStore((state) => state.setDepth);
  const setLearningPath = useAtlasStore((state) => state.setLearningPath);
  const invalidateLessons = useAtlasStore((state) => state.invalidateLessons);
  const lessonId = Array.isArray(params.lessonId)
    ? params.lessonId[0]
    : params.lessonId;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [pendingDepth, setPendingDepth] = useState<Depth | null>(null);

  const currentIndex = useMemo(() => {
    if (!learningPath) {
      return -1;
    }

    return learningPath.lessons.findIndex((entry) => entry.id === lessonId);
  }, [learningPath, lessonId]);

  const currentLessonSpec =
    currentIndex >= 0 && learningPath ? learningPath.lessons[currentIndex] : null;
  const previousLesson =
    currentIndex > 0 && learningPath ? learningPath.lessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 &&
    learningPath &&
    currentIndex < learningPath.lessons.length - 1
      ? learningPath.lessons[currentIndex + 1]
      : null;

  useEffect(() => {
    if (!ingestionData) {
      router.replace("/");
      return;
    }

    if (!learningPath) {
      router.replace("/plan");
    }
  }, [ingestionData, learningPath, router]);

  useEffect(() => {
    if (!ingestionData || !learningPath || !lessonId || !currentLessonSpec) {
      return;
    }

    const path = learningPath;
    const cachedLesson = lessonCache[lessonId];

    if (cachedLesson) {
      setLesson(cachedLesson);
      setError(null);
      setIsLoading(false);
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
          body: JSON.stringify({
            ingestionData,
            depth,
            lessonSpec: currentLessonSpec,
            pathContext: {
              totalLessons: path.lessons.length,
              previousTitles: path.lessons
                .slice(0, currentIndex)
                .map((entry) => entry.title),
            },
          }),
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

        const normalizedLesson = normalizeLesson(payload);

        if (isActive) {
          cacheLesson(lessonId, normalizedLesson);
          setLesson(normalizedLesson);
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
  }, [
    cacheLesson,
    currentIndex,
    currentLessonSpec,
    depth,
    ingestionData,
    learningPath,
    lessonCache,
    lessonId,
    retryCount,
  ]);

  if (!ingestionData || !learningPath) {
    return null;
  }

  if (!currentLessonSpec) {
    return <LessonNotFound />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <AtlasBackground />
      <TopBar ingestionData={ingestionData} />

      <div className="relative mx-auto max-w-6xl px-6 py-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-10 lg:self-start">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_80px_rgba(15,23,42,0.35)] backdrop-blur-xl">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
                Lessons
              </p>
              <div className="mt-4 space-y-2">
                {learningPath.lessons.map((entry) => {
                  const isCurrent = entry.id === lessonId;
                  const isCached = Boolean(lessonCache[entry.id]);

                  return (
                    <button
                      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                        isCurrent
                          ? "border border-indigo-400/20 bg-indigo-500/10 shadow-[inset_3px_0_0_0_rgba(129,140,248,0.9)]"
                          : "border border-transparent bg-zinc-950/45 hover:border-white/10 hover:bg-white/5"
                      }`}
                      key={entry.id}
                      onClick={() => {
                        router.push(`/learn/${entry.id}`);
                      }}
                      type="button"
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          isCurrent
                            ? "bg-indigo-300"
                            : isCached
                              ? "border border-emerald-300/70 bg-transparent"
                              : "border border-zinc-700 bg-transparent"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs uppercase tracking-[0.22em] text-zinc-500">
                          Lesson {entry.order}
                        </span>
                        <span
                          className={`mt-1 block truncate text-sm font-medium ${
                            isCurrent ? "text-indigo-100" : "text-zinc-200"
                          }`}
                        >
                          {entry.title}
                        </span>
                      </span>
                      {isCached && !isCurrent ? (
                        <span className="text-xs text-zinc-500">✓</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className="space-y-8">
            <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_32px_120px_rgba(15,23,42,0.4)] backdrop-blur-xl">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
                    Lesson {currentLessonSpec.order} of {learningPath.lessons.length}
                  </p>
                  <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                    {lesson?.title ?? currentLessonSpec.title}
                  </h1>
                  <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300">
                    {lesson?.subtitle ?? currentLessonSpec.summary}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                    <MetadataSummary ingestionData={ingestionData} />
                  </div>
                </div>

                <div className="w-full max-w-xs lg:pt-1">
                  <div className="rounded-2xl border border-white/10 bg-zinc-950/55 p-2">
                    <div className="grid grid-cols-3 gap-2">
                      {(["quick", "solid", "deep"] as const).map((option) => (
                        <button
                          className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                            depth === option
                              ? "bg-indigo-600 text-white"
                              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                          }`}
                          key={option}
                          onClick={() => {
                            if (option === depth) {
                              setPendingDepth(null);
                              return;
                            }

                            setPendingDepth(option);
                          }}
                          type="button"
                        >
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {pendingDepth ? (
                    <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4 text-sm text-zinc-300">
                      <p>
                        Switching depth will re-generate all lessons. Continue?
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          className="rounded-xl bg-amber-500 px-4 py-2 font-medium text-zinc-950 transition hover:bg-amber-400"
                          onClick={() => {
                            setDepth(pendingDepth);
                            invalidateLessons();
                            setLearningPath(null);
                            setPendingDepth(null);
                            router.push("/plan?regenerate=1");
                          }}
                          type="button"
                        >
                          Confirm
                        </button>
                        <button
                          className="rounded-xl border border-zinc-700 px-4 py-2 font-medium text-zinc-200 transition hover:border-zinc-500"
                          onClick={() => {
                            setPendingDepth(null);
                          }}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            {isLoading ? <LessonLoadingPanel /> : null}
            {error ? (
              <LessonErrorPanel
                error={error}
                onRetry={() => {
                  setRetryCount((count) => count + 1);
                }}
              />
            ) : null}

            {!isLoading && !error && lesson ? (
              <>
                {lesson.blocks.map((block, index) => (
                  <BlockRenderer block={block} key={`${block.type}-${index}`} />
                ))}

                <section className="rounded-[2rem] border border-indigo-500/20 bg-indigo-500/5 p-8 shadow-[0_0_0_1px_rgba(99,102,241,0.06),0_24px_80px_rgba(15,23,42,0.25)]">
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-indigo-200/85">
                    Check your understanding
                  </p>
                  <p className="mt-4 text-lg text-zinc-100">
                    {lesson.quiz.question}
                  </p>
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

                <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_80px_rgba(15,23,42,0.25)] backdrop-blur-xl">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {previousLesson ? (
                      <button
                        className="rounded-2xl border border-white/10 px-4 py-3 text-left text-sm text-zinc-200 transition hover:border-zinc-500 hover:bg-white/5"
                        onClick={() => {
                          router.push(`/learn/${previousLesson.id}`);
                        }}
                        type="button"
                      >
                        ← Previous: {previousLesson.title}
                      </button>
                    ) : (
                      <div />
                    )}

                    {nextLesson ? (
                      <button
                        className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-3 text-left text-sm text-indigo-100 transition hover:border-indigo-300/40 hover:bg-indigo-500/15"
                        onClick={() => {
                          router.push(`/learn/${nextLesson.id}`);
                        }}
                        type="button"
                      >
                        Next: {nextLesson.title} →
                      </button>
                    ) : (
                      <p className="text-sm font-medium text-emerald-200">
                        You&apos;ve completed the path 🎉
                      </p>
                    )}
                  </div>
                </section>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
