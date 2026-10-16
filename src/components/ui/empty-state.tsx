import { KerenMark } from "@/components/brand/logo";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-white px-6 py-16 text-center">
      <KerenMark className="mb-4 h-8 w-8 opacity-50" />
      <h3 className="text-base font-bold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-stone">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
