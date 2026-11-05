import { getUser, newId } from "@/lib/auth";
import { fail, json, readJson } from "@/lib/http";
import { buildDoc, insertMany, listNotes, parseNoteInput } from "@/lib/notes";
import type { NoteDoc } from "@/lib/db";

/** Imports writing saved by the old browser-only version. */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return fail("Not signed in.", 401);
  const b = (await readJson(req)) as { notes?: unknown } | null;
  if (!Array.isArray(b?.notes)) return fail("Expected { notes: [] }.");
  const ok = (d: unknown) => (typeof d === "string" && !Number.isNaN(Date.parse(d)) ? new Date(d).toISOString() : undefined);
  const docs: NoteDoc[] = [];
  for (const raw of b.notes.slice(0, 500)) {
    const input = parseNoteInput(raw);
    if (!input) continue;
    const r = raw as { createdAt?: unknown; updatedAt?: unknown };
    docs.push(buildDoc(user.id, input, newId(), ok(r.createdAt), ok(r.updatedAt)));
  }
  await insertMany(docs);
  return json({ notes: await listNotes(user.id) }, 201);
}
