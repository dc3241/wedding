/** Set on the hop that mints a demo session. Stops a redirect loop if the auth cookie never sticks. */
export const DEMO_BOOT_COOKIE = "demo_bootstrap";

export function demoBootCookieOptions(maxAge: number) {
  return {
    path: "/",
    maxAge,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
