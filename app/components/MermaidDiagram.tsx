"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  createFallbackMermaidFromChart,
  normalizeMermaidChart,
} from "@/app/lib/mermaid";

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
        const renderCandidates = [
          chart,
          normalizeMermaidChart(chart),
          createFallbackMermaidFromChart(chart),
        ].filter(
          (candidate, index, candidates): candidate is string =>
            Boolean(candidate) && candidates.indexOf(candidate) === index
        );

        if (!hasInitialized.current) {
          mermaid.initialize({
            startOnLoad: false,
            theme: "dark",
            securityLevel: "loose",
            fontFamily: "inherit",
          });
          hasInitialized.current = true;
        }

        let nextSvg: string | null = null;

        for (let index = 0; index < renderCandidates.length; index += 1) {
          try {
            const renderedDiagram = await mermaid.render(
              `${id}-${index}`,
              renderCandidates[index]
            );

            nextSvg = renderedDiagram.svg;
            break;
          } catch (error) {
            console.error("[mermaid] Failed to render diagram", error);
          }
        }

        if (!nextSvg) {
          throw new Error("Unable to render Mermaid diagram");
        }

        if (isActive) {
          setSvg(nextSvg);
        }
      } catch (error) {
        console.error("[mermaid] Exhausted diagram fallbacks", error);

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

  if (hasError) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h3 className="text-base font-semibold text-zinc-100">
          Diagram unavailable
        </h3>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/80 p-4 font-mono text-xs leading-6 text-zinc-300">
          {chart}
        </pre>
      </div>
    );
  }

  return (
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
  );
}
