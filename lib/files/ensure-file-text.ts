import "server-only";

import { PROJECT_FILES_BUCKET } from "@/components/files/types";
import {
  extractFileText,
  extractionKind,
  type FileExtraction,
} from "@/lib/files/extract-file-text";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StoredFileForText = {
  id: string;
  mime_type: string | null;
  storage_path: string;
  extraction_status: string | null;
  extracted_text: string | null;
  extraction_truncated: boolean | null;
};

export type EnsuredFileText = {
  extraction_status: "ready" | "empty" | "unsupported" | "failed";
  extracted_text: string | null;
  extraction_truncated: boolean;
};

const SETTLED = new Set(["ready", "empty", "unsupported"]);

function fromStored(file: StoredFileForText): EnsuredFileText | null {
  if (!file.extraction_status || !SETTLED.has(file.extraction_status)) {
    return null;
  }
  return {
    extraction_status: file.extraction_status as EnsuredFileText["extraction_status"],
    extracted_text:
      file.extraction_status === "ready" ? file.extracted_text : null,
    extraction_truncated: Boolean(file.extraction_truncated),
  };
}

function fromExtraction(extracted: FileExtraction): EnsuredFileText {
  if (extracted.status === "ready") {
    return {
      extraction_status: "ready",
      extracted_text: extracted.text,
      extraction_truncated: extracted.truncated,
    };
  }
  return {
    extraction_status: extracted.status,
    extracted_text: null,
    extraction_truncated: false,
  };
}

/**
 * Read stored text, or extract once from storage and save it.
 * `failed` is retried on the next read. A save error still returns the text
 * for this turn.
 */
export async function ensureFileText(
  supabase: SupabaseClient,
  projectId: string,
  file: StoredFileForText,
): Promise<EnsuredFileText> {
  const stored = fromStored(file);
  if (stored) return stored;

  let ensured: EnsuredFileText;
  if (extractionKind(file.mime_type) === "unsupported") {
    ensured = fromExtraction({ status: "unsupported" });
  } else {
    const { data, error } = await supabase.storage
      .from(PROJECT_FILES_BUCKET)
      .download(file.storage_path);

    if (error || !data) {
      console.error(
        "[files.extract] download",
        error?.message ?? "empty download",
      );
      ensured = fromExtraction({ status: "failed" });
    } else {
      const bytes = new Uint8Array(await data.arrayBuffer());
      ensured = fromExtraction(await extractFileText(file.mime_type, bytes));
    }
  }

  const { error: updateError } = await supabase
    .from("files")
    .update({
      extraction_status: ensured.extraction_status,
      extracted_text: ensured.extracted_text,
      extraction_truncated: ensured.extraction_truncated,
    })
    .eq("id", file.id)
    .eq("project_id", projectId);

  if (updateError) {
    console.error("[files.extract] save", updateError.message);
  }

  return ensured;
}
