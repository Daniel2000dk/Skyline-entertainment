import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Wachtwoord vergeten" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Wachtwoord vergeten"
      description="Vul het e-mailadres van je medewerkersaccount in. Je ontvangt een link om een nieuw wachtwoord in te stellen."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
