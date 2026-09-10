import { fetchJudgeMe } from "../_lib/judgeme.js";

function queryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInteger(value, fallback, maximum) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

function safeMediaUrl(value) {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function pictureUrls(pictures) {
  if (!Array.isArray(pictures)) return [];

  return pictures.flatMap((picture) => {
    if (!picture || picture.hidden) return [];
    const urls = picture.urls ?? {};
    const source =
      safeMediaUrl(urls.original) ??
      safeMediaUrl(urls.huge) ??
      safeMediaUrl(urls.compact) ??
      safeMediaUrl(urls.small);
    return source ? [source] : [];
  });
}

function collectVideoExternalIds(value, found = new Set()) {
  if (!value) return found;

  if (Array.isArray(value)) {
    value.forEach((item) => collectVideoExternalIds(item, found));
    return found;
  }

  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "video_external_ids" && Array.isArray(child)) {
        child.forEach((id) => {
          if (typeof id === "string" && /^[a-zA-Z0-9-]+$/.test(id)) found.add(id);
        });
      } else {
        collectVideoExternalIds(child, found);
      }
    }
    return found;
  }

  if (typeof value === "string") {
    for (const match of value.matchAll(/video_external_ids[^[]*\[([^\]]*)\]/g)) {
      for (const idMatch of match[1].matchAll(/[a-zA-Z0-9-]{12,}/g)) found.add(idMatch[0]);
    }
  }

  return found;
}

function numericValue(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method && req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const externalId = queryValue(req.query?.externalId);
  if (typeof externalId !== "string" || !/^\d+$/.test(externalId)) {
    res.status(400).json({ error: "A valid Shopify product ID is required." });
    return;
  }

  const page = positiveInteger(queryValue(req.query?.page), 1, 10000);
  const perPage = positiveInteger(queryValue(req.query?.perPage), 100, 100);

  try {
    const productResult = await fetchJudgeMe("/products/-1", {
      external_id: externalId,
    });
    const product = productResult?.product;

    if (!product?.id) {
      res.status(200).json({
        averageRating: 0,
        reviewCount: 0,
        reviews: [],
        media: [],
        page,
        perPage,
      });
      return;
    }

    const [reviewResult, widgetResult] = await Promise.all([
      fetchJudgeMe("/reviews", {
        product_id: product.id,
        published: true,
        page,
        per_page: perPage,
      }),
      fetchJudgeMe("/widgets/product_review", {
        id: product.id,
        external_id: externalId,
        page,
        per_page: perPage,
        json_request: true,
      }).catch(() => ({})),
    ]);

    const reviews = (Array.isArray(reviewResult?.reviews) ? reviewResult.reviews : [])
      .filter((review) => review && review.hidden !== true && review.published !== false)
      .map((review) => ({
        id: String(review.id),
        rating: numericValue(review.rating) ?? 0,
        title: typeof review.title === "string" ? review.title : "",
        body: typeof review.body === "string" ? review.body : "",
        createdAt: typeof review.created_at === "string" ? review.created_at : "",
        reviewerName:
          typeof review.reviewer?.name === "string" && review.reviewer.name.trim()
            ? review.reviewer.name.trim()
            : "Anonymous",
        verified: review.verified === "buyer" || review.verified === true,
        pictures: pictureUrls(review.pictures),
        hasVideo: review.has_published_videos === true,
      }));

    const calculatedAverage =
      reviews.length > 0
        ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
        : 0;
    const averageRating =
      numericValue(
        product.review_average,
        product.average_rating,
        product.rating,
        widgetResult?.rating,
      ) ?? calculatedAverage;
    const reviewCount =
      numericValue(
        product.review_count,
        product.reviews_count,
        widgetResult?.review_count,
        reviewResult?.count,
      ) ?? reviews.length;

    const photoMedia = reviews.flatMap((review) =>
      review.pictures.map((url) => ({
        type: "image",
        url,
        reviewId: review.id,
        alt: `Customer photo from ${review.reviewerName}`,
      })),
    );
    const videoMedia = Array.from(collectVideoExternalIds(widgetResult)).map((id) => ({
      type: "video",
      url: `https://player.pandavideo.com.br/embed/?v=${encodeURIComponent(id)}`,
      reviewId: null,
      alt: "Customer review video",
    }));

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
    res.status(200).json({
      averageRating,
      reviewCount,
      reviews,
      media: [...photoMedia, ...videoMedia],
      page,
      perPage,
    });
  } catch (error) {
    const status = error?.status === 401 ? 502 : error?.status === 404 ? 200 : 502;
    if (status === 200) {
      res.status(200).json({
        averageRating: 0,
        reviewCount: 0,
        reviews: [],
        media: [],
        page,
        perPage,
      });
      return;
    }

    res.status(status).json({
      error: error instanceof Error ? error.message : "Unable to load product reviews.",
    });
  }
}
