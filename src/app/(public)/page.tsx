import { EmptyState } from "@/components/ui/empty-state";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <section>
        <p className="text-sm font-medium tracking-[0.2em] text-gold uppercase">GTA RP events</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Races, meets en shows in Los Santos.
        </h1>
        <p className="mt-4 max-w-xl text-muted">
          Inschrijven doe je straks met alleen je GTA RP-naam. Geen account, geen e-mailadres.
        </p>
      </section>

      <section aria-labelledby="evenementen">
        <h2 id="evenementen" className="mb-4 text-xl font-semibold">
          Evenementen
        </h2>
        <EmptyState
          title="Nog geen evenementen gepubliceerd"
          description="Zodra er een evenement openstaat voor inschrijving, zie je het hier."
        />
      </section>
    </div>
  );
}
