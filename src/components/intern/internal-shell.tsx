import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import type { CurrentStaff } from "@/lib/auth/staff";
import { MobileNav } from "./mobile-nav";
import { navItemsFor } from "./nav-items";
import { NavLinks } from "./nav-links";
import { UserPanel } from "./user-panel";

export function InternalShell({ staff, children }: { staff: CurrentStaff; children: ReactNode }) {
  const items = navItemsFor(staff.role);
  return (
    <div className="flex min-h-dvh flex-1">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-8 border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <Logo href="/intern" />
        <nav aria-label="Hoofdmenu" className="flex-1">
          <NavLinks items={items} />
        </nav>
        <UserPanel staff={staff} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur lg:hidden">
          <Logo href="/intern" />
          <MobileNav items={items} footer={<UserPanel staff={staff} />} />
        </header>
        <main id="inhoud" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export function InternalShellSkeleton() {
  return (
    <div className="flex min-h-dvh flex-1" aria-busy="true">
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:block" />
      <main id="inhoud" className="flex-1 px-6 py-8">
        <p className="text-sm text-muted-foreground">Laden…</p>
      </main>
    </div>
  );
}
