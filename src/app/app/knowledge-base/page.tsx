import Link from "next/link";
import { requireOrganization } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadDocumentForm } from "./upload-form";
import { deleteKnowledgeDocumentAction } from "./actions";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function KnowledgeBasePage() {
  const { organization } = await requireOrganization();

  const documents = await db.knowledgeDocument.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      sizeBytes: true,
      createdAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-bold text-ink">Knowledge base</h1>
      <p className="mb-5 text-sm text-stone">
        Upload business plans, pitch decks, financials and previous proposals
        once — Keren reuses them when drafting applications.
      </p>

      {!storage.configured ? (
        <Card className="mb-5 p-4">
          <p className="text-sm font-semibold text-ink">
            Document storage is not configured
          </p>
          <p className="mt-1 text-sm text-stone">
            Uploads are disabled until the S3-compatible storage settings are
            complete.
          </p>
        </Card>
      ) : (
        <UploadDocumentForm />
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Your documents</h2>
        <span className="text-xs text-stone">
          {documents.length} {documents.length === 1 ? "document" : "documents"}
        </span>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          title="No documents yet"
          body="Upload supporting documents so Keren can reference them when drafting your applications."
        />
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-col gap-3 rounded-md border border-line bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-ink">
                  {doc.name}
                </p>
                <p className="mt-1 text-xs text-stone">
                  {doc.type.replace(/_/g, " ")} · {formatFileSize(doc.sizeBytes)}
                  {" · "}
                  {doc.createdAt.toLocaleDateString()}
                </p>
                <div className="mt-2">
                  <Badge
                    tone={doc.status === "PROCESSED" ? "verified" : "neutral"}
                  >
                    {doc.status}
                  </Badge>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <Link
                  href={`/app/knowledge-base/${doc.id}/download`}
                  className="text-sm font-medium text-ink underline underline-offset-4"
                >
                  Download
                </Link>

                <form action={deleteKnowledgeDocumentAction.bind(null, doc.id)}>
                  <button
                    type="submit"
                    className="text-sm font-medium text-red-600 underline underline-offset-4"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
