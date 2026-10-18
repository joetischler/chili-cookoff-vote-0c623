import { getStore } from "@netlify/blobs";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const expected = Netlify.env.get("RESET_PIN");
  if (!expected) return json({ error: "Reset isn't set up." }, 500);
  let body;
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  if (String(body.pin || "") !== expected) return json({ error: "Wrong PIN." }, 403);
  const store = getStore({ name: "chili-ballots-r2", consistency: "strong" });
  const { blobs } = await store.list();
  await Promise.all(blobs.map((b) => store.delete(b.key)));
  return json({ ok: true, cleared: blobs.length });
};

export const config = { path: "/api/reset" };
