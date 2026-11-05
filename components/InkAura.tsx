"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { TYPES, type Note, type User, type Visibility } from "@/lib/types";

const LEGACY_KEY = "inkAuraWriting_v1";

const starterPrompts = [
  "Write about a place that exists only in your imagination.",
  "If the moon could keep a diary, what would tonight’s entry say?",
  "Describe a tiny moment you wish you could save in a jar.",
  "Begin a story with: “The letter arrived under a violet sky…”",
  "Write a quote that your future self might need to hear.",
  "Imagine a secret library where every book tells a forgotten dream.",
];

async function api<T = unknown>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Something went wrong.");
  return data as T;
}

function readLegacy(): Note[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LEGACY_KEY) || "null");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export default function InkAura({ initialUser, initialNotes }: { initialUser: User | null; initialNotes: Note[] }) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [visFilter, setVisFilter] = useState("All");
  const [promptIndex, setPromptIndex] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);
  const [legacyCount, setLegacyCount] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", body: "", type: "Story", visibility: "Private" as Visibility });
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) setLegacyCount(readLegacy().length);
  }, [user]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditorOpen(false);
        setAboutOpen(false);
        setAuthMode(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (editorOpen) titleRef.current?.focus();
  }, [editorOpen]);

  const showToast = (message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  };

  const openEditor = (note?: Note) => {
    if (!user) {
      openAuth("register");
      return;
    }
    setEditingId(note?.id ?? null);
    setForm({
      title: note?.title ?? "",
      body: note?.body ?? "",
      type: note?.type ?? "Story",
      visibility: note?.visibility ?? "Private",
    });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
  };

  const openAuth = (mode: "login" | "register") => {
    setAuthError("");
    setAuthMode(mode);
  };

  const onAuth = async (e: FormEvent) => {
    e.preventDefault();
    if (!authMode) return;
    setBusy(true);
    setAuthError("");
    try {
      const { user: u } = await api<{ user: User }>(`/api/auth/${authMode}`, "POST", authForm);
      const { notes: mine } = await api<{ notes: Note[] }>("/api/notes", "GET");
      setUser(u);
      setNotes(mine);
      setAuthMode(null);
      setAuthForm({ name: "", email: "", password: "" });
      showToast(authMode === "register" ? `Welcome, ${u.name} ✦` : `Welcome back, ${u.name} ✦`);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await api("/api/auth/logout", "POST").catch(() => {});
    setUser(null);
    setNotes([]);
    showToast("Signed out.");
  };

  const importLegacy = async () => {
    try {
      const { notes: all } = await api<{ notes: Note[] }>("/api/notes/import", "POST", { notes: readLegacy() });
      localStorage.removeItem(LEGACY_KEY);
      setNotes(all);
      setLegacyCount(0);
      showToast("Your earlier writing has been imported ✦");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Import failed.");
    }
  };

  const deleteNote = async (id: string) => {
    const n = notes.find((x) => x.id === id);
    if (!n) return;
    if (!confirm(`Delete “${n.title}”? This cannot be undone.`)) return;
    try {
      await api(`/api/notes/${id}`, "DELETE");
      setNotes((prev) => prev.filter((x) => x.id !== id));
      closeEditor();
      showToast("Writing deleted.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not delete.");
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    setBusy(true);
    try {
      if (editingId) {
        const { note } = await api<{ note: Note }>(`/api/notes/${editingId}`, "PATCH", form);
        setNotes((prev) => [note, ...prev.filter((n) => n.id !== note.id)]);
      } else {
        const { note } = await api<{ note: Note }>("/api/notes", "POST", form);
        setNotes((prev) => [note, ...prev]);
      }
      closeEditor();
      showToast("Your words have been saved ✦");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter(
      (n) =>
        (category === "All" || n.type === category) &&
        (visFilter === "All" || n.visibility === visFilter) &&
        `${n.title} ${n.body}`.toLowerCase().includes(q),
    );
  }, [notes, search, category, visFilter]);

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#" aria-label="Ink and Aura home">
          <div className="logo">☾</div>
          <div className="brand-name">
            Ink <span>&amp;</span> Aura
          </div>
        </a>
        <div className="top-actions">
          <Link className="quiet-btn" href="/explore" style={{ textDecoration: "none" }}>
            Explore
          </Link>
          <button className="quiet-btn" onClick={() => setAboutOpen(true)}>
            Our little space
          </button>
          {user ? (
            <button className="quiet-btn" onClick={logout} title={user.email}>
              Sign out
            </button>
          ) : (
            <button className="quiet-btn" onClick={() => openAuth("login")}>
              Sign in
            </button>
          )}
          <button className="primary" onClick={() => openEditor()}>
            ＋ New writing
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div>
            <div className="eyebrow">A little universe of words</div>
            <h1>
              Your thoughts.
              <br />
              <em>Your universe.</em>
            </h1>
            <p>
              A gentle place to gather your poems, stories, quotes, and little thoughts. Keep a piece just for yourself, or choose
              to share it with the world.
            </p>
            <button className="primary" onClick={() => openEditor()}>
              Begin writing&nbsp; ↗
            </button>
          </div>
          <div className="hero-art" aria-label="Celestial crescent moon illustration">
            <span className="spark s1">✦</span>
            <span className="spark s2">✧</span>
            <span className="spark s3">·</span>
            <div className="moon">☾</div>
          </div>
        </section>

        <section>
          <div className="section-head">
            <div>
              <h2>Your writing room</h2>
              <div className="sub">Every idea deserves a little space.</div>
            </div>
            <button className="outline" onClick={() => openEditor()}>
              ＋ Create
            </button>
          </div>
          {user && legacyCount > 0 && (
            <div className="prompt-box" style={{ margin: "0 0 18px", padding: "16px 20px" }}>
              <p>Found {legacyCount} piece(s) saved in this browser from before accounts.</p>
              <button className="prompt-btn" onClick={importLegacy}>
                Import to my account
              </button>
            </div>
          )}
          <div className="tools">
            <input
              className="search"
              type="search"
              placeholder="Find a thought, title, or word…"
              aria-label="Search writing"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="filter" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="All">All writing</option>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select className="filter" value={visFilter} onChange={(e) => setVisFilter(e.target.value)}>
              <option value="All">Private &amp; shared</option>
              <option value="Private">Private</option>
              <option value="Public">Public</option>
            </select>
          </div>

          <div className="grid">
            {!shown.length && (
              <div className="empty">
                <div className="empty-moon">☾</div>
                <h3>{!user ? "Sign in to start your room" : notes.length ? "No matching words just yet" : "Your first page is waiting"}</h3>
                <p>
                  {!user
                    ? "Create a free account to keep your writing safe and share what you choose."
                    : notes.length
                      ? "Try another search or filter."
                      : "Start with a thought, a poem, or a tiny idea."}
                </p>
                {(!user || !notes.length) && (
                  <button className="primary" onClick={() => openEditor()}>
                    {user ? "Write your first note" : "Create an account"}
                  </button>
                )}
              </div>
            )}
            {shown.map((n) => (
              <article className="note" key={n.id}>
                <div className="note-top">
                  <span className="pill">{n.type}</span>
                  <span className="visibility">{n.visibility === "Private" ? "◉ Private" : "✧ Public"}</span>
                </div>
                <h3>{n.title}</h3>
                <div className="note-body">{n.body}</div>
                <div className="note-foot">
                  <span>{new Date(n.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                  <div className="note-actions">
                    <button className="tiny" onClick={() => openEditor(n)}>
                      Edit
                    </button>
                    <button className="tiny" onClick={() => deleteNote(n.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="prompt-box">
          <div>
            <div className="eyebrow">A spark for today</div>
            <h3>When words feel far away…</h3>
            <p>{starterPrompts[promptIndex]}</p>
          </div>
          <button className="prompt-btn" onClick={() => setPromptIndex((i) => (i + 1) % starterPrompts.length)}>
            Another little spark ↻
          </button>
        </section>
      </main>

      <footer>Made of moonlight, imagination, and words. &nbsp;✦</footer>

      <div
        className={`modal-backdrop${editorOpen ? " show" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editorTitle"
        onClick={(e) => e.target === e.currentTarget && closeEditor()}
      >
        <div className="modal">
          <div className="modal-head">
            <h2 id="editorTitle">{editingId ? "Edit your writing" : "Create something lovely"}</h2>
            <button className="close" onClick={closeEditor} aria-label="Close">
              ×
            </button>
          </div>
          <form onSubmit={onSubmit}>
            <label className="field">
              <span>Give your writing a title</span>
              <input
                ref={titleRef}
                maxLength={90}
                placeholder="A title for your thoughts…"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Your words</span>
              <textarea
                maxLength={12000}
                placeholder="Let your imagination wander…"
                required
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </label>
            <div className="form-row">
              <label className="field">
                <span>Type of writing</span>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Visibility</span>
                <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as Visibility })}>
                  <option value="Private">Private — just for me</option>
                  <option value="Public">Public — marked to share</option>
                </select>
              </label>
            </div>
            <div className="helper">
              Your writing is saved to your account. “Private” stays just for you; “Public” appears on the Explore page with your name.
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="quiet-btn"
                style={{ display: editingId ? "inline-block" : "none", color: "#9b5555" }}
                onClick={() => editingId && deleteNote(editingId)}
              >
                Delete
              </button>
              <div className="right">
                <button type="button" className="outline" onClick={closeEditor}>
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={busy}>
                  Save writing
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div
        className={`modal-backdrop${aboutOpen ? " show" : ""}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.target === e.currentTarget && setAboutOpen(false)}
      >
        <div className="modal">
          <div className="modal-head">
            <h2>Our little space</h2>
            <button className="close" onClick={() => setAboutOpen(false)} aria-label="Close">
              ×
            </button>
          </div>
          <p style={{ font: "italic 21px/1.5 var(--font-cormorant), serif", color: "var(--plum-soft)" }}>“A world written by you.”</p>
          <p style={{ fontSize: 13, lineHeight: 1.8, color: "var(--plum-soft)" }}>
            Ink &amp; Aura is a personal writing nook for the things you imagine, notice, and feel inspired to put into words. Start
            with a sentence. See where it takes you.
          </p>
          <div className="helper">
            Your writing is stored on the server and tied to your account. Only pieces you mark Public are visible to others.
          </div>
        </div>
      </div>

      <div
        className={`modal-backdrop${authMode ? " show" : ""}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.target === e.currentTarget && setAuthMode(null)}
      >
        <div className="modal">
          <div className="modal-head">
            <h2>{authMode === "register" ? "Create your account" : "Welcome back"}</h2>
            <button className="close" onClick={() => setAuthMode(null)} aria-label="Close">
              ×
            </button>
          </div>
          <form onSubmit={onAuth}>
            {authMode === "register" && (
              <label className="field">
                <span>Your name</span>
                <input maxLength={60} required value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} />
              </label>
            )}
            <label className="field">
              <span>Email</span>
              <input type="email" required autoComplete="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                required
                minLength={authMode === "register" ? 8 : undefined}
                autoComplete={authMode === "register" ? "new-password" : "current-password"}
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              />
            </label>
            {authError && (
              <div className="helper" role="alert" style={{ color: "#9b5555" }}>
                {authError}
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="quiet-btn" onClick={() => openAuth(authMode === "register" ? "login" : "register")}>
                {authMode === "register" ? "I already have an account" : "Create an account"}
              </button>
              <div className="right">
                <button type="submit" className="primary" disabled={busy}>
                  {authMode === "register" ? "Sign up" : "Sign in"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className={`toast${toast ? " show" : ""}`} role="status">
        {toast}
      </div>
    </>
  );
}
