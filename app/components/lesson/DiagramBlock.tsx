"use client";

import MermaidDiagram from "@/app/components/MermaidDiagram";

interface DiagramBlockProps {
  diagramType: string;
  title?: string;
  mermaid: string;
}

export default function DiagramBlock({
  diagramType,
  title,
  mermaid,
}: DiagramBlockProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-zinc-500">
            Concept map
          </p>
          {title ? (
            <h2 className="mt-2 text-xl font-semibold text-zinc-100">{title}</h2>
          ) : null}
        </div>
        <span className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
          {diagramType}
        </span>
      </div>
      <MermaidDiagram chart={mermaid} />
    </section>
  );
}
