import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export const metadata: Metadata = { title: "Geen toegang" };

export default function NoAccessPage() {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyTitle>
          <h1>Geen toegang</h1>
        </EmptyTitle>
        <EmptyDescription>
          Je rol geeft geen toegang tot deze pagina. Denk je dat dit niet klopt? Vraag het een
          administrator.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link href="/intern" className={buttonVariants({ variant: "outline" })}>
          Naar het dashboard
        </Link>
      </EmptyContent>
    </Empty>
  );
}
