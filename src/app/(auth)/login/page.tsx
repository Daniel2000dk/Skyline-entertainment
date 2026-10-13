import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Inloggen" };

export default function LoginPage() {
  return (
    <AuthCard title="Inloggen" description="Alleen voor medewerkers van Skyline Entertainment.">
      <LoginForm />
    </AuthCard>
  );
}
