import type { Metadata } from "next";
import { Suspense } from "react";
import { InternalShell, InternalShellSkeleton } from "@/components/intern/internal-shell";
import { requireStaff } from "@/lib/auth/staff";

export const metadata: Metadata = {
  title: { default: "Intern", template: "%s · Skyline intern" },
  robots: { index: false, follow: false },
};

export default function InternLayout({ children }: LayoutProps<"/intern">) {
  return (
    <Suspense fallback={<InternalShellSkeleton />}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}

async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  return <InternalShell staff={staff}>{children}</InternalShell>;
}
