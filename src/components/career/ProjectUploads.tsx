import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Link2, FileText, Trash2, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isEnabled } from "@/config/features";

interface UploadRow {
  id: string;
  title: string;
  description: string | null;
  storage_path: string | null;
  external_url: string | null;
  review_status: string;
  branch_id: string | null;
  lesson_id: string | null;
  created_at: string;
}

const MAX_BYTES = 15 * 1024 * 1024;

const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting review",
  reviewing: "In review",
  reviewed: "Reviewed",
  rejected: "Needs changes",
};

export function ProjectUploads({
  categoryId,
  branchId,
  lessonId,
  compact,
}: {
  categoryId?: string;
  branchId?: string;
  lessonId?: string;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("project_uploads")
      .select("id,title,description,storage_path,external_url,review_status,branch_id,lesson_id,created_at")
      .order("created_at", { ascending: false });
    if (lessonId) query = query.eq("lesson_id", lessonId);
    const { data, error } = await query;
    if (error) toast.error("Couldn't load your projects");
    setRows((data as UploadRow[]) ?? []);
    setLoading(false);
  }, [user, lessonId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!isEnabled("projectUploads") || !user) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!file && !externalUrl.trim()) {
      toast.error("Attach a file or paste a link");
      return;
    }
    if (file && file.size > MAX_BYTES) {
      toast.error("File must be under 15MB");
      return;
    }
    setBusy(true);
    try {
      let storagePath: string | null = null;
      if (file) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        storagePath = `${user.id}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage
          .from("project-uploads")
          .upload(storagePath, file, { upsert: false });
        if (upErr) throw new Error(upErr.message);
      }
      const { error } = await supabase.from("project_uploads").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        storage_path: storagePath,
        external_url: externalUrl.trim() || null,
        category_id: categoryId ?? null,
        branch_id: branchId ?? null,
        lesson_id: lessonId ?? null,
      });
      if (error) throw new Error(error.message);
      toast.success("Project submitted");
      setTitle("");
      setDescription("");
      setExternalUrl("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: UploadRow) => {
    const { error } = await supabase.from("project_uploads").delete().eq("id", row.id);
    if (error) {
      toast.error("Couldn't delete");
      return;
    }
    if (row.storage_path) {
      await supabase.storage.from("project-uploads").remove([row.storage_path]);
    }
    setRows((r) => r.filter((x) => x.id !== row.id));
  };

  const openFile = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("project-uploads")
      .createSignedUrl(path, 60);
    if (error || !data) {
      toast.error("Couldn't open file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <section aria-label="Project uploads" className="flex flex-col gap-4">
      {!compact && <h2 className="text-lg font-bold text-foreground">Your Projects</h2>}

      <form onSubmit={submit} className="surface-card p-4 flex flex-col gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Project title"
          className="px-3 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={600}
          rows={2}
          placeholder="What did you build? What are you unsure about?"
          className="px-3 py-2 rounded-lg border border-border bg-input-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <div className="flex flex-col sm:flex-row gap-2">
          <label className="flex-1 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground cursor-pointer hover:border-primary/50">
            <Upload className="w-4 h-4" />
            <span className="truncate">{file ? file.name : "Attach file (max 15MB)"}</span>
            <input
              ref={fileRef}
              type="file"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <div className="flex-1 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border">
            <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="or paste a live link"
              className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="btn-primary-gold self-start px-5 py-2 rounded-lg text-sm inline-flex items-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Submit project
        </button>
      </form>

      {loading ? (
        <div className="h-16 rounded-xl bg-muted animate-pulse" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing submitted yet. Ship something small and put it here.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {rows.map((row) => (
              <motion.li
                key={row.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 rounded-xl border border-border bg-card flex items-center gap-3"
              >
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{row.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {STATUS_LABEL[row.review_status] ?? row.review_status} ·{" "}
                    {new Date(row.created_at).toLocaleDateString()}
                  </p>
                </div>
                {row.external_url && (
                  <a
                    href={row.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Open link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                {row.storage_path && (
                  <button
                    onClick={() => openFile(row.storage_path!)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Open file"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => remove(row)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
