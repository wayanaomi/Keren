"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RetryDocumentProcessingButton({
  documentId,
  label = "Retry extraction",
}: {
  documentId: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function processDocument() {
    setPending(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/knowledge-base/${encodeURIComponent(documentId)}/process`,
        { method: "POST" },
      );

      const result = (await response.json().catch(() => ({}))) as {
        status?: string;
        error?: string;
      };

      if (result.status === "PROCESSED") {
        setMessage("Document extraction completed.");
      } else if (result.status === "PROCESSING") {
        setMessage("Document processing is already underway.");
      } else {
        setMessage(
          result.error || "Document extraction could not be completed.",
        );
      }
    } catch {
      setMessage("Could not reach the processing service. Please try again.");
    } finally {
      setPending(false);
      router.refresh();
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={processDocument}
        disabled={pending}
        aria-busy={pending}
        className="text-sm font-semibold text-ink underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Processing..." : label}
      </button>

      {message && (
        <p role="status" className="mt-1 text-xs text-stone">
          {message}
        </p>
      )}
    </div>
  );
}
