import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface StorageService {
  readonly configured: boolean;
  createSignedUploadUrl(key: string, contentType: string): Promise<string>;
  getObjectMetadata(key: string): Promise<{
    sizeBytes: number;
    contentType?: string;
  }>;
  getSignedDownloadUrl(key: string, fileName?: string): Promise<string>;
  delete(key: string): Promise<void>;
}

type S3Config = {
  bucket: string;
  region: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
};

class S3StorageService implements StorageService {
  private client: S3Client | null = null;

  get configured(): boolean {
    return (
      process.env.STORAGE_PROVIDER?.trim().toLowerCase() === "s3" &&
      Boolean(process.env.STORAGE_BUCKET?.trim()) &&
      Boolean(process.env.STORAGE_REGION?.trim()) &&
      Boolean(process.env.STORAGE_ENDPOINT?.trim()) &&
      Boolean(process.env.STORAGE_ACCESS_KEY_ID?.trim()) &&
      Boolean(process.env.STORAGE_SECRET_ACCESS_KEY?.trim())
    );
  }

  private getConfig(): S3Config {
    if (process.env.STORAGE_PROVIDER?.trim().toLowerCase() !== "s3") {
      throw new Error("S3 storage is not enabled.");
    }

    const bucket = process.env.STORAGE_BUCKET?.trim();
    const region = process.env.STORAGE_REGION?.trim();
    const endpoint = process.env.STORAGE_ENDPOINT?.trim().replace(/\/+$/, "");
    const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY?.trim();

    if (!bucket || !region || !endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error("S3 storage configuration is incomplete.");
    }

    try {
      new URL(endpoint);
    } catch {
      throw new Error("STORAGE_ENDPOINT must be a valid URL.");
    }

    return { bucket, region, endpoint, accessKeyId, secretAccessKey };
  }

  private getClient(config: S3Config): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        region: config.region,
        endpoint: config.endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });
    }

    return this.client;
  }

  async createSignedUploadUrl(
    key: string,
    contentType: string,
  ): Promise<string> {
    const config = this.getConfig();
    const client = this.getClient(config);

    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(client, command, { expiresIn: 120 });
  }

  async getObjectMetadata(key: string): Promise<{
    sizeBytes: number;
    contentType?: string;
  }> {
    const config = this.getConfig();
    const client = this.getClient(config);

    const result = await client.send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
    );

    return {
      sizeBytes: result.ContentLength ?? 0,
      contentType: result.ContentType,
    };
  }

  async getSignedDownloadUrl(
    key: string,
    fileName?: string,
  ): Promise<string> {
    const config = this.getConfig();
    const client = this.getClient(config);

    const command = new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ...(fileName
        ? {
            ResponseContentDisposition:
              `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
          }
        : {}),
    });

    return getSignedUrl(client, command, { expiresIn: 300 });
  }

  async delete(key: string): Promise<void> {
    const config = this.getConfig();
    const client = this.getClient(config);

    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
    );
  }
}

export const storage: StorageService = new S3StorageService();

export function scopedDocumentKey(
  organizationId: string,
  fileName: string,
): string {
  const safeName = fileName
    .replace(/[\\/]/g, "_")
    .replace(/[^a-zA-Z0-9.\-_]/g, "_")
    .slice(-180);

  return `organizations/${organizationId}/documents/${randomUUID()}-${safeName || "document"}`;
}
