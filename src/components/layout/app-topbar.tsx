import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function AppTopbar({ orgName, userName }: { orgName: string; userName: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-line bg-white px-6">
      <div>
        <p className="text-sm font-semibold text-ink">{orgName}</p>
        <p className="text-xs text-stone">{userName}</p>
      </div>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <Button variant="ghost" size="sm" type="submit">
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </form>
    </header>
  );
}
