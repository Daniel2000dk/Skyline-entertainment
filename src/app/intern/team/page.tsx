import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/staff";
import { listTeam, type TeamMember } from "@/lib/team/queries";
import { InviteForm } from "./invite-form";
import { ActiveToggle, LoginLinkForm, MfaResetForm, RoleForm } from "./member-actions";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const currentStaff = await requireRole(["admin"]);
  const team = await listTeam();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Team"
        description="Nodig medewerkers uit en beheer hun rol en toegang. Alleen zichtbaar voor administrators."
      />

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Medewerker uitnodigen</h2>
          </CardTitle>
          <CardDescription>
            Je krijgt een persoonlijke link die je privé deelt. De medewerker stelt daarmee zelf een
            wachtwoord in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteForm />
        </CardContent>
      </Card>

      <section aria-labelledby="medewerkers" className="flex flex-col gap-4">
        <h2 id="medewerkers" className="text-lg font-semibold">
          Medewerkers ({team.length})
        </h2>
        <ul className="grid gap-4 lg:grid-cols-2">
          {team.map((member) => (
            <li key={member.id}>
              <MemberCard member={member} isSelf={member.id === currentStaff.id} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function MemberCard({ member, isSelf }: { member: TeamMember; isSelf: boolean }) {
  return (
    <Card className={member.isActive ? undefined : "opacity-75"}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <h3>{member.displayName}</h3>
          {isSelf && <Badge variant="outline">Jij</Badge>}
          <StatusBadge member={member} />
          {member.hasMfa && <Badge variant="outline">2FA aan</Badge>}
        </CardTitle>
        <CardDescription className="break-all">
          {member.email ?? "Geen e-mailadres"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isSelf ? (
          <p className="text-sm text-muted-foreground">
            {ROLE_LABELS[member.role]}. Je kunt je eigen rol en toegang niet wijzigen; laat dit een
            andere administrator doen.
          </p>
        ) : (
          <>
            <RoleForm staffId={member.id} role={member.role} name={member.displayName} />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              {member.isActive && <LoginLinkForm staffId={member.id} name={member.displayName} />}
              {member.hasMfa && <MfaResetForm staffId={member.id} name={member.displayName} />}
              <ActiveToggle
                staffId={member.id}
                name={member.displayName}
                isActive={member.isActive}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ member }: { member: TeamMember }) {
  if (!member.isActive) return <Badge variant="destructive">Gedeactiveerd</Badge>;
  if (!member.hasSignedIn) return <Badge variant="secondary">Uitgenodigd</Badge>;
  return <Badge variant="outline">Actief</Badge>;
}
