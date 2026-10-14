import "server-only";
import { requireStaff } from "@/lib/auth/staff";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type IdeaStatus = Database["public"]["Enums"]["idea_status"];

export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  new: "Nieuw",
  discussing: "In bespreking",
  approved: "Goedgekeurd",
  rejected: "Afgewezen",
  converted: "Project gestart",
};

export type IdeaFilter = "open" | "approved" | "converted" | "rejected" | "all";

export type IdeaCard = {
  id: string;
  title: string;
  description: string | null;
  status: IdeaStatus;
  authorId: string | null;
  authorName: string;
  createdAt: string;
  votes: number;
  votedByMe: boolean;
  comments: number;
  projectId: string | null;
  decidedByName: string | null;
};

const FILTER_STATUSES: Record<Exclude<IdeaFilter, "all">, IdeaStatus[]> = {
  open: ["new", "discussing"],
  approved: ["approved"],
  converted: ["converted"],
  rejected: ["rejected"],
};

const IDEA_COLUMNS = `id, title, description, status, author_id, created_at, project_id,
  author:staff_profiles!ideas_author_id_fkey(display_name),
  decider:staff_profiles!ideas_decided_by_fkey(display_name),
  votes:idea_votes(staff_id),
  comments(count)`;

type IdeaRow = {
  id: string;
  title: string;
  description: string | null;
  status: IdeaStatus;
  author_id: string | null;
  created_at: string;
  project_id: string | null;
  author: { display_name: string } | null;
  decider: { display_name: string } | null;
  votes: Array<{ staff_id: string }>;
  comments: Array<{ count: number }>;
};

function toCard(row: IdeaRow, staffId: string): IdeaCard {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    authorId: row.author_id,
    authorName: row.author?.display_name ?? "Onbekend",
    createdAt: row.created_at,
    votes: row.votes.length,
    votedByMe: row.votes.some((vote) => vote.staff_id === staffId),
    comments: row.comments[0]?.count ?? 0,
    projectId: row.project_id,
    decidedByName: row.decider?.display_name ?? null,
  };
}

export async function listIdeas(filter: IdeaFilter): Promise<IdeaCard[]> {
  const staff = await requireStaff();
  const supabase = await createClient();
  let query = supabase
    .from("ideas")
    .select(IDEA_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter !== "all") query = query.in("status", FILTER_STATUSES[filter]);
  const { data, error } = await query;
  if (error) throw new Error("Kon ideeën niet laden");
  return (data as unknown as IdeaRow[])
    .map((row) => toCard(row, staff.id))
    .sort((a, b) => b.votes - a.votes || b.createdAt.localeCompare(a.createdAt));
}

export async function getIdea(id: string): Promise<IdeaCard | null> {
  const staff = await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ideas")
    .select(IDEA_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return toCard(data as unknown as IdeaRow, staff.id);
}

/** The idea a project grew out of (if any), for linking back to its discussion. */
export async function getIdeaForProject(projectId: string) {
  await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase
    .from("ideas")
    .select("id, title")
    .eq("project_id", projectId)
    .maybeSingle();
  return data;
}
