export type InstagramPost = {
  id: string;
  shortcode: string;
  permalink: string;
  imageUrl: string;
  caption: string;
  isVideo: boolean;
};

const INSTAGRAM_APP_ID = "936619743392459";

function getBestImageUrl(node: Record<string, unknown>): string {
  const resources = (node.thumbnail_resources as Array<{ src?: string; config_width?: number }>) ?? [];
  if (resources.length > 0) {
    const largest = [...resources].sort((a, b) => (b.config_width ?? 0) - (a.config_width ?? 0))[0];
    if (largest?.src) return largest.src;
  }

  return String(node.display_url ?? node.thumbnail_src ?? "");
}

function parseProfileResponse(data: unknown): InstagramPost[] {
  const user = (data as { data?: { user?: Record<string, unknown> } })?.data?.user;
  if (!user) return [];

  const edges = (user.edge_owner_to_timeline_media as { edges?: Array<{ node: Record<string, unknown> }> })?.edges ?? [];

  return edges
    .map(({ node }) => {
      const shortcode = String(node.shortcode ?? "");
      const imageUrl = getBestImageUrl(node);
      const caption =
        ((node.edge_media_to_caption as { edges?: Array<{ node: { text?: string } }> })?.edges?.[0]?.node?.text as string) ?? "";

      return {
        id: String(node.id ?? shortcode),
        shortcode,
        permalink: `https://www.instagram.com/p/${shortcode}/`,
        imageUrl,
        caption,
        isVideo: Boolean(node.is_video),
      };
    })
    .filter((post) => post.shortcode && post.imageUrl);
}

async function fetchFromInstagramApi(username: string): Promise<InstagramPost[]> {
  const response = await fetch(`/api/instagram/profile?username=${encodeURIComponent(username)}`);
  if (!response.ok) {
    throw new Error(`Instagram profile request failed (${response.status})`);
  }

  const json = await response.json();
  return parseProfileResponse(json);
}

async function fetchFromStaticFeed(): Promise<InstagramPost[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}instagram-feed.json`);
  if (!response.ok) {
    throw new Error("Instagram feed file is unavailable.");
  }

  const json = await response.json();
  if (Array.isArray(json.posts)) {
    return (json.posts as InstagramPost[]).filter((post) => post.shortcode && post.imageUrl);
  }

  return parseProfileResponse(json);
}

export async function fetchInstagramPosts(username: string): Promise<InstagramPost[]> {
  try {
    const livePosts = await fetchFromInstagramApi(username);
    if (livePosts.length > 0) return livePosts;
  } catch {
    // Fall through to the static feed generated at build time.
  }

  const staticPosts = await fetchFromStaticFeed();
  if (staticPosts.length > 0) return staticPosts;

  throw new Error("No Instagram posts are available right now.");
}

export function getInstagramProfileUrl(username: string): string {
  return `https://www.instagram.com/${username.replace(/^@/, "")}/`;
}

export function getInstagramImageUrl(imageUrl: string): string {
  if (!imageUrl) return "";
  return `/api/instagram/image?url=${encodeURIComponent(imageUrl)}`;
}

export { INSTAGRAM_APP_ID, parseProfileResponse };
