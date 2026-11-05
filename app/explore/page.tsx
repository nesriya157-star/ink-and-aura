import type { Metadata } from "next";
import Link from "next/link";
import { listPublic } from "@/lib/notes";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Explore — Ink & Aura" };

export default async function Explore() {
  const notes = await listPublic();
  return (
    <>
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Ink and Aura home">
          <div className="logo">☾</div>
          <div className="brand-name">
            Ink <span>&amp;</span> Aura
          </div>
        </Link>
        <div className="top-actions">
          <Link className="primary" href="/" style={{ textDecoration: "none" }}>
            Your writing room
          </Link>
        </div>
      </header>
      <main>
        <div className="section-head">
          <div>
            <h2>Explore</h2>
            <div className="sub">Words others have chosen to share.</div>
          </div>
        </div>
        <div className="grid">
          {!notes.length && (
            <div className="empty">
              <div className="empty-moon">☾</div>
              <h3>Nothing shared yet</h3>
              <p>Mark a piece as Public in your writing room and it will appear here.</p>
            </div>
          )}
          {notes.map((n) => (
            <article className="note" key={n.id}>
              <div className="note-top">
                <span className="pill">{n.type}</span>
                <span className="visibility">by {n.author}</span>
              </div>
              <h3>{n.title}</h3>
              <div className="note-body" style={{ WebkitLineClamp: 8 }}>
                {n.body}
              </div>
              <div className="note-foot">
                <span>{new Date(n.updatedAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
            </article>
          ))}
        </div>
      </main>
      <footer>Made of moonlight, imagination, and words. &nbsp;✦</footer>
    </>
  );
}
