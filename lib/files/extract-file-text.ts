export const FILE_TEXT_MAX_CHARS = 48_000;

const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const TEXT_MIME = "text/plain";

export type FileExtraction =
  | { status: "ready"; text: string; truncated: boolean }
  | { status: "empty" }
  | { status: "unsupported" }
  | { status: "failed" };

export function extractionKind(
  mime: string | null,
): "pdf" | "docx" | "txt" | "unsupported" {
  if (mime === PDF_MIME) return "pdf";
  if (mime === DOCX_MIME) return "docx";
  if (mime === TEXT_MIME) return "txt";
  return "unsupported";
}

function capText(raw: string): { text: string; truncated: boolean } {
  const normalized = raw
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
  if (normalized.length <= FILE_TEXT_MAX_CHARS) {
    return { text: normalized, truncated: false };
  }
  return {
    text: normalized.slice(0, FILE_TEXT_MAX_CHARS),
    truncated: true,
  };
}

export async function extractFileText(
  mime: string | null,
  bytes: Uint8Array,
): Promise<FileExtraction> {
  const kind = extractionKind(mime);
  if (kind === "unsupported") return { status: "unsupported" };

  try {
    let raw = "";
    if (kind === "txt") {
      raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    } else if (kind === "pdf") {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(bytes);
      const result = await extractText(pdf, { mergePages: true });
      raw = Array.isArray(result.text) ? result.text.join("\n\n") : result.text;
      const closable = pdf as { destroy?: () => Promise<void> | void };
      await closable.destroy?.();
    } else {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      raw = result.value;
    }

    const capped = capText(raw);
    if (!capped.text) return { status: "empty" };
    return {
      status: "ready",
      text: capped.text,
      truncated: capped.truncated,
    };
  } catch (err) {
    console.error(
      "[files.extract]",
      err instanceof Error ? err.message : err,
    );
    return { status: "failed" };
  }
}
