import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { logout } from "@/app/intern/actions";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthState } from "@/lib/auth/staff";
import { MfaForm } from "./mfa-form";

export const metadata: Metadata = { title: "Tweestapsverificatie" };

export default function MfaPage() {
  return (
    <Suspense fallback={<Skeleton className="h-72 w-full" />}>
      <MfaContent />
    </Suspense>
  );
}

async function MfaContent() {
  const state = await getAuthState();
  if (state.kind === "anonymous") redirect("/login");
  if (state.kind === "staff") redirect("/intern");

  return (
    <AuthCard
      title="Tweestapsverificatie"
      description="Open je authenticator-app en vul de 6-cijferige code voor Skyline in."
    >
      <div className="flex flex-col gap-4">
        <MfaForm />
        <form action={logout}>
          <Button type="submit" variant="ghost" className="w-full">
            Annuleren en uitloggen
          </Button>
        </form>
      </div>
    </AuthCard>
  );
}
