"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface MermaidDiagramProps {
  chart: string;
}

export default function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const id = useMemo(
    () => `mermaid-${Math.random().toString(36).slice(2, 10)}`,
    []
  );
  const hasInitialized = useRef(false);
  const [svg, setSvg] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function renderDiagram() {
      setSvg(null);
      setHasError(false);

      try {
        const mermaid = (await import("mermaid")).default;

        if (!hasInitialized.current) {
          mermaid.initialize({
            startOnLoad: false,
            theme: "dark",
            securityLevel: "loose",
            fontFamily: "inherit",
          });
          hasInitialized.current = true;
        }

        const { svg: nextSvg } = await mermaid.render(id, chart);

        if (isActive) {
          setSvg(nextSvg);
        }
      } catch (error) {
        console.error("[mermaid] Failed to render diagram", error);

        if (isActive) {
          setHasError(true);
        }
      }
    }

    void renderDiagram();

    return () => {
      isActive = false;
    };
  }, [chart, id]);

  return (
    <section className="space-y-3">
      <p className="text-sm font-medium uppercase tracking-[0.24em] text-zinc-500">
        Concept map
      </p>
      {hasError ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-base font-semibold text-zinc-100">
            Diagram unavailable
          </h3>
          <pre className="mt-4 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/80 p-4 font-mono text-xs leading-6 text-zinc-300">
            {chart}
          </pre>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          {svg ? (
            <div
              className="flex min-w-max justify-center [&>svg]:h-auto [&>svg]:max-w-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="flex min-h-48 items-center justify-center text-sm text-zinc-500">
              Rendering diagram…
            </div>
          )}
        </div>
      )}
    </section>
  );
}
