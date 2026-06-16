import { createClient } from "@/lib/supabase/server";
import { addBankQuestion, deleteBankQuestion } from "./actions";
import { BookOpen, Trash2 } from "lucide-react";

export default async function QuestionBankPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; topic?: string; difficulty?: string }>;
}) {
  const filters = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("question_bank")
    .select("id, subject, topic, difficulty, type, question_text, marks, negative_marks, question_bank_options(count)")
    .order("created_at", { ascending: false });

  if (filters.subject) query = query.ilike("subject", `%${filters.subject}%`);
  if (filters.topic) query = query.ilike("topic", `%${filters.topic}%`);
  if (filters.difficulty) query = query.eq("difficulty", filters.difficulty);

  const { data: questions } = await query;

  const input = "input";
  const label = "mb-1.5 block text-sm font-medium text-slate-700";

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Question Bank</h1>
        <p className="mt-1 text-sm text-slate-500">
          Reusable questions by subject, topic, and difficulty.
        </p>
      </div>

      <form action={addBankQuestion} className="card mb-8 space-y-4 p-5">
        <h2 className="section-title">Add bank question</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className={label}>Subject</label>
            <input name="subject" placeholder="Physics" className={input} />
          </div>
          <div>
            <label className={label}>Topic</label>
            <input name="topic" placeholder="Motion" className={input} />
          </div>
          <div>
            <label className={label}>Difficulty</label>
            <select name="difficulty" className={input} defaultValue="medium">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_180px]">
          <textarea
            name="question_text"
            required
            rows={2}
            placeholder="Question text"
            className={input}
          />
          <select name="type" className={input} defaultValue="single">
            <option value="single">Single MCQ</option>
            <option value="multiple">Multiple MCQ</option>
            <option value="true_false">True / False</option>
            <option value="fill_blank">Fill blank</option>
            <option value="numerical">Numerical</option>
            <option value="descriptive">Descriptive</option>
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-2">
              <input type="checkbox" name={`correct_${i}`} className="mt-3 h-4 w-4" />
              <input name={`option_${i}`} placeholder={`Option ${i + 1}`} className={input} />
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <input name="correct_text" placeholder="Correct text / number" className={input} />
          <input name="marks" type="number" min={0} step="0.01" defaultValue={1} className={input} />
          <input name="negative_marks" type="number" min={0} step="0.01" defaultValue={0} className={input} />
          <button className="btn-primary">Add to bank</button>
        </div>

        <textarea name="explanation" rows={2} placeholder="Explanation" className={input} />
      </form>

      <form className="mb-5 grid gap-3 md:grid-cols-4">
        <input name="subject" defaultValue={filters.subject ?? ""} placeholder="Filter subject" className={input} />
        <input name="topic" defaultValue={filters.topic ?? ""} placeholder="Filter topic" className={input} />
        <select name="difficulty" defaultValue={filters.difficulty ?? ""} className={input}>
          <option value="">All difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <button className="btn-secondary">Filter</button>
      </form>

      <div className="space-y-3">
        {(questions ?? []).length === 0 && (
          <div className="card p-10 text-center text-sm text-slate-500">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            No bank questions yet.
          </div>
        )}
        {questions?.map((q) => (
          <div key={q.id} className="card-hover flex items-start justify-between gap-4 p-4">
            <div>
              <p className="font-medium text-slate-900">{q.question_text}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="badge bg-slate-100 text-slate-600">{q.type}</span>
                {q.subject && <span className="badge bg-blue-50 text-blue-700">{q.subject}</span>}
                {q.topic && <span className="badge bg-violet-50 text-violet-700">{q.topic}</span>}
                {q.difficulty && <span className="badge bg-amber-50 text-amber-700">{q.difficulty}</span>}
                <span className="badge bg-emerald-50 text-emerald-700">+{q.marks}</span>
              </div>
            </div>
            <form action={deleteBankQuestion}>
              <input type="hidden" name="id" value={q.id} />
              <button className="btn-danger p-2" title="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
