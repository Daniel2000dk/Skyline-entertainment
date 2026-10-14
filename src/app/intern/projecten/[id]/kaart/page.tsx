import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";
import { getMapImageUrl, listMarkers, listRoutes } from "@/lib/map/queries";
import { getProject, projectRights } from "@/lib/projects/queries";
import { RouteMap } from "./route-map";

export const metadata: Metadata = { title: "Kaart" };

export default async function ProjectMapPage({
  params,
}: PageProps<"/intern/projecten/[id]/kaart">) {
  const staff = await requireStaff();
  const project = await getProject((await params).id);
  if (!project) notFound();

  const { canEdit } = projectRights(staff, project);
  const [routes, markers, imageUrl] = await Promise.all([
    listRoutes(project.id),
    listMarkers(project.id),
    getMapImageUrl(),
  ]);

  return (
    <RouteMap
      projectId={project.id}
      imageUrl={imageUrl}
      routes={routes}
      markers={markers}
      canEdit={canEdit}
    />
  );
}
