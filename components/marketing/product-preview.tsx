export function ProductPreview() {
  return (
    <div
      aria-hidden
      className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-raised)]"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-accent">
            Checklist
          </p>
          <p className="mt-1 text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            12 weeks out
          </p>
        </div>
        <span className="text-[32px] font-extrabold tracking-[-0.035em] tabular-nums text-ink">
          68%
        </span>
      </div>

      <div className="mb-4 rounded-[var(--radius-pill)] bg-[#EDE4E8] p-[5px]">
        <div
          className="h-2.5 rounded-[var(--radius-pill)] bg-sage"
          style={{ width: "68%" }}
        />
      </div>

      <div className="space-y-2">
        {[
          { title: "Confirm florist delivery window", done: true },
          { title: "Send final guest count", done: true },
          { title: "Book hair & makeup trial", done: false },
          { title: "Print day-of run sheet", done: false },
        ].map((task) => (
          <div
            key={task.title}
            className="flex items-center gap-3 rounded-[var(--radius-inner)] bg-well px-3.5 py-3 shadow-[var(--shadow-recessed)]"
          >
            <span
              className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border ${
                task.done
                  ? "border-sage bg-sage text-surface"
                  : "border-ring bg-surface"
              }`}
            >
              {task.done ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M2 5.2L4.1 7.2L8 2.8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </span>
            <span
              className={`text-[14px] font-medium ${
                task.done ? "text-muted line-through" : "text-ink"
              }`}
            >
              {task.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
