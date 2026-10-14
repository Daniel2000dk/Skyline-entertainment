import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/staff";
import { listEventTypes } from "@/lib/projects/queries";
import { CreateProjectForm } from "./create-project-form";

export const metadata: Metadata = { title: "Nieuw project" };

export default async function NewProjectPage() {
  await requireRole(["admin", "organizer"]);
  const eventTypes = await listEventTypes();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nieuw project"
        description="Start met de basis; details vul je later aan in de projectruimte."
      />
      <CreateProjectForm eventTypes={eventTypes} />
    </div>
  );
}
