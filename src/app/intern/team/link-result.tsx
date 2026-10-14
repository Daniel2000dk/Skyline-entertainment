"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function CopyRow({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex gap-2">
        <Input
          readOnly
          value={value}
          aria-label={label}
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button type="button" variant="outline" onClick={copy}>
          {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
          {copied ? "Gekopieerd" : "Kopiëren"}
        </Button>
      </div>
    </div>
  );
}

/** Shows a one-time activation link and its code once. */
export function LinkResult({
  link,
  code,
  username,
  label,
}: {
  link: string;
  code: string;
  username?: string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/40 bg-card p-3">
      {username && <CopyRow value={username} label="Gebruikersnaam om in te loggen" />}
      <CopyRow value={link} label={label} />
      <CopyRow value={code} label="Activatiecode" />
      <p className="text-xs text-muted-foreground">
        Deel de link en de code via verschillende kanalen (bijvoorbeeld de link in een privébericht
        en de code mondeling). Alleen met allebei kan het wachtwoord worden ingesteld. Werkt één
        keer en verloopt na 24 uur; vijf foute codes maken de link ongeldig.
      </p>
    </div>
  );
}
