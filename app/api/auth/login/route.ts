import { hashPassword, startSession, verifyPassword } from "@/lib/auth";
import { collections } from "@/lib/db";
import { fail, json, readJson } from "@/lib/http";

// Hash used to keep timing similar when the email is unknown.
const DUMMY = hashPassword("not-a-real-password");

export async function POST(req: Request) {
  const b = (await readJson(req)) as Record<string, unknown> | null;
  const email = typeof b?.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b?.password === "string" ? b.password : "";
  const { users } = await collections();
  const row = await users.findOne({ email });
  const ok = verifyPassword(password, row?.passwordHash ?? DUMMY) && !!row;
  if (!row || !ok) return fail("Incorrect email or password.", 401);
  await startSession(row._id);
  return json({ user: { id: row._id, name: row.name, email: row.email } });
}
