import type { Metadata } from "next";
import { DrawRule } from "@/components/draw-rule";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy",
  description:
    "What KnightMatch keeps, where your data goes and how to remove it. Accounts are optional, and your resume is never saved.",
  path: "/privacy",
});

const UPDATED = "October 31, 2026";
const CONTACT_EMAIL = "longnguyen060106@gmail.com";

const SECTIONS: { title: string; paragraphs: string[] }[] = [
  {
    title: "Without an account",
    paragraphs: [
      "You can use KnightMatch without signing in. Your skills, courses, list of projects and light or dark choice are stored in your browser. They stay there unless you sign in or ask the AI to write your email, both explained below. Clearing your browser's data removes them.",
      "Your resume is read inside your browser. It is never saved, and it is gone when you reload or close the tab.",
    ],
  },
  {
    title: "If you sign in with Google",
    paragraphs: [
      "Signing in is optional. It keeps your skills, courses and list the same on all your devices.",
      "Google tells us your email address, name and profile photo. We keep your email address and the ID Google gives your account, because that is how we recognize you. We don't save your name, your photo or Google's sign-in tokens.",
      "We also keep what you add: your skills and courses, and for each project on your list, how far it got and the dates. A session record and a cookie keep you signed in. The session record has no IP address or browser details, and KnightMatch sets cookies only when you sign in.",
      "Your Google information is used only to sign you in. It is not sold, not shared and not sent to the AI.",
    ],
  },
  {
    title: "If you ask the AI to write your email",
    paragraphs: [
      "This happens only when you choose it and add your resume. Your resume text, your skills and courses, and the project go through our server to Google's Gemini AI. An automatic step in your browser takes out your email address, phone number and street address first. The rest of your resume, including your name, stays in the text.",
      "KnightMatch keeps none of it. On Gemini's free plan, Google may use what is sent to improve its products, so leave out anything you wouldn't want shared.",
    ],
  },
  {
    title: "Who else handles data",
    paragraphs: [
      "Vercel hosts the site and handles every request, so your IP address appears in its short-lived logs. Neon stores account data. Google provides sign-in and the AI.",
      "We use your IP address to limit how often some requests can be made. During sign-in it stays in our database for a short time, then it is removed.",
      "There are no ads, no analytics and no tracking cookies. We don't sell your data or share it with anyone else.",
    ],
  },
  {
    title: "Removing your data",
    paragraphs: [
      "Signing out removes your skills and list from that browser and leaves them in your account.",
      "Delete my account, on the Your account page, removes your email address, skills, courses and list from our database right away. A copy can remain in Neon's short restore history until it expires. The copy in your browser stays until you clear it. You can also email us and we will delete your account for you.",
    ],
  },
  {
    title: "Questions and changes",
    paragraphs: [
      "KnightMatch is a personal project by Long Nguyen, a UCF student, for college students. It is not run by UCF and it is not meant for children under 13. If this page changes, the date at the top changes too.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-20 md:px-6 md:pb-28">
      <header className="pt-16 pb-6 md:pt-14 md:pb-8">
        <h1 className="font-serif text-[clamp(2rem,1.2rem+3.2vw,3.25rem)] leading-[1.06] tracking-[-0.015em]">Privacy</h1>
        <p className="mt-4 max-w-[58ch] text-muted-foreground">
          What KnightMatch keeps, where it goes and how to remove it.
        </p>
        <p className="km-label mt-4 text-muted-foreground">Last updated {UPDATED}</p>
      </header>
      {SECTIONS.map((section) => (
        <section key={section.title} aria-labelledby={slug(section.title)}>
          <DrawRule />
          <div className="grid gap-x-8 gap-y-3 py-8 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <h2 id={slug(section.title)} className="font-serif text-2xl leading-tight">
              {section.title}
            </h2>
            <div className="grid max-w-[62ch] gap-3 text-muted-foreground">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>
      ))}
      <DrawRule />
      <p className="mt-8 text-sm text-muted-foreground">
        Questions or a deletion request:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="km-link font-medium text-foreground [overflow-wrap:anywhere]">
          {CONTACT_EMAIL}
        </a>
      </p>
    </div>
  );
}

function slug(title: string): string {
  return title.toLowerCase().replace(/[^a-z]+/g, "-");
}
