import { Button } from "@/components/ui/button";
import { signOutAction } from "@/components/layout/sign-out-action";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="ghost" size="sm">
        Sign out
      </Button>
    </form>
  );
}
