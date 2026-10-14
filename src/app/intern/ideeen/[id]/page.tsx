import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Attachments } from "@/components/attachments/attachments";
import { Discussion } from "@/components/discussions/discussion";
import { VoteButton } from "@/components/ideas/vote-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/staff";
import { listAttachments } from "@/lib/attachments/queries";
import { formatDateTime } from "@/lib/datetime";
import { listThreads } from "@/lib/discussions/queries";
import { getIdea, IDEA_STATUS_LABELS } from "@/lib/ideas/queries";
import { listEventTypes } from "@/lib/projects/queries";
import { uuidSchema } from "@/lib/validation/projects";
import { ConvertIdea, DecideIdea, DeleteIdea, EditIdea } from "./idea-actions";

export const metadata: Metadata = { title: "Idee" };

export default async function IdeaPage({ params }: PageProps<"/intern/ideeen/[id]">) {
  const staff = await requireStaff();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const idea = await getIdea(id);
  if (!idea) notFound();

  const isAuthor = idea.authorId === staff.id;
  const isAdmin = staff.role === "admin";
  const isDecider = isAdmin || staff.role === "organizer";
  const isOpen = idea.status === "new" || idea.status === "discussing";
  const [attachments, threads, eventTypes] = await Promise.all([
    listAttachments({ ideaId: idea.id }),
    listThreads({ ideaId: idea.id }),
    isDecider && idea.status === "approved" ? listEventTypes() : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/intern/ideeen"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Ideeën
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{idea.title}</h1>
          <Badge variant={idea.status === "approved" ? "default" : "outline"}>
            {IDEA_STATUS_LABELS[idea.status]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {idea.authorName} · {formatDateTime(idea.createdAt)}
          {idea.decidedByName && ` · beoordeeld door ${idea.decidedByName}`}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Omschrijving</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm whitespace-pre-line">
                {idea.description || "Geen omschrijving."}
              </p>
              <VoteButton
                ideaId={idea.id}
                title={idea.title}
                votes={idea.votes}
                votedByMe={idea.votedByMe}
                canVote={isOpen}
              />
              {(isAuthor || isAdmin) && isOpen && <EditIdea idea={idea} />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Afbeeldingen en bestanden</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Attachments
                owner={{ ideaId: idea.id }}
                attachments={attachments}
                canUpload={isAuthor || isDecider}
                currentStaffId={staff.id}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Discussie</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Discussion
                subject={{ ideaId: idea.id }}
                threads={threads}
                currentStaffId={staff.id}
                isAdmin={isAdmin}
                emptyText="Nog geen reacties. Wat vind jij ervan?"
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          {idea.projectId && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>Project</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/intern/projecten/${idea.projectId}`} className={buttonVariants()}>
                  Naar het project
                </Link>
              </CardContent>
            </Card>
          )}
          {isDecider && isOpen && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>Beoordelen</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DecideIdea idea={idea} />
              </CardContent>
            </Card>
          )}
          {isDecider && idea.status === "approved" && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>Project starten</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ConvertIdea idea={idea} eventTypes={eventTypes} />
              </CardContent>
            </Card>
          )}
          {(isAdmin || (isAuthor && idea.status === "new")) && <DeleteIdea idea={idea} />}
        </div>
      </div>
    </div>
  );
}
