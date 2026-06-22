import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import InstructionsForm from "./InstructionsForm";

export default async function ExamInstructionsPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const supabase = await createClient();

  const { data: exam } = await supabase
    .from("exams")
    .select("id, title, instructions, courses(name), batches(name)")
    .eq("id", examId)
    .single();

  if (!exam) notFound();

  const course = (exam.courses as unknown as { name: string } | null)?.name ?? "";
  const batch = (exam.batches as unknown as { name: string } | null)?.name ?? "";

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/admin/exams"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to exams
      </Link>

      <div className="mb-6">
        <h1 className="page-title">{exam.title} — Instructions</h1>
        <p className="mt-1 text-sm text-slate-500">
          {course}
          {batch ? ` · ${batch}` : ""}
        </p>
      </div>

      <InstructionsForm examId={exam.id} initialInstructions={exam.instructions ?? ""} />
    </div>
  );
}
