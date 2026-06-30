export async function handler(event) {
  const imageUrl = event.queryStringParameters?.url;

  if (!imageUrl) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "text/plain" },
      body: "Missing image url.",
    };
  }

  try {
    const response = await fetch(decodeURIComponent(imageUrl), {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://www.instagram.com/",
      },
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { "Content-Type": "text/plain" },
        body: "Unable to fetch Instagram image.",
      };
    }

    const buffer = await response.arrayBuffer();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
      body: Buffer.from(buffer).toString("base64"),
      isBase64Encoded: true,
    };
  } catch {
    return {
      statusCode: 502,
      headers: { "Content-Type": "text/plain" },
      body: "Failed to proxy Instagram image.",
    };
  }
}
