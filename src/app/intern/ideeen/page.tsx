import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareIcon } from "lucide-react";
import { VoteButton } from "@/components/ideas/vote-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";
import { requireStaff } from "@/lib/auth/staff";
import { formatDate } from "@/lib/datetime";
import { IDEA_STATUS_LABELS, listIdeas, type IdeaFilter } from "@/lib/ideas/queries";
import { cn } from "@/lib/utils";
import { NewIdeaForm } from "./new-idea-form";

export const metadata: Metadata = { title: "Ideeën" };

const FILTERS: Array<{ value: IdeaFilter; label: string }> = [
  { value: "open", label: "Open" },
  { value: "approved", label: "Goedgekeurd" },
  { value: "converted", label: "Project gestart" },
  { value: "rejected", label: "Afgewezen" },
  { value: "all", label: "Alles" },
];

export default async function IdeasPage({ searchParams }: PageProps<"/intern/ideeen">) {
  await requireStaff();
  const requested = (await searchParams).filter;
  const filter = FILTERS.find((option) => option.value === requested)?.value ?? "open";
  const ideas = await listIdeas(filter);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ideeën"
        description="Deel ideeën voor evenementen, stem en praat mee. Goedgekeurde ideeën worden met één klik een project."
      />

      <details className="rounded-lg border p-4">
        <summary className="cursor-pointer font-medium">Nieuw idee delen</summary>
        <div className="mt-4">
          <NewIdeaForm />
        </div>
      </details>

      <nav aria-label="Filter" className="flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <Link
            key={option.value}
            href={
              option.value === "open" ? "/intern/ideeen" : `/intern/ideeen?filter=${option.value}`
            }
            aria-current={filter === option.value ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              filter === option.value
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      {ideas.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>Geen ideeën in deze lijst</EmptyTitle>
            <EmptyDescription>Deel het eerste idee hierboven.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="grid gap-3">
          {ideas.map((idea) => (
            <li key={idea.id}>
              <Card className="flex-row items-start gap-4 px-4 py-4 sm:px-5">
                <VoteButton
                  ideaId={idea.id}
                  title={idea.title}
                  votes={idea.votes}
                  votedByMe={idea.votedByMe}
                  canVote={idea.status === "new" || idea.status === "discussing"}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/intern/ideeen/${idea.id}`}
                      className="font-semibold underline-offset-4 hover:underline"
                    >
                      {idea.title}
                    </Link>
                    <Badge variant={idea.status === "approved" ? "default" : "outline"}>
                      {IDEA_STATUS_LABELS[idea.status]}
                    </Badge>
                  </div>
                  {idea.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {idea.description}
                    </p>
                  )}
                  <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {idea.authorName} · {formatDate(idea.createdAt)} ·
                    <MessageSquareIcon className="size-3" aria-hidden="true" />
                    {idea.comments}
                    <span className="sr-only">reacties</span>
                  </p>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
