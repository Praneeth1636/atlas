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
