"use client";

import {
  CalendarDaysIcon,
  FolderKanbanIcon,
  LayoutDashboardIcon,
  LightbulbIcon,
  ListChecksIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-items";

const icons = {
  dashboard: LayoutDashboardIcon,
  planning: CalendarDaysIcon,
  projects: FolderKanbanIcon,
  tasks: ListChecksIcon,
  ideas: LightbulbIcon,
  team: UsersIcon,
} as const;

function isActive(pathname: string, href: string) {
  return href === "/intern"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = icons[item.icon];
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
              )}
            >
              <Icon className={cn("size-4", active && "text-primary")} aria-hidden="true" />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
