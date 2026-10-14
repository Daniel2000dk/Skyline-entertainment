import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, type ProjectStatus } from "@/lib/projects/labels";

const variants: Record<ProjectStatus, "default" | "secondary" | "outline" | "destructive"> = {
  idea: "outline",
  under_review: "outline",
  approved: "secondary",
  in_preparation: "secondary",
  published: "default",
  completed: "secondary",
  archived: "outline",
  cancelled: "destructive",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge variant={variants[status]}>{STATUS_LABELS[status]}</Badge>;
}
