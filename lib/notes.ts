import { collections, type NoteDoc } from "./db";
import { TYPES, type Note, type Visibility } from "./types";

const toNote = (d: NoteDoc): Note => ({
  id: d._id,
  title: d.title,
  body: d.body,
  type: d.type,
  visibility: d.visibility,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

export type NoteInput = { title: string; body: string; type: string; visibility: Visibility };

/** Returns a cleaned input or null if invalid. */
export function parseNoteInput(v: unknown): NoteInput | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const body = typeof o.body === "string" ? o.body.trim() : "";
  if (!title || title.length > 90 || !body || body.length > 12000) return null;
  const type = TYPES.includes(o.type as never) ? (o.type as string) : "Other";
  const visibility: Visibility = o.visibility === "Public" ? "Public" : "Private";
  return { title, body, type, visibility };
}

export async function listNotes(userId: string): Promise<Note[]> {
  const { notes } = await collections();
  return (await notes.find({ userId }).sort({ updatedAt: -1 }).toArray()).map(toNote);
}

export function buildDoc(userId: string, input: NoteInput, id: string, createdAt?: string, updatedAt?: string): NoteDoc {
  const created = createdAt ?? new Date().toISOString();
  return { _id: id, userId, ...input, createdAt: created, updatedAt: updatedAt ?? created };
}

export async function insertNote(userId: string, input: NoteInput, id: string): Promise<Note> {
  const { notes } = await collections();
  const doc = buildDoc(userId, input, id);
  await notes.insertOne(doc);
  return toNote(doc);
}

export async function insertMany(docs: NoteDoc[]) {
  if (docs.length) await (await collections()).notes.insertMany(docs);
}

export async function updateNote(userId: string, id: string, input: NoteInput): Promise<Note | null> {
  const { notes } = await collections();
  const doc = await notes.findOneAndUpdate(
    { _id: id, userId },
    { $set: { ...input, updatedAt: new Date().toISOString() } },
    { returnDocument: "after" },
  );
  return doc ? toNote(doc) : null;
}

export async function deleteNote(userId: string, id: string) {
  return (await (await collections()).notes.deleteOne({ _id: id, userId })).deletedCount > 0;
}

export type PublicNote = Note & { author: string };

export async function listPublic(limit = 60): Promise<PublicNote[]> {
  const { notes, users } = await collections();
  const docs = await notes.find({ visibility: "Public" }).sort({ updatedAt: -1 }).limit(limit).toArray();
  const authors = await users.find({ _id: { $in: [...new Set(docs.map((d) => d.userId))] } }).toArray();
  const names = new Map(authors.map((u) => [u._id, u.name]));
  return docs.map((d) => ({ ...toNote(d), author: names.get(d.userId) ?? "Unknown" }));
}
