import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

import { normalizeMermaidChart } from "@/app/lib/mermaid";
import { normalizeLesson } from "@/app/lib/normalize";
import { getLessonSystemPrompt } from "@/app/lib/prompts";
import type {
  Depth,
  IngestionData,
  Lesson,
  LessonSpec,
} from "@/app/lib/types";

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
type AiProvider = {
  client: OpenAI;
  model: string;
  label: "groq" | "openai";
};
const DEPTH_BLOCK_RANGES: Record<Depth, { min: number; max: number }> = {
  quick: { min: 3, max: 4 },
  solid: { min: 5, max: 7 },
  deep: { min: 6, max: 8 },
};

type PathContext = {
  totalLessons: number;
  previousTitles: string[];
};

type LessonRequestPayload = {
  ingestionData: IngestionData;
  depth: Depth;
  lessonSpec: LessonSpec;
  pathContext?: PathContext;
};

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function truncateWords(text: string, maxWords: number) {
  const words = normalizeWhitespace(text).split(" ").filter(Boolean);

  if (words.length <= maxWords) {
    return words.join(" ");
  }

  return `${words.slice(0, maxWords).join(" ")}…`;
}

function sanitizeMermaidLabel(text: string) {
  return normalizeWhitespace(text)
    .replace(/["'`()[\]{}:;/\\]/g, "")
    .replace(/[^\w -]/g, "")
    .slice(0, 28)
    .trim() || "Concept";
}

function deriveSourceTitle(ingestionData: IngestionData) {
  const title = normalizeWhitespace(ingestionData.metadata.fullName);

  if (title && title.toLowerCase() !== "document.pdf") {
    return title;
  }

  const firstMeaningfulLine = ingestionData.readme
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .find((line) => line.length > 6 && !line.includes("@"));

  return firstMeaningfulLine || title || "this source";
}

function extractSourceParagraphs(readme: string) {
  const normalized = readme
    .split(/\n{2,}/)
    .map((paragraph) => normalizeWhitespace(paragraph))
    .filter((paragraph) => paragraph.length > 40);

  return normalized.slice(0, 6);
}

function createLessonDiagram(
  sourceTitle: string,
  lessonSpec: LessonSpec,
  label: string
) {
  return {
    type: "diagram" as const,
    diagramType: "flowchart" as const,
    title: label,
    mermaid: `graph LR
  A[Prior Context]
  B[${sanitizeMermaidLabel(truncateWords(lessonSpec.focusArea, 3))}]
  C[${sanitizeMermaidLabel(truncateWords(lessonSpec.title, 4))}]
  D[${sanitizeMermaidLabel(truncateWords(sourceTitle, 4))}]
  A --> B
  B --> C
  C --> D`,
  };
}

function createLessonTable(
  ingestionData: IngestionData,
  lessonSpec: LessonSpec
) {
  if (ingestionData.sourceType === "pdf") {
    return {
      type: "table" as const,
      title: "Reading anchors",
      headers: ["Signal", "Value", "Why it matters"],
      rows: [
        ["Source", deriveSourceTitle(ingestionData), "Keeps the lesson grounded"],
        [
          "Pages",
          String(ingestionData.metadata.pageCount ?? "Unknown"),
          "Sets the document scope",
        ],
        ["Focus", lessonSpec.focusArea, "Frames the current lesson"],
        ["Goal", truncateWords(lessonSpec.summary, 8), "Defines the takeaway"],
      ],
    };
  }

  const keyFiles = ingestionData.fileTree
    .slice(0, 3)
    .map((file) => file.name)
    .join(", ") || "README.md";

  return {
    type: "table" as const,
    title: "Implementation anchors",
    headers: ["Signal", "Value", "Why it matters"],
    rows: [
      [
        "Language",
        ingestionData.metadata.language ?? "Mixed",
        "Hints at the implementation style",
      ],
      [
        "Stars",
        ingestionData.metadata.stars.toLocaleString(),
        "Shows project adoption",
      ],
      ["Key files", keyFiles, "Good next reading targets"],
      ["Focus", lessonSpec.focusArea, "Frames the current lesson"],
    ],
  };
}

function createLessonCallout(lessonSpec: LessonSpec) {
  const variant: "info" | "tip" | "warning" | "key" =
    lessonSpec.focusArea === "tradeoffs" || lessonSpec.focusArea === "evaluation"
      ? "warning"
      : lessonSpec.focusArea === "implementation"
        ? "tip"
        : lessonSpec.focusArea === "theory"
          ? "info"
          : "key";

  return {
    type: "callout" as const,
    variant,
    title: "Why this lesson matters",
    body: `${lessonSpec.summary} Keep the focus on ${lessonSpec.focusArea} rather than trying to relearn the whole source at once.`,
  };
}

function createLessonCodeBlock(ingestionData: IngestionData) {
  const keyFiles = ingestionData.fileTree
    .slice(0, 4)
    .map((file) => `${file.path}`)
    .join("\n");

  return {
    type: "code" as const,
    language: "text",
    caption: "Good files to inspect next",
    code: keyFiles || "README.md",
  };
}

function createFallbackLesson(payload: LessonRequestPayload): Lesson {
  const sourceTitle = deriveSourceTitle(payload.ingestionData);
  const sourceParagraphs = extractSourceParagraphs(payload.ingestionData.readme);
  const pathLead =
    payload.pathContext && payload.pathContext.previousTitles.length > 0
      ? `Earlier lessons covered ${payload.pathContext.previousTitles.join(", ")}. `
      : payload.lessonSpec.order === 1
        ? "This is the opening lesson in the path. "
        : "";
  const introText = `${pathLead}${payload.lessonSpec.summary} ${payload.ingestionData.metadata.description ? `${sourceTitle} is described as ${truncateWords(payload.ingestionData.metadata.description, 18)}.` : `The source is ${sourceTitle}.`} Focus on ${payload.lessonSpec.focusArea} as the organizing lens for this lesson.`;
  const detailText = sourceParagraphs[0]
    ? `A useful anchor from the source is: ${truncateWords(sourceParagraphs[0], payload.depth === "quick" ? 36 : payload.depth === "solid" ? 70 : 110)}`
    : `Use this lesson to connect ${payload.lessonSpec.title.toLowerCase()} back to the source's actual structure, terminology, and design choices.`;
  const closingText = sourceParagraphs[1]
    ? `As you continue, keep this second anchor in view: ${truncateWords(sourceParagraphs[1], payload.depth === "quick" ? 30 : payload.depth === "solid" ? 60 : 90)}`
    : `The next useful move is to compare this lesson's focus area with the rest of the path so you can see how the source builds up its full argument or system behavior.`;

  const blocks: Lesson["blocks"] = [
    {
      type: "text",
      body: introText,
    },
    createLessonDiagram(sourceTitle, payload.lessonSpec, "Concept map"),
  ];

  if (payload.depth !== "quick") {
    blocks.push({
      type: "text",
      body: detailText,
    });
  }

  if (payload.depth !== "quick") {
    blocks.push(createLessonTable(payload.ingestionData, payload.lessonSpec));
  }

  blocks.push(createLessonCallout(payload.lessonSpec));

  if (payload.depth === "deep") {
    blocks.push(createLessonDiagram(sourceTitle, payload.lessonSpec, "Lesson flow"));

    if (payload.ingestionData.sourceType === "github") {
      blocks.push(createLessonCodeBlock(payload.ingestionData));
    }
  }

  return {
    title: payload.lessonSpec.title,
    subtitle: payload.lessonSpec.summary,
    blocks: [
      ...blocks,
      {
        type: "text",
        body: closingText,
      },
    ],
    quiz: {
      question: `What is the key idea behind ${payload.lessonSpec.title}?`,
      expectedConcept: payload.lessonSpec.focusArea,
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isDepth(value: unknown): value is Depth {
  return value === "quick" || value === "solid" || value === "deep";
}

function isValidIngestionData(value: unknown): value is IngestionData {
  return (
    isObject(value) &&
    (value.sourceType === "github" || value.sourceType === "pdf") &&
    typeof value.sourceRef === "string" &&
    isObject(value.metadata) &&
    typeof value.readme === "string" &&
    Array.isArray(value.fileTree)
  );
}

function cleanMermaid(raw: string): string {
  return raw
    .replace(/(-->|==>|-\.->)\|([^|]+)\|>/g, "$1|$2|")
    .replace(/\|([^|]*)"([^|]*)\|/g, "|$1$2|")
    .replace(/\|([^|]+)\|/g, (_match, inside: string) =>
      `|${inside.replace(/\s+/g, " ").trim()}|`
    );
}

function sanitizeLessonSpec(raw: unknown): LessonSpec | null {
  if (!isObject(raw)) {
    return null;
  }

  const title = isNonEmptyString(raw.title) ? raw.title.trim() : null;
  const summary = isNonEmptyString(raw.summary) ? raw.summary.trim() : null;
  const focusArea = isNonEmptyString(raw.focusArea)
    ? raw.focusArea.trim()
    : null;
  const order =
    typeof raw.order === "number" && Number.isInteger(raw.order) && raw.order > 0
      ? raw.order
      : null;

  if (!title || !summary || !focusArea || !order) {
    return null;
  }

  return {
    id:
      isNonEmptyString(raw.id) && /^lesson-\d+$/.test(raw.id.trim())
        ? raw.id.trim()
        : `lesson-${order}`,
    order,
    title,
    summary,
    focusArea,
  };
}

function sanitizePathContext(raw: unknown): PathContext | undefined {
  if (!isObject(raw)) {
    return undefined;
  }

  const totalLessons =
    typeof raw.totalLessons === "number" &&
    Number.isInteger(raw.totalLessons) &&
    raw.totalLessons > 0
      ? raw.totalLessons
      : null;

  if (!totalLessons) {
    return undefined;
  }

  return {
    totalLessons,
    previousTitles: Array.isArray(raw.previousTitles)
      ? raw.previousTitles
          .filter((title): title is string => isNonEmptyString(title))
          .map((title) => title.trim())
      : [],
  };
}

function resolveLessonRequest(body: unknown): LessonRequestPayload | null {
  if (isValidIngestionData(body)) {
    return {
      ingestionData: body,
      depth: "solid",
      lessonSpec: {
        id: "lesson-1",
        order: 1,
        title: "Overview",
        summary: "A quick introduction to this source.",
        focusArea: "orientation",
      },
    };
  }

  if (!isObject(body) || !isValidIngestionData(body.ingestionData)) {
    return null;
  }

  return {
    ingestionData: body.ingestionData,
    depth: isDepth(body.depth) ? body.depth : "solid",
    lessonSpec:
      sanitizeLessonSpec(body.lessonSpec) ?? {
        id: "lesson-1",
        order: 1,
        title: "Overview",
        summary: "A quick introduction to this source.",
        focusArea: "orientation",
      },
    pathContext: sanitizePathContext(body.pathContext),
  };
}

function buildSourceContext({
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
${readme.slice(0, 7000)}`;
  }

  return `Source type: GitHub repository
Source ref: ${sourceRef}
Repository: ${metadata.fullName}
Description: ${metadata.description ?? "(none)"}
Language: ${metadata.language ?? "(mixed)"}
Stars: ${metadata.stars}

README (truncated):
${readme.slice(0, 5500)}

Top-level file tree:
${fileTree
  .slice(0, 18)
  .map((file) => `- ${file.type === "dir" ? "[DIR]" : "[FILE]"} ${file.path}`)
  .join("\n")}`;
}

function buildLessonUserPrompt({
  ingestionData,
  lessonSpec,
  pathContext,
}: LessonRequestPayload) {
  const pathSection = pathContext
    ? `

Path context:
This is lesson ${lessonSpec.order} of ${pathContext.totalLessons}.
Previous lessons covered: ${
        pathContext.previousTitles.length > 0
          ? pathContext.previousTitles.join(", ")
          : "(none)"
      }.
Do not re-explain those — reference them as prior knowledge.
`
    : `

Path context:
This is a standalone lesson. Treat it as the learner's first touchpoint.
`;

  return `${buildSourceContext(ingestionData)}

Lesson to generate:
- Title: ${lessonSpec.title}
- Summary: ${lessonSpec.summary}
- Focus area: ${lessonSpec.focusArea}
- Lesson order: ${lessonSpec.order}
${pathSection}
Return one complete lesson for this specific slot in the path.`;
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

      if (typeof block.mermaid === "string") {
        block.mermaid = cleanMermaid(block.mermaid);
      }

      return normalizeMermaidChart(block.mermaid)
        ? null
        : "Diagram blocks require valid Mermaid syntax.";
    case "table":
      if (!Array.isArray(block.headers) || !Array.isArray(block.rows)) {
        return "Table blocks require non-empty headers and rows.";
      }

      const headers = block.headers;
      const rows = block.rows;

      if (block.title !== undefined && typeof block.title !== "string") {
        return "Table block titles must be strings when provided.";
      }

      if (headers.length === 0 || headers.some((header) => !isNonEmptyString(header))) {
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

function validateLessonShape(
  value: unknown,
  depth: Depth
): { valid: boolean; reason: string } {
  if (!isObject(value)) {
    return { valid: false, reason: "Lesson must be an object." };
  }

  if (!isNonEmptyString(value.title)) {
    return { valid: false, reason: "Lesson title is required." };
  }

  if (!isNonEmptyString(value.subtitle)) {
    return { valid: false, reason: "Lesson subtitle is required." };
  }

  const blockRange = DEPTH_BLOCK_RANGES[depth];

  if (
    !Array.isArray(value.blocks) ||
    value.blocks.length < blockRange.min ||
    value.blocks.length > blockRange.max
  ) {
    return {
      valid: false,
      reason: `Lesson blocks must contain between ${blockRange.min} and ${blockRange.max} items for ${depth} depth.`,
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

function createAiProviders(): AiProvider[] {
  const groqApiKey = process.env.GROQ_API_KEY;
  const openAiApiKey = process.env.OPENAI_API_KEY;
  const providers: AiProvider[] = [];

  if (groqApiKey) {
    providers.push({
      label: "groq",
      client: new OpenAI({
        apiKey: groqApiKey,
        baseURL: GROQ_BASE_URL,
      }),
      model: process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL,
    });
  }

  if (openAiApiKey) {
    providers.push({
      label: "openai",
      client: new OpenAI({ apiKey: openAiApiKey }),
      model: process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
    });
  }

  return providers;
}

async function requestLessonFromModel({
  client,
  model,
  systemPrompt,
  userPrompt,
  depth,
  extraSystemMessages = [],
}: {
  client: OpenAI;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  depth: Depth;
  extraSystemMessages?: string[];
}) {
  const maxTokens =
    depth === "quick" ? 2200 : depth === "solid" ? 3600 : 5200;

  const response = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      ...extraSystemMessages.map((message) => ({
        role: "system" as const,
        content: message,
      })),
      { role: "user", content: userPrompt },
    ],
  });

  return response.choices[0]?.message?.content;
}

async function generateLesson({
  providers,
  payload,
}: {
  providers: AiProvider[];
  payload: LessonRequestPayload;
}): Promise<Lesson> {
  const userPrompt = buildLessonUserPrompt(payload);
  const systemPrompt = getLessonSystemPrompt(payload.depth);
  let lastValidationReason = "";

  for (const provider of providers) {
    let extraSystemMessages: string[] = [];

    for (let attempt = 0; attempt < 2; attempt += 1) {
      let raw: string | null | undefined;

      try {
        raw = await requestLessonFromModel({
          client: provider.client,
          model: provider.model,
          systemPrompt,
          userPrompt,
          depth: payload.depth,
          extraSystemMessages,
        });
      } catch (error) {
        lastValidationReason = `The ${provider.label} model request failed.`;
        console.error(`[lesson] ${provider.label} request failed:`, error);

        if (attempt === 0) {
          continue;
        }

        break;
      }

      if (!raw) {
        lastValidationReason = `The ${provider.label} model returned an empty response.`;

        if (attempt === 0) {
          extraSystemMessages = [
            "Your previous response was empty. Return ONLY a valid JSON object matching the required lesson schema for the requested depth, with valid Mermaid and the correct number of blocks.",
          ];
          continue;
        }

        break;
      }

      let parsedLesson: unknown;

      try {
        parsedLesson = JSON.parse(raw);
      } catch (error) {
        lastValidationReason = `The ${provider.label} model returned invalid JSON.`;

        if (attempt === 0) {
          extraSystemMessages = [
            "Your previous response was invalid JSON. Return ONLY a valid JSON object matching the required lesson schema for the requested depth.",
          ];
          continue;
        }

        console.error("[lesson] Invalid JSON response:", error);
        break;
      }

      const validation = validateLessonShape(parsedLesson, payload.depth);

      if (validation.valid) {
        return normalizeLesson(parsedLesson);
      }

      lastValidationReason = validation.reason;
      console.error(
        "[lesson] Invalid lesson response:",
        validation.reason,
        parsedLesson
      );

      if (attempt === 0) {
        extraSystemMessages = [
          `Your previous response did not match the required lesson schema: ${validation.reason} Return ONLY valid JSON matching the schema exactly. Respect the requested depth, keep valid Mermaid syntax, and avoid re-teaching prior lessons.`,
        ];
      }
    }
  }

  if (lastValidationReason) {
    console.warn("[lesson] Falling back to safe lesson:", lastValidationReason);
  }

  return createFallbackLesson(payload);
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid lesson request" },
      { status: 400 }
    );
  }

  const payload = resolveLessonRequest(body);

  if (!payload) {
    return NextResponse.json(
      { error: "Missing required ingestion data" },
      { status: 400 }
    );
  }

  const aiProviders = createAiProviders();

  if (aiProviders.length === 0) {
    console.error("[lesson] GROQ_API_KEY or OPENAI_API_KEY not set");

    return NextResponse.json(
      { error: "Failed to generate lesson. Please try again." },
      { status: 500 }
    );
  }

  try {
    const lesson = await generateLesson({
      providers: aiProviders,
      payload,
    });

    return NextResponse.json(lesson);
  } catch (error) {
    console.error("[lesson] Model error:", error);

    return NextResponse.json(
      { error: "Failed to generate lesson. Please try again." },
      { status: 500 }
    );
  }
}
