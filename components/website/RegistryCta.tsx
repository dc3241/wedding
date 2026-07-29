import { SITE_GUTTER, Wrap } from "./layout";

type RegistryCtaProps = {
  href: string;
};

export function RegistryCta({ href }: RegistryCtaProps) {
  return (
    <section
      className="scroll-mt-8 text-center font-ws-sans"
      style={{ padding: `clamp(64px, 9vw, 110px) ${SITE_GUTTER}` }}
    >
      <Wrap>
        <p
          className="m-0 text-[12px] font-semibold tracking-[0.22em] uppercase"
          style={{ color: "var(--ws-accent)" }}
        >
          With gratitude
        </p>
        <h2
          className="font-serif-display m-0 mt-2 text-[clamp(28px,4.5vw,42px)] font-medium"
          style={{ color: "var(--ws-ink)" }}
        >
          Registry
        </h2>
        <p
          className="mx-auto mt-3.5 max-w-[480px] text-[15px]"
          style={{ color: "var(--ws-muted)" }}
        >
          Your presence is the gift. If you&apos;d like to do more, we&apos;ve put
          together a few things.
        </p>
        <a
          href={href}
          className="mt-5 inline-block rounded-full px-[34px] py-3.5 text-[12.5px] font-medium tracking-[0.16em] uppercase no-underline"
          style={{
            background: "var(--ws-accent-deep)",
            color: "#ffffff",
          }}
        >
          View the registry
        </a>
      </Wrap>
    </section>
  );
}
