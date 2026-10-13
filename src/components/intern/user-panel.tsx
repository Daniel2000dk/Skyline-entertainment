import { LogOutIcon, UserCogIcon } from "lucide-react";
import Link from "next/link";
import { logout } from "@/app/intern/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { CurrentStaff } from "@/lib/auth/staff";

export function UserPanel({ staff }: { staff: CurrentStaff }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-sidebar-border pt-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{staff.displayName}</p>
        <p className="text-xs text-muted-foreground">{ROLE_LABELS[staff.role]}</p>
      </div>
      <div className="flex">
        <Link
          href="/intern/account"
          aria-label="Account"
          title="Account"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <UserCogIcon aria-hidden="true" />
        </Link>
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            aria-label="Uitloggen"
            title="Uitloggen"
          >
            <LogOutIcon aria-hidden="true" />
          </Button>
        </form>
      </div>
    </div>
  );
}
