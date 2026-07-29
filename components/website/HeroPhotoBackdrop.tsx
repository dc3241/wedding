/** Full-bleed photo + dark scrim for photo-led heroes (mockup source of truth). */
export function HeroPhotoBackdrop({
  imageUrl,
  fallbackTone = "warm",
}: {
  imageUrl?: string;
  /** Gradient placeholder when no photo — keeps hero readable. */
  fallbackTone?: "warm" | "editorial" | "romance" | "minimal" | "garden";
}) {
  const fallback =
    fallbackTone === "editorial"
      ? "linear-gradient(90deg, rgba(28,24,20,.6), rgba(28,24,20,.1)), linear-gradient(120deg, #b7a284, #5e483a)"
      : fallbackTone === "romance"
        ? "linear-gradient(180deg, rgba(40,26,30,.28), rgba(40,26,30,.5)), linear-gradient(135deg, #d8bcb6, #8a5f5a)"
        : fallbackTone === "minimal"
          ? "linear-gradient(180deg, rgba(24,24,24,.32), rgba(24,24,24,.5)), linear-gradient(135deg, #b9b3aa, #54504a)"
          : fallbackTone === "garden"
            ? "linear-gradient(180deg, rgba(26,34,26,.28), rgba(26,34,26,.5)), linear-gradient(135deg, #b7c3a3, #5a6b4c)"
            : "linear-gradient(135deg, #c3b39c 0%, #9a8168 55%, #6d5641 100%)";

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: imageUrl
            ? `url(${JSON.stringify(imageUrl)})`
            : fallback,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: imageUrl
            ? "linear-gradient(180deg, rgba(30,22,16,.3) 0%, rgba(30,22,16,.12) 42%, rgba(30,22,16,.55) 100%)"
            : "linear-gradient(180deg, rgba(30,22,16,.3) 0%, rgba(30,22,16,.12) 42%, rgba(30,22,16,.55) 100%)",
        }}
      />
    </>
  );
}
