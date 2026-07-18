import { fetchGalleryImagesByFolder, resolveGalleryFolder } from "./_lib/cloudinaryGallery.js";

function getFolderParam(req) {
  const raw = req.query?.folder ?? req.query?.source;
  if (Array.isArray(raw)) return raw[0];
  return typeof raw === "string" ? raw : undefined;
}

export default async function handler(req, res) {
  if (req.method && req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const folderParam = getFolderParam(req);
  const folder = resolveGalleryFolder(folderParam);
  if (!folder) {
    res.status(400).json({ error: "Invalid gallery folder." });
    return;
  }

  try {
    const images = await fetchGalleryImagesByFolder(folder);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({ images, folder });
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : "Failed to load Cloudinary gallery.",
    });
  }
}
