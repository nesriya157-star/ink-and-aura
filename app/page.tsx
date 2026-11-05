import InkAura from "@/components/InkAura";
import { getUser } from "@/lib/auth";
import { listNotes } from "@/lib/notes";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getUser();
  return <InkAura initialUser={user} initialNotes={user ? await listNotes(user.id) : []} />;
}
