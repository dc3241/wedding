"use client";

import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";

function LogoutSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="ghost" className="text-sm" disabled={pending}>
      {pending ? "Logging out…" : "Log out"}
    </Button>
  );
}

export function LogoutButton() {
  return (
    <form action={logout}>
      <LogoutSubmitButton />
    </form>
  );
}
