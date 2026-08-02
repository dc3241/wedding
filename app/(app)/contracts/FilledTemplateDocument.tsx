"use client";

import { PrintContractButton } from "@/components/proposals/PrintContractButton";

type FilledTemplateDocumentProps = {
  businessName: string;
  templateName: string;
  coupleName: string;
  body: string;
  onBack: () => void;
};

export function FilledTemplateDocument({
  businessName,
  templateName,
  coupleName,
  body,
  onBack,
}: FilledTemplateDocumentProps) {
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
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer border-none bg-transparent p-0 text-[13px] text-muted hover:text-ink"
        >
          ← Back to edit
        </button>
        <PrintContractButton />
      </div>

      <article className="contract-print-root mx-auto max-w-[720px] rounded-[var(--radius-card)] border border-hairline bg-surface px-10 py-12 print:border-none print:px-0 print:py-0">
        <header className="border-b border-hairline pb-8">
          <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-muted">
            {businessName}
          </p>
          <h1 className="font-serif-display mt-3 text-[32px] leading-tight text-ink">
            {templateName}
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            Agreement between {businessName} and {coupleName}
          </p>
        </header>

        <section className="py-8">
          <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
            {body}
          </div>
        </section>

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
