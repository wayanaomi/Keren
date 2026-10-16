import { cn } from "@/lib/utils";

/** The Keren spark — insight / AI / "you found a fit". Use sparingly, never as a bullet. */
export function Spark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-4 w-4 text-orange", className)} fill="currentColor" aria-hidden="true">
      <path d="M12 2 L14.2 9.8 L22 12 L14.2 14.2 L12 22 L9.8 14.2 L2 12 L9.8 9.8 Z" />
    </svg>
  );
}

/** The Keren slash — direction / progress / dividers. */
export function Slash({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-4 w-4 text-orange", className)} fill="currentColor" aria-hidden="true">
      <polygon points="8,2 14,2 16,22 10,22" />
    </svg>
  );
}
