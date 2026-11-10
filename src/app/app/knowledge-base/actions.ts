"use server";

import { DocumentType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrganization } from "@/lib/auth/session";
import { scopedDocumentKey, storage } from "@/lib/storage";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const ALLOWED_DOCUMENT_TYPES = [
  "BUSINESS_PLAN",
  "PITCH_DECK",
  "PREVIOUS_APPLICATION",
  "FOUNDER_CV",
  "FINANCIAL_DOCUMENT",
  "PRODUCT_DOCUMENT",
  "COMPANY_PROFILE",
  "IMPACT_REPORT",
  "PREVIOUS_PROPOSAL",
  "OTHER",
] as const satisfies readonly DocumentType[];

type UploadInput = {
  name: string;
  sizeBytes: number;
  type: string;
};

type ValidatedUpload = {
  name: string;
  sizeBytes: number;
  type: DocumentType;
  contentType: string;
};

type UploadActionResult = {
  error?: string;
  uploadUrl?: string;
  key?: string;
  contentType?: string;
};

function validateUpload(input: UploadInput): ValidatedUpload | string {
  if (
    !input ||
    typeof input.name !== "string" ||
    typeof input.type !== "string" ||
    !Number.isSafeInteger(input.sizeBytes)
  ) {
    return "Invalid document details.";
  }

  const name = input.name
    .replace(/[\\/]/g, "_")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(-180);

  if (!name) return "The file name is invalid.";

  if (input.sizeBytes <= 0) return "The selected file is empty.";

  if (input.sizeBytes > MAX_FILE_SIZE) {
    return "The maximum permitted file size is 25 MB.";
  }

  if (!ALLOWED_DOCUMENT_TYPES.includes(input.type as DocumentType)) {
    return "Select a valid document category.";
  }

  const extension = name.toLowerCase().split(".").pop();
  const contentType = extension ? MIME_TYPES[extension] : undefined;

  if (!contentType) {
    return "Unsupported file. Upload a PDF, DOC, DOCX, XLS, XLSX, PPT or PPTX.";
  }

  return {
    name,
    sizeBytes: input.sizeBytes,
    type: input.type as DocumentType,
    contentType,
  };
}

export async function createKnowledgeDocumentUploadUrlAction(
  input: UploadInput,
): Promise<UploadActionResult> {
  const { organization } = await requireOrganization();

  if (!storage.configured) {
    return { error: "Document storage is not configured." };
  }

  const validated = validateUpload(input);
  if (typeof validated === "string") return { error: validated };

  try {
    const key = scopedDocumentKey(organization.id, validated.name);
    const uploadUrl = await storage.createSignedUploadUrl(
      key,
      validated.contentType,
    );

    return {
      uploadUrl,
      key,
      contentType: validated.contentType,
    };
  } catch (error) {
    console.error(
      "Could not create document upload URL:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return { error: "Could not prepare the document upload. Please try again." };
  }
}

export async function completeKnowledgeDocumentUploadAction(
  input: UploadInput & { key: string },
): Promise<{ error?: string; success?: string }> {
  const { user, organization } = await requireOrganization();

  const validated = validateUpload(input);
  if (typeof validated === "string") return { error: validated };

  const expectedPrefix = `organizations/${organization.id}/documents/`;

  if (
    typeof input.key !== "string" ||
    !input.key.startsWith(expectedPrefix)
  ) {
    return { error: "Invalid document upload reference." };
  }

  try {
    const metadata = await storage.getObjectMetadata(input.key);

    if (
      metadata.sizeBytes !== validated.sizeBytes ||
      metadata.sizeBytes <= 0 ||
      metadata.sizeBytes > MAX_FILE_SIZE ||
      (metadata.contentType &&
        metadata.contentType !== validated.contentType)
    ) {
      await storage.delete(input.key).catch(() => undefined);
      return {
        error: "The uploaded file did not pass verification. Please retry.",
      };
    }

    await db.knowledgeDocument.create({
      data: {
        organizationId: organization.id,
        uploadedById: user.id,
        name: validated.name,
        type: validated.type,
        storageKey: input.key,
        mimeType: validated.contentType,
        sizeBytes: metadata.sizeBytes,
        status: "UPLOADED",
      },
    });

    revalidatePath("/app/knowledge-base");
    revalidatePath("/app");

    return { success: "Document uploaded successfully." };
  } catch (error) {
    await storage.delete(input.key).catch(() => undefined);

    console.error(
      "Could not complete document upload:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return { error: "The uploaded document could not be saved. Please retry." };
  }
}

export async function cancelKnowledgeDocumentUploadAction(
  key: string,
): Promise<void> {
  const { organization } = await requireOrganization();
  const expectedPrefix = `organizations/${organization.id}/documents/`;

  if (typeof key !== "string" || !key.startsWith(expectedPrefix)) {
    return;
  }

  await storage.delete(key).catch(() => undefined);
}

export async function deleteKnowledgeDocumentAction(
  documentId: string,
): Promise<void> {
  const { organization } = await requireOrganization();

  const document = await db.knowledgeDocument.findFirst({
    where: {
      id: documentId,
      organizationId: organization.id,
    },
    select: {
      id: true,
      storageKey: true,
    },
  });

  if (!document) {
    throw new Error("Document not found.");
  }

  await storage.delete(document.storageKey);

  await db.knowledgeDocument.deleteMany({
    where: {
      id: document.id,
      organizationId: organization.id,
    },
  });

  revalidatePath("/app/knowledge-base");
  revalidatePath("/app");
}
