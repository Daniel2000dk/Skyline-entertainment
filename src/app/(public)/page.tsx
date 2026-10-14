import { CalendarDaysIcon, Gamepad2Icon, PenLineIcon, UsersIcon } from "lucide-react";
import Image from "next/image";
import heroImage from "@/assets/brand/skyline-hero.jpg";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

const pillars = [
  {
    icon: CalendarDaysIcon,
    title: "Evenementen",
    text: "Races, meets, tochten en shows door heel Los Santos.",
  },
  {
    icon: UsersIcon,
    title: "Community",
    text: "Samen met spelers uit de hele stad, iedere keer weer.",
  },
  {
    icon: Gamepad2Icon,
    title: "Roleplay",
    text: "Elk evenement past in het verhaal van jouw personage.",
  },
  {
    icon: PenLineIcon,
    title: "Simpel inschrijven",
    text: "Alleen je GTA RP-naam. Geen account, geen e-mailadres.",
  },
] as const;

export default function HomePage() {
  return (
    <>
      {/* The key visual already carries the full logo and tagline: no second logo on top. */}
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(212,175,55,0.16),transparent_70%),radial-gradient(40%_60%_at_85%_20%,rgba(147,197,253,0.10),transparent_70%)]"
        />
        <div className="relative mx-auto max-w-6xl sm:px-4 sm:pt-6">
          <Image
            src={heroImage}
            alt="Skyline Entertainment. Real people. Bigger stories."
            priority
            placeholder="blur"
            sizes="(min-width: 1152px) 1120px, 100vw"
            className="h-auto w-full sm:rounded-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-background to-transparent sm:rounded-b-2xl"
          />
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 pt-8 pb-16 sm:pt-12">
        <section className="max-w-2xl">
          <p className="font-heading text-xs font-semibold tracking-[0.3em] text-primary uppercase">
            GTA RP-evenementen
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Races, meets en shows in Los Santos.
          </h1>
          <p className="mt-4 text-lg text-brand-light">
            Doe mee met je personage. Inschrijven gaat met alleen je GTA RP-naam, zonder account of
            e-mailadres.
          </p>
          <a
            href="#evenementen"
            className="mt-6 inline-flex h-11 items-center rounded-lg bg-primary px-5 font-heading text-sm font-bold text-primary-foreground transition hover:brightness-110"
          >
            Bekijk evenementen
          </a>
        </section>

        <section aria-label="Waar Skyline voor staat">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-4">
                  <Icon aria-hidden="true" className="size-6 shrink-0 text-primary" />
                  <h2 className="text-sm font-bold tracking-[0.18em] uppercase">{title}</h2>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="evenementen" className="scroll-mt-6">
          <h2 id="evenementen" className="mb-4 text-2xl font-bold">
            Evenementen
          </h2>
          <Empty className="border border-dashed bg-card/40">
            <EmptyHeader>
              <EmptyTitle>Nog geen evenementen gepubliceerd</EmptyTitle>
              <EmptyDescription>
                Zodra er een evenement openstaat voor inschrijving, zie je het hier.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </section>
      </div>
    </>
  );
}
