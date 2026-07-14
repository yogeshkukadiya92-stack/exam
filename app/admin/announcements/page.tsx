import { createClient } from "@/lib/supabase/server";
import { createAnnouncement, deleteAnnouncement, toggleAnnouncement } from "./actions";
import { Megaphone, Trash2, Eye, EyeOff } from "lucide-react";

interface AnnouncementRow {
  id: string;
  title: string;
  content: string | null;
  is_active: boolean;
  created_at: string;
}

export default async function AnnouncementsPage() {
  const supabase = await createClient();

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, content, is_active, created_at")
    .order("created_at", { ascending: false });
  const rows = (announcements as AnnouncementRow[] | null) ?? [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Announcements</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage announcements visible to all students
        </p>
      </div>

      {/* Create form */}
      <div className="card mb-8 p-6">
        <h2 className="section-title mb-4">New Announcement</h2>
        <form action={createAnnouncement} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Title
            </label>
            <input
              name="title"
              type="text"
              required
              placeholder="Announcement title"
              className="input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Content (optional)
            </label>
            <textarea
              name="content"
              rows={3}
              placeholder="Write your announcement details here..."
              className="input resize-none"
            />
          </div>
          <button type="submit" className="btn-primary">
            Publish Announcement
          </button>
        </form>
      </div>

      {/* List */}
      <div className="space-y-3">
        {rows.length === 0 && (
          <div className="card p-12 text-center">
            <Megaphone className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              No announcements yet. Create one above.
            </p>
          </div>
        )}
        {rows.map((a) => (
          <div key={a.id} className="card-hover p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="break-words font-semibold text-slate-900 dark:text-slate-100">
                    {a.title}
                  </span>
                  <span
                    className={`badge ${
                      a.is_active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {a.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                {a.content && (
                  <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                    {a.content}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-slate-400">
                  {new Date(a.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <form action={toggleAnnouncement}>
                  <input type="hidden" name="id" value={a.id} />
                  <input
                    type="hidden"
                    name="is_active"
                    value={a.is_active.toString()}
                  />
                  <button className="btn-secondary flex items-center gap-1.5 text-xs">
                    {a.is_active ? (
                      <><EyeOff className="h-3.5 w-3.5" /> Hide</>
                    ) : (
                      <><Eye className="h-3.5 w-3.5" /> Show</>
                    )}
                  </button>
                </form>
                <form action={deleteAnnouncement}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="btn-danger flex items-center gap-1 text-xs">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
