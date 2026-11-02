import { LogOut } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SignOutButton({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <form action={signOut} className={className}>
      <Button
        type="submit"
        variant="ghost"
        className={cn("w-full justify-start gap-3 text-muted-foreground", compact && "w-auto")}
      >
        <LogOut aria-hidden /> Log out
      </Button>
    </form>
  );
}
