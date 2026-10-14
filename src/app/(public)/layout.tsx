import { BrandMark, Logo } from "@/components/brand/logo";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Logo />
        </div>
      </header>
      <main id="inhoud" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BrandMark className="h-6 w-auto" />
            <p className="font-heading text-xs font-semibold tracking-[0.3em] text-brand-light uppercase">
              Events bring people together
            </p>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            Skyline Entertainment organiseert evenementen binnen GTA roleplay. Alle bedragen zijn
            in-game GTA-dollars.
          </p>
        </div>
      </footer>
    </>
  );
}
