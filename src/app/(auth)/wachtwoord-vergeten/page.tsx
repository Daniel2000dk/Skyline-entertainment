import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = { title: "Wachtwoord vergeten" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Wachtwoord vergeten"
      description="Vraag een administrator om een nieuwe activatielink. Je krijgt een link en een aparte code waarmee je zelf een nieuw wachtwoord kiest."
    >
      <Link
        href="/login"
        className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Terug naar inloggen
      </Link>
    </AuthCard>
  );
}
