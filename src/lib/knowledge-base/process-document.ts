import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import {
  DocumentExtractionError,
  extractKnowledgeDocumentText,
  MAX_KNOWLEDGE_DOCUMENT_BYTES,
} from "./extraction";

const PROCESSING_STALE_AFTER_MS = 10 * 60 * 1000;

export type KnowledgeDocumentProcessingResult =
  | { status: "PROCESSED"; characterCount: number; truncated: boolean }
  | { status: "FAILED"; error: string }
  | { status: "PROCESSING" }
  | { status: "NOT_FOUND" };

export async function processKnowledgeDocument(
  documentId: string,
  organizationId: string,
): Promise<KnowledgeDocumentProcessingResult> {
  const document = await db.knowledgeDocument.findFirst({
    where: { id: documentId, organizationId },
    select: {
      id: true,
      storageKey: true,
      mimeType: true,
      sizeBytes: true,
      status: true,
    },
  });

  if (!document) return { status: "NOT_FOUND" };

  if (document.status === "PROCESSED") {
    const existing = await db.knowledgeDocument.findFirst({
      where: { id: document.id, organizationId },
      select: { extractedSummary: true },
    });

    return {
      status: "PROCESSED",
      characterCount: existing?.extractedSummary?.length ?? 0,
      truncated: false,
    };
  }

  const expectedPrefix = `organizations/${organizationId}/documents/`;

  if (!document.storageKey.startsWith(expectedPrefix)) {
    return {
      status: "FAILED",
      error: "The document storage reference is invalid.",
    };
  }

  // Claim the document atomically. A stale PROCESSING record can be reclaimed
  // after ten minutes if an earlier serverless execution terminated unexpectedly.
  const staleBefore = new Date(Date.now() - PROCESSING_STALE_AFTER_MS);

  const claim = await db.knowledgeDocument.updateMany({
    where: {
      id: document.id,
      organizationId,
      OR: [
        { status: { in: ["UPLOADED", "FAILED"] } },
        { status: "PROCESSING", updatedAt: { lt: staleBefore } },
      ],
    },
    data: {
      status: "PROCESSING",
      extractedSummary: null,
      extractedFacts: Prisma.JsonNull,
    },
  });

  if (claim.count === 0) {
    const current = await db.knowledgeDocument.findFirst({
      where: { id: document.id, organizationId },
      select: { status: true, extractedSummary: true },
    });

    if (!current) return { status: "NOT_FOUND" };

    if (current.status === "PROCESSED") {
      return {
        status: "PROCESSED",
        characterCount: current.extractedSummary?.length ?? 0,
        truncated: false,
      };
    }

    return { status: "PROCESSING" };
  }

  try {
    if (
      !Number.isSafeInteger(document.sizeBytes) ||
      document.sizeBytes <= 0 ||
      document.sizeBytes > MAX_KNOWLEDGE_DOCUMENT_BYTES
    ) {
      throw new DocumentExtractionError(
        "The stored document is empty or exceeds the permitted 25 MB size.",
        "INVALID_SIZE",
      );
    }

    const metadata = await storage.getObjectMetadata(document.storageKey);

    if (
      metadata.sizeBytes !== document.sizeBytes ||
      metadata.sizeBytes > MAX_KNOWLEDGE_DOCUMENT_BYTES ||
      (metadata.contentType && metadata.contentType !== document.mimeType)
    ) {
      throw new DocumentExtractionError(
        "The stored file no longer matches its verified upload details.",
        "INVALID_DOCUMENT",
      );
    }

    const bytes = await storage.getObjectBytes(
      document.storageKey,
      MAX_KNOWLEDGE_DOCUMENT_BYTES,
    );

    if (bytes.length !== document.sizeBytes) {
      throw new DocumentExtractionError(
        "The stored file size does not match its upload record.",
        "INVALID_DOCUMENT",
      );
    }

    const extraction = await extractKnowledgeDocumentText(
      bytes,
      document.mimeType,
    );

    const update = await db.knowledgeDocument.updateMany({
      where: {
        id: document.id,
        organizationId,
        status: "PROCESSING",
      },
      data: {
        status: "PROCESSED",
        extractedSummary: extraction.text,
        extractedFacts: Prisma.JsonNull,
      },
    });

    if (update.count !== 1) return { status: "PROCESSING" };

    return {
      status: "PROCESSED",
      characterCount: extraction.characterCount,
      truncated: extraction.truncated,
    };
  } catch (error) {
    const message =
      error instanceof DocumentExtractionError
        ? error.message
        : "Keren could not process this document. Please try again or upload another supported file.";

    const code =
      error instanceof DocumentExtractionError
        ? error.code
        : "PROCESSING_FAILED";

    await db.knowledgeDocument.updateMany({
      where: {
        id: document.id,
        organizationId,
        status: "PROCESSING",
      },
      data: {
        status: "FAILED",
        extractedSummary: message,
        extractedFacts: { errorCode: code },
      },
    });

    console.error("Knowledge document processing failed", {
      documentId: document.id,
      organizationId,
      code,
    });

    return { status: "FAILED", error: message };
  }
}
