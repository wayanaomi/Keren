import { requireOrganization } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function KnowledgeBasePage() {
  const { organization } = await requireOrganization();
  const documents = await db.knowledgeDocument.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-bold text-ink">Knowledge base</h1>
      <p className="mb-5 text-sm text-stone">
        Upload business plans, pitch decks, financials and previous proposals once — Keren reuses them when
        drafting applications.
      </p>

      {!storage.configured && (
        <Card className="mb-5 p-4">
          <p className="text-sm font-semibold text-ink">Document storage is not configured</p>
          <p className="mt-1 text-sm text-stone">
            Uploads are disabled until a storage provider (S3-compatible) is connected. Set STORAGE_PROVIDER and
            related environment variables to enable this feature.
          </p>
        </Card>
      )}

      {documents.length === 0 ? (
        <EmptyState
          title="No documents yet"
          body="Upload supporting documents so Keren can reference them when drafting your applications."
        />
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between rounded-md border border-line bg-white p-3">
              <div>
                <p className="text-sm font-semibold text-ink">{doc.name}</p>
                <p className="text-xs text-stone">{doc.type.replace(/_/g, " ")}</p>
              </div>
              <Badge tone={doc.status === "PROCESSED" ? "verified" : "neutral"}>{doc.status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
