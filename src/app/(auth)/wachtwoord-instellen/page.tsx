import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth/staff";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = { title: "Wachtwoord instellen" };

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <SetPasswordContent />
    </Suspense>
  );
}

async function SetPasswordContent() {
  const staff = await requireStaff();
  return (
    <AuthCard
      title="Wachtwoord instellen"
      description={`Kies een sterk wachtwoord voor je account, ${staff.displayName}.`}
    >
      <SetPasswordForm />
    </AuthCard>
  );
}
