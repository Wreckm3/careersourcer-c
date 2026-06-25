import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Users,
  Sparkles,
  ExternalLink,
  Plus,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import { categories } from "@/data/curriculum";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface PoolProfile {
  user_id: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  branches: string[];
  looking_for: string | null;
  contact_link: string | null;
  updated_at: string;
}

const allBranches = categories.flatMap((c) =>
  c.branches.map((b) => ({
    id: b.id,
    title: b.title,
    emoji: b.emoji,
    color: c.color,
    category: c.title,
  }))
);

const branchMeta = (id: string) => allBranches.find((b) => b.id === id);

export default function Pool() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<PoolProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [myProfile, setMyProfile] = useState<PoolProfile | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pool_profiles" as never)
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error("Couldn't load the pool");
    } else {
      const list = (data as unknown as PoolProfile[]) || [];
      setProfiles(list);
      if (user) setMyProfile(list.find((p) => p.user_id === user.id) || null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      if (filter && !p.branches.includes(filter)) return false;
      if (query) {
        const q = query.toLowerCase();
        if (
          !p.display_name.toLowerCase().includes(q) &&
          !(p.headline || "").toLowerCase().includes(q) &&
          !(p.bio || "").toLowerCase().includes(q) &&
          !(p.looking_for || "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [profiles, filter, query]);

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <motion.button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm font-medium"
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-start justify-between gap-4 flex-wrap"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-blue/10 text-accent-blue text-xs font-bold uppercase tracking-wider mb-3">
              <Users className="w-3.5 h-3.5" /> Collaboration Pool
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              Find your team.
            </h1>
            <p className="text-muted-foreground mt-1 max-w-xl">
              Game devs, app devs, freelancers, entrepreneurs — connect with
              people sharing your branch and build something together.
            </p>
          </div>

          {user ? (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-blue text-primary-foreground font-semibold text-sm hover:scale-[1.02] transition-transform"
            >
              {myProfile ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {myProfile ? "Edit my pool card" : "Join the pool"}
            </button>
          ) : (
            <button
              onClick={() => navigate("/auth")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-blue text-primary-foreground font-semibold text-sm"
            >
              Sign in to join
            </button>
          )}
        </motion.div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, interest, or what someone is building..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
          />
        </div>

        {/* Branch filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 -mx-1 px-1 scrollbar-hide">
          <button
            onClick={() => setFilter(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              filter === null
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {allBranches.map((b) => (
            <button
              key={b.id}
              onClick={() => setFilter(filter === b.id ? null : b.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                filter === b.id
                  ? "text-white border-transparent"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
              style={
                filter === b.id ? { backgroundColor: b.color } : undefined
              }
            >
              <span>{b.emoji}</span> {b.title}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Loading the pool...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <Sparkles className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <p className="font-bold text-foreground">No one here yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              {filter
                ? "Be the first in this branch."
                : "Be the first to drop your card in the pool."}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            <AnimatePresence>
              {filtered.map((p, i) => (
                <motion.div
                  key={p.user_id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="p-5 rounded-2xl border border-border bg-card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-white font-black text-sm shrink-0">
                        {p.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">
                          {p.display_name}
                        </p>
                        {p.headline && (
                          <p className="text-xs text-muted-foreground truncate">
                            {p.headline}
                          </p>
                        )}
                      </div>
                    </div>
                    {user?.id === p.user_id && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent-blue">
                        You
                      </span>
                    )}
                  </div>

                  {p.bio && (
                    <p className="text-sm text-foreground/80 mb-3 line-clamp-3">
                      {p.bio}
                    </p>
                  )}

                  {p.looking_for && (
                    <div className="mb-3 p-2.5 rounded-lg bg-muted/40 border border-border">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                        Looking for
                      </p>
                      <p className="text-xs text-foreground">{p.looking_for}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {p.branches.map((bid) => {
                      const b = branchMeta(bid);
                      if (!b) return null;
                      return (
                        <span
                          key={bid}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${b.color}18`,
                            color: b.color,
                          }}
                        >
                          {b.emoji} {b.title}
                        </span>
                      );
                    })}
                  </div>

                  {p.contact_link && (
                    <a
                      href={
                        /^https?:\/\//i.test(p.contact_link)
                          ? p.contact_link
                          : p.contact_link.includes("@")
                          ? `mailto:${p.contact_link}`
                          : `https://${p.contact_link}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-blue hover:underline"
                    >
                      Reach out <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && user && (
          <PoolForm
            user={user}
            existing={myProfile}
            onClose={() => setShowForm(false)}
            onSaved={async () => {
              setShowForm(false);
              await load();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PoolForm({
  user,
  existing,
  onClose,
  onSaved,
}: {
  user: { id: string; email?: string | null };
  existing: PoolProfile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState(
    existing?.display_name || user.email?.split("@")[0] || ""
  );
  const [headline, setHeadline] = useState(existing?.headline || "");
  const [bio, setBio] = useState(existing?.bio || "");
  const [lookingFor, setLookingFor] = useState(existing?.looking_for || "");
  const [contactLink, setContactLink] = useState(existing?.contact_link || "");
  const [branches, setBranches] = useState<string[]>(existing?.branches || []);
  const [saving, setSaving] = useState(false);

  const toggleBranch = (id: string) =>
    setBranches((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const save = async () => {
    if (!displayName.trim()) {
      toast.error("Add a display name");
      return;
    }
    if (branches.length === 0) {
      toast.error("Pick at least one branch");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("pool_profiles" as never).upsert(
      {
        user_id: user.id,
        display_name: displayName.trim(),
        headline: headline.trim() || null,
        bio: bio.trim() || null,
        looking_for: lookingFor.trim() || null,
        contact_link: contactLink.trim() || null,
        branches,
      } as never,
      { onConflict: "user_id" }
    );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(existing ? "Updated" : "You're in the pool!");
    onSaved();
  };

  const remove = async () => {
    if (!existing) return;
    if (!confirm("Remove your card from the pool?")) return;
    setSaving(true);
    const { error } = await supabase
      .from("pool_profiles" as never)
      .delete()
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Removed");
    onSaved();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        className="bg-card border border-border w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
          <h2 className="font-black text-lg">
            {existing ? "Edit your card" : "Join the pool"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Display name">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={60}
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
            />
          </Field>
          <Field label="Headline" hint="One line. e.g. 'Aspiring game dev from Nairobi'">
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              maxLength={120}
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
            />
          </Field>
          <Field label="About you">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
            />
          </Field>
          <Field label="Looking for" hint="What do you want to team up on?">
            <input
              value={lookingFor}
              onChange={(e) => setLookingFor(e.target.value)}
              maxLength={200}
              placeholder="e.g. A teammate to build a mobile game with"
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
            />
          </Field>
          <Field label="Contact" hint="Email, WhatsApp, Discord, or any link">
            <input
              value={contactLink}
              onChange={(e) => setContactLink(e.target.value)}
              maxLength={200}
              placeholder="you@email.com or https://..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
            />
          </Field>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Your branches
            </p>
            <div className="flex flex-wrap gap-1.5">
              {allBranches.map((b) => {
                const on = branches.includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggleBranch(b.id)}
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                      on ? "text-white border-transparent" : "border-border text-muted-foreground"
                    }`}
                    style={on ? { backgroundColor: b.color } : undefined}
                  >
                    <span>{b.emoji}</span> {b.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-5 py-3 flex items-center gap-2">
          {existing && (
            <button
              onClick={remove}
              disabled={saving}
              className="p-2 rounded-lg border border-border text-destructive hover:bg-destructive/10"
              aria-label="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-accent-blue text-primary-foreground text-sm font-semibold disabled:opacity-60"
          >
            {saving ? "Saving..." : existing ? "Save" : "Publish"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
