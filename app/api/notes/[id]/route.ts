import { getUser } from "@/lib/auth";
import { fail, json, readJson } from "@/lib/http";
import { deleteNote, parseNoteInput, updateNote } from "@/lib/notes";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const user = await getUser();
  if (!user) return fail("Not signed in.", 401);
  const input = parseNoteInput(await readJson(req));
  if (!input) return fail("A title (max 90 chars) and body (max 12000 chars) are required.");
  const note = await updateNote(user.id, (await params).id, input);
  return note ? json({ note }) : fail("Not found.", 404);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getUser();
  if (!user) return fail("Not signed in.", 401);
  return (await deleteNote(user.id, (await params).id)) ? json({ ok: true }) : fail("Not found.", 404);
}
