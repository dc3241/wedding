import type { WeddingWebsiteContent } from "../types";
import { Band, Wrap } from "../layout";
import { SectionHead } from "./SectionHead";
import { showFaq, type SectionVariant } from "./section-meta";
import { cn } from "@/lib/cn";

type FaqSectionProps = {
  content: WeddingWebsiteContent;
  variant: SectionVariant;
  tint?: boolean;
};

export function FaqSection({ content, variant, tint }: FaqSectionProps) {
  if (!showFaq(content)) return null;

  const { faq } = content;
  const items = faq.items.filter(
    (item) => item.question.trim().length > 0 && item.answer.trim().length > 0,
  );
  if (items.length === 0) return null;

  const heading = faq.heading || (variant === "editorial" ? "FAQ" : "Questions & answers");

  return (
    <Band id="faq" tint={tint}>
      <Wrap>
        <SectionHead
          variant={variant}
          eyebrow={
            variant === "minimalist" || variant === "editorial"
              ? undefined
              : "Good to know"
          }
          sub={variant === "editorial" ? "The practical bits." : undefined}
        >
          {heading}
        </SectionHead>

        {variant === "minimalist" ? (
          <ul className="mx-auto m-0 max-w-[680px] list-none p-0">
            {items.map((item, index) => (
              <li
                key={`${item.question}-${index}`}
                className="grid gap-1.5 border-t py-5 sm:grid-cols-[200px_1fr] sm:gap-6"
                style={{ borderColor: "var(--ws-border)" }}
              >
                <h4
                  className="m-0 text-[15px] font-semibold"
                  style={{ color: "var(--ws-ink)" }}
                >
                  {item.question}
                </h4>
                <p className="m-0 text-[15px]" style={{ color: "var(--ws-muted)" }}>
                  {item.answer}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <ul
            className={cn(
              "m-0 grid list-none gap-x-[54px] p-0",
              variant === "editorial"
                ? "grid-cols-1 gap-y-0 sm:grid-cols-2"
                : "grid-cols-1 gap-y-[34px] sm:grid-cols-2",
              variant === "romance" && "text-center",
            )}
          >
            {items.map((item, index) => (
              <li
                key={`${item.question}-${index}`}
                className={cn(
                  variant === "editorial" && "border-t pt-[18px]",
                )}
                style={
                  variant === "editorial"
                    ? { borderColor: "var(--ws-border)" }
                    : undefined
                }
              >
                <h4
                  className={cn(
                    "font-serif-display m-0 mb-2 text-[21px]",
                    variant === "romance" ? "font-medium italic" : "font-semibold",
                  )}
                  style={{ color: "var(--ws-ink)" }}
                >
                  {item.question}
                </h4>
                <p className="m-0 text-[15.5px]" style={{ color: "var(--ws-muted)" }}>
                  {item.answer}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Wrap>
    </Band>
  );
}
