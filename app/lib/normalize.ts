import type { Lesson } from "@/app/lib/types";

export function normalizeLesson(raw: unknown): Lesson {
  const source =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {};

  const normalizeNullString = (value: unknown) =>
    value === null ||
    value === undefined ||
    value === "null" ||
    value === ""
      ? null
      : String(value);

  const quiz =
    source.quiz && typeof source.quiz === "object"
      ? (source.quiz as Record<string, unknown>)
      : {};

  return {
    title: String(source.title ?? "Untitled lesson"),
    explanation: String(source.explanation ?? ""),
    mermaidDiagram: String(
      source.mermaidDiagram ?? "graph TD\n  A[Lesson] --> B[Continue]"
    ),
    codeSnippet: normalizeNullString(source.codeSnippet),
    language: normalizeNullString(source.language),
    quiz: {
      question: String(quiz.question ?? ""),
      expectedConcept: String(quiz.expectedConcept ?? ""),
    },
  };
}
