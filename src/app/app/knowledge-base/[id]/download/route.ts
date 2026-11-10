import { db } from "@/lib/db";
import { requireOrganization } from "@/lib/auth/session";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { organization } = await requireOrganization();
  const { id } = await context.params;

  const document = await db.knowledgeDocument.findFirst({
    where: {
      id,
      organizationId: organization.id,
    },
    select: {
      storageKey: true,
      name: true,
    },
  });

  if (!document) {
    return new Response("Document not found.", { status: 404 });
  }

  try {
    const url = await storage.getSignedDownloadUrl(
      document.storageKey,
      document.name,
    );

    return Response.redirect(url, 302);
  } catch (error) {
    console.error(
      "Knowledge document download failed:",
      error instanceof Error ? error.message : "Unknown storage error",
    );

    return Response.json(
      { error: "Document download is currently unavailable." },
      { status: 503 },
    );
  }
}
