"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import RichTextContent from "@/components/RichTextContent";
import { pauseAttempt, submitAttempt } from "./actions";
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Pause,
} from "lucide-react";

interface CaseStudy {
  id: string;
  title: string;
  content: string;
  position: number | null;
}

interface Question {
  id: string;
  case_study_id: string | null;
  case_study: CaseStudy | null;
  question_text: string;
  type: string;
  marks: number;
  negative_marks: number;
  options: { id: string; option_text: string }[];
}

interface CaseGroup {
  id: string;
  title: string;
  content: string;
  position: number;
  questions: Question[];
}

const GENERAL_CASE_ID = "__general__";

function seeded(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
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

function buildCaseGroups(questions: Question[]): CaseGroup[] {
  const groups = new Map<string, CaseGroup>();

  questions.forEach((question) => {
    const study = question.case_study;
    const id = study?.id ?? GENERAL_CASE_ID;
    const existing = groups.get(id);

    if (existing) {
      existing.questions.push(question);
      return;
    }

    groups.set(id, {
      id,
      title: study?.title ?? "Unassigned questions",
      content: study?.content ?? "These questions are not attached to a case study.",
      position: Number(study?.position ?? Number.MAX_SAFE_INTEGER),
      questions: [question],
    });
  });

  return [...groups.values()].sort((a, b) => a.position - b.position);
}

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(safe / 3600);
  const mm = Math.floor((safe % 3600) / 60);
  const ss = safe % 60;
  if (hh > 0) {
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function formatWindow(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function ExamRunner({
  attemptId,
  title,
  examMode,
  timerMode,
  allowCaseNavigation,
  startedAt,
  durationMinutes,
  examEndTime,
  initialActiveSeconds,
  negativeMarking,
  shuffle,
  proctoring,
  questions: rawQuestions,
  initialAnswers,
  initialTextAnswers,
  initialFlags,
  preview = false,
}: {
  attemptId: string;
  title: string;
  examMode: string;
  timerMode: string;
  allowCaseNavigation: boolean;
  startedAt: string;
  durationMinutes: number;
  examEndTime: string | null;
  initialActiveSeconds: number;
  negativeMarking: boolean;
  shuffle: boolean;
  proctoring: boolean;
  questions: Question[];
  initialAnswers: Record<string, string[]>;
  initialTextAnswers: Record<string, string>;
  initialFlags: Record<string, boolean>;
  preview?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const isPractical = examMode === "practical";
  const isPausable = !preview && isPractical && timerMode === "pausable";
  const proctoringEnabled = !preview && proctoring;
  const durationSeconds = Math.max(1, durationMinutes * 60);

  const questions = useMemo(() => {
    if (!shuffle) return rawQuestions;

    const rnd = seeded(attemptId);
    if (!isPractical) {
      return shuffleWith(rawQuestions, rnd).map((q) => ({
        ...q,
        options: shuffleWith(q.options, rnd),
      }));
    }

    return buildCaseGroups(rawQuestions).flatMap((group) =>
      shuffleWith(group.questions, rnd).map((q) => ({
        ...q,
        options: shuffleWith(q.options, rnd),
      }))
    );
  }, [attemptId, isPractical, rawQuestions, shuffle]);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>(initialAnswers);
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>(initialTextAnswers);
  const [flags, setFlags] = useState<Record<string, boolean>>(initialFlags);
  const [saving, setSaving] = useState(false);
  const [violations, setViolations] = useState(0);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [pending, startTransition] = useTransition();
  const submittedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const startingSessionRef = useRef(false);
  const lastTickRef = useRef(Date.now());
  const activeElapsedRef = useRef(Math.max(0, initialActiveSeconds));

  const continuousDeadline = Math.min(
    new Date(startedAt).getTime() + durationMinutes * 60000,
    examEndTime ? new Date(examEndTime).getTime() : Infinity
  );
  const [left, setLeft] = useState(() =>
    isPausable
      ? Math.max(0, Math.ceil(durationSeconds - activeElapsedRef.current))
      : Math.max(0, Math.floor((continuousDeadline - Date.now()) / 1000))
  );
  const [windowLeft, setWindowLeft] = useState<number | null>(() =>
    examEndTime
      ? Math.max(0, Math.floor((new Date(examEndTime).getTime() - Date.now()) / 1000))
      : null
  );

  const MAX_VIOLATIONS = 3;

  const doSubmit = useCallback(() => {
    if (submittedRef.current) return;
    if (preview) {
      setConfirmSubmit(false);
      return;
    }
    submittedRef.current = true;
    setConfirmSubmit(false);
    setAutoSubmitting(true);
    startTransition(() => submitAttempt(attemptId));
  }, [attemptId, preview]);

  const startSession = useCallback(async () => {
    if (!isPausable || submittedRef.current || sessionIdRef.current || startingSessionRef.current) {
      return;
    }

    startingSessionRef.current = true;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("attempt_sessions")
      .insert({ attempt_id: attemptId, started_at: now, last_seen_at: now })
      .select("id")
      .single();

    if (!error && data?.id) {
      sessionIdRef.current = data.id as string;
      lastTickRef.current = Date.now();
    }
    startingSessionRef.current = false;
  }, [attemptId, isPausable, supabase]);

  const endSession = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;

    sessionIdRef.current = null;
    const now = new Date().toISOString();
    await supabase
      .from("attempt_sessions")
      .update({ ended_at: now, last_seen_at: now })
      .eq("id", sessionId);
  }, [supabase]);

  const askSubmit = () => {
    if (submittedRef.current) return;
    setConfirmSubmit(true);
  };

  const pauseNow = () => {
    if (!isPausable || submittedRef.current || pausing) return;
    setPausing(true);
    void endSession();
    startTransition(() => pauseAttempt(attemptId));
  };

  useEffect(() => {
    if (!isPausable) return;
    void startSession();
    return () => {
      void endSession();
    };
  }, [endSession, isPausable, startSession]);

  useEffect(() => {
    if (!isPausable) return;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        void endSession();
      } else {
        void startSession();
      }
    };
    const onPageHide = () => {
      void endSession();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [endSession, isPausable, startSession]);

  useEffect(() => {
    if (!isPausable) return;
    const t = setInterval(() => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) return;
      void supabase
        .from("attempt_sessions")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", sessionId);
    }, 15000);
    return () => clearInterval(t);
  }, [isPausable, supabase]);

  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      const nextWindowLeft = examEndTime
        ? Math.max(0, Math.floor((new Date(examEndTime).getTime() - now) / 1000))
        : null;
      setWindowLeft(nextWindowLeft);

      if (nextWindowLeft !== null && nextWindowLeft <= 0) {
        clearInterval(t);
        doSubmit();
        return;
      }

      if (isPausable) {
        const deltaSeconds = Math.max(0, (now - lastTickRef.current) / 1000);
        lastTickRef.current = now;

        if (sessionIdRef.current && document.visibilityState === "visible") {
          activeElapsedRef.current = Math.min(
            durationSeconds,
            activeElapsedRef.current + deltaSeconds
          );
        }

        const rem = Math.max(0, Math.ceil(durationSeconds - activeElapsedRef.current));
        setLeft(rem);
        if (rem <= 0) {
          clearInterval(t);
          doSubmit();
        }
        return;
      }

      const rem = Math.max(0, Math.floor((continuousDeadline - now) / 1000));
      setLeft(rem);
      if (rem <= 0) {
        clearInterval(t);
        doSubmit();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [continuousDeadline, doSubmit, durationSeconds, examEndTime, isPausable]);

  useEffect(() => {
    if (!proctoringEnabled) return;
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
  }, [doSubmit, proctoringEnabled]);

  const blockEvents = proctoringEnabled
    ? {
        onCopy: (e: React.ClipboardEvent) => e.preventDefault(),
        onPaste: (e: React.ClipboardEvent) => e.preventDefault(),
        onCut: (e: React.ClipboardEvent) => e.preventDefault(),
        onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      }
    : {};

  if (questions.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No questions in this exam.</p>;
  }

  const q = questions[Math.min(idx, questions.length - 1)];
  const caseGroups = buildCaseGroups(questions);
  const questionIndexById = new Map(questions.map((question, index) => [question.id, index]));
  const caseIndexByQuestionId = new Map<string, number>();
  caseGroups.forEach((group, caseIndex) => {
    group.questions.forEach((question) => caseIndexByQuestionId.set(question.id, caseIndex));
  });

  const isTextQuestion = (type: string) =>
    type === "fill_blank" || type === "numerical" || type === "descriptive";
  const isAnswered = (question: Question) =>
    isTextQuestion(question.type)
      ? Boolean(textAnswers[question.id]?.trim())
      : (answers[question.id]?.length ?? 0) > 0;
  const isCaseComplete = (group: CaseGroup) => group.questions.every((question) => isAnswered(question));
  const canEnterCase = (caseIndex: number) => {
    if (!isPractical || allowCaseNavigation) return true;
    const currentCaseIndex = caseIndexByQuestionId.get(q.id) ?? 0;
    if (caseIndex <= currentCaseIndex) return true;
    return caseGroups.slice(0, caseIndex).every(isCaseComplete);
  };

  const currentCaseIndex = caseIndexByQuestionId.get(q.id) ?? 0;
  const currentCase = caseGroups[currentCaseIndex] ?? caseGroups[0];
  const answeredCount = questions.filter((x) => isAnswered(x)).length;
  const reviewCount = questions.filter((x) => flags[x.id]).length;
  const notAnsweredCount = questions.length - answeredCount;
  const lowTime = left < 60;
  const nextQuestion = questions[idx + 1];
  const nextQuestionCaseIndex = nextQuestion ? caseIndexByQuestionId.get(nextQuestion.id) ?? 0 : 0;
  const nextBlocked = Boolean(nextQuestion && !canEnterCase(nextQuestionCaseIndex));

  const goToQuestion = (questionId: string) => {
    const nextIndex = questionIndexById.get(questionId);
    if (nextIndex == null) return;
    const nextCaseIndex = caseIndexByQuestionId.get(questionId) ?? 0;
    if (!canEnterCase(nextCaseIndex)) return;
    setIdx(nextIndex);
  };

  const goToCase = (caseIndex: number) => {
    if (!canEnterCase(caseIndex)) return;
    const firstQuestion = caseGroups[caseIndex]?.questions[0];
    if (firstQuestion) goToQuestion(firstQuestion.id);
  };

  const save = async (qid: string, optionIds: string[], flag: boolean) => {
    if (submittedRef.current) return;
    if (preview) return;
    setSaving(true);
    try {
      await supabase.from("answers").upsert(
        {
          attempt_id: attemptId,
          question_id: qid,
          selected_option_ids: optionIds,
          marked_for_review: flag,
        },
        { onConflict: "attempt_id,question_id" }
      );
    } finally {
      setSaving(false);
    }
  };

  const saveText = async (qid: string, value: string, flag: boolean) => {
    if (submittedRef.current) return;
    if (preview) return;
    setSaving(true);
    try {
      await supabase.from("answers").upsert(
        {
          attempt_id: attemptId,
          question_id: qid,
          text_answer: value,
          selected_option_ids: [],
          marked_for_review: flag,
        },
        { onConflict: "attempt_id,question_id" }
      );
    } finally {
      setSaving(false);
    }
  };

  const pick = (optionId: string) => {
    if (submittedRef.current) return;
    const cur = answers[q.id] ?? [];
    const next =
      q.type === "multiple"
        ? cur.includes(optionId)
          ? cur.filter((x) => x !== optionId)
          : [...cur, optionId]
        : [optionId];

    setAnswers((p) => ({ ...p, [q.id]: next }));
    void save(q.id, next, flags[q.id] ?? false);
  };

  const toggleFlag = () => {
    if (submittedRef.current) return;
    const next = !flags[q.id];
    setFlags((p) => ({ ...p, [q.id]: next }));
    void save(q.id, answers[q.id] ?? [], next);
  };

  const questionPanel = (
    <div className="card p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Question {idx + 1} of {questions.length}
        </span>
        <span className={`text-xs transition-colors ${saving ? "text-amber-500" : "text-emerald-500 dark:text-emerald-400"}`}>
          {preview ? "preview" : saving ? "saving..." : "saved"}
        </span>
      </div>

      {isPractical && (
        <div className="mb-3 rounded-xl bg-cyan-50 px-3 py-2 text-xs font-medium text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300">
          Case {currentCaseIndex + 1}: {currentCase.title}
        </div>
      )}

      <p className="break-words font-medium text-slate-900 dark:text-slate-100">
        {q.question_text}
      </p>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
        +{q.marks} marks
        {negativeMarking && q.negative_marks > 0 ? ` -${q.negative_marks} for wrong answer` : ""}
        {q.type === "multiple" ? " - select one or more options" : ""}
      </p>

      <div className="mt-4 space-y-2">
        {isTextQuestion(q.type) ? (
          <textarea
            value={textAnswers[q.id] ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              setTextAnswers((p) => ({ ...p, [q.id]: value }));
              void saveText(q.id, value, flags[q.id] ?? false);
            }}
            disabled={autoSubmitting}
            rows={q.type === "descriptive" ? 6 : 3}
            placeholder={q.type === "numerical" ? "Enter numerical answer" : "Enter answer"}
            className="input disabled:opacity-60"
          />
        ) : (
          q.options.map((o, i) => {
            const sel = (answers[q.id] ?? []).includes(o.id);
            return (
              <button
                key={o.id}
                onClick={() => pick(o.id)}
                disabled={autoSubmitting}
                className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all duration-200 ${
                  sel
                    ? "border-indigo-500 bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30"
                    : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700/50"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors ${
                    sel
                      ? "border-white/50 bg-white/20 text-white"
                      : "border-slate-300 text-slate-400 dark:border-slate-500 dark:text-slate-500"
                  }`}
                >
                  {sel ? <Check className="h-3.5 w-3.5" /> : String.fromCharCode(65 + i)}
                </span>
                <span className="min-w-0 break-words">{o.option_text}</span>
              </button>
            );
          })
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <button
          disabled={idx === 0 || autoSubmitting}
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          className="flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition-all hover:bg-indigo-100 active:scale-[0.98] disabled:opacity-40 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <button
          onClick={toggleFlag}
          disabled={autoSubmitting}
          className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold transition-all active:scale-[0.98] ${
            flags[q.id]
              ? "border-amber-500 bg-amber-500 text-white shadow-sm hover:bg-amber-600 dark:border-amber-500"
              : "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50"
          } disabled:opacity-50`}
        >
          <Flag className="h-4 w-4" /> {flags[q.id] ? "Flagged" : "Review"}
        </button>
        {idx === questions.length - 1 ? (
          <button
            onClick={askSubmit}
            disabled={pending || autoSubmitting}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
          >
            {autoSubmitting ? "Submitting..." : "Submit"}
          </button>
        ) : (
          <button
            onClick={() => {
              if (nextBlocked) return;
              setIdx((i) => Math.min(questions.length - 1, i + 1));
            }}
            disabled={autoSubmitting || nextBlocked}
            className="flex items-center gap-1 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
          >
            {nextBlocked ? "Complete case" : "Next"} <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  const palette = (
    <div
      className={`card flex flex-col p-4 lg:sticky lg:overflow-hidden ${
        preview
          ? "lg:top-20 lg:max-h-[calc(100vh-7rem)]"
          : "lg:top-4 lg:max-h-[calc(100vh-2rem)]"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {isPractical ? "Progress" : "Question palette"}
        </p>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {idx + 1}/{questions.length}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl bg-emerald-50 px-2 py-2 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
          <p className="font-semibold">{answeredCount}</p>
          <p>Answered</p>
        </div>
        <div className="rounded-xl bg-amber-50 px-2 py-2 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          <p className="font-semibold">{reviewCount}</p>
          <p>Review</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-2 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
          <p className="font-semibold">{notAnsweredCount}</p>
          <p>Pending</p>
        </div>
      </div>

      {isPractical && (
        <label className="mb-3 block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Go to question
          <select
            value={q.id}
            onChange={(event) => goToQuestion(event.target.value)}
            disabled={autoSubmitting}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {questions.map((question, questionIndex) => {
              const caseIndex = caseIndexByQuestionId.get(question.id) ?? 0;
              const locked = !canEnterCase(caseIndex);
              return (
                <option key={question.id} value={question.id} disabled={locked}>
                  Question {questionIndex + 1}
                </option>
              );
            })}
          </select>
        </label>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {isPractical && (
        <div className="mb-3 rounded-xl border border-slate-100 p-2 dark:border-slate-700">
          <p className="mb-2 text-xs font-semibold text-slate-500">Jump to question</p>
          <div className="grid grid-cols-5 gap-2 lg:grid-cols-6">
            {questions.map((question, i) => {
              const answered = isAnswered(question);
              const flagged = flags[question.id];
              const caseIndex = caseIndexByQuestionId.get(question.id) ?? 0;
              const locked = !canEnterCase(caseIndex);
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => goToQuestion(question.id)}
                  disabled={locked || autoSubmitting}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium transition-all ${
                    i === idx ? "ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-800" : ""
                  } ${
                    flagged
                      ? "border-amber-400 bg-amber-100 text-amber-700 dark:border-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
                      : answered
                      ? "border-emerald-400 bg-emerald-100 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
                      : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400"
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isPractical && (
        <div className="mb-3 space-y-2">
          {caseGroups.map((group, caseIndex) => {
            const answeredInCase = group.questions.filter((question) => isAnswered(question)).length;
            const locked = !canEnterCase(caseIndex);
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => goToCase(caseIndex)}
                disabled={locked || autoSubmitting}
                className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                  caseIndex === currentCaseIndex
                    ? "border-cyan-400 bg-cyan-50 text-cyan-800"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <span className="block truncate font-semibold">
                  Case {caseIndex + 1}: {group.title}
                </span>
                <span className="text-slate-400">
                  {answeredInCase}/{group.questions.length} answered
                </span>
              </button>
            );
          })}
        </div>
      )}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-emerald-400 bg-emerald-100 dark:bg-emerald-900/50" />
          Answered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-amber-400 bg-amber-100 dark:bg-amber-900/50" />
          Review
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700" />
          Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border-2 border-indigo-500 bg-white dark:bg-slate-800" />
          Current
        </span>
      </div>

      {!isPractical && (
        <div className="max-h-[46vh] overflow-y-auto rounded-xl border border-slate-100 p-2 dark:border-slate-700">
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-6">
            {questions.map((question, i) => {
              const answered = isAnswered(question);
              const flagged = flags[question.id];
              return (
                <button
                  key={question.id}
                  onClick={() => setIdx(i)}
                  disabled={autoSubmitting}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium transition-all ${
                    i === idx ? "ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-800" : ""
                  } ${
                    flagged
                      ? "border-amber-400 bg-amber-100 text-amber-700 dark:border-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
                      : answered
                      ? "border-emerald-400 bg-emerald-100 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
                      : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={askSubmit}
        disabled={pending || autoSubmitting}
        className="mt-4 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
      >
        {pending || autoSubmitting ? "Submitting..." : "Submit exam"}
      </button>
    </div>
  );

  return (
    <div {...blockEvents} className={proctoringEnabled ? "select-none" : ""}>
      {preview && (
        <div className="mb-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300">
          Preview mode: answers, review flags, and submit clicks are only for checking the exam flow. Nothing is saved.
        </div>
      )}
      {autoSubmitting && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Time is up! Your exam is being submitted automatically...
        </div>
      )}
      {proctoringEnabled && violations > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Warning: Tab switch detected ({violations}/{MAX_VIOLATIONS}).
        </div>
      )}
      {confirmSubmit && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm duration-200">
          <div className="animate-in zoom-in-95 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl duration-200 dark:border dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">Submit exam?</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Once submitted, you cannot change your answers.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl bg-emerald-50 px-2 py-3 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                <p className="text-lg font-semibold">{answeredCount}</p>
                <p>Answered</p>
              </div>
              <div className="rounded-xl bg-amber-50 px-2 py-3 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                <p className="text-lg font-semibold">{reviewCount}</p>
                <p>Review</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-2 py-3 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
                <p className="text-lg font-semibold">{notAnsweredCount}</p>
                <p>Pending</p>
              </div>
            </div>

            {notAnsweredCount > 0 && (
              <p className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                {notAnsweredCount} question{notAnsweredCount > 1 ? "s" : ""} not answered. Are you sure you want to submit?
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmSubmit(false)}
                className="btn-secondary"
              >
                Back to exam
              </button>
              <button
                type="button"
                onClick={doSubmit}
                disabled={pending || autoSubmitting}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
              >
                {pending || autoSubmitting ? "Submitting..." : "Final submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
          {isPausable && windowLeft !== null && (
            <p className="mt-1 text-xs text-slate-500">
              Window closes in {formatWindow(windowLeft)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isPractical && (
            <button
              type="button"
              onClick={askSubmit}
              disabled={pending || autoSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {pending || autoSubmitting ? "Submitting..." : "Submit exam"}
            </button>
          )}
          {isPausable && (
            <button
              type="button"
              onClick={pauseNow}
              disabled={pausing || pending || autoSubmitting}
              className="btn-secondary flex items-center gap-1.5"
            >
              <Pause className="h-4 w-4" />
              {pausing ? "Pausing..." : "Pause"}
            </button>
          )}
          <span
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
              lowTime
                ? "animate-pulse bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
            }`}
          >
            <Clock className="h-4 w-4" /> {formatClock(left)}
          </span>
        </div>
      </div>

      {isPractical ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.15fr)_280px]">
          <div
            className={`card p-5 xl:sticky xl:overflow-y-auto ${
              preview
                ? "xl:top-20 xl:max-h-[calc(100vh-7rem)]"
                : "xl:top-4 xl:max-h-[calc(100vh-2rem)]"
            }`}
          >
            <div className="mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-cyan-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-600">
                Case {currentCaseIndex + 1} of {caseGroups.length}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {currentCase.title}
            </h2>
            <RichTextContent
              content={currentCase.content}
              className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-300"
            />
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => goToCase(currentCaseIndex - 1)}
                disabled={currentCaseIndex === 0 || autoSubmitting}
                className="btn-secondary text-xs disabled:opacity-40"
              >
                Prev case
              </button>
              <button
                type="button"
                onClick={() => goToCase(currentCaseIndex + 1)}
                disabled={
                  currentCaseIndex >= caseGroups.length - 1 ||
                  !canEnterCase(currentCaseIndex + 1) ||
                  autoSubmitting
                }
                className="btn-secondary text-xs disabled:opacity-40"
              >
                Next case
              </button>
            </div>
          </div>
          {questionPanel}
          {palette}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          {questionPanel}
          {palette}
        </div>
      )}
    </div>
  );
}
