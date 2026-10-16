import { cn } from "@/lib/utils";
import { forwardRef, type TextareaHTMLAttributes } from "react";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-stone focus-visible:border-ink",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
