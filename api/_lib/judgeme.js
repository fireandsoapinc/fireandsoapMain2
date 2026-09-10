const JUDGEME_API_BASE = "https://judge.me/api/v1";

function getConfig() {
  const apiToken = process.env.JUDGEME_PRIVATE;
  const shopDomain = process.env.JUDGEME_SHOP_DOMAIN;

  if (!apiToken || !shopDomain) {
    throw new Error("Judge.me is not configured.");
  }

  return { apiToken, shopDomain };
}

export async function fetchJudgeMe(path, params = {}) {
  const { apiToken, shopDomain } = getConfig();
  const url = new URL(`${JUDGEME_API_BASE}${path}`);
  url.searchParams.set("shop_domain", shopDomain);
  url.searchParams.set("api_token", apiToken);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  const body = await response.text();
  let data;

  try {
    data = body ? JSON.parse(body) : {};
  } catch {
    throw new Error(`Judge.me returned an invalid response (${response.status}).`);
  }

  if (!response.ok) {
    const message =
      typeof data?.error === "string"
        ? data.error
        : typeof data?.message === "string"
          ? data.message
          : `Judge.me request failed (${response.status}).`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

export { JUDGEME_API_BASE };
