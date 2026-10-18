import { getStore } from "@netlify/blobs";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const PIN_HASH = "49aa07d926840bafe0cff28ce8688abab4260fb59fc65c51bd7649963cc4e69f";
  let body;
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("chili-cookoff:" + String(body.pin || "")));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex !== PIN_HASH) return json({ error: "Wrong PIN." }, 403);
  const meta = getStore({ name: "chili-poll", consistency: "strong" });
  if (body.action === "open" || body.action === "close") {
    await meta.setJSON("state", { open: body.action === "open", at: Date.now() });
    return json({ ok: true, open: body.action === "open" });
  }
  if (body.action === "reset") {
    const store = getStore({ name: "chili-ballots-r2", consistency: "strong" });
    const { blobs } = await store.list();
    await Promise.all(blobs.map((b) => store.delete(b.key)));
    await meta.setJSON("state", { open: true, at: Date.now() });
    return json({ ok: true, cleared: blobs.length, open: true });
  }
  if (body.action === "check") {
    const state = (await meta.get("state", { type: "json" })) || { open: true };
    return json({ ok: true, open: state.open });
  }
  return json({ error: "Unknown action." }, 400);
};

export const config = { path: "/api/host" };
