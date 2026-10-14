import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Upload storage.
 *
 * Uploaded files are untrusted: they are stored outside /public under random names, their type is
 * checked by extension AND content signature, they are never executed, parsed or rendered by the
 * server, and customer files are only served to signed-in admins as `attachment` downloads.
 */

const root = () => path.resolve(process.env.STORAGE_DIR || "./storage");

export type UploadBucket = "quotes" | "media";

interface FileRule {
  mime: string;
  check: (head: Buffer, size: number) => boolean;
}

const startsWith = (head: Buffer, bytes: number[]) => bytes.every((b, i) => head[i] === b);
const isLikelyText = (head: Buffer) => !head.subarray(0, 512).includes(0);

const RULES: Record<string, FileRule> = {
  // 3D models
  stl: {
    mime: "model/stl",
    // ASCII STL starts with "solid"; binary STL is an 80-byte header + uint32 triangle count
    // followed by exactly 50 bytes per triangle, so the declared count must match the file size.
    check: (head, size) =>
      (head.subarray(0, 5).toString("ascii").toLowerCase() === "solid" && isLikelyText(head)) ||
      (head.length >= 84 && head.readUInt32LE(80) > 0 && 84 + head.readUInt32LE(80) * 50 === size),
  },
  "3mf": { mime: "model/3mf", check: (head) => startsWith(head, [0x50, 0x4b, 0x03, 0x04]) }, // ZIP container
  obj: { mime: "model/obj", check: (head) => isLikelyText(head) },
  // Reference images
  png: { mime: "image/png", check: (head) => startsWith(head, [0x89, 0x50, 0x4e, 0x47]) },
  jpg: { mime: "image/jpeg", check: (head) => startsWith(head, [0xff, 0xd8, 0xff]) },
  jpeg: { mime: "image/jpeg", check: (head) => startsWith(head, [0xff, 0xd8, 0xff]) },
  webp: { mime: "image/webp", check: (head) => head.subarray(0, 4).toString("ascii") === "RIFF" && head.subarray(8, 12).toString("ascii") === "WEBP" },
  pdf: { mime: "application/pdf", check: (head) => head.subarray(0, 5).toString("ascii") === "%PDF-" },
};

export const QUOTE_EXTENSIONS = ["stl", "3mf", "obj", "png", "jpg", "jpeg", "webp", "pdf"] as const;
export const MEDIA_EXTENSIONS = ["png", "jpg", "jpeg", "webp"] as const;

export class UploadError extends Error {}

export interface StoredFile {
  originalName: string;
  storedName: string;
  size: number;
  mime: string;
}

export async function storeUpload(
  file: File,
  bucket: UploadBucket,
  allowed: readonly string[],
  maxBytes: number,
): Promise<StoredFile> {
  if (file.size === 0) throw new UploadError("The file is empty.");
  if (file.size > maxBytes) throw new UploadError(`File is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`);
  const ext = path.extname(file.name).slice(1).toLowerCase();
  if (!allowed.includes(ext)) throw new UploadError(`Unsupported file type. Allowed: ${allowed.join(", ").toUpperCase()}.`);
  const rule = RULES[ext];
  if (!rule) throw new UploadError("Unsupported file type.");
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!rule.check(buffer.subarray(0, 1024), buffer.length)) {
    throw new UploadError("The file content does not match its extension.");
  }
  const storedName = `${Date.now().toString(36)}-${randomBytes(12).toString("hex")}.${ext}`;
  const dir = path.join(root(), bucket);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, storedName), buffer, { flag: "wx" });
  const originalName = path.basename(file.name).replace(/[^\w.\- ()]+/g, "_").slice(0, 120) || `upload.${ext}`;
  return { originalName, storedName, size: buffer.length, mime: rule.mime };
}

const SAFE_NAME = /^[a-z0-9]+-[a-f0-9]{24}\.(stl|3mf|obj|png|jpg|jpeg|webp|pdf)$/;

/** Read a stored file by its generated name. Rejects anything that is not a generated name. */
export async function readStored(bucket: UploadBucket, storedName: string): Promise<{ data: Buffer; ext: string } | null> {
  if (!SAFE_NAME.test(storedName)) return null;
  try {
    const data = await readFile(path.join(root(), bucket, storedName));
    return { data, ext: path.extname(storedName).slice(1) };
  } catch {
    return null;
  }
}

export function mimeForExt(ext: string): string {
  return RULES[ext]?.mime ?? "application/octet-stream";
}
