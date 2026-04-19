import {
  inferDiagramType,
  normalizeMermaidChart,
} from "@/app/lib/mermaid";
import type { Lesson, LessonBlock } from "@/app/lib/types";

const VALID_DIAGRAM_TYPES = new Set([
  "flowchart",
  "sequence",
  "class",
  "gantt",
  "timeline",
  "mindmap",
  "state",
  "er",
  "graph",
] as const);

const VALID_CALLOUT_VARIANTS = new Set([
  "info",
  "tip",
  "warning",
  "key",
] as const);

function createFallbackLesson(): Lesson {
  return {
    title: "Overview",
    subtitle: "A quick introduction to this source.",
    blocks: [
      {
        type: "text",
        body: "We had trouble generating a detailed lesson. Here's a minimal overview — please try again.",
      },
      {
        type: "diagram",
        diagramType: "flowchart",
        title: "Concept flow",
        mermaid:
          "graph TD\n  A[Source] --> B[Analysis]\n  B --> C[Key Concept]\n  C --> D[Applied Understanding]",
      },
    ],
    quiz: {
      question: "What is the main idea of this source?",
      expectedConcept: "Core concept identification",
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeOptionalString(value: unknown) {
  return isNonEmptyString(value) ? value.trim() : undefined;
}

function sanitizeBlock(raw: unknown): LessonBlock | null {
  if (!isObject(raw) || typeof raw.type !== "string") {
    return null;
  }

  switch (raw.type) {
    case "text":
      if (!isNonEmptyString(raw.body)) {
        return null;
      }

      return {
        type: "text",
        body: raw.body.trim(),
      };
    case "diagram":
      const mermaid = normalizeMermaidChart(raw.mermaid);

      if (!VALID_DIAGRAM_TYPES.has(raw.diagramType as never) || !mermaid) {
        return null;
      }

      return {
        type: "diagram",
        diagramType: inferDiagramType(mermaid),
        title: normalizeOptionalString(raw.title),
        mermaid,
      };
    case "table":
      if (!Array.isArray(raw.headers) || !Array.isArray(raw.rows)) {
        return null;
      }

      const headers = raw.headers
        .filter((header): header is string => isNonEmptyString(header))
        .map((header) => header.trim());
      const rows = raw.rows
        .filter((row): row is unknown[] => Array.isArray(row))
        .map((row) => row.map((cell) => String(cell ?? "")));

      if (
        headers.length === 0 ||
        rows.length === 0 ||
        rows.some((row) => row.length !== headers.length)
      ) {
        return null;
      }

      return {
        type: "table",
        title: normalizeOptionalString(raw.title),
        headers,
        rows,
      };
    case "callout":
      if (
        !VALID_CALLOUT_VARIANTS.has(raw.variant as never) ||
        !isNonEmptyString(raw.body)
      ) {
        return null;
      }

      return {
        type: "callout",
        variant: raw.variant as "info" | "tip" | "warning" | "key",
        title: normalizeOptionalString(raw.title),
        body: raw.body.trim(),
      };
    case "code":
      if (!isNonEmptyString(raw.code)) {
        return null;
      }

      return {
        type: "code",
        language: isNonEmptyString(raw.language) ? raw.language.trim() : "text",
        code: raw.code,
        caption: normalizeOptionalString(raw.caption),
      };
    default:
      return null;
  }
}

function sanitizeQuiz(raw: unknown) {
  if (!isObject(raw)) {
    return {
      question: "What is the main idea of this source?",
      expectedConcept: "Core concept identification",
    };
  }

  return {
    question: isNonEmptyString(raw.question)
      ? raw.question.trim()
      : "What is the main idea of this source?",
    expectedConcept: isNonEmptyString(raw.expectedConcept)
      ? raw.expectedConcept.trim()
      : "Core concept identification",
  };
}

export function normalizeLesson(raw: unknown): Lesson {
  if (!isObject(raw)) {
    return createFallbackLesson();
  }

  if (Array.isArray(raw.blocks)) {
    const blocks = raw.blocks
      .map((block) => sanitizeBlock(block))
      .filter((block): block is LessonBlock => block !== null);

    if (blocks.length > 0) {
      return {
        title: isNonEmptyString(raw.title) ? raw.title.trim() : "Overview",
        subtitle: isNonEmptyString(raw.subtitle)
          ? raw.subtitle.trim()
          : "A quick introduction to this source.",
        blocks,
        quiz: sanitizeQuiz(raw.quiz),
      };
    }
  }

  if (isNonEmptyString(raw.explanation) && isNonEmptyString(raw.mermaidDiagram)) {
    const blocks: LessonBlock[] = [
      {
        type: "text",
        body: raw.explanation.trim(),
      },
    ];

    blocks.push({
      type: "diagram",
      diagramType: inferDiagramType(
        normalizeMermaidChart(raw.mermaidDiagram) ??
          "graph TD\n  A[Source] --> B[Key Idea]"
      ),
      mermaid:
        normalizeMermaidChart(raw.mermaidDiagram) ??
        "graph TD\n  A[Source] --> B[Key Idea]",
    });

    if (isNonEmptyString(raw.codeSnippet)) {
      blocks.push({
        type: "code",
        language: isNonEmptyString(raw.language) ? raw.language.trim() : "text",
        code: raw.codeSnippet,
      });
    }

    return {
      title: isNonEmptyString(raw.title) ? raw.title.trim() : "Overview",
      subtitle: isNonEmptyString(raw.subtitle)
        ? raw.subtitle.trim()
        : "A quick introduction to this source.",
      blocks,
      quiz: sanitizeQuiz(raw.quiz),
    };
  }

  return createFallbackLesson();
}
