"use client";

interface CalloutBlockProps {
  variant: "info" | "tip" | "warning" | "key";
  title?: string;
  body: string;
}

const VARIANT_STYLES: Record<
  CalloutBlockProps["variant"],
  { classes: string; icon: string; label: string }
> = {
  info: {
    classes: "border-blue-500/30 bg-blue-500/5 text-blue-200",
    icon: "ℹ️",
    label: "INFO",
  },
  tip: {
    classes: "border-emerald-500/30 bg-emerald-500/5 text-emerald-200",
    icon: "💡",
    label: "TIP",
  },
  warning: {
    classes: "border-amber-500/30 bg-amber-500/5 text-amber-200",
    icon: "⚠️",
    label: "WARNING",
  },
  key: {
    classes: "border-indigo-500/30 bg-indigo-500/5 text-indigo-200",
    icon: "★",
    label: "KEY INSIGHT",
  },
};

export default function CalloutBlock({
  variant,
  title,
  body,
}: CalloutBlockProps) {
  const variantStyle = VARIANT_STYLES[variant];

  return (
    <section
      className={`rounded-2xl border border-l-4 p-6 ${variantStyle.classes}`}
    >
      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em]">
        <span>{variantStyle.icon}</span>
        <span>{variantStyle.label}</span>
      </div>
      {title ? (
        <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
      ) : null}
      <p className="mt-3 text-sm leading-7 text-zinc-200">{body}</p>
    </section>
  );
}
