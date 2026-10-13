"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Shows a one-time link once, with a copy button. */
export function LinkResult({ link, label }: { link: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-primary/40 bg-card p-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex gap-2">
        <Input readOnly value={link} aria-label={label} onFocus={(e) => e.currentTarget.select()} />
        <Button type="button" variant="outline" onClick={copy}>
          {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
          {copied ? "Gekopieerd" : "Kopiëren"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Deel deze link alleen privé met de medewerker. Hij werkt één keer en verloopt na een uur.
      </p>
    </div>
  );
}
