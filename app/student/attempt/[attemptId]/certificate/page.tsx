import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import PrintButton from "../result/PrintButton";

interface ResultData {
  exam: { title: string; pass_marks: number; result_visible?: boolean | null };
  total_score: number | null;
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const supabase = await createClient();
  const profile = await getProfile();

  const { data, error } = await supabase.rpc("get_attempt_result", {
    p_attempt_id: attemptId,
  });
  if (error || !data) notFound();

  const result = data as ResultData;
  const { data: attemptRow } = await supabase
    .from("attempts")
    .select("exam_id")
    .eq("id", attemptId)
    .maybeSingle();
  const { data: examSettings } = attemptRow?.exam_id
    ? await supabase
        .from("exams")
        .select("result_visible")
        .eq("id", attemptRow.exam_id)
        .maybeSingle()
    : { data: null };

  if ((examSettings?.result_visible ?? result.exam.result_visible) === false) {
    redirect(`/student/attempt/${attemptId}/result`);
  }

  const score = result.total_score ?? 0;
  const passed = score >= result.exam.pass_marks;

  // Do not show a certificate unless the student passed.
  if (!passed) redirect(`/student/attempt/${attemptId}/result`);

  const name = profile?.full_name || profile?.email || "Student";
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between print:hidden">
        <Link
          href={`/student/attempt/${attemptId}/result`}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Result
        </Link>
        <PrintButton />
      </div>

      {/* Certificate */}
      <div className="mx-auto max-w-2xl rounded-xl border-4 border-double border-gray-800 bg-white p-10 text-center shadow-sm">
        <p className="text-sm uppercase tracking-[0.3em] text-gray-400">
          Certificate of Achievement
        </p>
        <div className="mx-auto my-4 h-px w-24 bg-gray-300" />
        <p className="text-sm text-gray-500">This is to certify that</p>
        <p className="mt-3 font-serif text-3xl font-semibold text-gray-900">
          {name}
        </p>
        <p className="mt-4 text-sm text-gray-600">
          has successfully passed the examination
        </p>
        <p className="mt-1 text-xl font-medium text-gray-800">
          {result.exam.title}
        </p>
        <p className="mt-4 text-sm text-gray-600">
          with a score of{" "}
          <span className="font-semibold text-emerald-700">{score} marks</span>
        </p>

        <div className="mt-10 flex items-end justify-between text-sm text-gray-500">
          <div className="text-left">
            <div className="mb-1 w-32 border-t border-gray-400" />
            Date: {today}
          </div>
          <div className="text-right">
            <div className="mb-1 w-32 border-t border-gray-400" />
            ExamHub
          </div>
        </div>
      </div>
    </div>
  );
}
