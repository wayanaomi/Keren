import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Tone = "neutral" | "verified" | "warn" | "danger" | "orange" | "ink";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-line/60 text-stone",
  verified: "bg-verified/10 text-verified",
  warn: "bg-warn/10 text-[#8a6300]",
  danger: "bg-danger/10 text-danger",
  orange: "bg-orange-tint text-ember",
  ink: "bg-ink text-white",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}

const verificationDotClasses: Record<string, string> = {
  VERIFIED: "bg-verified",
  NEEDS_VERIFICATION: "bg-warn",
  EXPIRED: "bg-danger",
};

const verificationLabel: Record<string, string> = {
  VERIFIED: "Verified",
  NEEDS_VERIFICATION: "Needs verification",
  EXPIRED: "Expired",
};

const verificationTone: Record<string, Tone> = {
  VERIFIED: "verified",
  NEEDS_VERIFICATION: "warn",
  EXPIRED: "danger",
};

export function VerificationBadge({ status }: { status: string }) {
  return (
    <Badge tone={verificationTone[status] ?? "neutral"}>
      <span className={cn("h-1.5 w-1.5 rounded-full", verificationDotClasses[status])} />
      {verificationLabel[status] ?? status}
    </Badge>
  );
}
