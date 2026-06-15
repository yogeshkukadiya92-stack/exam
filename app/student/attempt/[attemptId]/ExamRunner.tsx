"use client";

import { useState, useEffect, useRef, useTransition, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { submitAttempt } from "./actions";
import {
  Clock, ChevronLeft, ChevronRight, Flag, Check, AlertTriangle,
} from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  type: string;
  marks: number;
  negative_marks: number;
  options: { id: string; option_text: string }[];
}

// deterministic PRNG (mulberry32) so shuffle order is stable across reloads
function seeded(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffleWith<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ExamRunner({
  attemptId,
  title,
  startedAt,
  durationMinutes,
  examEndTime,
  negativeMarking,
  shuffle,
  proctoring,
  questions: rawQuestions,
  initialAnswers,
  initialFlags,
}: {
  attemptId: string;
  title: string;
  startedAt: string;
  durationMinutes: number;
  examEndTime: string | null;
  negativeMarking: boolean;
  shuffle: boolean;
  proctoring: boolean;
  questions: Question[];
  initialAnswers: Record<string, string[]>;
  initialFlags: Record<string, boolean>;
}) {
  const supabase = createClient();

  // Stable shuffle (questions + options) keyed on attemptId
  const questions = useMemo(() => {
    if (!shuffle) return rawQuestions;
    const rnd = seeded(attemptId);
    return shuffleWith(rawQuestions, rnd).map((q) => ({
      ...q,
      options: shuffleWith(q.options, rnd),
    }));
  }, [rawQuestions, shuffle, attemptId]);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>(initialAnswers);
  const [flags, setFlags] = useState<Record<string, boolean>>(initialFlags);
  const [saving, setSaving] = useState(false);
  const [violations, setViolations] = useState(0);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [pending, startTransition] = useTransition();
  const submittedRef = useRef(false);

  const MAX_VIOLATIONS = 3;

  // ---- deadline ----
  const deadline = Math.min(
    new Date(startedAt).getTime() + durationMinutes * 60000,
    examEndTime ? new Date(examEndTime).getTime() : Infinity
  );
  const [left, setLeft] = useState(() =>
    Math.max(0, Math.floor((deadline - Date.now()) / 1000))
  );

  const doSubmit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setConfirmSubmit(false);
    setAutoSubmitting(true);
    startTransition(() => submitAttempt(attemptId));
  };

  const askSubmit = () => {
    if (submittedRef.current) return;
    setConfirmSubmit(true);
  };

  useEffect(() => {
    const t = setInterval(() => {
      const rem = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setLeft(rem);
      if (rem <= 0) {
        clearInterval(t);
        doSubmit();
      }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- anti-cheat: tab-switch detection ----
  useEffect(() => {
    if (!proctoring) return;
    const onHidden = () => {
      if (document.visibilityState === "hidden") {
        setViolations((v) => {
          const nv = v + 1;
          if (nv >= MAX_VIOLATIONS) doSubmit();
          return nv;
        });
      }
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proctoring]);

  // block copy / paste / right-click during proctored exam
  const blockEvents = proctoring
    ? {
        onCopy: (e: React.ClipboardEvent) => e.preventDefault(),
        onPaste: (e: React.ClipboardEvent) => e.preventDefault(),
        onCut: (e: React.ClipboardEvent) => e.preventDefault(),
        onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      }
    : {};

  if (questions.length === 0) {
    return <p className="text-sm text-gray-500">Aa exam ma koi question nathi.</p>;
  }

  const q = questions[idx];
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const lowTime = left < 60;

  const save = async (qid: string, optionIds: string[], flag: boolean) => {
    if (submittedRef.current) return;
    setSaving(true);
    await supabase.from("answers").upsert(
      {
        attempt_id: attemptId,
        question_id: qid,
        selected_option_ids: optionIds,
        marked_for_review: flag,
      },
      { onConflict: "attempt_id,question_id" }
    );
    setSaving(false);
  };

  const pick = (optionId: string) => {
    if (submittedRef.current) return;
    const cur = answers[q.id] ?? [];
    let next: string[];
    if (q.type === "multiple") {
      next = cur.includes(optionId)
        ? cur.filter((x) => x !== optionId)
        : [...cur, optionId];
    } else {
      next = [optionId];
    }
    setAnswers((p) => ({ ...p, [q.id]: next }));
    save(q.id, next, flags[q.id] ?? false);
  };

  const toggleFlag = () => {
    if (submittedRef.current) return;
    const next = !flags[q.id];
    setFlags((p) => ({ ...p, [q.id]: next }));
    save(q.id, answers[q.id] ?? [], next);
  };

  const answered = (qid: string) => (answers[qid]?.length ?? 0) > 0;
  const answeredCount = questions.filter((x) => answered(x.id)).length;
  const reviewCount = questions.filter((x) => flags[x.id]).length;
  const notAnsweredCount = questions.length - answeredCount;

  return (
    <div {...blockEvents} className={proctoring ? "select-none" : ""}>
      {autoSubmitting && (
        <div className="mb-3 flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Time up. Exam auto-submit thai rahi chhe...
        </div>
      )}
      {proctoring && violations > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Warning: tab-switch detect thayu ({violations}/{MAX_VIOLATIONS}).
          {MAX_VIOLATIONS - violations} vaar pachi exam auto-submit thai jase.
        </div>
      )}
      {confirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Submit exam?</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Final submit pachi answer change nahi kari shako.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-lg bg-emerald-50 px-2 py-3 text-emerald-700">
                <p className="text-lg font-semibold">{answeredCount}</p>
                <p>Answered</p>
              </div>
              <div className="rounded-lg bg-amber-50 px-2 py-3 text-amber-700">
                <p className="text-lg font-semibold">{reviewCount}</p>
                <p>Review</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-3 text-slate-600">
                <p className="text-lg font-semibold">{notAnsweredCount}</p>
                <p>Pending</p>
              </div>
            </div>

            {notAnsweredCount > 0 && (
              <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {notAnsweredCount} question pending chhe. Tame submit karva sure cho?
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmSubmit(false)}
                className="rounded-md border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Back to exam
              </button>
              <button
                type="button"
                onClick={doSubmit}
                disabled={pending || autoSubmitting}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {pending || autoSubmitting ? "Submitting..." : "Final submit"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-semibold">{title}</h1>
        <span
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium ${
            lowTime ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
          }`}
        >
          <Clock className="h-4 w-4" /> {mm}:{ss}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* main */}
        <div className="rounded-xl border bg-white p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Question {idx + 1} of {questions.length}
            </span>
            <span className="text-xs text-gray-400">
              {saving ? "saving…" : "saved"}
            </span>
          </div>

          <p className="font-medium">{q.question_text}</p>
          <p className="mt-1 text-xs text-gray-400">
            +{q.marks} marks
            {negativeMarking && q.negative_marks > 0 ? ` · -${q.negative_marks} wrong par` : ""}
            {q.type === "multiple" ? " · ek thi vadhare select kari shako" : ""}
          </p>

          <div className="mt-4 space-y-2">
            {q.options.map((o, i) => {
              const sel = (answers[q.id] ?? []).includes(o.id);
              return (
                <button
                  key={o.id}
                  onClick={() => pick(o.id)}
                  disabled={autoSubmitting}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                    sel ? "border-gray-900 bg-gray-900 text-white" : "hover:bg-gray-50"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                      sel ? "border-white" : "border-gray-300"
                    }`}
                  >
                    {sel ? <Check className="h-3 w-3" /> : String.fromCharCode(65 + i)}
                  </span>
                  {o.option_text}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button
              disabled={idx === 0 || autoSubmitting}
              onClick={() => setIdx((i) => i - 1)}
              className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button
              onClick={toggleFlag}
              disabled={autoSubmitting}
              className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${
                flags[q.id] ? "border-amber-400 bg-amber-50 text-amber-700" : "hover:bg-gray-100"
              } disabled:opacity-50`}
            >
              <Flag className="h-4 w-4" /> {flags[q.id] ? "Flagged" : "Mark review"}
            </button>
            {idx === questions.length - 1 ? (
              <button
                onClick={askSubmit}
                disabled={pending || autoSubmitting}
                className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {autoSubmitting ? "Submitting..." : "Submit"}
              </button>
            ) : (
              <button
                onClick={() => setIdx((i) => i + 1)}
                disabled={autoSubmitting}
                className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-100"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* palette */}
        <div className="rounded-xl border bg-white p-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)] lg:overflow-hidden">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Question palette</p>
            <span className="text-xs text-gray-400">
              {idx + 1}/{questions.length}
            </span>
          </div>

          <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-emerald-50 px-2 py-2 text-emerald-700">
              <p className="font-semibold">{answeredCount}</p>
              <p>Answered</p>
            </div>
            <div className="rounded-lg bg-amber-50 px-2 py-2 text-amber-700">
              <p className="font-semibold">{reviewCount}</p>
              <p>Review</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-2 text-slate-600">
              <p className="font-semibold">{notAnsweredCount}</p>
              <p>Pending</p>
            </div>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-emerald-400 bg-emerald-100" />
              Answered
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-amber-400 bg-amber-100" />
              Mark review
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-gray-200 bg-gray-50" />
              Not answered
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border-2 border-gray-900 bg-white" />
              Current
            </span>
          </div>

          <div className="max-h-[52vh] overflow-y-auto rounded-lg border border-slate-100 p-2">
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-6">
            {questions.map((x, i) => {
              const a = answered(x.id);
              const fl = flags[x.id];
              return (
                <button
                  key={x.id}
                  onClick={() => setIdx(i)}
                  disabled={autoSubmitting}
                  className={`flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium ${
                    i === idx ? "ring-2 ring-gray-900 ring-offset-1" : ""
                  } ${
                    fl
                      ? "border-amber-400 bg-amber-100 text-amber-700"
                      : a
                      ? "border-emerald-400 bg-emerald-100 text-emerald-700"
                      : "border-gray-200 bg-gray-50 text-gray-500"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
            </div>
          </div>
          <button
            onClick={askSubmit}
            disabled={pending || autoSubmitting}
            className="mt-4 w-full rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {pending || autoSubmitting ? "Submitting..." : "Submit exam"}
          </button>
        </div>
      </div>
    </div>
  );
}
