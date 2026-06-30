const INSTAGRAM_APP_ID = "936619743392459";

export async function handler(event) {
  const username = event.queryStringParameters?.username || "fireandsoap";

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

    return {
      statusCode: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300",
      },
      body: await response.text(),
    };
  } catch {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to fetch Instagram profile." }),
    };
  }
}
