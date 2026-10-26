"use client";

import { ClipboardPaste, FileUp, LoaderCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState, type DragEvent as ReactDragEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ReadProblem } from "@/lib/resume/extract-text";
import type { ScanResult } from "@/lib/resume/scan";
import { rememberResume } from "@/lib/resume/session";
import type { Course, Profile, SkillMap } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { ResumePicks } from "./resume-review";

// The review sheet (dialog, drawer, checkboxes) is only needed after a file is read.
const loadReview = () => import("./resume-review");
const ResumeReview = dynamic(() => loadReview().then((m) => m.ResumeReview), { ssr: false });

const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

interface Notice {
  text: string;
  /** Offer the "Paste text instead" fallback. */
  paste: boolean;
}

const PROBLEMS: Record<ReadProblem, Notice> = {
  "too-big": { text: "That file is over 10 MB. Try a smaller PDF or Word file.", paste: true },
  "legacy-doc": {
    text: "Older Word files (.doc) can't be read here. Save it as .docx or PDF and try again, or paste the text.",
    paste: true,
  },
  "wrong-type": { text: "Choose a PDF or a Word (.docx) file.", paste: true },
  scanned: {
    text: "This PDF looks like a scanned image, so there's no text to read. Try the Word version, or paste the text instead.",
    paste: true,
  },
  locked: { text: "This file is password-protected. Save a copy without the password, or paste the text instead.", paste: true },
  unreadable: { text: "We couldn't read this file. Try the other format, or paste the text instead.", paste: true },
};

type ScanModule = typeof import("@/lib/resume/scan");

interface ResumeUploadProps {
  profile: Profile;
  skills: SkillMap;
  courses: Course[];
  onAdd: (picks: ResumePicks) => void;
  /** The "Added N from your resume · Undo" line, shown right under the drop zone. */
  undo: ReactNode;
}

/**
 * "Fill from your resume": reads a PDF or Word file on this device, finds known courses and skills
 * with the fixed dictionary, and lets the student pick what to add. The file and its text are
 * never uploaded or saved; only the chosen course codes and skill ids reach the profile.
 */
export function ResumeUpload({ profile, skills, courses, onAdd, undo }: ResumeUploadProps) {
  const headingId = useId();
  const pasteId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pasteRef = useRef<HTMLTextAreaElement>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [review, setReview] = useState<{ found: ScanResult; key: number; source: "file" | "text" } | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  // /match#resume (the link under the home page button) lands here with the button focused.
  useEffect(() => {
    const focusIfTarget = () => {
      if (window.location.hash === "#resume") buttonRef.current?.focus();
    };
    focusIfTarget();
    window.addEventListener("hashchange", focusIfTarget);
    return () => window.removeEventListener("hashchange", focusIfTarget);
  }, []);

  // A file dropped next to the zone would make the browser open it and leave the page.
  useEffect(() => {
    const keepPage = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    };
    window.addEventListener("dragover", keepPage);
    window.addEventListener("drop", keepPage);
    return () => {
      window.removeEventListener("dragover", keepPage);
      window.removeEventListener("drop", keepPage);
    };
  }, []);

  useEffect(() => {
    if (pasting) pasteRef.current?.focus();
  }, [pasting]);

  function show(text: string, source: "file" | "text", { scanResume }: ScanModule) {
    rememberResume(text);
    const found = scanResume(text, profile);
    if (found.courses.length + found.skills.length > 0) {
      setReview({ found, key: Date.now(), source });
      setReviewOpen(true);
      return;
    }
    const known = scanResume(text, { skills: [], courses: [] });
    if (known.courses.length + known.skills.length > 0) {
      setNotice({ text: "Everything we recognized is already in your profile.", paste: false });
    } else if (source === "text") {
      setNotice({ text: "We didn't find any courses or skills we know in that text. You can add them below.", paste: false });
    } else {
      setNotice({ text: "We didn't find any courses or skills we know. Paste the text instead, or add them below.", paste: true });
    }
  }

  async function readFile(file: File) {
    if (reading) return;
    setReading(true);
    setNotice(null);
    setPasting(false);
    try {
      const [{ extractText }, scan] = await Promise.all([
        import("@/lib/resume/extract-text"),
        import("@/lib/resume/scan"),
        loadReview(),
      ]);
      const result = await extractText(file);
      if (result.ok) show(result.text, "file", scan);
      else setNotice(PROBLEMS[result.problem]);
    } catch {
      setNotice(PROBLEMS.unreadable);
    } finally {
      setReading(false);
    }
  }

  async function readPasted() {
    setNotice(null);
    const [scan] = await Promise.all([import("@/lib/resume/scan"), loadReview()]);
    show(pasted, "text", scan);
  }

  function onDrag(event: ReactDragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    if (event.type === "dragleave") {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
    } else {
      event.dataTransfer.dropEffect = "copy";
      setDragging(true);
    }
  }

  function onDrop(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void readFile(file);
  }

  return (
    <div className="grid gap-1">
      <div
        id="resume"
        role="group"
        aria-labelledby={headingId}
        onDragEnter={onDrag}
        onDragOver={onDrag}
        onDragLeave={onDrag}
        onDrop={onDrop}
        className={cn(
          "scroll-mt-6 rounded-lg border border-dashed border-input bg-card p-4 transition-colors duration-[var(--dur-fast)] focus-within:border-foreground",
          dragging && "border-foreground bg-accent",
        )}
      >
        <div className="flex items-start gap-3">
          <FileUp className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="grid gap-0.5">
            <h3 id={headingId} className="text-sm font-semibold">
              Fill from your resume
            </h3>
            <p className="text-xs text-muted-foreground">PDF or Word · stays on this device</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Button
            ref={buttonRef}
            variant="outline"
            aria-disabled={reading}
            onClick={() => !reading && inputRef.current?.click()}
            className="h-11 gap-2 px-4 active:scale-[0.97] aria-disabled:opacity-70"
          >
            {reading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
            {reading ? "Reading your resume…" : "Choose a file"}
          </Button>
          {!reading && <span className="hidden text-xs text-muted-foreground pointer-fine:inline">or drop it here</span>}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // so choosing the same file again still triggers a read
            if (file) void readFile(file);
          }}
        />

        <div role="status">
          {reading && <span className="sr-only">Reading your resume…</span>}
          {notice && (
            <div className="mt-3 grid gap-1 text-sm">
              <p>{notice.text}</p>
              {notice.paste && !pasting && (
                <button
                  type="button"
                  onClick={() => {
                    setPasting(true);
                    setNotice(null);
                  }}
                  className="km-link inline-flex min-h-11 items-center gap-2 justify-self-start font-medium"
                >
                  <ClipboardPaste className="size-4" aria-hidden="true" />
                  Paste text instead
                </button>
              )}
            </div>
          )}
        </div>

        {pasting && (
          <div className="mt-3 grid gap-2">
            <label htmlFor={pasteId} className="text-sm font-semibold">
              Resume text
            </label>
            <Textarea
              ref={pasteRef}
              id={pasteId}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={6}
              placeholder="Paste your resume here. It stays on this device too."
              className="max-h-64 min-h-32 bg-card text-base md:text-sm"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={readPasted}
                disabled={!pasted.trim()}
                className="h-11 px-4 font-semibold active:scale-[0.97]"
              >
                Find courses and skills
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setPasting(false);
                  setPasted("");
                  setNotice(null);
                }}
                className="h-11 px-4 active:scale-[0.97]"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      <div aria-live="polite">{undo}</div>

      {review && (
        <ResumeReview
          key={review.key}
          open={reviewOpen}
          found={review.found}
          skills={skills}
          courses={courses}
          onOpenChange={setReviewOpen}
          returnFocus={() => buttonRef.current?.focus()}
          source={review.source}
          onConfirm={(picks) => {
            onAdd(picks);
            setReviewOpen(false);
            setPasting(false);
            setPasted("");
          }}
        />
      )}
    </div>
  );
}
