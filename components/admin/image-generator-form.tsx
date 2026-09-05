"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

const STYLE_OPTIONS = [
  "App UI screenshot / feature graphic",
  "Lifestyle / editorial (couples)",
  "Icon or simple graphic",
  "Carousel background",
] as const;

type Packet = {
  concept: string;
  styleReference: string;
  composition: string;
  colorsAndLighting: string;
  aspectRatio: string;
  negativePrompt: string;
};

const PACKET_LABELS: { key: keyof Packet; label: string }[] = [
  { key: "concept", label: "Concept" },
  { key: "styleReference", label: "Style reference" },
  { key: "composition", label: "Composition" },
  { key: "colorsAndLighting", label: "Colors & lighting" },
  { key: "aspectRatio", label: "Aspect ratio" },
  { key: "negativePrompt", label: "Negative prompt" },
];

function packetAsPlainText(packet: Packet) {
  return PACKET_LABELS.map(({ key, label }) => `${label}: ${packet[key]}`).join(
    "\n",
  );
}

export function ImageGeneratorForm() {
  const [concept, setConcept] = useState("");
  const [style, setStyle] = useState<string>(STYLE_OPTIONS[0]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packet, setPacket] = useState<Packet | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    const trimmed = concept.trim();
    if (!trimmed) {
      setError("Describe the graphic first.");
      setPacket(null);
      return;
    }
    setRunning(true);
    setError(null);
    setCopied(false);
    setPacket(null);
    try {
      const res = await fetch("/api/admin/image-generator/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept: trimmed, style }),
      });
      const data = (await res.json()) as Packet & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Generation failed.");
        return;
      }
      setPacket({
        concept: data.concept,
        styleReference: data.styleReference,
        composition: data.composition,
        colorsAndLighting: data.colorsAndLighting,
        aspectRatio: data.aspectRatio,
        negativePrompt: data.negativePrompt,
      });
    } catch {
      setError("Network error reaching the image-generator route.");
    } finally {
      setRunning(false);
    }
  }

  async function handleCopy() {
    if (!packet) return;
    await navigator.clipboard.writeText(packetAsPlainText(packet));
    setCopied(true);
  }

  return (
    <Card className="px-6 py-5">
      <div className="mb-4">
        <label className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
          Describe the graphic
        </label>
        <Textarea
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="e.g. budget tracker screen, estimated vs. actual side by side, soft pink accent"
          rows={4}
        />
      </div>
      <div className="mb-4">
        <label className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
          Style reference
        </label>
        <Select value={style} onChange={(e) => setStyle(e.target.value)}>
          {STYLE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Select>
      </div>
      <Button variant="primary" onClick={handleGenerate} disabled={running}>
        {running ? "Building the prompt packet…" : "Generate KIE prompt packet"}
      </Button>

      {error ? (
        <p className="mt-4 rounded-[var(--radius-inner)] bg-rosewood-wash px-3.5 py-3 text-[15px] font-medium text-rosewood">
          {error}
        </p>
      ) : null}

      {packet ? (
        <div className="mt-4">
          <div className="rounded-[var(--radius-inner)] bg-well px-3.5 py-3 text-[15px] font-medium whitespace-pre-wrap text-ink shadow-recessed">
            {packetAsPlainText(packet)}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button variant="default" onClick={handleCopy}>
              {copied ? "Copied" : "Copy"}
            </Button>
            <p className="text-[13px] text-muted">
              Copy this into KIE / Seedream 5 Pro manually — this only builds the
              prompt, it doesn&apos;t call the image API, so credit spend stays
              visible and under your control.
            </p>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
