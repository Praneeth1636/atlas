"use client";

interface CodeBlockProps {
  language: string;
  code: string;
  caption?: string;
}

export default function CodeBlock({
  language,
  code,
  caption,
}: CodeBlockProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      <div className="flex items-center justify-end border-b border-zinc-800 px-4 py-3">
        <span className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
          {language.toUpperCase()}
        </span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-6 text-zinc-200">
        <code>{code}</code>
      </pre>
      {caption ? (
        <p className="border-t border-zinc-800 px-5 py-3 text-sm text-zinc-400">
          {caption}
        </p>
      ) : null}
    </section>
  );
}
