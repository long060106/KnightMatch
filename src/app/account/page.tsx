import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountPanel } from "@/components/account-panel";
import { DrawRule } from "@/components/draw-rule";
import { ACCOUNTS_ON } from "@/lib/accounts";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Your account",
    description: "Keep your KnightMatch skills, courses and list on every device, or delete your account.",
    path: "/account",
  }),
  robots: { index: false },
};

export default function AccountPage() {
  if (!ACCOUNTS_ON) notFound();
  return (
    <div className="mx-auto max-w-[1200px] px-4 md:px-6">
      <header className="pt-16 pb-6 md:pt-14 md:pb-8">
        <h1 className="font-serif text-[clamp(2rem,1.2rem+3.2vw,3.25rem)] leading-[1.06] tracking-[-0.015em]">
          Your account
        </h1>
      </header>
      <DrawRule />
      <AccountPanel />
    </div>
  );
}
