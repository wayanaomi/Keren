import { cn } from "@/lib/utils";

type LogoTone = "color" | "reversed" | "mono-black" | "mono-white";

/**
 * The Keren mark: a K built from a vertical bar, an upper arm, and a lower
 * "slash" arm, with the signature four-point spark at the join.
 *
 * No source logo asset exists in this workspace, so the mark is coded here
 * from the brand guide's description (K + orange slash + spark) rather than
 * traced from a file.
 */
export function KerenMark({
  tone = "color",
  className,
}: {
  tone?: LogoTone;
  className?: string;
}) {
  const wordColor =
    tone === "reversed" || tone === "mono-white" ? "#FFFFFF" : "#121212";
  const accentColor =
    tone === "mono-black" ? "#121212" : tone === "mono-white" ? "#FFFFFF" : "#FE6811";

  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("h-8 w-8", className)}
      aria-hidden="true"
      fill="none"
    >
      {/* vertical bar of the K */}
      <rect x="6" y="4" width="10" height="40" fill={wordColor} />
      {/* upper arm */}
      <polygon points="18,22 34,4 46,4 24,27" fill={wordColor} />
      {/* lower arm — the slash */}
      <polygon points="18,26 46,44 34,44 18,34" fill={accentColor} />
      {/* the spark */}
      <path
        d="M27 16 L29.2 21.8 L35 24 L29.2 26.2 L27 32 L24.8 26.2 L19 24 L24.8 21.8 Z"
        fill={accentColor}
      />
    </svg>
  );
}

export function KerenLogo({
  tone = "color",
  showDescriptor = false,
  className,
  wordmarkClassName,
}: {
  tone?: LogoTone;
  showDescriptor?: boolean;
  className?: string;
  wordmarkClassName?: string;
}) {
  const wordColor =
    tone === "reversed" || tone === "mono-white" ? "text-white" : "text-ink";
  const accentColor =
    tone === "mono-black" ? "text-ink" : tone === "mono-white" ? "text-white" : "text-orange";

  return (
    <div className={cn("inline-flex flex-col", className)}>
      <div className="inline-flex items-center gap-0.5">
        <KerenMark tone={tone} className="h-8 w-8 shrink-0" />
        <span
          className={cn(
            "font-sans text-2xl font-extrabold tracking-tight",
            wordColor,
            wordmarkClassName,
          )}
        >
          eren
        </span>
      </div>
      {showDescriptor && (
        <span className={cn("text-xs font-medium", wordColor)}>
          AI Opportunity <span className={accentColor}>Intelligence</span>
        </span>
      )}
    </div>
  );
}
