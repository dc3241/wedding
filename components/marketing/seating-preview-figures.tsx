/**
 * Sole LAND-01 consumer of `--sage-wash`: full-occupancy table fill in marketing
 * seating previews. Do not use `--sage-wash` elsewhere in this slice.
 */

type SeatingPreviewFiguresProps = {
  className?: string;
  /** Compact workspace-card canvas vs hero panel. */
  variant?: "hero" | "compact";
};

export function SeatingPreviewFigures({
  className,
  variant = "hero",
}: SeatingPreviewFiguresProps) {
  if (variant === "compact") {
    return (
      <svg
        viewBox="0 0 300 96"
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className={className}
      >
        <g transform="translate(46,48)">
          <circle
            r="26"
            fill="var(--sage-wash)"
            stroke="var(--sage)"
            strokeWidth="2.5"
          />
          <text
            y="4"
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fill="var(--sage)"
            fontFamily="var(--font-sans), Figtree, sans-serif"
          >
            Full
          </text>
        </g>
        <g transform="translate(150,48)">
          <rect
            x="-26"
            y="-26"
            width="52"
            height="52"
            rx="9"
            fill="var(--surface)"
            stroke="var(--accent)"
            strokeWidth="3"
          />
          <text
            y="4"
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fill="var(--ink)"
            fontFamily="var(--font-sans), Figtree, sans-serif"
          >
            T3
          </text>
        </g>
        <g transform="translate(252,48)">
          <circle r="24" fill="var(--surface)" stroke="var(--ring)" strokeWidth="2" />
          <text
            y="4"
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fill="var(--muted)"
            fontFamily="var(--font-sans), Figtree, sans-serif"
          >
            T4
          </text>
        </g>
      </svg>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 420 220"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g transform="translate(60,44)">
        <rect
          x="0"
          y="0"
          width="110"
          height="34"
          rx="9"
          fill="var(--surface)"
          stroke="var(--ring)"
          strokeWidth="2"
        />
        <text
          x="55"
          y="22"
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          fill="var(--ink)"
          fontFamily="var(--font-sans), Figtree, sans-serif"
        >
          Head
        </text>
      </g>
      <g transform="translate(300,58)">
        <circle
          cx="0"
          cy="0"
          r="34"
          fill="var(--sage-wash)"
          stroke="var(--sage)"
          strokeWidth="2.5"
        />
        <text
          x="0"
          y="5"
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          fill="var(--sage)"
          fontFamily="var(--font-sans), Figtree, sans-serif"
        >
          T2
        </text>
      </g>
      <g transform="translate(150,150)">
        <rect
          x="-30"
          y="-30"
          width="60"
          height="60"
          rx="10"
          fill="var(--surface)"
          stroke="var(--accent)"
          strokeWidth="3"
        />
        <text
          x="0"
          y="5"
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          fill="var(--ink)"
          fontFamily="var(--font-sans), Figtree, sans-serif"
        >
          T3
        </text>
      </g>
      <g transform="translate(320,158)">
        <circle
          cx="0"
          cy="0"
          r="30"
          fill="var(--surface)"
          stroke="var(--ring)"
          strokeWidth="2"
        />
        <text
          x="0"
          y="5"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="var(--muted)"
          fontFamily="var(--font-sans), Figtree, sans-serif"
        >
          T4
        </text>
      </g>
    </svg>
  );
}
