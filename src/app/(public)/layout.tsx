import { Logo } from "@/components/brand/logo";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
          <Logo />
        </div>
      </header>
      <main id="inhoud" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        {children}
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-muted">
          Skyline Entertainment organiseert evenementen binnen GTA roleplay. Alle bedragen zijn
          in-game GTA-dollars.
        </div>
      </footer>
    </>
  );
}
