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

function createFallbackOutline(
  ingestionData: IngestionData,
  depth: Depth
): LearningPath {
  return {
    sourceTitle: ingestionData.metadata.fullName,
    depth,
    lessons: [
      {
        id: "lesson-1",
        order: 1,
        title: "Overview",
        summary:
          "Get oriented around the source, what it is trying to do, and why it matters before diving into specifics.",
        focusArea: "orientation",
      },
      {
        id: "lesson-2",
        order: 2,
        title: "Architecture",
        summary:
          "Map the major components so the learner can see how the core pieces fit together.",
        focusArea: "architecture",
      },
      {
        id: "lesson-3",
        order: 3,
        title: "Key Mechanisms",
        summary:
          "Focus on the central mechanisms, algorithms, or ideas that make this source distinctive.",
        focusArea: "core-algorithm",
      },
      {
        id: "lesson-4",
        order: 4,
        title: "Applications",
        summary:
          "Connect the ideas back to practical use, implications, and what a learner should do next.",
        focusArea: "applications",
      },
    ],
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
