import { revalidatePath } from "next/cache";
import { requireOrganization } from "@/lib/auth/session";
import { processKnowledgeDocument } from "@/lib/knowledge-base/process-document";

export const runtime = "nodejs";
export const maxDuration = 60;

function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    .trim();

  const host = forwardedHost ?? request.headers.get("host");

  if (!origin || !host) return false;

  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  const { organization } = await requireOrganization();
  const { id } = await context.params;

  if (!id || id.length > 128) {
    return Response.json(
      { error: "Invalid document reference." },
      { status: 400 },
    );
  }

  try {
    const result = await processKnowledgeDocument(id, organization.id);

    if (result.status === "NOT_FOUND") {
      return Response.json(
        { error: "Document not found." },
        { status: 404 },
      );
    }

    revalidatePath("/app/knowledge-base");
    revalidatePath("/app");

    if (result.status === "PROCESSING") {
      return Response.json(result, { status: 202 });
    }

    if (result.status === "FAILED") {
      return Response.json(result, { status: 422 });
    }

    return Response.json(result);
  } catch (error) {
    console.error(
      "Knowledge document processing endpoint failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return Response.json(
      { error: "Document processing is temporarily unavailable." },
      { status: 500 },
    );
  }
}
