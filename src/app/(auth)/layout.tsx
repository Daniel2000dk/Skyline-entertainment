import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main
      id="inhoud"
      className="flex flex-1 flex-col items-center justify-center bg-[radial-gradient(50%_40%_at_50%_0%,rgba(212,175,55,0.12),transparent_70%)] px-4 py-12"
    >
      <div className="mb-10">
        <Logo variant="stacked" />
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
