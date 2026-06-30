export default async function handler(req, res) {
  const imageUrl = req.query.url;

  if (!imageUrl) {
    res.status(400).setHeader("Content-Type", "text/plain").send("Missing image url.");
    return;
  }

  try {
    const response = await fetch(decodeURIComponent(imageUrl), {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://www.instagram.com/",
      },
    });

    if (!response.ok) {
      res.status(response.status).setHeader("Content-Type", "text/plain").send("Unable to fetch Instagram image.");
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", response.headers.get("content-type") || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).send(buffer);
  } catch {
    res.status(502).setHeader("Content-Type", "text/plain").send("Failed to proxy Instagram image.");
  }
}
