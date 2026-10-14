import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ActivationForm } from "./activation-form";

export const metadata: Metadata = { title: "Account activeren" };

export default function ActivationPage() {
  return (
    <AuthCard
      title="Account activeren"
      description="Vul de activatiecode in en kies je wachtwoord. Daarna log je in met je gebruikersnaam."
    >
      <ActivationForm />
    </AuthCard>
  );
}
