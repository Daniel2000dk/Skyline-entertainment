import { ThumbsUpIcon } from "lucide-react";
import { toggleVote } from "@/app/intern/ideeen/actions";
import { Button } from "@/components/ui/button";

/** Vote toggle (plain form: works without JavaScript). */
export function VoteButton({
  ideaId,
  title,
  votes,
  votedByMe,
  canVote,
}: {
  ideaId: string;
  title: string;
  votes: number;
  votedByMe: boolean;
  canVote: boolean;
}) {
  if (!canVote) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ThumbsUpIcon className="size-4" aria-hidden="true" />
        {votes} {votes === 1 ? "stem" : "stemmen"}
      </span>
    );
  }
  return (
    <form action={toggleVote}>
      <input type="hidden" name="ideaId" value={ideaId} />
      <input type="hidden" name="voted" value={String(votedByMe)} />
      <Button
        type="submit"
        size="sm"
        variant={votedByMe ? "default" : "outline"}
        aria-pressed={votedByMe}
        aria-label={`${votedByMe ? "Stem intrekken voor" : "Stemmen op"} ${title} (${votes} ${votes === 1 ? "stem" : "stemmen"})`}
      >
        <ThumbsUpIcon aria-hidden="true" />
        {votes}
      </Button>
    </form>
  );
}
