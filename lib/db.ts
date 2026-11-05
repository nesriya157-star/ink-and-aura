import { MongoClient } from "mongodb";

export type UserDoc = { _id: string; name: string; email: string; passwordHash: string; createdAt: string };
export type SessionDoc = { _id: string; userId: string; expiresAt: Date };
export type NoteDoc = {
  _id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  visibility: "Private" | "Public";
  createdAt: string;
  updatedAt: string;
};

const g = globalThis as unknown as { __inkMongo?: Promise<MongoClient>; __inkIndexes?: Promise<void> };

function client() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set (see .env.example).");
  return (g.__inkMongo ??= new MongoClient(uri).connect());
}

export async function collections() {
  const database = (await client()).db(process.env.MONGODB_DB || "inkandaura");
  const users = database.collection<UserDoc>("users");
  const sessions = database.collection<SessionDoc>("sessions");
  const notes = database.collection<NoteDoc>("notes");
  g.__inkIndexes ??= Promise.all([
    users.createIndex({ email: 1 }, { unique: true }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    notes.createIndex({ userId: 1, updatedAt: -1 }),
    notes.createIndex({ visibility: 1, updatedAt: -1 }),
  ]).then(() => undefined);
  await g.__inkIndexes;
  return { users, sessions, notes };
}
