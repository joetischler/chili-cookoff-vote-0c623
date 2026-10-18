import { getStore } from "@netlify/blobs";

const CHILIS = ["erin", "ali", "dana", "andy"];
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default async (req) => {
  const store = getStore({ name: "chili-ballots", consistency: "strong" });

  if (req.method === "GET") {
    const { blobs } = await store.list();
    const ballots = (
      await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })))
    ).filter(Boolean);
    return json({ ballots });
  }

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
    const initials = String(body.initials || "").toUpperCase().replace(/[^A-Z]/g, "");
    if (initials.length < 2 || initials.length > 4)
      return json({ error: "Initials must be 2–4 letters." }, 400);
    const ballot = { initials, at: Date.now() };
    for (const c of CHILIS) {
      const n = Number(body.scores?.[c]);
      if (!Number.isInteger(n) || n < 1 || n > 10)
        return json({ error: "Score every chili from 1 to 10." }, 400);
      ballot[c] = n;
    }
    const { modified } = await store.setJSON(initials, ballot, body.replace ? {} : { onlyIfNew: true });
    if (!modified) return json({ error: "duplicate", initials }, 409);
    return json({ ok: true, ballot });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config = { path: "/api/ballots" };
