const INSTAGRAM_APP_ID = "936619743392459";
const DEFAULT_USERNAME = "fireandsoap";

export default async function handler(req, res) {
  const username = req.query.username || DEFAULT_USERNAME;

  try {
    const response = await fetch(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      {
        headers: {
          "User-Agent": "Instagram 76.0.0.11.384",
          "X-IG-App-ID": INSTAGRAM_APP_ID,
        },
      },
    );

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(response.status).send(await response.text());
  } catch {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(502).json({ error: "Failed to fetch Instagram profile." });
  }
}
