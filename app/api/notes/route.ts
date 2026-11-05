import { getUser, newId } from "@/lib/auth";
import { fail, json, readJson } from "@/lib/http";
import { insertNote, listNotes, parseNoteInput } from "@/lib/notes";

export async function GET() {
  const user = await getUser();
  if (!user) return fail("Not signed in.", 401);
  return json({ notes: await listNotes(user.id) });
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return fail("Not signed in.", 401);
  const input = parseNoteInput(await readJson(req));
  if (!input) return fail("A title (max 90 chars) and body (max 12000 chars) are required.");
  return json({ note: await insertNote(user.id, input, newId()) }, 201);
}
