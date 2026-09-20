/** True when a Supabase SSR session cookie is present (not the PKCE verifier). */
export function hasSupabaseAuthCookie(
  cookieList: { name: string }[],
): boolean {
  return cookieList.some(
    (cookie) =>
      cookie.name.includes("-auth-token") &&
      !cookie.name.includes("code-verifier"),
  );
}
