import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startAttempt } from "./actions";

export default async function ExamIntro({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { examId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: exam } = await supabase
    .from("exams")
    .select("id, title, instructions, duration_minutes, pass_marks, negative_marking, max_attempts, courses(name), batches(name), questions(count)")
    .eq("id", examId)
    .single();

  if (!exam) notFound();

  const qCount = (exam.questions as { count: number }[] | null)?.[0]?.count ?? 0;
  const course = (exam.courses as unknown as { name: string } | null)?.name;
  const batch = (exam.batches as unknown as { name: string } | null)?.name;

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/student" className="mb-3 inline-block text-sm text-gray-500 hover:text-gray-900">
        ← My Exams
      </Link>

      <div className="rounded-xl border bg-white p-6">
        <h1 className="text-xl font-semibold">{exam.title}</h1>
        <p className="text-sm text-gray-500">{course} · {batch}</p>

        {error && (
          <p className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>
        )}

        <ul className="mt-4 space-y-1.5 text-sm text-gray-600">
          <li>• Total questions: {qCount}</li>
          <li>• Duration: {exam.duration_minutes} minutes</li>
          <li>• Pass marks: {exam.pass_marks}</li>
          <li>• Allowed attempts: {exam.max_attempts}</li>
          <li className={exam.negative_marking ? "text-red-600" : ""}>
            • Negative marking: {exam.negative_marking ? "Haan (khota answer par minus)" : "Nathi"}
          </li>
        </ul>

        {exam.instructions && (
          <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm text-gray-600">
            {exam.instructions}
          </div>
        )}

        <p className="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-700">
          Start pachi timer chalu thai jase. Question palette thi navigate karo, answers
          auto-save thay che, ane ant ma Submit karo.
        </p>

        <form action={startAttempt} className="mt-4">
          <input type="hidden" name="exam_id" value={exam.id} />
          <button className="w-full rounded-md bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800">
            Start exam
          </button>
        </form>
      </div>
    </div>
  );
}
