import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/auth/roles";
import { requireStaff } from "@/lib/auth/staff";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const staff = await requireStaff();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Welkom, ${staff.displayName}`}
        description="Overzicht van Skyline Entertainment."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Jouw rol: {ROLE_LABELS[staff.role]}</CardTitle>
            <CardDescription>{ROLE_DESCRIPTIONS[staff.role]}</CardDescription>
          </CardHeader>
        </Card>
        {staff.role === "admin" && (
          <Card>
            <CardHeader>
              <CardTitle>Team opbouwen</CardTitle>
              <CardDescription>
                Nodig medewerkers uit en beheer hun rollen via{" "}
                <Link
                  href="/intern/team"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Team
                </Link>
                .
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}
