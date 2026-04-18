import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

import { LESSON_SYSTEM_PROMPT } from "@/app/lib/prompts";
import { IngestionData, Lesson } from "@/app/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

const FALLBACK_MERMAID_DIAGRAM = `graph TD
  A[Repository] --> B[Core Module]
  B --> C[Implementation]
  C --> D[Output]`;

function isMissingIngestionField(body: Partial<IngestionData> | null) {
  return !body || !body.metadata || body.readme === undefined || !body.fileTree;
}

function buildUserPrompt({ metadata, readme, fileTree }: IngestionData) {
  return `Repository: ${metadata.fullName}
Description: ${metadata.description ?? "(none)"}
Language: ${metadata.language ?? "(mixed)"}

README (truncated):
${readme.slice(0, 4000)}

Top-level file tree:
${fileTree
  .map((file) => `- ${file.type === "dir" ? "[DIR]" : "[FILE]"} ${file.name}`)
  .join("\n")}`;
}

function hasBalancedBrackets(chart: string) {
  return (chart.match(/\[/g) || []).length === (chart.match(/\]/g) || []).length;
}

function isValidMermaid(chart: unknown) {
  if (typeof chart !== "string") {
    return false;
  }

  const trimmedChart = chart.trim();

  if (
    !trimmedChart.startsWith("graph ") &&
    !trimmedChart.startsWith("flowchart ")
  ) {
    return false;
  }

  return hasBalancedBrackets(trimmedChart);
}

function isNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidLessonShape(value: unknown): value is Lesson {
  if (!value || typeof value !== "object") {
    return false;
  }

  const lesson = value as Lesson;

  return (
    isNonEmptyString(lesson.title) &&
    isNonEmptyString(lesson.explanation) &&
    isNonEmptyString(lesson.mermaidDiagram) &&
    typeof lesson.quiz === "object" &&
    lesson.quiz !== null &&
    isNonEmptyString(lesson.quiz.question) &&
    isNonEmptyString(lesson.quiz.expectedConcept) &&
    (lesson.codeSnippet === null || typeof lesson.codeSnippet === "string") &&
    (lesson.language === null || typeof lesson.language === "string")
  );
}

async function requestLessonFromGroq(
  groq: OpenAI,
  userPrompt: string,
  extraSystemMessages: string[] = []
) {
  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL,
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 2000,
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
  userPrompt: string
): Promise<Lesson> {
  let extraSystemMessages: string[] = [];
  let lastValidLesson: Lesson | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = await requestLessonFromGroq(
      groq,
      userPrompt,
      extraSystemMessages
    );

    if (!raw) {
      if (attempt === 0) {
        extraSystemMessages = [
          "Your previous response was empty. Return ONLY the JSON object, no prose, no markdown.",
        ];
        continue;
      }

      throw new Error("Empty lesson response from Groq");
    }

    let parsedLesson: unknown;

    try {
      parsedLesson = JSON.parse(raw);
    } catch (error) {
      if (attempt === 0) {
        extraSystemMessages = [
          "Your previous response was invalid JSON. Return ONLY the JSON object, no prose, no markdown.",
        ];
        continue;
      }

      throw error;
    }

    if (!isValidLessonShape(parsedLesson)) {
      console.error("[lesson] Missing required lesson fields:", parsedLesson);

      if (attempt === 0) {
        extraSystemMessages = [
          "Your previous response was missing one or more required fields. Return the full JSON object with all required fields populated.",
        ];
        continue;
      }

      throw new Error("Lesson response missing required fields");
    }

    lastValidLesson = parsedLesson;

    if (isValidMermaid(parsedLesson.mermaidDiagram)) {
      return parsedLesson;
    }

    if (attempt === 0) {
      extraSystemMessages = [
        "Your previous response included an invalid Mermaid diagram. Return the full JSON object again, and ensure mermaidDiagram starts with graph TD or flowchart TD and contains valid Mermaid syntax.",
      ];
      continue;
    }
  }

  if (lastValidLesson) {
    console.warn(
      "[lesson] Mermaid validation failed twice, using fallback diagram"
    );

    return {
      ...lastValidLesson,
      mermaidDiagram: FALLBACK_MERMAID_DIAGRAM,
    };
  }

  throw new Error("Failed to generate lesson");
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

  if (!process.env.GROQ_API_KEY) {
    console.error("[lesson] GROQ_API_KEY not set");

    return NextResponse.json(
      { error: "Failed to generate lesson. Please try again." },
      { status: 500 }
    );
  }

  const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: GROQ_BASE_URL,
  });
  const userPrompt = buildUserPrompt(body as IngestionData);

  try {
    const lesson = await generateLesson(groq, userPrompt);

    return NextResponse.json(lesson);
  } catch (error) {
    console.error("[lesson] Groq error:", error);

    return NextResponse.json(
      { error: "Failed to generate lesson. Please try again." },
      { status: 500 }
    );
  }
}
