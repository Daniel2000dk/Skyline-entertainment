import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { requireStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import { MfaDisable, MfaSetup } from "./mfa-settings";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const staff = await requireStaff();
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const mfaEnabled = Boolean(factors?.totp.length);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Account"
        description={`${staff.displayName} · ${ROLE_LABELS[staff.role]}`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <h2>Tweestapsverificatie</h2>
            {mfaEnabled ? <Badge>Aan</Badge> : <Badge variant="secondary">Uit</Badge>}
          </CardTitle>
          <CardDescription>
            Naast je wachtwoord vul je bij het inloggen een code uit een authenticator-app in. Sterk
            aanbevolen, zeker voor administrators.
          </CardDescription>
        </CardHeader>
        <CardContent>{mfaEnabled ? <MfaDisable /> : <MfaSetup />}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Wachtwoord</h2>
          </CardTitle>
          <CardDescription>
            Wijzigen kan binnen 15 minuten na het inloggen. Langer ingelogd? Log dan eerst opnieuw
            in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/wachtwoord-instellen" className={buttonVariants({ variant: "outline" })}>
            Wachtwoord wijzigen
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
