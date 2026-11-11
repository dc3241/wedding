import "server-only";
import type { Alignment } from "./script";
import { FIRST_LOOK_VOICE_ID } from "./types";

export type Synthesis = { audio: Buffer; alignment: Alignment };

/**
 * One ElevenLabs take on First Look Voice, with character timings.
 * Plain script only (the caller strips nothing: the script rules already ban tags and ellipses).
 * Never call this twice to "retry": every call spends credits. The UI asks before re-voicing.
 */
export async function synthesizeFirstLookVoice(text: string): Promise<Synthesis> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured.");
  const voice = process.env.ELEVENLABS_VOICE_ID?.trim() || FIRST_LOOK_VOICE_ID;
  const model = process.env.ELEVENLABS_MODEL?.trim() || "eleven_v4";

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ text, model_id: model }),
    },
  );
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    throw new Error(`ElevenLabs returned ${res.status}. ${detail}`);
  }
  const json = (await res.json()) as {
    audio_base64?: string;
    alignment?: Alignment | null;
    normalized_alignment?: Alignment | null;
  };
  const alignment = json.alignment ?? json.normalized_alignment;
  if (!json.audio_base64 || !alignment?.characters?.length) {
    throw new Error("ElevenLabs did not return audio with timings.");
  }
  return { audio: Buffer.from(json.audio_base64, "base64"), alignment };
}
