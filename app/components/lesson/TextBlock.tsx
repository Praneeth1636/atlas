"use client";

interface TextBlockProps {
  body: string;
}

export default function TextBlock({ body }: TextBlockProps) {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_80px_rgba(15,23,42,0.3)] backdrop-blur-xl">
      <div className="max-w-[65ch] text-base leading-8 text-zinc-200">
        {paragraphs.map((paragraph, index) => (
          <p className="mb-4 last:mb-0" key={`${index}-${paragraph}`}>
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
