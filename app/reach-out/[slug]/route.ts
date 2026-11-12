import { NextResponse, type NextRequest } from "next/server";
import { getAccountContext } from "@/lib/account-context";
import { addListingToProject } from "@/lib/directory/add-to-project";
import { getListingBySlug } from "@/lib/directory/data";
import {
  isValidListingSlug,
  REACH_OUT_COOKIE,
  reachOutCookieOptions,
} from "@/lib/directory/reach-out";
import { stateByCode } from "@/lib/directory/states";
import { needsCoupleOnboarding } from "@/lib/onboarding-gate";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/**
 * "Reach out to this venue" from the public directory.
 *  - signed out: remember the venue, send to signup
 *  - signed in, no account / not onboarded: remember it, finish onboarding first
 *  - signed-in couple: add the venue to their project as "to contact" and open outreach
 * The cookie only carries a listing slug (validated against the directory), never trusted data.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const origin = request.nextUrl.origin;
  const hub = NextResponse.redirect(`${origin}/wedding-vendors`);

  if (!isValidListingSlug(slug)) return hub;
  const listing = await getListingBySlug(slug);
  if (!listing) return hub;

  const state = stateByCode(listing.state);
  const listingPage = `${origin}/wedding-vendors/${state?.slug ?? ""}/${listing.slug}`;

  const remember = (to: string) => {
    const res = NextResponse.redirect(to);
    res.cookies.set(REACH_OUT_COOKIE, slug, reachOutCookieOptions());
    return res;
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return remember(`${origin}/login?mode=signup`);
  }

  const account = await getAccountContext(supabase);
  if (!account) return remember(`${origin}/projects`);

  if (account.kind !== "personal" || !account.singleProjectId) {
    return NextResponse.redirect(listingPage);
  }

  if (await needsCoupleOnboarding(supabase, account.singleProjectId)) {
    return remember(`${origin}/onboarding`);
  }

  const result = await addListingToProject(supabase, {
    accountId: account.accountId,
    projectId: account.singleProjectId,
    listing,
  });

  if (!result.ok) {
    console.error("reach-out add failed:", result.error);
    return NextResponse.redirect(listingPage);
  }

  const done = NextResponse.redirect(
    `${origin}/projects/${account.singleProjectId}/vendors?tab=outreach`,
  );
  done.cookies.delete(REACH_OUT_COOKIE);
  return done;
}
