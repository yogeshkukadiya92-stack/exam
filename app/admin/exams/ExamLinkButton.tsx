"use client";

import { useState } from "react";
import { Check, Link as LinkIcon } from "lucide-react";

export default function ExamLinkButton({ examId }: { examId: string }) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    const link = `${window.location.origin}/student/exam/${examId}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={copyLink}
      className="btn-secondary flex items-center gap-1.5 text-xs"
      title="Copy exam link"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" /> Copied
        </>
      ) : (
        <>
          <LinkIcon className="h-3.5 w-3.5" /> Link
        </>
      )}
    </button>
  );
}
