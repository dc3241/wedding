import Link from "next/link";
import { PrintContractButton } from "./PrintContractButton";
import {
  formatProposalCurrency,
  type ProposalLineItem,
} from "./types";

type ContractDocumentProps = {
  businessName: string;
  coupleName: string;
  proposalTitle: string;
  lineItems: ProposalLineItem[];
  total: number;
  terms: string | null;
  acceptedAt: string | null;
  leadId: string;
};

function formatContractDate(iso: string | null) {
  const date = iso ? new Date(iso) : new Date();
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatAcceptedDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function ContractDocument({
  businessName,
  coupleName,
  proposalTitle,
  lineItems,
  total,
  terms,
  acceptedAt,
  leadId,
}: ContractDocumentProps) {
  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .contract-print-root,
          .contract-print-root * {
            visibility: visible;
          }
          .contract-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            background: white;
          }
          .contract-no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="contract-no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/leads/${leadId}`}
          className="text-[13px] text-muted no-underline hover:text-ink"
        >
          ← Back to lead
        </Link>
        <PrintContractButton />
      </div>

      <article className="contract-print-root mx-auto max-w-[720px] rounded-[var(--radius-card)] border border-hairline bg-surface px-10 py-12 print:border-none print:px-0 print:py-0">
        <header className="border-b border-hairline pb-8">
          <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-muted">
            {businessName}
          </p>
          <h1 className="font-display mt-3 text-[32px] text-ink">
            {proposalTitle}
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            Agreement between {businessName} and {coupleName}
          </p>
          <p className="mt-1 text-[13px] text-muted">
            Date: {formatContractDate(acceptedAt)}
          </p>
          {acceptedAt ? (
            <p className="mt-1 text-[13px] text-sage">
              Accepted {formatAcceptedDate(acceptedAt)}
            </p>
          ) : null}
        </header>

        <section className="py-8">
          <h2 className="text-sm font-medium text-ink">Services & pricing</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr className="border-b border-hairline text-left text-[13px] text-muted">
                  <th className="pb-2 pr-4 font-medium">Description</th>
                  <th className="pb-2 pr-4 font-medium tabular-nums">Qty</th>
                  <th className="pb-2 pr-4 font-medium tabular-nums">Unit price</th>
                  <th className="pb-2 font-medium tabular-nums text-right">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr key={item.id} className="border-b border-hairline/60">
                    <td className="py-2.5 pr-4 text-ink">{item.description}</td>
                    <td className="py-2.5 pr-4 tabular-nums text-muted">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-muted">
                      {formatProposalCurrency(item.unit_price)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-ink">
                      {formatProposalCurrency(item.quantity * item.unit_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan={3}
                    className="pt-4 text-right text-sm font-medium text-ink"
                  >
                    Total
                  </td>
                  <td className="pt-4 text-right text-lg font-medium tabular-nums text-ink">
                    {formatProposalCurrency(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {terms ? (
          <section className="border-t border-hairline py-8">
            <h2 className="text-sm font-medium text-ink">Terms & conditions</h2>
            <div className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-muted">
              {terms}
            </div>
          </section>
        ) : null}

        <section className="border-t border-hairline pt-10">
          <h2 className="text-sm font-medium text-ink">Signatures</h2>
          <div className="mt-8 grid gap-12 sm:grid-cols-2">
            <div>
              <div className="border-b border-ink pb-1" />
              <p className="mt-2 text-[13px] text-muted">
                {businessName} (Planner)
              </p>
              <p className="mt-1 text-[12px] text-muted">Date: __________</p>
            </div>
            <div>
              <div className="border-b border-ink pb-1" />
              <p className="mt-2 text-[13px] text-muted">
                {coupleName} (Client)
              </p>
              <p className="mt-1 text-[12px] text-muted">Date: __________</p>
            </div>
          </div>
        </section>
      </article>
    </>
  );
}
