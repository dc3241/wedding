import type {
  PartyLayout,
  PartyMember,
  PhotoShape,
  WeddingWebsiteContent,
} from "../types";
import { Band, Wrap } from "../layout";
import { PhotoTile } from "./PhotoTile";
import { SectionHead } from "./SectionHead";
import { showParty, type SectionVariant } from "./section-meta";
import { cn } from "@/lib/cn";

type WeddingPartySectionProps = {
  content: WeddingWebsiteContent;
  variant: SectionVariant;
  tint?: boolean;
};

type PartySide = "bride" | "groom" | "neutral";

type IndexedMember = {
  member: PartyMember;
  index: number;
};

type MemberFlow = "grid" | "stack";

const BRIDE_KEYWORDS = ["bridesmaid", "maid", "matron", "bride"] as const;
const GROOM_KEYWORDS = ["groomsm", "groom", "bestman", "usher"] as const;

/** Lowercase + strip non-letters so "Best Man" and "BestMan" both become "bestman". */
function normalizeRole(role: string | undefined): string {
  if (!role) return "";
  return role.toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * Infer side from free-text role. Both-keyword hits and empty roles go neutral
 * so match order never decides and unmatched members stay visible.
 */
function partySideFromRole(role: string | undefined): PartySide {
  const normalized = normalizeRole(role);
  if (!normalized) return "neutral";

  const brideHit = BRIDE_KEYWORDS.some((keyword) =>
    normalized.includes(keyword),
  );
  const groomHit = GROOM_KEYWORDS.some((keyword) =>
    normalized.includes(keyword),
  );

  if (brideHit && !groomHit) return "bride";
  if (groomHit && !brideHit) return "groom";
  return "neutral";
}

function bucketPartyMembers(members: PartyMember[]): {
  bridesmaids: IndexedMember[];
  groomsmen: IndexedMember[];
  neutral: IndexedMember[];
} {
  const bridesmaids: IndexedMember[] = [];
  const groomsmen: IndexedMember[] = [];
  const neutral: IndexedMember[] = [];

  members.forEach((member, index) => {
    const row = { member, index };
    const side = partySideFromRole(member.role);
    if (side === "bride") bridesmaids.push(row);
    else if (side === "groom") groomsmen.push(row);
    else neutral.push(row);
  });

  return { bridesmaids, groomsmen, neutral };
}

function resolvePartyLayout(layout: PartyLayout | undefined): PartyLayout {
  return layout ?? "stacked";
}

function templatePartyShape(variant: SectionVariant): PhotoShape {
  if (variant === "editorial") return "rect";
  if (variant === "romance") return "arch";
  if (variant === "minimalist") return "square";
  return "circle";
}

function MemberCard({
  member,
  variant,
  imageShape,
}: {
  member: PartyMember;
  variant: SectionVariant;
  imageShape?: PhotoShape;
}) {
  const shape = imageShape ?? templatePartyShape(variant);

  if (variant === "editorial" && imageShape == null) {
    return (
      <li
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
    );
  }

  return (
    <li className="text-center">
      <PhotoTile
        variant={variant}
        url={member.imageUrl}
        shape={shape}
        className={cn(
          "mx-auto mb-4",
          shape === "circle" || shape === "square"
            ? "max-w-[160px]"
            : "max-w-[140px]",
        )}
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
  );
}

function MemberGrid({
  rows,
  variant,
  memberFlow = "grid",
  imageShape,
}: {
  rows: IndexedMember[];
  variant: SectionVariant;
  memberFlow?: MemberFlow;
  imageShape?: PhotoShape;
}) {
  if (rows.length === 0) return null;

  const listClass =
    memberFlow === "stack"
      ? "m-0 grid list-none grid-cols-1 gap-5 p-0"
      : variant === "editorial" && imageShape == null
        ? "m-0 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 sm:gap-x-10"
        : "m-0 grid list-none grid-cols-2 gap-[26px] p-0 sm:grid-cols-4";

  return (
    <ul className={listClass}>
      {rows.map(({ member, index }) => (
        <MemberCard
          key={`${member.name}-${index}`}
          member={member}
          variant={variant}
          imageShape={imageShape}
        />
      ))}
    </ul>
  );
}

function PartySideGroup({
  label,
  rows,
  variant,
  memberFlow = "grid",
  imageShape,
}: {
  label: string;
  rows: IndexedMember[];
  variant: SectionVariant;
  memberFlow?: MemberFlow;
  imageShape?: PhotoShape;
}) {
  if (rows.length === 0) return null;

  return (
    <div>
      <h3
        className={
          variant === "editorial" || variant === "minimalist"
            ? "m-0 mb-5 text-left text-[12px] font-semibold tracking-[0.18em] uppercase"
            : "m-0 mb-5 text-center text-[12px] font-semibold tracking-[0.18em] uppercase"
        }
        style={{ color: "var(--ws-muted)" }}
      >
        {label}
      </h3>
      <MemberGrid
        rows={rows}
        variant={variant}
        memberFlow={memberFlow}
        imageShape={imageShape}
      />
    </div>
  );
}

function OpposedSides({
  bridesmaids,
  groomsmen,
  variant,
  memberFlow,
  imageShape,
}: {
  bridesmaids: IndexedMember[];
  groomsmen: IndexedMember[];
  variant: SectionVariant;
  memberFlow: MemberFlow;
  imageShape?: PhotoShape;
}) {
  const bothSides = bridesmaids.length > 0 && groomsmen.length > 0;

  return (
    <div
      className={
        bothSides
          ? "grid grid-cols-1 gap-12 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-12"
          : "space-y-12"
      }
    >
      <PartySideGroup
        label="Bridesmaids"
        rows={bridesmaids}
        variant={variant}
        memberFlow={memberFlow}
        imageShape={imageShape}
      />
      <PartySideGroup
        label="Groomsmen"
        rows={groomsmen}
        variant={variant}
        memberFlow={memberFlow}
        imageShape={imageShape}
      />
    </div>
  );
}

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
  const layout = resolvePartyLayout(party.layout);
  const imageShape = party.imageShape;
  const { bridesmaids, groomsmen, neutral } = bucketPartyMembers(members);

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

        <div className="space-y-12">
          {layout === "stacked" ? (
            <>
              <PartySideGroup
                label="Bridesmaids"
                rows={bridesmaids}
                variant={variant}
                imageShape={imageShape}
              />
              <PartySideGroup
                label="Groomsmen"
                rows={groomsmen}
                variant={variant}
                imageShape={imageShape}
              />
            </>
          ) : (
            <OpposedSides
              bridesmaids={bridesmaids}
              groomsmen={groomsmen}
              variant={variant}
              memberFlow={layout === "vertical" ? "stack" : "grid"}
              imageShape={imageShape}
            />
          )}

          {/* Neutral: ungrouped below both sides — no sub-header. */}
          {neutral.length > 0 ? (
            <MemberGrid
              rows={neutral}
              variant={variant}
              imageShape={imageShape}
            />
          ) : null}
        </div>
      </Wrap>
    </Band>
  );
}
