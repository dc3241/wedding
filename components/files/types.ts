export type ProjectFile = {
  id: string;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  status?: string | null;
};

export type FileKind = "file" | "contract";

export const PROJECT_FILES_BUCKET = "project-files";

export const MAX_FILE_SIZE_BYTES = 26_214_400; // 25 MB

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
] as const;

export const FILE_INPUT_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.heic,.docx,.xlsx,.txt,application/pdf,image/png,image/jpeg,image/webp,image/heic,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain";

const EXTENSION_MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  heic: "image/heic",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
};

export function resolveMimeType(file: File): string | null {
  if (file.type && ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return file.type;
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && EXTENSION_MIME[ext]) {
    return EXTENSION_MIME[ext];
  }

  return null;
}

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "File is too large. Maximum size is 25 MB.";
  }

  if (!resolveMimeType(file)) {
    return "File type not allowed. Use PDF, images (PNG, JPG, WebP, HEIC), Word, Excel, or plain text.";
  }

  return null;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[/\\]/g, "_").slice(0, 200);
}

export function buildStoragePath(projectId: string, fileName: string): string {
  const id = crypto.randomUUID();
  return `${projectId}/${id}-${sanitizeFileName(fileName)}`;
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatUploadedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
