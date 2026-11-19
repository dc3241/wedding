import Script from "next/script";

/**
 * impact.com partner tracking tag (affiliate network verification + link
 * tracking). Loaded only on the production deployment so preview builds and
 * local dev don't register traffic with the network.
 */
const IMPACT_SCRIPT_SRC =
  "https://utt.impactcdn.com/P-A8269709-f096-450c-bb5e-37094c9c74181.js";

const IMPACT_INIT = `(function(i,m,p,a,c,t){c.ire_o=p;c[p]=c[p]||function(){(c[p].a=c[p].a||[]).push(arguments)};t=a.createElement(m);var z=a.getElementsByTagName(m)[0];t.async=1;t.src=i;z.parentNode.insertBefore(t,z)})('${IMPACT_SCRIPT_SRC}','script','impactStat',document,window);impactStat('transformLinks');impactStat('trackImpression');`;

export function ImpactTracking() {
  if (process.env.VERCEL_ENV !== "production") return null;
  return (
    <Script
      id="impact-tracking"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: IMPACT_INIT }}
    />
  );
}
