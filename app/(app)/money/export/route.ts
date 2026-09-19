import { NextResponse } from "next/server";
import { getAccountContext } from "@/lib/account-context";
import { resolveBusinessAccountId } from "@/lib/billing/resolve-account";
import { listAccountInvoices } from "@/lib/invoices/actions";
import {
  buildCollectionCsv,
  buildInvoiceCsv,
  invoiceCsvFilename,
  isInvoiceCsvKind,
} from "@/lib/invoices/csv";
import { getCopy } from "@/lib/venue-copy";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  if (!isInvoiceCsvKind(kind)) {
    return new NextResponse("Unknown export.", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const account = await getAccountContext(supabase);
  if (!account || account.kind === "personal") {
    return NextResponse.redirect(new URL("/projects", request.url));
  }

  let accountId: string;
  try {
    accountId = await resolveBusinessAccountId(supabase);
  } catch {
    return NextResponse.redirect(new URL("/projects", request.url));
  }

  const invoices = await listAccountInvoices(accountId);
  const labels = {
    projectColumn: getCopy("moneyWeddingColumn", account.plan),
    projectDateColumn: getCopy("moneyCsvProjectDate", account.plan),
  };
  const body =
    kind === "invoices"
      ? buildInvoiceCsv(invoices, labels)
      : buildCollectionCsv(invoices, labels);
  const filename = invoiceCsvFilename(kind);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
