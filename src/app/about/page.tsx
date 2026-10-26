import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Fragment, type CSSProperties } from "react";
import { DrawRule } from "@/components/draw-rule";
import { FloatingShapes } from "@/components/floating-shapes";
import { Portrait } from "@/components/portrait";
import { Scramble } from "@/components/scramble";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About",
  description:
    "KnightMatch is a student-built guide to UCF's Knight Research Scholars projects, developed by Long Nguyen. What it does, and the rules it keeps with your data.",
};

const REPO = "https://github.com/long060106/KnightMatch";

const HEADLINE: string[][] = [["Developed", "by"], ["Long", "Nguyen"]];

const CONTACT = [
  { label: "Email", value: "longnguyen060106@gmail.com", href: "mailto:longnguyen060106@gmail.com", external: false },
  { label: "Instagram", value: "@lo.ng_0601", href: "https://www.instagram.com/lo.ng_0601/", external: true },
  { label: "GitHub", value: "long060106", href: "https://github.com/long060106", external: true },
];

const PROMISES = [
  {
    title: "Public pages only",
    body: "KnightMatch checks the public Knight Research Scholars list once an hour, reads project pages only when something changed (and once a day anyway), slowly, and says who is asking. It never copies the OUR database. It only points you to it and tells you how to get access.",
  },
  {
    title: "Fixed rules, not guesses",
    body: "Your match is simple counting: the skills you have against the skills a project lists. Nothing decides it while you click. An AI model helps sort project wording during the updates and can help word your email, but it never decides your match, and the original text on KRSP is what counts.",
  },
  {
    title: "Your data stays with you",
    body: "Your skills and courses are saved only on your device, and your resume is read inside your browser. There is no account. Only if you ask the AI to write your email is your resume text sent to write it, with your email, phone and address taken out first, and it is not kept.",
  },
  {
    title: "You write the email",
    body: "KnightMatch drafts a first message, from a template or with AI help, for you to edit and send yourself. It never contacts a team leader or a professor for you, and every project links back to its KRSP listing with the date we last checked.",
  },
];

/** Each word rises out of its own mask (same effect as the home page headline). */
function RisingHeadline() {
  let i = 0;
  return HEADLINE.map((line, l) => (
    <span key={l} className="block whitespace-nowrap">
      {line.map((word, w) => (
        <Fragment key={w}>
          {w > 0 && " "}
          <span className="km-word-mask">
            <span className="km-word" style={{ "--i": i++ } as CSSProperties}>
              {word}
            </span>
          </span>
        </Fragment>
      ))}
    </span>
  ));
}

export default function AboutPage() {
  return (
    <>
      <section aria-labelledby="about-title" className="mx-auto max-w-[1200px] px-4 md:px-6">
        <div className="km-label flex flex-wrap items-center justify-between gap-x-6 gap-y-1 pt-5 pb-3 text-muted-foreground md:pt-6">
          <p className="inline-flex items-center gap-2">
            <span className="size-2 rounded-full bg-foreground" aria-hidden="true" />
            About KnightMatch
          </p>
          <p>Not affiliated with UCF</p>
        </div>
        <DrawRule />

        <div className="relative isolate py-14 md:py-20 lg:py-24">
          {/* A cube, an elliptic paraboloid and a sphere drift behind everything, partly hidden
              by the photo. Faint hairlines only, so the words stay the loudest thing on screen. */}
          <div aria-hidden="true" className="km-hero-in pointer-events-none absolute inset-0 -z-10" style={{ "--d": "400ms" } as CSSProperties}>
            <FloatingShapes />
          </div>

          <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-0">
            <div className="lg:col-span-8 lg:pr-10">
              <h1
                id="about-title"
                className="km-about-headline font-serif leading-[0.92] tracking-[-0.01em] uppercase"
              >
                <RisingHeadline />
              </h1>
              <p className="km-hero-in km-lead mt-8 max-w-[38ch] text-muted-foreground" style={{ "--d": "500ms" } as CSSProperties}>
                A student-built guide to UCF research teams that are looking for undergrads.
              </p>
              <div
                className="km-hero-in mt-6 grid max-w-[60ch] gap-4 text-[1.0625rem] leading-relaxed"
                style={{ "--d": "600ms" } as CSSProperties}
              >
                <p>
                  KnightMatch checks the public Knight Research Scholars list every hour. You add the skills and courses
                  you already have, and it shows how each team lines up, so your time goes to the teams that fit.
                </p>
                <p className="text-muted-foreground">
                  It is a personal project, built and maintained by one UCF student. It is not run, funded or checked by
                  UCF.
                </p>
              </div>
              <div
                className="km-hero-in mt-8 flex flex-wrap items-center gap-x-6 gap-y-1"
                style={{ "--d": "700ms" } as CSSProperties}
              >
                <Button asChild className="h-12 px-6 text-base font-semibold active:scale-[0.97]">
                  <Link href="/match">Add my skills and courses</Link>
                </Button>
              </div>
            </div>

            <div className="km-hero-in lg:col-span-4" style={{ "--d": "250ms" } as CSSProperties}>
              <Portrait />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="promises-title" className="mx-auto max-w-[1200px] px-4 pb-20 md:px-6 md:pb-28">
        <DrawRule />
        <div className="grid gap-10 pt-10 lg:grid-cols-12 lg:gap-0 lg:pt-14">
          <div className="lg:col-span-4 lg:pr-10">
            <h2 id="promises-title" className="km-label text-muted-foreground">
              <Scramble text="How it treats you and the data" />
            </h2>
            <p className="mt-6 max-w-[16ch] font-serif text-[clamp(2rem,1.2rem+2.4vw,3.25rem)] leading-[1.02]">
              Four rules it keeps.
            </p>
          </div>
          <ol className="lg:col-span-8">
            {PROMISES.map((promise, i) => (
              <li key={promise.title}>
                {i > 0 && <DrawRule />}
                <div className="grid gap-x-8 gap-y-2 py-7 md:grid-cols-[3rem_minmax(0,14rem)_minmax(0,1fr)]">
                  <span className="km-label text-muted-foreground md:pt-2">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="font-serif text-2xl leading-tight">{promise.title}</h3>
                  <p className="max-w-[56ch] text-muted-foreground">{promise.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <DrawRule className="mt-4" />
        <section aria-labelledby="contact-title" className="grid gap-6 py-10 lg:grid-cols-12 lg:gap-0 lg:py-14">
          <h2 id="contact-title" className="km-label text-muted-foreground lg:col-span-4 lg:pt-1">
            Contact
          </h2>
          <ul className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] lg:col-span-8">
            {CONTACT.map((item) => (
              <li key={item.label}>
                <p className="km-label text-muted-foreground">{item.label}</p>
                <a
                  href={item.href}
                  {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="km-link mt-1 inline-flex min-h-11 items-center gap-0.5 font-medium [overflow-wrap:anywhere]"
                >
                  {item.value}
                  {item.external && (
                    <>
                      <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <DrawRule />
        <p className="mt-8 max-w-[62ch] text-sm text-muted-foreground">
          Found a wrong listing or have an idea?{" "}
          <a href={`${REPO}/issues`} target="_blank" rel="noopener noreferrer" className="km-link font-medium text-foreground">
            Open an issue on GitHub
            <ArrowUpRight className="ml-0.5 inline size-3.5" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          . The original KRSP listing is always the source of truth.
        </p>
      </section>
    </>
  );
}
