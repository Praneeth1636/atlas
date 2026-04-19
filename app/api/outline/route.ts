import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

import { OUTLINE_SYSTEM_PROMPT } from "@/app/lib/prompts";
import type {
  Depth,
  IngestionData,
  LearningPath,
  LessonSpec,
} from "@/app/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_OPENAI_MODEL = "gpt-4o";

type AiProvider = {
  client: OpenAI;
  model: string;
  label: "groq" | "openai";
};

type OutlineRequestBody = {
  ingestionData?: IngestionData;
  depth?: Depth;
};

type LessonTemplate = Pick<LessonSpec, "title" | "summary" | "focusArea">;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isDepth(value: unknown): value is Depth {
  return value === "quick" || value === "solid" || value === "deep";
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
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

function createFallbackOutline(
  ingestionData: IngestionData,
  depth: Depth
): LearningPath {
  const sourceTitle = deriveSourceTitle(ingestionData);
  const shortTitle = sourceTitle.replace(/^.*\//, "");
  const templatesBySource: Record<Depth, LessonTemplate[]> =
    ingestionData.sourceType === "github"
      ? {
          quick: [
            {
              title: `What ${shortTitle} is trying to do`,
              summary:
                "Get oriented around the repository, the problem it tackles, and the big-picture workflow before diving into details.",
              focusArea: "orientation",
            },
            {
              title: `How ${shortTitle} is structured`,
              summary:
                "Map the main files, components, and runtime flow so the project stops feeling like a black box.",
              focusArea: "architecture",
            },
            {
              title: `The core mechanism inside ${shortTitle}`,
              summary:
                "Focus on the central model, algorithm, or data path that makes the repository work.",
              focusArea: "core-algorithm",
            },
            {
              title: `Using and adapting ${shortTitle}`,
              summary:
                "Close with the practical tradeoffs, configuration levers, and where the project is most useful in practice.",
              focusArea: "applications",
            },
          ],
          solid: [
            {
              title: `What ${shortTitle} is trying to do`,
              summary:
                "Get oriented around the repository, the problem it tackles, and the high-level workflow before diving deeper.",
              focusArea: "orientation",
            },
            {
              title: `How ${shortTitle} is structured`,
              summary:
                "Map the key files, components, and execution flow so the architecture becomes concrete.",
              focusArea: "architecture",
            },
            {
              title: `The core mechanism inside ${shortTitle}`,
              summary:
                "Focus on the main model, algorithm, or data transformation pipeline that drives the repository's results.",
              focusArea: "core-algorithm",
            },
            {
              title: `Training, tuning, and evaluation`,
              summary:
                "Look at the knobs that change behavior, the metrics that matter, and how the project is typically validated.",
              focusArea: "evaluation",
            },
            {
              title: `Where ${shortTitle} works best`,
              summary:
                "Synthesize the tradeoffs, constraints, and practical use cases so the learner can reason about real deployment choices.",
              focusArea: "tradeoffs",
            },
          ],
          deep: [
            {
              title: `What ${shortTitle} is optimizing for`,
              summary:
                "Frame the repository's objective, assumptions, and the context needed to read the implementation critically.",
              focusArea: "orientation",
            },
            {
              title: `How the codebase is partitioned`,
              summary:
                "Break down the architecture into modules, responsibilities, and data handoffs so the reading path is explicit.",
              focusArea: "architecture",
            },
            {
              title: `The core mechanism inside ${shortTitle}`,
              summary:
                "Dive into the main model or algorithm with enough specificity to support implementation-level reasoning.",
              focusArea: "core-algorithm",
            },
            {
              title: `Implementation details that matter`,
              summary:
                "Look at the concrete files, configuration surfaces, and code paths that have the biggest effect on behavior.",
              focusArea: "implementation",
            },
            {
              title: `Failure modes and evaluation tradeoffs`,
              summary:
                "Study the places where the system can underperform, how those risks are measured, and what tradeoffs emerge in practice.",
              focusArea: "evaluation",
            },
            {
              title: `Extending ${shortTitle} in the real world`,
              summary:
                "Close by connecting the design to real applications, extension points, and the questions an advanced reader should investigate next.",
              focusArea: "applications",
            },
          ],
        }
      : {
          quick: [
            {
              title: `The big idea in ${shortTitle}`,
              summary:
                "Start with the core claim of the document and why it mattered enough to read in the first place.",
              focusArea: "theory",
            },
            {
              title: `How the main mechanism works`,
              summary:
                "Focus on the central conceptual machinery so the learner can explain the paper's actual contribution.",
              focusArea: "core-algorithm",
            },
            {
              title: `What evidence supports it`,
              summary:
                "Highlight the results, experiments, or arguments that make the document persuasive.",
              focusArea: "evaluation",
            },
            {
              title: `Why this document still matters`,
              summary:
                "Close with impact, applications, and the practical lens a reader should carry forward.",
              focusArea: "applications",
            },
          ],
          solid: [
            {
              title: `The big idea in ${shortTitle}`,
              summary:
                "Orient the learner around the document's thesis, motivation, and what problem it is trying to solve.",
              focusArea: "theory",
            },
            {
              title: `The architecture or mechanism at the center`,
              summary:
                "Map the moving pieces so the learner understands how the core method actually operates.",
              focusArea: "architecture",
            },
            {
              title: `Why the mechanism works`,
              summary:
                "Go deeper on the reasoning, representations, or algorithms that make the document's contribution meaningful.",
              focusArea: "core-algorithm",
            },
            {
              title: `What the results prove`,
              summary:
                "Look at experiments, comparisons, and benchmarks to understand how the authors support their claims.",
              focusArea: "evaluation",
            },
            {
              title: `Open questions and practical impact`,
              summary:
                "Close by connecting the document to downstream applications, limitations, and the next questions a serious reader should ask.",
              focusArea: "applications",
            },
          ],
          deep: [
            {
              title: `The problem setting behind ${shortTitle}`,
              summary:
                "Establish the theoretical context, prior limitations, and the assumptions the document is trying to overturn or refine.",
              focusArea: "theory",
            },
            {
              title: `The architecture at the center`,
              summary:
                "Map the document's internal structure so the learner can track how the major components coordinate.",
              focusArea: "architecture",
            },
            {
              title: `The mathematical or algorithmic mechanism`,
              summary:
                "Examine the specific mechanism in enough detail to support technical explanation and implementation-level reasoning.",
              focusArea: "core-algorithm",
            },
            {
              title: `Implementation and experimental choices`,
              summary:
                "Focus on the concrete settings, ablations, and methodological details that make the work credible or fragile.",
              focusArea: "implementation",
            },
            {
              title: `Tradeoffs, limits, and failure modes`,
              summary:
                "Study where the document's argument is strongest, where it is weakest, and what caveats an expert reader should keep in mind.",
              focusArea: "tradeoffs",
            },
            {
              title: `What this changed afterwards`,
              summary:
                "Synthesize the lasting impact, downstream uses, and the advanced follow-up questions this document invites.",
              focusArea: "applications",
            },
          ],
        };

  const lessons = templatesBySource[depth].map((template, index) => ({
    id: `lesson-${index + 1}`,
    order: index + 1,
    ...template,
  }));

  return {
    sourceTitle,
    depth,
    lessons,
  };
}

function buildOutlineUserPrompt(ingestionData: IngestionData, depth: Depth) {
  if (ingestionData.sourceType === "pdf") {
    return `Depth: ${depth}
Source type: PDF
Source ref: ${ingestionData.sourceRef}
Title: ${ingestionData.metadata.fullName}
Description: ${ingestionData.metadata.description ?? "(none)"}
Pages: ${ingestionData.metadata.pageCount ?? "(unknown)"}

Extracted text (truncated):
${ingestionData.readme.slice(0, 6000)}`;
  }

  return `Depth: ${depth}
Source type: GitHub repository
Source ref: ${ingestionData.sourceRef}
Repository: ${ingestionData.metadata.fullName}
Description: ${ingestionData.metadata.description ?? "(none)"}
Language: ${ingestionData.metadata.language ?? "(mixed)"}

README (truncated):
${ingestionData.readme.slice(0, 5000)}

Top-level file tree:
${ingestionData.fileTree
  .slice(0, 16)
  .map((file) => `- ${file.type === "dir" ? "[DIR]" : "[FILE]"} ${file.path}`)
  .join("\n")}`;
}

function sanitizeLessonSpec(
  raw: unknown,
  index: number
): LessonSpec | null {
  if (!isObject(raw)) {
    return null;
  }

  const title = isNonEmptyString(raw.title) ? raw.title.trim() : null;
  const summary = isNonEmptyString(raw.summary) ? raw.summary.trim() : null;
  const focusArea = isNonEmptyString(raw.focusArea)
    ? raw.focusArea.trim()
    : null;

  if (!title || !summary || !focusArea) {
    return null;
  }

  return {
    id: `lesson-${index + 1}`,
    order: index + 1,
    title,
    summary,
    focusArea,
  };
}

function sanitizeLearningPath(
  raw: unknown,
  ingestionData: IngestionData,
  depth: Depth
): LearningPath | null {
  if (!isObject(raw) || !Array.isArray(raw.lessons)) {
    return null;
  }

  if (raw.lessons.length < 4 || raw.lessons.length > 6) {
    return null;
  }

  const lessons = raw.lessons
    .map((lesson, index) => sanitizeLessonSpec(lesson, index))
    .filter((lesson): lesson is LessonSpec => lesson !== null);

  if (lessons.length !== raw.lessons.length) {
    return null;
  }

  const ids = new Set(lessons.map((lesson) => lesson.id));

  if (ids.size !== lessons.length) {
    return null;
  }

  return {
    sourceTitle: isNonEmptyString(raw.sourceTitle)
      ? raw.sourceTitle.trim()
      : ingestionData.metadata.fullName,
    depth,
    lessons,
  };
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

async function requestOutline({
  client,
  model,
  userPrompt,
  extraSystemMessages = [],
}: {
  client: OpenAI;
  model: string;
  userPrompt: string;
  extraSystemMessages?: string[];
}) {
  const response = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    temperature: 0.5,
    max_tokens: 1800,
    messages: [
      { role: "system", content: OUTLINE_SYSTEM_PROMPT },
      ...extraSystemMessages.map((message) => ({
        role: "system" as const,
        content: message,
      })),
      { role: "user", content: userPrompt },
    ],
  });

  return response.choices[0]?.message?.content;
}

async function generateOutline({
  providers,
  ingestionData,
  depth,
}: {
  providers: AiProvider[];
  ingestionData: IngestionData;
  depth: Depth;
}): Promise<LearningPath> {
  const userPrompt = buildOutlineUserPrompt(ingestionData, depth);
  let lastReason = "";

  for (const provider of providers) {
    let extraSystemMessages: string[] = [];

    for (let attempt = 0; attempt < 2; attempt += 1) {
      let raw: string | null | undefined;

      try {
        raw = await requestOutline({
          client: provider.client,
          model: provider.model,
          userPrompt,
          extraSystemMessages,
        });
      } catch (error) {
        lastReason = `The ${provider.label} model request failed.`;
        console.error(`[outline] ${provider.label} request failed:`, error);

        if (attempt === 0) {
          continue;
        }

        break;
      }

      if (!raw) {
        lastReason = `The ${provider.label} model returned an empty response.`;

        if (attempt === 0) {
          extraSystemMessages = [
            "Your previous response was empty. Return ONLY valid JSON with 4 to 6 lessons in a contiguous learning path.",
          ];
          continue;
        }

        break;
      }

      let parsed: unknown;

      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        lastReason = `The ${provider.label} model returned invalid JSON.`;

        if (attempt === 0) {
          extraSystemMessages = [
            "Your previous response was invalid JSON. Return ONLY valid JSON for the outline schema.",
          ];
          continue;
        }

        console.error("[outline] Invalid JSON response:", error);
        break;
      }

      const outline = sanitizeLearningPath(parsed, ingestionData, depth);

      if (outline) {
        return outline;
      }

      lastReason = `The ${provider.label} model returned an invalid outline shape.`;
      console.error("[outline] Invalid outline response:", parsed);

      if (attempt === 0) {
        extraSystemMessages = [
          "Your previous response did not match the outline schema. Return 4 to 6 lessons with unique concrete titles, 1-indexed contiguous order, and valid lesson ids like lesson-1.",
        ];
      }
    }
  }

  if (lastReason) {
    console.warn("[outline] Falling back to safe outline:", lastReason);
  }

  return createFallbackOutline(ingestionData, depth);
}

export async function POST(request: NextRequest) {
  let body: OutlineRequestBody;

  try {
    body = (await request.json()) as OutlineRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid outline request" },
      { status: 400 }
    );
  }

  if (!isValidIngestionData(body.ingestionData) || !isDepth(body.depth)) {
    return NextResponse.json(
      { error: "Missing required outline data" },
      { status: 400 }
    );
  }

  const aiProviders = createAiProviders();

  if (aiProviders.length === 0) {
    console.error("[outline] GROQ_API_KEY or OPENAI_API_KEY not set");

    return NextResponse.json(
      { error: "Failed to generate outline. Please try again." },
      { status: 500 }
    );
  }

  try {
    const outline = await generateOutline({
      providers: aiProviders,
      ingestionData: body.ingestionData,
      depth: body.depth,
    });

    return NextResponse.json(outline);
  } catch (error) {
    console.error("[outline]", error);

    return NextResponse.json(
      { error: "Failed to generate outline. Please try again." },
      { status: 500 }
    );
  }
}
