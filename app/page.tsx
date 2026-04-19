"use client";

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { useAtlasStore } from "@/app/lib/store";
import type { IngestionData, SourceType } from "@/app/lib/types";

const GITHUB_REPO_URL_PATTERN =
  /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/;
const PDF_URL_PATTERN = /^https?:\/\//;
const DEMO_REPO_URL = "https://github.com/karpathy/nanoGPT";

export default function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setIngestionData = useAtlasStore((state) => state.setIngestionData);
  const setLearningPath = useAtlasStore((state) => state.setLearningPath);
  const invalidateLessons = useAtlasStore((state) => state.invalidateLessons);
  const [activeTab, setActiveTab] = useState<SourceType>("github");
  const [repoUrl, setRepoUrl] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Analyzing repository…");
  const [error, setError] = useState<string | null>(null);

  const handleAnalyzeSuccess = (data: IngestionData) => {
    setIngestionData(data);
    setLearningPath(null);
    invalidateLessons();
    router.push("/plan");
  };

  const submitRepo = async (nextRepoUrl: string) => {
    const trimmedUrl = nextRepoUrl.trim();

    if (!GITHUB_REPO_URL_PATTERN.test(trimmedUrl)) {
      setError("Please enter a valid GitHub repository URL");
      return;
    }

    setIsLoading(true);
    setLoadingLabel("Analyzing repository…");
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoUrl: trimmedUrl }),
      });

      const data = (await response.json()) as IngestionData & { error?: string };

      if (!response.ok) {
        setError(data.error || "Failed to analyze repository");
        return;
      }

      handleAnalyzeSuccess(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitPdfFile = async (file: File | null) => {
    if (!file) {
      setError("Please choose a PDF file first.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a valid PDF file.");
      return;
    }

    setIsLoading(true);
    setLoadingLabel("Analyzing PDF…");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/analyze-pdf", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as IngestionData & { error?: string };

      if (!response.ok) {
        setError(data.error || "Failed to analyze PDF");
        return;
      }

      handleAnalyzeSuccess(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitPdfUrl = async (nextPdfUrl: string) => {
    const trimmedUrl = nextPdfUrl.trim();

    if (!PDF_URL_PATTERN.test(trimmedUrl)) {
      setError("Please enter a valid PDF URL");
      return;
    }

    setIsLoading(true);
    setLoadingLabel("Analyzing PDF…");
    setError(null);

    try {
      const response = await fetch("/api/analyze-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pdfUrl: trimmedUrl }),
      });

      const data = (await response.json()) as IngestionData & { error?: string };

      if (!response.ok) {
        setError(data.error || "Failed to analyze PDF");
        return;
      }

      handleAnalyzeSuccess(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitRepo(repoUrl);
  };

  const handlePdfUrlSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitPdfUrl(pdfUrl);
  };

  const handleDemo = async () => {
    setActiveTab("github");
    setRepoUrl(DEMO_REPO_URL);
    await submitRepo(DEMO_REPO_URL);
  };

  const handleFileSelection = (file: File | null) => {
    setSelectedFile(file);
    setError(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFileSelection(event.target.files?.[0] ?? null);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileSelection(event.dataTransfer.files?.[0] ?? null);
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
            Learn any source, interactively.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
            Paste a GitHub repo or upload a PDF and Atlas builds you a
            personalized lesson path with diagrams, code, and quizzes.
          </p>

          <div className="flex flex-wrap gap-3 border-b border-white/10 pb-4">
            {(["github", "pdf"] as const).map((tab) => (
              <button
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  activeTab === tab
                    ? "border-indigo-400/40 bg-indigo-500/10 text-indigo-100 shadow-[inset_0_-2px_0_0_rgba(129,140,248,0.9)]"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
                disabled={isLoading}
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setError(null);
                }}
                type="button"
              >
                {tab === "github" ? "GitHub Repo" : "PDF"}
              </button>
            ))}
          </div>

          {error ? <div className="text-sm text-red-400">{error}</div> : null}

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
              <span>{loadingLabel}</span>
            </div>
          ) : activeTab === "github" ? (
            <form className="space-y-4" onSubmit={handleGitHubSubmit}>
              <input
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 px-4 py-3 text-base text-white outline-none transition focus:ring-2 focus:ring-indigo-500"
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
            </form>
          ) : (
            <div className="space-y-5">
              <input
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
                ref={fileInputRef}
                type="file"
              />
              <button
                className={`flex w-full flex-col items-center justify-center rounded-[1.75rem] border border-dashed px-6 py-10 text-center transition ${
                  isDragging
                    ? "border-indigo-400/60 bg-indigo-500/10 text-indigo-100"
                    : "border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-zinc-500"
                }`}
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => {
                  setIsDragging(false);
                }}
                onDrop={handleDrop}
                type="button"
              >
                <span className="text-sm font-medium text-zinc-100">
                  Drop a PDF here, or click to browse
                </span>
                <span className="mt-2 text-sm text-zinc-500">
                  Up to 15 MB per document
                </span>
              </button>

              {selectedFile ? (
                <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-200">
                  <span className="truncate">{selectedFile.name}</span>
                  <button
                    className="ml-4 text-zinc-500 transition hover:text-zinc-200"
                    onClick={() => {
                      handleFileSelection(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    type="button"
                  >
                    ×
                  </button>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!selectedFile}
                  onClick={() => {
                    void submitPdfFile(selectedFile);
                  }}
                  type="button"
                >
                  Analyze PDF file
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs uppercase tracking-[0.28em] text-zinc-500">
                <div className="h-px flex-1 bg-zinc-800" />
                <span>or</span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              <form className="space-y-4" onSubmit={handlePdfUrlSubmit}>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 px-4 py-3 text-base text-white outline-none transition focus:ring-2 focus:ring-indigo-500"
                    onChange={(event) => {
                      setPdfUrl(event.target.value);
                      if (error) {
                        setError(null);
                      }
                    }}
                    placeholder="https://arxiv.org/pdf/1706.03762"
                    type="url"
                    value={pdfUrl}
                  />
                  <button
                    className="inline-flex items-center justify-center rounded-2xl border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-100 transition hover:border-zinc-500"
                    type="submit"
                  >
                    Analyze PDF URL
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
