import type { ComponentType } from "react";

export type FeatureCard = {
  title: string;
  body: string;
  icon: ComponentType;
  Preview: ComponentType;
};

export function FeatureCardGrid({
  cards,
}: {
  cards: readonly FeatureCard[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
      {cards.map((card) => {
        const Icon = card.icon;
        const Preview = card.Preview;
        return (
          <article
            key={card.title}
            className="marketing-card-hover flex h-full flex-col rounded-[var(--radius-card)] border border-ring bg-surface p-6 shadow-raised md:p-7"
          >
            <div className="mb-4 flex size-10 items-center justify-center rounded-[var(--radius-inner)] bg-accent-wash text-accent">
              <Icon />
            </div>
            <h3 className="text-[17px] font-extrabold tracking-[-0.02em] text-ink md:text-[19px]">
              {card.title}
            </h3>
            <p className="mt-2 flex-1 text-[14px] leading-relaxed text-muted md:text-[15px]">
              {card.body}
            </p>
            <div className="mt-5">
              <Preview />
            </div>
          </article>
        );
      })}
    </div>
  );
}
