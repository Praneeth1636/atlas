export interface IngestionMetadata {
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  url: string;
}

export interface IngestionFileTreeEntry {
  name: string;
  path: string;
  type: "file" | "dir";
}

export interface IngestionData {
  metadata: IngestionMetadata;
  readme: string;
  fileTree: IngestionFileTreeEntry[];
}

export interface Lesson {
  title: string;
  explanation: string;
  mermaidDiagram: string;
  codeSnippet: string | null;
  language: string | null;
  quiz: {
    question: string;
    expectedConcept: string;
  };
}
