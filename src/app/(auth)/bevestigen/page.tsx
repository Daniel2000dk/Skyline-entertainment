import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { confirmSchema } from "@/lib/validation/auth";
import { ConfirmForm } from "./confirm-form";

export const metadata: Metadata = { title: "Link bevestigen" };

export default function ConfirmPage({ searchParams }: PageProps<"/bevestigen">) {
  return (
    <Suspense fallback={<Skeleton className="h-56 w-full" />}>
      <ConfirmContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ConfirmContent({ searchParams }: Pick<PageProps<"/bevestigen">, "searchParams">) {
  const params = await searchParams;
  const parsed = confirmSchema.safeParse({ tokenHash: params.token_hash, type: params.type });

  if (!parsed.success) {
    return (
      <AuthCard title="Ongeldige link">
        <Alert variant="destructive">
          <AlertDescription>
            Deze link is onvolledig of ongeldig. Vraag een administrator om een nieuwe link.
          </AlertDescription>
        </Alert>
      </AuthCard>
    );
  }

  const isInvite = parsed.data.type === "invite";
  return (
    <AuthCard
      title={isInvite ? "Welkom bij Skyline" : "Wachtwoord herstellen"}
      description={
        isInvite
          ? "Je bent uitgenodigd voor het interne systeem. Ga verder om je wachtwoord in te stellen."
          : "Ga verder om een nieuw wachtwoord in te stellen."
      }
    >
      <ConfirmForm tokenHash={parsed.data.tokenHash} type={parsed.data.type} />
    </AuthCard>
  );
}
