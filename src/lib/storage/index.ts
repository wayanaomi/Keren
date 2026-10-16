/**
 * Storage abstraction. Only one concrete provider (S3-compatible) is implemented;
 * swapping providers means implementing this interface, not rewriting call sites.
 * With no provider configured, uploads fail clearly rather than silently writing
 * to local disk (which would not be organization-isolated or production-safe).
 */

export interface StorageService {
  readonly configured: boolean;
  upload(params: { key: string; body: Buffer; contentType: string }): Promise<{ key: string }>;
  getSignedDownloadUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
}

class UnconfiguredStorageService implements StorageService {
  readonly configured = false;

  async upload(): Promise<{ key: string }> {
    throw new Error("Storage is not configured. Set STORAGE_PROVIDER and related env vars.");
  }

  async getSignedDownloadUrl(): Promise<string> {
    throw new Error("Storage is not configured. Set STORAGE_PROVIDER and related env vars.");
  }

  async delete(): Promise<void> {
    throw new Error("Storage is not configured. Set STORAGE_PROVIDER and related env vars.");
  }
}

// An S3-compatible implementation (AWS S3 / Supabase Storage) can be dropped in here
// once credentials are available, behind the same StorageService interface.
function createStorageService(): StorageService {
  if (process.env.STORAGE_PROVIDER === "s3") {
    throw new Error("S3 storage provider is not yet wired up — implement StorageService in lib/storage.");
  }
  return new UnconfiguredStorageService();
}

export const storage: StorageService = createStorageService();

export function scopedDocumentKey(organizationId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  return `organizations/${organizationId}/documents/${Date.now()}-${safeName}`;
}
