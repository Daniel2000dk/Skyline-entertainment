import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Discussion } from "@/components/discussions/discussion";
import { SuggestionCard, SuggestionForm } from "@/components/discussions/suggestions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/staff";
import { listSuggestions, listThreads } from "@/lib/discussions/queries";
import { getProject, projectRights } from "@/lib/projects/queries";
import type { SuggestionField } from "@/lib/validation/discussions";

export const metadata: Metadata = { title: "Discussie" };

export default async function ProjectDiscussionPage({
  params,
}: PageProps<"/intern/projecten/[id]/discussie">) {
  const staff = await requireStaff();
  const project = await getProject((await params).id);
  if (!project) notFound();

  const { canManage } = projectRights(staff, project);
  const [suggestions, threads] = await Promise.all([
    listSuggestions(project.id),
    listThreads({ projectId: project.id }),
  ]);
  const event = project.event;
  const currentValues: Record<SuggestionField, string | null> = {
    title: project.title,
    description: project.description,
    budget_gta: String(project.budget),
    summary: event?.summary ?? null,
    rules: event?.rules ?? null,
    location: event?.location ?? null,
    starts_at: event?.startsAt ?? null,
    ends_at: event?.endsAt ?? null,
    capacity: event?.capacity?.toString() ?? null,
    entry_fee_gta: event ? String(event.entryFee) : null,
  };
  const isAdmin = staff.role === "admin";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Suggesties</h2>
          </CardTitle>
          <CardDescription>
            Stel een wijziging voor zonder het project zelf aan te passen. De eigenaar accepteert of
            wijst af; geaccepteerde wijzigingen staan in de geschiedenis.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {suggestions.length === 0 && (
            <p className="text-sm text-muted-foreground">Nog geen suggesties.</p>
          )}
          {suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              currentValues={currentValues}
              canDecide={canManage}
              currentStaffId={staff.id}
              isAdmin={isAdmin}
            />
          ))}
          <section aria-labelledby="suggestion-new" className="rounded-lg border border-dashed p-4">
            <h3 id="suggestion-new" className="mb-3 font-medium">
              Nieuwe suggestie
            </h3>
            <SuggestionForm projectId={project.id} />
          </section>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Discussie</h2>
          </CardTitle>
          <CardDescription>Iedereen in het team kan meelezen en reageren.</CardDescription>
        </CardHeader>
        <CardContent>
          <Discussion
            subject={{ projectId: project.id }}
            threads={threads}
            currentStaffId={staff.id}
            isAdmin={isAdmin}
          />
        </CardContent>
      </Card>
    </div>
  );
}
