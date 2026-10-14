import type { StaffRole } from "@/lib/auth/roles";

export type NavItem = {
  href: string;
  label: string;
  icon: "dashboard" | "projects" | "tasks" | "team";
  roles: readonly StaffRole[];
};

const ALL_ROLES = ["admin", "organizer", "team_member"] as const;

// Only modules that exist are listed; no dead links. Planning, Ideeën,
// CRM and Financiën are added as they are built.
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/intern", label: "Dashboard", icon: "dashboard", roles: ALL_ROLES },
  { href: "/intern/projecten", label: "Projecten", icon: "projects", roles: ALL_ROLES },
  { href: "/intern/taken", label: "Taken", icon: "tasks", roles: ALL_ROLES },
  { href: "/intern/team", label: "Team", icon: "team", roles: ["admin"] },
];

export function navItemsFor(role: StaffRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
