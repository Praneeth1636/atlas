export type SourceType = "github" | "pdf";

export type DiagramBlock = {
  type: "diagram";
  diagramType:
    | "flowchart"
    | "sequence"
    | "class"
    | "gantt"
    | "timeline"
    | "mindmap"
    | "state"
    | "er"
    | "graph";
  title?: string;
  mermaid: string;
};

export type TableBlock = {
  type: "table";
  title?: string;
  headers: string[];
  rows: string[][];
};

export type CalloutBlock = {
  type: "callout";
  variant: "info" | "tip" | "warning" | "key";
  title?: string;
  body: string;
};

export type CodeBlock = {
  type: "code";
  language: string;
  code: string;
  caption?: string;
};

export type TextBlock = {
  type: "text";
  body: string;
};

export type LessonBlock =
  | DiagramBlock
  | TableBlock
  | CalloutBlock
  | CodeBlock
  | TextBlock;

export interface IngestionMetadata {
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  url: string;
  pageCount?: number;
}

export interface IngestionFileTreeEntry {
  name: string;
  path: string;
  type: "file" | "dir";
}

export interface IngestionData {
  sourceType: SourceType;
  sourceRef: string;
  metadata: IngestionMetadata;
  readme: string;
  fileTree: IngestionFileTreeEntry[];
}

export interface Lesson {
  title: string;
  subtitle: string;
  blocks: LessonBlock[];
  quiz: LessonQuiz;
}

export interface LessonQuiz {
  question: string;
  expectedConcept: string;
}
