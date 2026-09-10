import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Star, X } from "lucide-react";
import { customerAccountLinkProps } from "@/lib/customerAccounts";
import {
  fetchProductReviews,
  type JudgeMeReview,
  type ProductReviewsResponse,
} from "@/lib/judgeme";

type SortOrder = "recent" | "oldest" | "highest" | "lowest";

type PreviewItem = {
  type: "image" | "video";
  url: string;
  alt: string;
  review: JudgeMeReview | null;
};

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "recent", label: "Most recent" },
  { value: "highest", label: "Highest rated" },
  { value: "lowest", label: "Lowest rated" },
  { value: "oldest", label: "Oldest" },
];

function Stars({ rating, label }: { rating: number; label?: string }) {
  const rounded = Math.round(rating);

  return (
    <span
      className="inline-flex items-center gap-0.5 text-accent"
      aria-label={label ?? `${rating.toFixed(1)} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={15}
          strokeWidth={1.5}
          fill={index < rounded ? "currentColor" : "none"}
          className={index < rounded ? "" : "text-foreground/25"}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function formatReviewDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function sortedReviews(reviews: JudgeMeReview[], order: SortOrder) {
  return [...reviews].sort((a, b) => {
    if (order === "highest") {
      return b.rating - a.rating || Date.parse(b.createdAt) - Date.parse(a.createdAt);
    }
    if (order === "lowest") {
      return a.rating - b.rating || Date.parse(b.createdAt) - Date.parse(a.createdAt);
    }
    if (order === "oldest") return Date.parse(a.createdAt) - Date.parse(b.createdAt);
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
}

function buildPreviewItems(
  reviews: JudgeMeReview[],
  media: ProductReviewsResponse["media"],
): PreviewItem[] {
  const byId = new Map(reviews.map((review) => [review.id, review]));
  const items: PreviewItem[] = [];
  const seen = new Set<string>();

  for (const review of reviews) {
    for (const picture of review.pictures) {
      if (seen.has(picture)) continue;
      seen.add(picture);
      items.push({
        type: "image",
        url: picture,
        alt: `Customer photo from ${review.reviewerName}`,
        review,
      });
    }
  }

  for (const item of media) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    items.push({
      type: item.type,
      url: item.url,
      alt: item.alt,
      review: item.reviewId ? byId.get(item.reviewId) ?? null : null,
    });
  }

  return items;
}

function SortMenu({
  value,
  onChange,
}: {
  value: SortOrder;
  onChange: (value: SortOrder) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = SORT_OPTIONS.find((option) => option.value === value) ?? SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Sort reviews"
        className="inline-flex items-center gap-2 border border-border bg-background px-3 py-2 text-xs normal-case tracking-normal text-foreground transition-colors hover:border-accent focus:outline-none focus:border-accent"
      >
        {current.label}
        <ChevronDown size={12} strokeWidth={1.5} className={open ? "rotate-180" : ""} aria-hidden="true" />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Sort options"
          className="absolute right-0 z-20 mt-2 min-w-full border border-border bg-background py-1 shadow-lg"
        >
          {SORT_OPTIONS.map((option) => (
            <li key={option.value} role="option" aria-selected={option.value === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`block w-full px-3 py-2 text-left text-xs normal-case tracking-normal transition-colors ${
                  option.value === value
                    ? "bg-foreground text-background"
                    : "text-foreground hover:bg-foreground/10"
                }`}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReviewMediaPreview({
  items,
  index,
  onClose,
  onChangeIndex,
}: {
  items: PreviewItem[];
  index: number;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
}) {
  const item = items[index] ?? null;
  const review = item?.review ?? null;
  const hasMultiple = items.length > 1;

  useEffect(() => {
    if (!item) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && hasMultiple) {
        onChangeIndex((index - 1 + items.length) % items.length);
      }
      if (event.key === "ArrowRight" && hasMultiple) {
        onChangeIndex((index + 1) % items.length);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [hasMultiple, index, item, items.length, onChangeIndex, onClose]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 md:p-10"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Review media preview"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 md:top-6 md:right-6 z-10 flex h-10 w-10 items-center justify-center text-white/80 hover:text-white transition-colors"
        aria-label="Close preview"
      >
        <X size={22} strokeWidth={1.5} />
      </button>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onChangeIndex((index - 1 + items.length) % items.length);
            }}
            aria-label="Previous review media"
            className="absolute left-3 md:left-6 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-white/20 bg-black/50 text-white hover:bg-white hover:text-black transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onChangeIndex((index + 1) % items.length);
            }}
            aria-label="Next review media"
            className="absolute right-3 md:right-6 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-white/20 bg-black/50 text-white hover:bg-white hover:text-black transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}

      <div
        className="relative flex max-h-full w-full max-w-4xl flex-col items-center gap-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex max-h-[70vh] w-full items-center justify-center">
          {item.type === "video" ? (
            <iframe
              key={item.url}
              src={item.url}
              title={item.alt}
              allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="aspect-[9/16] h-auto max-h-[70vh] w-full max-w-sm border-0 bg-black"
            />
          ) : (
            <img
              src={item.url}
              alt={item.alt}
              className="max-h-[70vh] max-w-full w-auto object-contain"
            />
          )}
        </div>

        {review && (
          <div className="w-full max-w-xl border border-white/15 bg-black/70 px-5 py-4 text-left backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-3">
              <Stars rating={review.rating} label={`${review.rating} out of 5 stars`} />
              <p className="text-sm font-medium text-white">{review.reviewerName}</p>
              {review.verified && (
                <span className="text-[9px] tracking-[0.18em] uppercase text-accent">Verified buyer</span>
              )}
            </div>
            {review.title && <p className="mt-3 text-sm font-medium text-white">{review.title}</p>}
            {review.body && (
              <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-white/70">
                {review.body}
              </p>
            )}
          </div>
        )}

        {hasMultiple && (
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/50">
            {index + 1} / {items.length}
          </p>
        )}
      </div>
    </div>
  );
}

export function ProductReviews({
  shopifyProductId,
  displayFont,
}: {
  shopifyProductId: string;
  displayFont: string;
}) {
  const [result, setResult] = useState<ProductReviewsResponse | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("recent");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setPreviewIndex(null);
    setStatus("loading");

    fetchProductReviews(shopifyProductId, controller.signal)
      .then((data) => {
        setResult(data);
        setStatus("success");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      });

    return () => controller.abort();
  }, [shopifyProductId]);

  const reviews = sortedReviews(result?.reviews ?? [], sortOrder);
  const reviewCount = result?.reviewCount ?? reviews.length;
  const averageRating = result?.averageRating ?? 0;
  const previewItems = useMemo(
    () => buildPreviewItems(reviews, result?.media ?? []),
    [reviews, result?.media],
  );

  function openPreview(url: string) {
    const index = previewItems.findIndex((item) => item.url === url);
    if (index >= 0) setPreviewIndex(index);
  }

  return (
    <section className="mt-20 md:mt-28 border-t border-border pt-12" aria-labelledby="product-reviews-heading">
      <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-3 text-[10px] tracking-[0.3em] uppercase text-accent">Customer Reviews</p>
          <h2
            id="product-reviews-heading"
            style={{ fontFamily: displayFont }}
            className="text-2xl md:text-3xl font-light text-foreground"
          >
           Product Reviews
          </h2>
          {status === "success" && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xl font-light text-foreground">{averageRating.toFixed(1)}</span>
              <Stars rating={averageRating} />
              <span className="text-xs text-muted-foreground">
                {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
              </span>
            </div>
          )}
        </div>

        <a
          {...customerAccountLinkProps}
          className="inline-flex w-fit items-center justify-center border border-foreground/25 px-6 py-3 text-[10px] tracking-[0.2em] uppercase text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Write a review
        </a>
      </div>

      {status === "loading" && (
        <p className="mt-10 text-sm text-muted-foreground" role="status">
          Loading reviews…
        </p>
      )}

      {status === "error" && (
        <p className="mt-10 text-sm text-muted-foreground" role="status">
          Reviews are temporarily unavailable.
        </p>
      )}

      {status === "success" && reviews.length === 0 && (
        <p className="mt-10 text-sm text-muted-foreground">No reviews yet.</p>
      )}

      {status === "success" && reviews.length > 0 && (
        <>
          {previewItems.length > 0 && (
            <div className="mt-10">
              <p className="mb-4 text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
                Customer photos &amp; videos
              </p>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {previewItems.map((item, index) =>
                  item.type === "video" ? (
                    <button
                      key={`${item.url}-${index}`}
                      type="button"
                      onClick={() => setPreviewIndex(index)}
                      aria-label="Open customer video preview"
                      className="relative h-48 w-36 shrink-0 overflow-hidden bg-card text-left"
                    >
                      <iframe
                        src={item.url}
                        title={item.alt}
                        loading="lazy"
                        tabIndex={-1}
                        aria-hidden="true"
                        className="pointer-events-none h-full w-full border-0"
                      />
                    </button>
                  ) : (
                    <button
                      key={`${item.url}-${index}`}
                      type="button"
                      onClick={() => setPreviewIndex(index)}
                      aria-label="Open customer photo preview"
                      className="h-48 w-36 shrink-0 overflow-hidden bg-card"
                    >
                      <img src={item.url} alt={item.alt} loading="lazy" className="h-full w-full object-cover" />
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          <div className="mt-10 flex items-center justify-between border-b border-border pb-4">
            <p className="text-xs text-muted-foreground">
              Showing {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
            </p>
            <label className="flex items-center gap-3 text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
              Sort
              <SortMenu value={sortOrder} onChange={setSortOrder} />
            </label>
          </div>

          <div>
            {reviews.map((review, index) => (
              <article
                key={review.id}
                className={`py-8 ${index < reviews.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Stars rating={review.rating} label={`${review.rating} out of 5 stars`} />
                    <p className="mt-3 text-sm font-medium text-foreground">
                      {review.reviewerName}
                      {review.verified && (
                        <span className="ml-2 text-[9px] font-normal tracking-[0.18em] uppercase text-accent">
                          Verified buyer
                        </span>
                      )}
                    </p>
                  </div>
                  {review.createdAt && (
                    <time dateTime={review.createdAt} className="text-xs text-muted-foreground">
                      {formatReviewDate(review.createdAt)}
                    </time>
                  )}
                </div>

                {review.title && <h3 className="mt-5 text-base font-medium text-foreground">{review.title}</h3>}
                {review.body && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {review.body}
                  </p>
                )}

                {review.pictures.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    {review.pictures.map((picture, pictureIndex) => (
                      <button
                        key={`${picture}-${pictureIndex}`}
                        type="button"
                        onClick={() => openPreview(picture)}
                        aria-label={`Preview photo from ${review.reviewerName}'s review`}
                        className="h-24 w-24 overflow-hidden bg-card"
                      >
                        <img
                          src={picture}
                          alt={`Customer photo from ${review.reviewerName}`}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {review.hasVideo && !previewItems.some((item) => item.type === "video" && item.review?.id === review.id) && (
                  <p className="mt-4 text-xs text-muted-foreground">This review includes a customer video.</p>
                )}
              </article>
            ))}
          </div>
        </>
      )}

      {previewIndex !== null && previewItems[previewIndex] && (
        <ReviewMediaPreview
          items={previewItems}
          index={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onChangeIndex={setPreviewIndex}
        />
      )}
    </section>
  );
}
