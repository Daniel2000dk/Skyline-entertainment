"use client";

import { MenuIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { NavItem } from "./nav-items";
import { NavLinks } from "./nav-links";

export function MobileNav({ items, footer }: { items: NavItem[]; footer: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Menu openen">
            <MenuIcon aria-hidden="true" />
          </Button>
        }
      />
      <SheetContent side="left" className="flex w-72 flex-col gap-6 bg-sidebar p-4">
        <SheetHeader className="p-0">
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav aria-label="Hoofdmenu" className="flex-1">
          <NavLinks items={items} onNavigate={() => setOpen(false)} />
        </nav>
        {footer}
      </SheetContent>
    </Sheet>
  );
}
