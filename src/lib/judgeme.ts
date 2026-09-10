export type JudgeMeReview = {
  id: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  reviewerName: string;
  verified: boolean;
  pictures: string[];
  hasVideo: boolean;
};

export type JudgeMeMedia = {
  type: "image" | "video";
  url: string;
  reviewId: string | null;
  alt: string;
};

export type ProductReviewsResponse = {
  averageRating: number;
  reviewCount: number;
  reviews: JudgeMeReview[];
  media: JudgeMeMedia[];
  page: number;
  perPage: number;
};

export async function fetchProductReviews(
  shopifyProductId: string,
  signal?: AbortSignal,
): Promise<ProductReviewsResponse> {
  const params = new URLSearchParams({
    externalId: shopifyProductId,
    page: "1",
    perPage: "100",
  });
  const response = await fetch(`/api/judgeme/reviews?${params}`, { signal });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Unable to load product reviews.");
  }

  return data as ProductReviewsResponse;
}
