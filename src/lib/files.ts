/** Max upload size (Vercel functions accept at most 4.5 MB per request). */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

export type AllowedFileType = {
  contentType: "image/png" | "image/jpeg" | "image/webp" | "image/gif" | "application/pdf";
  extension: "png" | "jpg" | "webp" | "gif" | "pdf";
  isImage: boolean;
};

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((byte, index) => bytes[offset + index] === byte);

/**
 * Determines the type from the file's content (magic bytes), never from the
 * name or the browser-supplied type. Anything else (SVG, HTML, scripts,
 * archives) is refused, so uploads can never be served as active content.
 */
export function detectFileType(bytes: Uint8Array): AllowedFileType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { contentType: "image/png", extension: "png", isImage: true };
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { contentType: "image/jpeg", extension: "jpg", isImage: true };
  }
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) {
    return { contentType: "image/gif", extension: "gif", isImage: true };
  }
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return { contentType: "image/webp", extension: "webp", isImage: true };
  }
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { contentType: "application/pdf", extension: "pdf", isImage: false };
  }
  return null;
}

/** Display name only (never used as a storage path): no paths, no control characters. */
export function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[\u0000-\u001f\u007f"<>|]/g, "").trim();
  return (cleaned || "bestand").slice(0, 200);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
