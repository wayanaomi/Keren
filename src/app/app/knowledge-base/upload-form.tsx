"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  cancelKnowledgeDocumentUploadAction,
  completeKnowledgeDocumentUploadAction,
  createKnowledgeDocumentUploadUrlAction,
} from "./actions";

const documentTypes = [
  ["BUSINESS_PLAN", "Business plan"],
  ["PITCH_DECK", "Pitch deck"],
  ["PREVIOUS_APPLICATION", "Previous application"],
  ["FOUNDER_CV", "Founder CV"],
  ["FINANCIAL_DOCUMENT", "Financial document"],
  ["PRODUCT_DOCUMENT", "Product document"],
  ["COMPANY_PROFILE", "Company profile"],
  ["IMPACT_REPORT", "Impact report"],
  ["PREVIOUS_PROPOSAL", "Previous proposal"],
  ["OTHER", "Other"],
] as const;

export function UploadDocumentForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    const type = formData.get("type");

    if (!(file instanceof File) || file.size === 0) {
      setError("Select a document to upload.");
      return;
    }

    if (typeof type !== "string" || !type) {
      setError("Select a document category.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError("The maximum permitted file size is 25 MB.");
      return;
    }

    setPending(true);

    let uploadKey: string | undefined;

    try {
      const intent = await createKnowledgeDocumentUploadUrlAction({
        name: file.name,
        sizeBytes: file.size,
        type,
      });

      if (intent.error || !intent.uploadUrl || !intent.key || !intent.contentType) {
        throw new Error(intent.error || "Could not prepare the upload.");
      }

      uploadKey = intent.key;

      const response = await fetch(intent.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": intent.contentType,
        },
        body: file,
      });

      if (!response.ok) {
        throw new Error(
          `Storage rejected the upload (HTTP ${response.status}). Check the storage connection and browser CORS configuration.`,
        );
      }

      const result = await completeKnowledgeDocumentUploadAction({
        name: file.name,
        sizeBytes: file.size,
        type,
        key: uploadKey,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setSuccess(result.success || "Document uploaded successfully.");
      formRef.current?.reset();
      router.refresh();
    } catch (uploadError) {
      if (uploadKey) {
        await cancelKnowledgeDocumentUploadAction(uploadKey).catch(() => undefined);
      }

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The document could not be uploaded. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="mb-6 space-y-4 rounded-lg border border-line bg-white p-4"
    >
      <div>
        <h2 className="text-base font-semibold text-ink">Upload a document</h2>
        <p className="mt-1 text-sm text-stone">
          PDF, Word, Excel or PowerPoint files. Maximum size: 25 MB.
        </p>
      </div>

      <div>
        <label
          htmlFor="document-type"
          className="mb-1 block text-sm font-medium text-ink"
        >
          Document category
        </label>
        <select
          id="document-type"
          name="type"
          required
          defaultValue=""
          disabled={pending}
          className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink"
        >
          <option value="" disabled>
            Select a category
          </option>
          {documentTypes.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="document-file"
          className="mb-1 block text-sm font-medium text-ink"
        >
          Choose document
        </label>
        <input
          id="document-file"
          name="file"
          type="file"
          required
          disabled={pending}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          className="block w-full text-sm text-stone file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="text-sm text-green-700">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Uploading document..." : "Upload document"}
      </button>
    </form>
  );
}
