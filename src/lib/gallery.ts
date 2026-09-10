export type GalleryTab = "our" | "customers";

export type GalleryMediaType = "image" | "video";

export type GalleryImage = {
  id: string;
  publicId: string;
  mediaType: GalleryMediaType;
  imageUrl: string;
  fullUrl?: string | null;
  videoUrl: string | null;
  posterUrl: string | null;
  width: number;
  height: number;
  alt: string;
  createdAt: string | null;
  /** Instagram handle from Cloudinary User metadata, without @. */
  instagramUser: string | null;
};

const FOLDER_BY_TAB: Record<GalleryTab, string> = {
  our: "Website_Gallery",
  customers: "Client_Gallery",
};

const warmedVideos = new Set<string>();
const videoWarmElements = new Map<string, HTMLVideoElement>();

/** Start downloading a gallery video early (e.g. on hover) so preview playback can begin sooner. */
export function warmGalleryVideo(url: string | null | undefined) {
  if (!url || typeof document === "undefined" || warmedVideos.has(url)) return;
  warmedVideos.add(url);

  const link = document.createElement("link");
  link.rel = "prefetch";
  link.as = "video";
  link.href = url;
  document.head.appendChild(link);

  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  video.load();
  videoWarmElements.set(url, video);

  // Warm the first chunk via Range so playback can start without waiting for the full file.
  void fetch(url, {
    mode: "cors",
    credentials: "omit",
    headers: { Range: "bytes=0-1048575" },
  }).catch(() => {});
}

export async function fetchGalleryImages(tab: GalleryTab = "customers"): Promise<GalleryImage[]> {
  const folder = FOLDER_BY_TAB[tab];
  const response = await fetch(`/api/gallery?folder=${encodeURIComponent(folder)}`);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body && typeof body.error === "string" ? body.error : `Gallery request failed (${response.status})`;
    throw new Error(message);
  }

  const json = await response.json();
  const images = Array.isArray(json.images) ? (json.images as GalleryImage[]) : [];
  return images.filter((item) => {
    if (!item.id) return false;
    if (item.mediaType === "video") return Boolean(item.videoUrl);
    return Boolean(item.imageUrl);
  });
}
