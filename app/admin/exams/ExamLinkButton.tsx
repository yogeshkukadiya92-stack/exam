"use client";

import { useState } from "react";
import { Check, Link as LinkIcon } from "lucide-react";

export default function ExamLinkButton({
  examId,
  isPublished,
}: {
  examId: string;
  isPublished: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "blocked">("idle");

  const copyLink = async () => {
    if (!isPublished) {
      setStatus("blocked");
      window.setTimeout(() => setStatus("idle"), 1800);
      return;
    }

    const link = `${window.location.origin}/student/exam/${examId}`;
    await navigator.clipboard.writeText(link);
    setStatus("copied");
    window.setTimeout(() => setStatus("idle"), 1800);
  };

  return (
    <button
      type="button"
      onClick={copyLink}
      className="btn-secondary flex items-center gap-1.5 text-xs"
      title={isPublished ? "Copy exam link" : "Publish exam before sharing link"}
    >
      {status === "copied" ? (
        <>
          <Check className="h-3.5 w-3.5" /> Copied
        </>
      ) : status === "blocked" ? (
        <>
          <Check className="h-3.5 w-3.5" /> Publish first
        </>
      ) : (
        <>
          <LinkIcon className="h-3.5 w-3.5" /> Link
        </>
      )}
    </button>
  );
}
