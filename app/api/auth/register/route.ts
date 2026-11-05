import { hashPassword, newId, startSession } from "@/lib/auth";
import { collections } from "@/lib/db";
import { fail, json, readJson } from "@/lib/http";

export async function POST(req: Request) {
  const b = (await readJson(req)) as Record<string, unknown> | null;
  const name = typeof b?.name === "string" ? b.name.trim() : "";
  const email = typeof b?.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b?.password === "string" ? b.password : "";
  if (!name || name.length > 60) return fail("Please enter a name (up to 60 characters).");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return fail("Please enter a valid email.");
  if (password.length < 8 || password.length > 200) return fail("Password must be at least 8 characters.");
  const { users } = await collections();
  const id = newId();
  try {
    await users.insertOne({ _id: id, name, email, passwordHash: hashPassword(password), createdAt: new Date().toISOString() });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return fail("An account with that email already exists.", 409);
    throw e;
  }
  await startSession(id);
  return json({ user: { id, name, email } }, 201);
}
