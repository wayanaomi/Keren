import { parseOffice } from "officeparser";

export const MAX_KNOWLEDGE_DOCUMENT_BYTES = 25 * 1024 * 1024;
export const MAX_EXTRACTED_TEXT_CHARACTERS = 80_000;

const MIME_TO_FORMAT = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    "xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
} as const;

export type KnowledgeDocumentFormat =
  (typeof MIME_TO_FORMAT)[keyof typeof MIME_TO_FORMAT];

export class DocumentExtractionError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "UNSUPPORTED_FORMAT"
      | "INVALID_SIZE"
      | "NO_EXTRACTABLE_TEXT"
      | "INVALID_DOCUMENT"
      | "PROCESSING_TIMEOUT",
  ) {
    super(message);
    this.name = "DocumentExtractionError";
  }
}

export interface DocumentExtractionResult {
  text: string;
  format: KnowledgeDocumentFormat;
  characterCount: number;
  truncated: boolean;
}

function normalizeExtractedText(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export async function extractKnowledgeDocumentText(
  buffer: Buffer,
  mimeType: string,
): Promise<DocumentExtractionResult> {
  const format =
    MIME_TO_FORMAT[mimeType as keyof typeof MIME_TO_FORMAT];

  if (!format) {
    throw new DocumentExtractionError(
      "This file format is not supported for text extraction. Use PDF, DOCX, XLSX or PPTX.",
      "UNSUPPORTED_FORMAT",
    );
  }

  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length === 0 ||
    buffer.length > MAX_KNOWLEDGE_DOCUMENT_BYTES
  ) {
    throw new DocumentExtractionError(
      "The document is empty or exceeds the permitted 25 MB size.",
      "INVALID_SIZE",
    );
  }

  const parserWarnings: unknown[] = [];

  let ast;

  try {
    ast = await parseOffice(buffer, {
      fileType: format,
      allowRemoteAssets: false,
      onWarning: (issue) => parserWarnings.push(issue),
      extractAttachments: false,
      includeRawContent: false,
      ocr: false,
      abortSignal: AbortSignal.timeout(45_000),
      decompressionLimits: {
        maxUncompressedBytes: 128 * 1024 * 1024,
        maxZipEntries: 2_500,
        maxTableCells: 100_000,
        maxXmlElements: 500_000,
        maxRepeatedContent: 4 * 1024 * 1024,
      },
    });
  } catch (error) {
    const parserError = error as Error & {
      code?: string;
      cause?: unknown;
    };

    console.error("[KEREN_PDF_PARSE_ERROR]", {
      name: parserError.name,
      code: parserError.code ?? null,
      message: parserError.message,
      cause:
        parserError.cause instanceof Error
          ? parserError.cause.message
          : null,
    });

    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new DocumentExtractionError(
        "Document extraction exceeded the permitted processing time. Try a smaller document.",
        "PROCESSING_TIMEOUT",
      );
    }

    throw new DocumentExtractionError(
      "Keren could not read this document. It may be damaged, password-protected or incorrectly formatted.",
      "INVALID_DOCUMENT",
    );
  }

  if (parserWarnings.length > 0) {
    console.warn(
      "[KEREN_DOCUMENT_PARSER_WARNINGS]",
      parserWarnings.slice(0, 20).map((issue) => {
        const warning = issue as {
          code?: unknown;
          message?: unknown;
          phase?: unknown;
        };

        return {
          code: warning.code ?? null,
          message: warning.message ?? null,
          phase: warning.phase ?? null,
        };
      }),
    );
  }

  if (ast.type !== format) {
    throw new DocumentExtractionError(
      "The document's actual file format does not match its uploaded file type.",
      "INVALID_DOCUMENT",
    );
  }

  let extracted: string;

  try {
    const result = await ast.to("text");
    extracted = result.value;
  } catch (error) {
    const parserError = error as Error & {
      code?: string;
    };

    console.error("[KEREN_TEXT_CONVERSION_ERROR]", {
      name: parserError.name,
      code: parserError.code ?? null,
      message: parserError.message,
    });

    throw new DocumentExtractionError(
      "The document was opened but its text could not be extracted.",
      "INVALID_DOCUMENT",
    );
  }

  const normalized = normalizeExtractedText(extracted);

  if (!normalized) {
    throw new DocumentExtractionError(
      "No selectable text was found. This may be a scanned or image-only document. OCR is not enabled.",
      "NO_EXTRACTABLE_TEXT",
    );
  }

  const truncated =
    normalized.length > MAX_EXTRACTED_TEXT_CHARACTERS;

  const text = truncated
    ? normalized.slice(0, MAX_EXTRACTED_TEXT_CHARACTERS)
    : normalized;

  return {
    text,
    format,
    characterCount: text.length,
    truncated,
  };
}
