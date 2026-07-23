/**
 * Mini-app result endpoint — isolated from gallery/Shopify.
 * Mockup: in-memory echo only (no DB). Safe no-op for local/dev.
 */

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    id: `ritual_${Date.now().toString(36)}`,
    draft: {
      element: body.element ?? null,
      hz: body.hz ?? null,
      warmth: body.warmth ?? null,
      botanical: body.botanical ?? null,
      sanctuary: body.sanctuary ?? null,
      productPair: body.productPair ?? null,
    },
    createdAt: new Date().toISOString(),
  });
}
