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
] as const;

const FALLBACK_MERMAID = `graph LR
  A[Source] --> B[Key Concept]
  B --> C[How It Works]
  C --> D[Why It Matters]`;

type DiagramType =
  | "flowchart"
  | "sequence"
  | "class"
  | "gantt"
  | "timeline"
  | "mindmap"
  | "state"
  | "er"
  | "graph";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function countChar(text: string, char: string) {
  return text.split(char).length - 1;
}

export function hasBalancedMermaidBrackets(chart: string) {
  return (
    countChar(chart, "[") === countChar(chart, "]") &&
    countChar(chart, "(") === countChar(chart, ")") &&
    countChar(chart, "{") === countChar(chart, "}")
  );
}

export function hasMermaidPrefix(chart: string) {
  return MERMAID_PREFIXES.some((prefix) => chart.startsWith(prefix));
}

function sanitizeLabel(label: string) {
  return label
    .replace(/["'`]/g, "")
    .replace(/[<>{}\[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30);
}

function extractMermaidLabels(chart: string) {
  const labels: string[] = [];
  const seen = new Set<string>();

  const pushLabel = (rawLabel: string | undefined) => {
    if (!rawLabel) {
      return;
    }

    const label = sanitizeLabel(rawLabel);

    if (!label || seen.has(label)) {
      return;
    }

    seen.add(label);
    labels.push(label);
  };

  for (const match of Array.from(
    chart.matchAll(/\[([^\]\n]+)\]|\(([^\)\n]+)\)|\{([^\}\n]+)\}/g)
  )) {
    pushLabel(match[1] ?? match[2] ?? match[3]);
  }

  for (const match of Array.from(
    chart.matchAll(
      /\b(?:participant|actor)\s+([A-Za-z0-9_]+)(?:\s+as\s+([^\n]+))?/g
    )
  )) {
    pushLabel(match[2] ?? match[1]);
  }

  for (const match of Array.from(chart.matchAll(/\|([^|\n]+)\|/g))) {
    pushLabel(match[1]);
  }

  return labels;
}

export function createFallbackMermaidFromChart(chart?: string) {
  const labels = chart ? extractMermaidLabels(chart).slice(0, 5) : [];

  if (labels.length >= 2) {
    const ids = ["A", "B", "C", "D", "E"];
    const lines = ["graph LR"];

    for (let index = 0; index < labels.length; index += 1) {
      lines.push(`  ${ids[index]}[${labels[index]}]`);
    }

    for (let index = 0; index < labels.length - 1; index += 1) {
      lines.push(`  ${ids[index]} --> ${ids[index + 1]}`);
    }

    return lines.join("\n");
  }

  return FALLBACK_MERMAID;
}

export function repairMermaidChart(chart: string) {
  let repaired = chart.trim().replace(/\r\n/g, "\n");

  repaired = repaired.replace(
    /\|([^|\n]+)\|>/g,
    (_, label: string) => `|${sanitizeLabel(label)}| `
  );

  repaired = repaired.replace(
    /\b(participant|actor)\s+([A-Za-z0-9_]+)\s+as\s+["']([^"'\n]+)["']/g,
    (_, role: string, id: string, label: string) =>
      `${role} ${id} as ${sanitizeLabel(label)}`
  );

  repaired = repaired.replace(/[ \t]+\n/g, "\n");

  return repaired;
}

export function inferDiagramType(chart: string): DiagramType {
  if (chart.startsWith("sequenceDiagram")) {
    return "sequence";
  }

  if (chart.startsWith("classDiagram")) {
    return "class";
  }

  if (chart.startsWith("gantt")) {
    return "gantt";
  }

  if (chart.startsWith("timeline")) {
    return "timeline";
  }

  if (chart.startsWith("stateDiagram")) {
    return "state";
  }

  if (chart.startsWith("mindmap")) {
    return "mindmap";
  }

  if (chart.startsWith("erDiagram")) {
    return "er";
  }

  if (chart.startsWith("flowchart ")) {
    return "flowchart";
  }

  return "graph";
}

export function normalizeMermaidChart(chart: unknown) {
  if (!isNonEmptyString(chart)) {
    return null;
  }

  const repaired = repairMermaidChart(chart);

  if (!hasMermaidPrefix(repaired) || !hasBalancedMermaidBrackets(repaired)) {
    return createFallbackMermaidFromChart(repaired);
  }

  if (/\|[^|\n]+\|>/.test(repaired)) {
    return createFallbackMermaidFromChart(repaired);
  }

  return repaired;
}
