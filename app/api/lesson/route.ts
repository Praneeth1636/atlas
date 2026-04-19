import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

import { LESSON_SYSTEM_PROMPT } from "@/app/lib/prompts";
import type { IngestionData, Lesson } from "@/app/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_OPENAI_MODEL = "gpt-4o";
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
const MERMAID_PREFIXES = [
  "graph ",
  "flowchart ",
  "sequenceDiagram",
  "classDiagram",
  "gantt",
  "timeline",
  "stateDiagram",
  "mindmap",
  "erDiagram",
];

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

function isMissingIngestionField(body: Partial<IngestionData> | null) {
  return (
    !body ||
    (body.sourceType !== "github" && body.sourceType !== "pdf") ||
    typeof body.sourceRef !== "string" ||
    !body.metadata ||
    body.readme === undefined ||
    !Array.isArray(body.fileTree)
  );
}

function buildUserPrompt({
  sourceType,
  sourceRef,
  metadata,
  readme,
  fileTree,
}: IngestionData) {
  if (sourceType === "pdf") {
    return `Source type: PDF
Source ref: ${sourceRef}
Title: ${metadata.fullName}
Description: ${metadata.description ?? "(none)"}
Pages: ${metadata.pageCount ?? "(unknown)"}

Extracted text (truncated):
${readme.slice(0, 8000)}`;
  }

  return `Source type: GitHub repository
Source ref: ${sourceRef}
Repository: ${metadata.fullName}
Description: ${metadata.description ?? "(none)"}
Language: ${metadata.language ?? "(mixed)"}

README (truncated):
${readme.slice(0, 6000)}

Top-level file tree:
${fileTree
  .map((file) => `- ${file.type === "dir" ? "[DIR]" : "[FILE]"} ${file.name}`)
  .join("\n")}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function countChar(text: string, char: string) {
  return text.split(char).length - 1;
}

function hasBalancedBrackets(chart: string) {
  return (
    countChar(chart, "[") === countChar(chart, "]") &&
    countChar(chart, "(") === countChar(chart, ")") &&
    countChar(chart, "{") === countChar(chart, "}")
  );
}

function isValidMermaid(chart: unknown) {
  if (!isNonEmptyString(chart)) {
    return false;
  }

  const trimmedChart = chart.trim();

  if (!MERMAID_PREFIXES.some((prefix) => trimmedChart.startsWith(prefix))) {
    return false;
  }

  return hasBalancedBrackets(trimmedChart);
}

function validateBlock(block: unknown) {
  if (!isObject(block) || typeof block.type !== "string") {
    return "Each block must be an object with a valid type.";
  }

  switch (block.type) {
    case "text":
      return isNonEmptyString(block.body)
        ? null
        : "Text blocks require a non-empty body.";
    case "diagram":
      if (!VALID_DIAGRAM_TYPES.has(block.diagramType as never)) {
        return "Diagram blocks require a valid diagramType.";
      }

      if (block.title !== undefined && typeof block.title !== "string") {
        return "Diagram block titles must be strings when provided.";
      }

      return isValidMermaid(block.mermaid)
        ? null
        : "Diagram blocks require valid Mermaid syntax.";
    case "table":
      if (!Array.isArray(block.headers) || !Array.isArray(block.rows)) {
        return "Table blocks require non-empty headers and rows.";
      }

      const headers = block.headers;
      const rows = block.rows;

      if (
        block.title !== undefined &&
        typeof block.title !== "string"
      ) {
        return "Table block titles must be strings when provided.";
      }

      if (
        headers.length === 0 ||
        headers.some((header) => !isNonEmptyString(header))
      ) {
        return "Table blocks require non-empty headers.";
      }

      if (
        rows.length === 0 ||
        rows.some(
          (row) =>
            !Array.isArray(row) ||
            row.length !== headers.length ||
            row.some((cell) => typeof cell !== "string")
        )
      ) {
        return "Table blocks require rows that match the header count.";
      }

      return null;
    case "callout":
      if (!VALID_CALLOUT_VARIANTS.has(block.variant as never)) {
        return "Callout blocks require a valid variant.";
      }

      if (block.title !== undefined && typeof block.title !== "string") {
        return "Callout block titles must be strings when provided.";
      }

      return isNonEmptyString(block.body)
        ? null
        : "Callout blocks require a non-empty body.";
    case "code":
      if (!isNonEmptyString(block.language) || !isNonEmptyString(block.code)) {
        return "Code blocks require language and code strings.";
      }

      if (block.caption !== undefined && typeof block.caption !== "string") {
        return "Code block captions must be strings when provided.";
      }

      return null;
    default:
      return "Unsupported block type.";
  }
}

function validateLessonShape(value: unknown): { valid: boolean; reason: string } {
  if (!isObject(value)) {
    return { valid: false, reason: "Lesson must be an object." };
  }

  if (!isNonEmptyString(value.title)) {
    return { valid: false, reason: "Lesson title is required." };
  }

  if (!isNonEmptyString(value.subtitle)) {
    return { valid: false, reason: "Lesson subtitle is required." };
  }

  if (!Array.isArray(value.blocks) || value.blocks.length < 3 || value.blocks.length > 7) {
    return {
      valid: false,
      reason: "Lesson blocks must contain between 3 and 7 items.",
    };
  }

  let diagramCount = 0;

  for (let index = 0; index < value.blocks.length; index += 1) {
    const block = value.blocks[index];
    const blockError = validateBlock(block);

    if (blockError) {
      return {
        valid: false,
        reason: `Block ${index + 1}: ${blockError}`,
      };
    }

    if (isObject(block) && block.type === "diagram") {
      diagramCount += 1;
    }
  }

  if (diagramCount === 0) {
    return {
      valid: false,
      reason: "At least one diagram block is required.",
    };
  }

  if (!isObject(value.quiz)) {
    return { valid: false, reason: "Quiz is required." };
  }

  if (
    !isNonEmptyString(value.quiz.question) ||
    !isNonEmptyString(value.quiz.expectedConcept)
  ) {
    return {
      valid: false,
      reason: "Quiz question and expectedConcept are required.",
    };
  }

  return { valid: true, reason: "" };
}

async function requestLessonFromGroq(
  groq: OpenAI,
  userPrompt: string,
  extraSystemMessages: string[] = [],
  model: string
) {
  const response = await groq.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 2500,
    messages: [
      { role: "system", content: LESSON_SYSTEM_PROMPT },
      ...extraSystemMessages.map((message) => ({
        role: "system" as const,
        content: message,
      })),
      { role: "user", content: userPrompt },
    ],
  });

  return response.choices[0]?.message?.content;
}

async function generateLesson(
  groq: OpenAI,
  userPrompt: string,
  model: string
): Promise<Lesson> {
  let extraSystemMessages: string[] = [];
  let lastValidationReason = "";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = await requestLessonFromGroq(
      groq,
      userPrompt,
      extraSystemMessages,
      model
    );

    if (!raw) {
      lastValidationReason = "The model returned an empty response.";

      if (attempt === 0) {
        extraSystemMessages = [
          "Your previous response was empty. Return ONLY a valid JSON object matching the required lesson schema with 3 to 7 blocks and at least one valid diagram block.",
        ];
        continue;
      }

      break;
    }

    let parsedLesson: unknown;

    try {
      parsedLesson = JSON.parse(raw);
    } catch (error) {
      lastValidationReason = "The model returned invalid JSON.";

      if (attempt === 0) {
        extraSystemMessages = [
          "Your previous response was invalid JSON. Return ONLY a valid JSON object matching the required lesson schema with 3 to 7 blocks and at least one valid diagram block.",
        ];
        continue;
      }

      console.error("[lesson] Invalid JSON response:", error);
      break;
    }

    const validation = validateLessonShape(parsedLesson);

    if (validation.valid) {
      return parsedLesson as Lesson;
    }

    lastValidationReason = validation.reason;
    console.error("[lesson] Invalid lesson response:", validation.reason, parsedLesson);

    if (attempt === 0) {
      extraSystemMessages = [
        `Your previous response did not match the required lesson schema: ${validation.reason} Return ONLY valid JSON matching the schema exactly. The lesson must contain 3 to 7 blocks and at least one diagram block with valid Mermaid syntax.`,
      ];
      continue;
    }
  }

  if (lastValidationReason) {
    console.warn("[lesson] Falling back to safe lesson:", lastValidationReason);
  }

  return createFallbackLesson();
}

export async function POST(request: NextRequest) {
  let body: Partial<IngestionData> | null = null;

  try {
    body = (await request.json()) as Partial<IngestionData>;
  } catch {
    return NextResponse.json(
      { error: "Invalid lesson request" },
      { status: 400 }
    );
  }

  if (isMissingIngestionField(body)) {
    return NextResponse.json(
      { error: "Missing required ingestion data" },
      { status: 400 }
    );
  }

  const groqApiKey = process.env.GROQ_API_KEY;
  const openAiApiKey = process.env.OPENAI_API_KEY;

  if (!groqApiKey && !openAiApiKey) {
    console.error("[lesson] GROQ_API_KEY or OPENAI_API_KEY not set");

    return NextResponse.json(
      { error: "Failed to generate lesson. Please try again." },
      { status: 500 }
    );
  }

  const groq = groqApiKey
    ? new OpenAI({
        apiKey: groqApiKey,
        baseURL: GROQ_BASE_URL,
      })
    : new OpenAI({ apiKey: openAiApiKey });
  const model = groqApiKey
    ? process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL
    : process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL;
  const userPrompt = buildUserPrompt(body as IngestionData);

  try {
    const lesson = await generateLesson(groq, userPrompt, model);

    return NextResponse.json(lesson);
  } catch (error) {
    console.error("[lesson] Groq error:", error);

    return NextResponse.json(
      { error: "Failed to generate lesson. Please try again." },
      { status: 500 }
    );
  }
}
