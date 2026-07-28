import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

async function signOutAction() {
  "use server";
  await signOut();
}

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="ghost" size="sm">
        Sign out
      </Button>
    </form>
  );
}
