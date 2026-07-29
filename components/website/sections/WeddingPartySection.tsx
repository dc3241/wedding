import type { WeddingWebsiteContent } from "../types";
import { Band, Wrap } from "../layout";
import { PhotoTile } from "./PhotoTile";
import { SectionHead } from "./SectionHead";
import { showParty, type SectionVariant } from "./section-meta";

type WeddingPartySectionProps = {
  content: WeddingWebsiteContent;
  variant: SectionVariant;
  tint?: boolean;
};

export function WeddingPartySection({
  content,
  variant,
  tint,
}: WeddingPartySectionProps) {
  if (!showParty(content)) return null;

  const { party } = content;
  const members = party.members.filter((member) => member.name.trim().length > 0);
  if (members.length === 0) return null;

  const heading = party.heading || "Wedding party";

  return (
    <Band id="party" tint={tint}>
      <Wrap>
        <SectionHead
          variant={variant}
          eyebrow={
            variant === "minimalist" || variant === "editorial"
              ? undefined
              : "The lineup"
          }
          sub={variant === "editorial" ? "The people beside us." : undefined}
        >
          {heading}
        </SectionHead>

        {variant === "editorial" ? (
          <ul className="m-0 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 sm:gap-x-10">
            {members.map((member, index) => (
              <li
                key={`${member.name}-${index}`}
                className="flex items-center gap-[18px] border-b pb-[18px]"
                style={{ borderColor: "var(--ws-border)" }}
              >
                <PhotoTile
                  variant={variant}
                  url={member.imageUrl}
                  shape="rect"
                  className="h-24 w-[76px] shrink-0 [&>div]:aspect-auto [&>div]:h-full [&>div]:rounded-sm"
                  alt=""
                />
                <div className="min-w-0">
                  <h4
                    className="font-serif-display m-0 text-[22px] font-medium"
                    style={{ color: "var(--ws-ink)" }}
                  >
                    {member.name}
                  </h4>
                  {member.role ? (
                    <p
                      className="m-0 mt-0.5 text-[11px] tracking-[0.16em] uppercase"
                      style={{ color: "var(--ws-accent)" }}
                    >
                      {member.role}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="m-0 grid list-none grid-cols-2 gap-[26px] p-0 sm:grid-cols-4">
            {members.map((member, index) => (
              <li key={`${member.name}-${index}`} className="text-center">
                <PhotoTile
                  variant={variant}
                  url={member.imageUrl}
                  shape={
                    variant === "romance"
                      ? "arch"
                      : variant === "minimalist"
                        ? "square"
                        : "circle"
                  }
                  className="mx-auto mb-4"
                  alt=""
                />
                <h4
                  className={
                    variant === "minimalist"
                      ? "m-0 text-[15px] font-semibold tracking-[0.02em]"
                      : "font-serif-display m-0 text-[21px] font-medium"
                  }
                  style={{ color: "var(--ws-ink)" }}
                >
                  {member.name}
                </h4>
                {member.role ? (
                  <p
                    className={
                      variant === "romance"
                        ? "font-serif-display m-0 mt-0.5 text-[15px] italic tracking-normal normal-case"
                        : variant === "minimalist"
                          ? "m-0 mt-0.5 text-[11px]"
                          : "m-0 mt-0.5 text-[12px] tracking-[0.14em] uppercase"
                    }
                    style={{
                      color:
                        variant === "minimalist"
                          ? "var(--ws-muted)"
                          : "var(--ws-accent)",
                    }}
                  >
                    {member.role}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Wrap>
    </Band>
  );
}
