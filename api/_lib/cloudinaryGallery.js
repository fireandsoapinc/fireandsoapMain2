import { v2 as cloudinary } from "cloudinary";

export const GALLERY_FOLDERS = {
  our: "Website_Gallery",
  customers: "Client_Gallery",
};

const ALLOWED_FOLDERS = new Set(Object.values(GALLERY_FOLDERS));
const MEDIA_TYPES = ["image", "video"];

export function resolveGalleryFolder(input) {
  if (!input) return GALLERY_FOLDERS.customers;
  if (input === "our" || input === "customers") return GALLERY_FOLDERS[input];
  if (ALLOWED_FOLDERS.has(input)) return input;
  return null;
}

function configureCloudinary() {
  const cloudName =
    process.env.VITE_CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUDINARY_URL?.match(/@([^/]+)/)?.[1];
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Missing Cloudinary credentials. Set VITE_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return cloudinary;
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function normalizeInstagramUser(value) {
  if (!value) return null;
  const handle = String(value).trim().replace(/^@+/, "").replace(/\s+/g, "");
  if (!handle || !/^[A-Za-z0-9._]+$/.test(handle)) return null;
  return handle;
}

function resolveInstagramUser(resource) {
  const metadata = resource.metadata || {};
  const custom = resource.context?.custom || {};
  return normalizeInstagramUser(
    firstString(
      metadata.user,
      metadata.User,
      metadata.instagram_user,
      metadata.instagramUser,
      custom.user,
      custom.User,
      custom.instagram_user,
      custom.instagramUser,
    ),
  );
}

function mapResource(resource) {
  const mediaType = resource.resource_type === "video" ? "video" : "image";
  const width = resource.width || 800;
  const height = resource.height || width;
  const alt =
    resource.context?.custom?.alt || resource.display_name || resource.public_id.split("/").pop();
  const instagramUser = resolveInstagramUser(resource);

  if (mediaType === "video") {
    // Lean progressive MP4 for faster time-to-first-frame in the lightbox.
    const videoUrl = cloudinary.url(resource.public_id, {
      resource_type: "video",
      format: "mp4",
      transformation: [
        {
          width: 1280,
          crop: "limit",
          quality: "auto:eco",
          video_codec: "h264",
        },
      ],
      secure: true,
    });
    const posterUrl = cloudinary.url(resource.public_id, {
      resource_type: "video",
      format: "jpg",
      transformation: [
        { width: 900, crop: "limit", quality: "auto", start_offset: "0" },
      ],
      secure: true,
    });

    return {
      id: resource.asset_id || resource.public_id,
      publicId: resource.public_id,
      mediaType,
      imageUrl: posterUrl,
      videoUrl,
      posterUrl,
      width,
      height,
      alt,
      createdAt: resource.created_at || null,
      instagramUser,
    };
  }

  const imageUrl = cloudinary.url(resource.public_id, {
    resource_type: "image",
    transformation: [
      { width: 900, crop: "limit", quality: "auto", fetch_format: "auto" },
    ],
    secure: true,
  });
  const fullUrl = cloudinary.url(resource.public_id, {
    resource_type: "image",
    transformation: [
      { width: 2000, crop: "limit", quality: "auto", fetch_format: "auto" },
    ],
    secure: true,
  });

  return {
    id: resource.asset_id || resource.public_id,
    publicId: resource.public_id,
    mediaType,
    imageUrl,
    fullUrl,
    videoUrl: null,
    posterUrl: null,
    width,
    height,
    alt,
    createdAt: resource.created_at || null,
    instagramUser,
  };
}

async function listFromAssetFolder(name) {
  const batches = await Promise.all(
    MEDIA_TYPES.map(async (resourceType) => {
      try {
        const result = await cloudinary.api.resources_by_asset_folder(name, {
          max_results: 100,
          resource_type: resourceType,
          context: true,
          metadata: true,
        });
        return result.resources || [];
      } catch {
        return [];
      }
    }),
  );
  return batches.flat();
}

async function listFromPrefix(name) {
  const batches = await Promise.all(
    MEDIA_TYPES.map(async (resourceType) => {
      try {
        const result = await cloudinary.api.resources({
          type: "upload",
          resource_type: resourceType,
          prefix: `${name}/`,
          max_results: 100,
          context: true,
          metadata: true,
        });
        return result.resources || [];
      } catch {
        return [];
      }
    }),
  );
  return batches.flat();
}

async function listFromSearch(name) {
  try {
    const result = await cloudinary.search
      .expression(
        `(asset_folder:"${name}" OR folder:"${name}" OR folder:"${name}/*" OR tags:"${name}") AND resource_type:(image OR video)`,
      )
      .with_field("context")
      .with_field("metadata")
      .sort_by("created_at", "desc")
      .max_results(100)
      .execute();
    return result.resources || [];
  } catch {
    return [];
  }
}

function dedupeResources(resources) {
  const seen = new Set();
  return resources.filter((resource) => {
    const key = resource.asset_id || `${resource.resource_type}:${resource.public_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function fetchGalleryImagesByFolder(folderName) {
  const folder = resolveGalleryFolder(folderName);
  if (!folder) {
    throw new Error(`Unknown gallery folder: ${folderName}`);
  }

  configureCloudinary();

  let resources = await listFromAssetFolder(folder);
  if (resources.length === 0) resources = await listFromPrefix(folder);
  if (resources.length === 0) resources = await listFromSearch(folder);

  return dedupeResources(resources)
    .map(mapResource)
    .sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

/** @deprecated Prefer fetchGalleryImagesByFolder */
export async function fetchWebsiteGalleryImages() {
  return fetchGalleryImagesByFolder(GALLERY_FOLDERS.our);
}
