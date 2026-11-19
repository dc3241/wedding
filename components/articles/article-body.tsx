import Link from "next/link";
import type { ReactNode } from "react";

/**
 * MEDIA-05: a small, safe markdown subset for articles. Builds React
 * elements (no innerHTML), so article text can never inject markup.
 *
 * Blocks: "## " / "### " headings, "- " or "* " bullets, "1. " numbered
 * lists, "> " quotes, blank-line paragraphs.
 * Inline: **bold**, *italic*, [label](https://… or /path).
 */

type Block =
  | { kind: "h2" | "h3" | "p" | "quote"; text: string }
  | { kind: "ul" | "ol"; items: string[] };

export function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];

  const flush = () => {
    if (para.length) blocks.push({ kind: "p", text: para.join(" ") });
    para = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^###\s+(.*)$/))) {
      flush();
      blocks.push({ kind: "h3", text: m[1] });
    } else if ((m = line.match(/^##?\s+(.*)$/))) {
      flush();
      blocks.push({ kind: "h2", text: m[1] });
    } else if ((m = line.match(/^[-*]\s+(.*)$/))) {
      flush();
      const last = blocks[blocks.length - 1];
      if (last?.kind === "ul") last.items.push(m[1]);
      else blocks.push({ kind: "ul", items: [m[1]] });
    } else if ((m = line.match(/^\d+[.)]\s+(.*)$/))) {
      flush();
      const last = blocks[blocks.length - 1];
      if (last?.kind === "ol") last.items.push(m[1]);
      else blocks.push({ kind: "ol", items: [m[1]] });
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      flush();
      const last = blocks[blocks.length - 1];
      if (last?.kind === "quote") last.text += ` ${m[1]}`;
      else blocks.push({ kind: "quote", text: m[1] });
    } else {
      para.push(line);
    }
  }
  flush();
  return blocks;
}

function safeHref(href: string): string | null {
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  return null;
}

const INLINE = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

function renderInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE)) {
    const start = m.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const key = `${keyBase}-${i++}`;
    if (m[1] != null) {
      out.push(<strong key={key}>{m[1]}</strong>);
    } else if (m[2] != null) {
      out.push(<em key={key}>{m[2]}</em>);
    } else {
      const href = safeHref(m[4] ?? "");
      if (!href) out.push(m[3]);
      else if (href.startsWith("/"))
        out.push(
          <Link key={key} href={href} className="font-semibold text-accent underline-offset-2 hover:underline">
            {m[3]}
          </Link>,
        );
      else
        out.push(
          <a
            key={key}
            href={href}
            rel="noopener noreferrer nofollow"
            target="_blank"
            className="font-semibold text-accent underline-offset-2 hover:underline"
          >
            {m[3]}
          </a>,
        );
    }
    last = start + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function ArticleBody({ source }: { source: string }) {
  const blocks = parseBlocks(source);
  return (
    <div className="space-y-5 text-[16.5px] leading-[1.75] text-ink">
      {blocks.map((b, idx) => {
        const k = `b${idx}`;
        switch (b.kind) {
          case "h2":
            return (
              <h2 key={k} className="pt-4 text-[24px] font-extrabold leading-tight tracking-[-0.02em]">
                {renderInline(b.text, k)}
              </h2>
            );
          case "h3":
            return (
              <h3 key={k} className="pt-2 text-[19px] font-bold leading-snug">
                {renderInline(b.text, k)}
              </h3>
            );
          case "ul":
            return (
              <ul key={k} className="list-disc space-y-2 pl-6 marker:text-accent">
                {b.items.map((it, j) => (
                  <li key={j}>{renderInline(it, `${k}-${j}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={k} className="list-decimal space-y-2 pl-6 marker:font-semibold marker:text-accent">
                {b.items.map((it, j) => (
                  <li key={j}>{renderInline(it, `${k}-${j}`)}</li>
                ))}
              </ol>
            );
          case "quote":
            return (
              <blockquote
                key={k}
                className="rounded-[var(--radius-inner)] bg-well px-5 py-4 text-[16px] text-ink shadow-recessed"
              >
                {renderInline(b.text, k)}
              </blockquote>
            );
          default:
            return <p key={k}>{renderInline(b.text, k)}</p>;
        }
      })}
    </div>
  );
}

export function readingMinutes(source: string): number {
  const words = source.replace(/[#>*\-[\]()]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
