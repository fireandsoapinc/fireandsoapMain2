import { useState, useEffect, useRef, lazy, Suspense, type FormEvent, type ReactNode, type RefObject } from "react";
import { ShoppingBag, Search, Menu, X, ArrowRight, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { fetchShopifyProducts, subscribeEmailToMarketing, createShopifyCheckoutUrl, ShopifyProduct, SHOP_CATEGORIES, shopCategoryFromSlug, shopCategoryToSlug, type ShopCategoryLabel } from "@/lib/shopify";
import { getInstagramProfileUrl } from "@/lib/instagram";
import { fetchGalleryImages, warmGalleryVideo, type GalleryImage, type GalleryTab } from "@/lib/gallery";
import { ContactPage } from "@/app/ContactPage";

const MiniApp = lazy(() => import("@/miniapp/MiniApp"));

type Product = ShopifyProduct;
type CartItem = {
  product: Product;
  quantity: number;
};

const rituals = [
  {
    number: "01",
    title: "Set Your Intention",
    body: "Before lighting, hold the candle in both hands. Close your eyes and breathe slowly. State your intention — what you are releasing, inviting, or healing.",
  },
  {
    number: "02",
    title: "Light with Presence",
    body: "Strike a single match. As the flame catches, exhale slowly. The act of lighting is itself a ritual — do not rush it.",
  },
  {
    number: "03",
    title: "Sit with the Flame",
    body: "Allow at least 20 minutes for the wax to pool evenly to the edges. This is your time. Let the scent carry you.",
  },
];

const categories = SHOP_CATEGORIES.map((category) => category.label);

const soapIngredients = [
  { name: "Aqua (Water)", description: "The essential base used to blend our ingredients smoothly." },
  {
    name: "Glycerin",
    description: "A natural humectant that draws moisture from the air into your skin.",
  },
  {
    name: "Sodium Cocoate",
    description: "Saponified coconut oil that gives our soap its powerful cleansing ability.",
  },
  {
    name: "Sodium Stearate & Sodium Laurate",
    description:
      "Natural fatty acids derived from vegetable oils that help harden the soap bar so it lasts longer in your shower.",
  },
  {
    name: "Butyrospermum Parkii (Shea) Butter",
    description: "An ultra-nourishing plant lipid.",
  },
  {
    name: "Sorbitol & Propylene Glycol",
    description: "Skin-conditioning agents that keep the soap smooth and clear.",
  },
  {
    name: "Sodium Laureth Sulfate",
    description: "A mild surfactant that helps create that rich, satisfying, bubbly lather you love.",
  },
  {
    name: "Fragrance (Parfum)",
    description: "Our proprietary blend of scents to make your shower experience unforgettable.",
  },
  {
    name: "Boswellia Carterii (Frankincense) Oil",
    description: "A luxurious, earthy essential oil.",
  },
  {
    name: "Mica (CI 77019)",
    description: "A mineral powder used to give our soap its beautiful, eye-catching shimmer.",
  },
];
const displayFont = "'Cormorant Garamond', serif";
const pageGutterClass = "px-5 md:px-14"; // tighter on mobile, 3.5rem on desktop
const carouselScrollInsetClass =
  "pl-5 pr-5 scroll-pl-5 scroll-pr-5 md:pl-[calc(3.5rem+2.75rem)] md:pr-[calc(3.5rem+2.75rem)] md:scroll-pl-[calc(3.5rem+2.75rem)] md:scroll-pr-[calc(3.5rem+2.75rem)]";
const homepageCarouselVisibleSlots = 4;
const homepageCarouselGapPx = 16; // matches gap-4
const homepageCarouselMobileSlotClass = "w-[min(82vw,19rem)] sm:w-[min(72vw,21rem)]";
const CART_STORAGE_KEY = "fire-and-soap-cart";
const CHECKOUT_PENDING_KEY = "fire-and-soap-checkout-pending";

function getThankYouUrl() {
  return `${window.location.origin}/#thank-you`;
}

function isMyAuraPath(pathname = window.location.pathname) {
  return pathname.replace(/\/+$/, "").toLowerCase() === "/myaura";
}

/** Canonical ritual URL for social / shared links. */
function goToMyAura(replace = false) {
  const url = "/myaura";
  if (replace) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
}

/**
 * Navigate to a hash route on the site root.
 * If we're currently on /myaura, leave that path so the URL stays clean.
 */
function goToRootHash(hash: string, replace = false) {
  const normalized = hash.startsWith("#") ? hash : `#${hash}`;
  const url = `/${normalized}`;
  if (isMyAuraPath() || replace) {
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
    return;
  }
  window.location.hash = normalized;
}

function isShopifyCheckoutSuccess() {
  const hash = window.location.hash.replace("#", "").split("?")[0].toLowerCase();
  if (hash === "thank-you" || hash === "thankyou") return true;

  const params = new URLSearchParams(window.location.search);
  if (params.has("oseid")) return true;
  if (params.has("order_id") || params.has("orderId")) return true;

  const checkout = params.get("checkout")?.toLowerCase();
  if (checkout === "complete" || checkout === "thank_you" || checkout === "thank-you" || checkout === "success") {
    return true;
  }

  if (params.get("thank_you") === "1" || params.get("thank-you") === "1") return true;

  return false;
}

function clearStoredCart() {
  window.localStorage.removeItem(CART_STORAGE_KEY);
  window.sessionStorage.removeItem(CHECKOUT_PENDING_KEY);
}

function ScrollReveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(node);
          }
        });
      },
      { threshold: 0.15 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`scroll-reveal ${visible ? "is-visible" : ""} ${className}`.trim()}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function GalleryMediaTile({
  item,
  onOpen,
}: {
  item: GalleryImage;
  onOpen: (item: GalleryImage) => void;
}) {
  const [hovering, setHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = item.mediaType === "video" && Boolean(item.videoUrl);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo) return;

    if (hovering) {
      warmGalleryVideo(item.videoUrl);
      video.currentTime = 0;
      void video.play().catch(() => {});
      return;
    }

    video.pause();
    video.currentTime = 0;
  }, [hovering, isVideo, item.videoUrl]);

  return (
    <button
      type="button"
      onClick={() => {
        if (isVideo) warmGalleryVideo(item.videoUrl);
        onOpen(item);
      }}
      onMouseEnter={() => {
        if (isVideo) setHovering(true);
      }}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => {
        if (isVideo) warmGalleryVideo(item.videoUrl);
      }}
      className="group relative isolate block w-full overflow-hidden border border-border bg-card text-left cursor-pointer"
      aria-label={
        isVideo
          ? `Preview video: ${item.alt || "gallery video"}`
          : `View image: ${item.alt || "gallery image"}`
      }
    >
      <img
        src={item.imageUrl}
        alt={item.alt || "Fire and Soap gallery image"}
        className="block w-full h-auto"
        loading="lazy"
        draggable={false}
      />
      {isVideo && (
        <video
          ref={videoRef}
          src={item.videoUrl || undefined}
          poster={item.posterUrl || item.imageUrl}
          className={`pointer-events-none absolute inset-0 h-full w-full object-contain transition-opacity duration-200 ${
            hovering ? "opacity-100" : "opacity-0"
          }`}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
          tabIndex={-1}
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-background/0 transition-colors duration-300 group-hover:bg-background/15" />
      {isVideo && (
        <span
          className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
            hovering ? "opacity-0" : "opacity-100"
          }`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-black/45 text-white backdrop-blur-sm">
            <Play size={20} strokeWidth={1.5} fill="currentColor" className="ml-0.5" />
          </span>
        </span>
      )}
    </button>
  );
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ShopCategoryLabel>("All");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterState, setNewsletterState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [newsletterMessage, setNewsletterMessage] = useState<string | null>(null);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<
    | "home"
    | "shop"
    | "cart"
    | "about"
    | "gallery"
    | "returns"
    | "ingredients"
    | "shipping"
    | "privacy"
    | "contact"
    | "thank-you"
    | "ritual"
    | "product"
  >(() => {
    if (typeof window === "undefined") return "home";
    if (isMyAuraPath()) return "ritual";
    const hash = window.location.hash.replace("#", "").split("?")[0].toLowerCase();
    if (hash === "ritual") return "ritual";
    return "home";
  });
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [galleryTab, setGalleryTab] = useState<GalleryTab>("our");
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<GalleryImage | null>(null);
  const [checkoutState, setCheckoutState] = useState<"idle" | "loading" | "error">("idle");
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const homepageScrollRef = useRef<HTMLDivElement>(null);
  const homepageCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [featuredProductIndex, setFeaturedProductIndex] = useState(0);
  const [homepageSlotWidth, setHomepageSlotWidth] = useState<number | null>(null);
  const relatedScrollRef = useRef<HTMLDivElement>(null);
  const [productQuantity, setProductQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const instagramUsername = import.meta.env.VITE_INSTAGRAM_USERNAME || "fireandsoap";
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    setHeroLoaded(true);

    const storedCart = window.localStorage.getItem(CART_STORAGE_KEY);
    if (isShopifyCheckoutSuccess()) {
      clearStoredCart();
      setCartItems([]);
    } else if (storedCart) {
      try {
        setCartItems(JSON.parse(storedCart));
      } catch {
        clearStoredCart();
      }
    }

    fetchShopifyProducts(12)
      .then((items) => {
        setProducts(items);
        setCartItems((current) =>
          current.map((item) => {
            const latest = items.find((product) => product.id === item.product.id);
            return latest ? { ...item, product: latest } : item;
          }),
        );
      })
      .catch((error) => setProductError(error instanceof Error ? error.message : String(error)))
      .finally(() => setLoadingProducts(false));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  const goToPage = (
    page:
      | "home"
      | "shop"
      | "cart"
      | "about"
      | "gallery"
      | "returns"
      | "ingredients"
      | "shipping"
      | "privacy"
      | "contact"
      | "thank-you"
      | "ritual"
      | "product",
    productId: string | null = null,
  ) => {
    if (page === "product" && productId) {
      // Leave /myaura so browser Back returns to the quiz.
      goToRootHash(`#product-${encodeURIComponent(productId)}`);
      setSelectedProductId(productId);
      setCurrentPage("product");
      return;
    }

    if (page === "ritual") {
      goToMyAura();
      setSelectedProductId(null);
      setCurrentPage("ritual");
      return;
    }

    const pageHash = page === "home" ? "#home" : `#${page}`;
    goToRootHash(pageHash);
    setSelectedProductId(null);
    setCurrentPage(page);
  };

  function goToShopCategory(category: ShopCategoryLabel) {
    setActiveCategory(category);
    setCurrentPage("shop");
    setSelectedProductId(null);
    setMenuOpen(false);

    const slug = shopCategoryToSlug(category);
    goToRootHash(slug ? `#shop-${slug}` : "#shop");
  }

  useEffect(() => {
    const syncFromLocation = () => {
      if (isShopifyCheckoutSuccess()) {
        clearStoredCart();
        setCartItems([]);

        const hash = window.location.hash.replace("#", "").split("?")[0].toLowerCase();
        if (hash !== "thank-you" && hash !== "thankyou") {
          setSelectedProductId(null);
          setCurrentPage("thank-you");
          window.history.replaceState(null, "", "/#thank-you");
          return;
        }
      }

      // Social / branded entry: fireandsoap.com/myaura
      if (isMyAuraPath()) {
        setSelectedProductId(null);
        setCurrentPage("ritual");
        return;
      }

      const hash = window.location.hash.replace("#", "");

      if (hash.startsWith("product-")) {
        const productId = decodeURIComponent(hash.slice("product-".length));
        setSelectedProductId(productId || null);
        setCurrentPage("product");
        return;
      }

      if (hash === "shop") {
        setCurrentPage("shop");
        setActiveCategory("All");
        setSelectedProductId(null);
        return;
      }

      if (hash.startsWith("shop-")) {
        setCurrentPage("shop");
        setActiveCategory(shopCategoryFromSlug(hash.slice("shop-".length)));
        setSelectedProductId(null);
        return;
      }

      // Legacy deep link — canonicalize to /myaura
      if (hash === "ritual") {
        goToMyAura(true);
        setSelectedProductId(null);
        setCurrentPage("ritual");
        return;
      }

      if (
        hash === "home" ||
        hash === "cart" ||
        hash === "about" ||
        hash === "gallery" ||
        hash === "returns" ||
        hash === "ingredients" ||
        hash === "shipping" ||
        hash === "privacy" ||
        hash === "contact" ||
        hash === "thank-you"
      ) {
        setCurrentPage(
          hash as
            | "home"
            | "cart"
            | "about"
            | "gallery"
            | "returns"
            | "ingredients"
            | "shipping"
            | "privacy"
            | "contact"
            | "thank-you",
        );
        if (hash === "thank-you") {
          clearStoredCart();
          setCartItems([]);
        }
        setSelectedProductId(null);
      } else {
        setCurrentPage("home");
        setSelectedProductId(null);
      }
    };

    syncFromLocation();
    window.addEventListener("hashchange", syncFromLocation);
    window.addEventListener("popstate", syncFromLocation);
    return () => {
      window.removeEventListener("hashchange", syncFromLocation);
      window.removeEventListener("popstate", syncFromLocation);
    };
  }, []);

  useEffect(() => {
    if (currentPage !== "gallery") return;

    let cancelled = false;
    setLoadingGallery(true);
    setGalleryError(null);
    setGalleryImages([]);
    setSelectedGalleryItem(null);

    fetchGalleryImages(galleryTab)
      .then((images) => {
        if (!cancelled) setGalleryImages(images);
      })
      .catch((error) => {
        if (!cancelled) {
          setGalleryError(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingGallery(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentPage, galleryTab]);

  useEffect(() => {
    if (!selectedGalleryItem) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedGalleryItem(null);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedGalleryItem]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  const filtered = products.filter((p) => {
    if (activeCategory === "All") return true;
    return p.collections.includes(activeCategory);
  });

  const homepageProducts = (() => {
    const featured = products.filter((p) => p.tag === "NEW" || p.tag === "BESTSELLER");
    return featured.length > 0 ? featured.slice(0, 8) : products.slice(0, 8);
  })();

  useEffect(() => {
    homepageCardRefs.current = homepageCardRefs.current.slice(0, homepageProducts.length);
    setFeaturedProductIndex(0);
  }, [homepageProducts.length]);

  useEffect(() => {
    if (currentPage !== "home") return;

    const container = homepageScrollRef.current;
    if (!container) return;

    const updateSlotWidth = () => {
      if (container.clientWidth < 768) {
        setHomepageSlotWidth(null);
        return;
      }

      const width =
        (container.clientWidth - homepageCarouselGapPx * (homepageCarouselVisibleSlots - 1)) /
        homepageCarouselVisibleSlots;
      setHomepageSlotWidth(width);
    };

    updateSlotWidth();
    const resizeObserver = new ResizeObserver(updateSlotWidth);
    resizeObserver.observe(container);
    window.addEventListener("resize", updateSlotWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSlotWidth);
    };
  }, [currentPage, homepageProducts.length]);

  useEffect(() => {
    if (currentPage !== "home") return;

    const container = homepageScrollRef.current;
    if (!container) return;

    const updateFeaturedIndex = () => {
      const paddingLeft = parseFloat(getComputedStyle(container).paddingLeft) || 0;
      const useCenterSnap = container.clientWidth < 768;
      const anchor = useCenterSnap
        ? container.scrollLeft + container.clientWidth / 2
        : container.scrollLeft + paddingLeft;
      let nextIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      homepageCardRefs.current.forEach((node, index) => {
        if (!node) return;
        const cardAnchor = useCenterSnap ? node.offsetLeft + node.offsetWidth / 2 : node.offsetLeft;
        const distance = Math.abs(cardAnchor - anchor);
        if (distance < closestDistance) {
          closestDistance = distance;
          nextIndex = index;
        }
      });

      setFeaturedProductIndex((current) => (current === nextIndex ? current : nextIndex));
    };

    let scrollTimeout: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateFeaturedIndex, 120);
    };

    updateFeaturedIndex();
    container.addEventListener("scrollend", updateFeaturedIndex);
    container.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateFeaturedIndex);

    return () => {
      clearTimeout(scrollTimeout);
      container.removeEventListener("scrollend", updateFeaturedIndex);
      container.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateFeaturedIndex);
    };
  }, [currentPage, homepageProducts.length]);

  const selectedProduct = selectedProductId ? products.find((product) => product.id === selectedProductId) : null;
  const relatedProducts = selectedProduct
    ? products.filter((product) => product.id !== selectedProduct.id).slice(0, 4)
    : [];

  useEffect(() => {
    setProductQuantity(1);
    setSelectedImageIndex(0);
  }, [selectedProductId]);

  function addToCart(product: Product, quantity = 1) {
    setCartItems((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item,
        );
      }
      return [...current, { product, quantity }];
    });
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1200);
  }

  function updateCartQuantity(productId: string, delta: number) {
    setCartItems((current) =>
      current
        .map((item) =>
          item.product.id === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function removeFromCart(productId: string) {
    setCartItems((current) => current.filter((item) => item.product.id !== productId));
  }

  async function handleCheckout() {
    if (cartItems.length === 0) return;

    setCheckoutState("loading");
    setCheckoutMessage(null);

    try {
      const lines = cartItems.map(({ product, quantity }) => {
        const latestProduct = products.find((item) => item.id === product.id) ?? product;
        return {
          variantId: latestProduct.variantId,
          quantity,
        };
      });

      const checkoutUrl = await createShopifyCheckoutUrl(lines);
      window.sessionStorage.setItem(CHECKOUT_PENDING_KEY, "1");

      const returnUrl = getThankYouUrl();
      const separator = checkoutUrl.includes("?") ? "&" : "?";
      window.location.assign(`${checkoutUrl}${separator}return_to=${encodeURIComponent(returnUrl)}`);
    } catch (error) {
      setCheckoutState("error");
      setCheckoutMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleNewsletterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = newsletterEmail.trim();
    if (!email || !email.includes("@")) {
      setNewsletterState("error");
      setNewsletterMessage("Please enter a valid email address.");
      return;
    }

    setNewsletterState("loading");
    setNewsletterMessage(null);

    try {
      await subscribeEmailToMarketing(email);
      setNewsletterState("success");
      setNewsletterMessage("Thanks! You’re subscribed.");
      setNewsletterEmail("");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setNewsletterState("error");
      setNewsletterMessage(message);
    }
  }

  function scrollCarousel(ref: RefObject<HTMLDivElement | null>, dir: "left" | "right") {
    if (!ref.current) return;
    ref.current.scrollBy({ left: dir === "left" ? -340 : 340, behavior: "smooth" });
  }

  function getHomepageCardScrollLeft(index: number) {
    const container = homepageScrollRef.current;
    const target = homepageCardRefs.current[index];
    if (!container || !target) return 0;

    const paddingLeft = parseFloat(getComputedStyle(container).paddingLeft) || 0;
    return Math.max(0, target.offsetLeft - paddingLeft);
  }

  function scrollHomepageCarousel(dir: "left" | "right") {
    const container = homepageScrollRef.current;
    if (!container) return;

    const nextIndex =
      dir === "left"
        ? Math.max(0, featuredProductIndex - 1)
        : Math.min(homepageProducts.length - 1, featuredProductIndex + 1);

    if (nextIndex === featuredProductIndex) return;

    setFeaturedProductIndex(nextIndex);
    container.scrollTo({ left: getHomepageCardScrollLeft(nextIndex), behavior: "smooth" });
  }

  function goToProductImage(total: number, dir: "prev" | "next") {
    setSelectedImageIndex((current) => {
      if (dir === "prev") return current === 0 ? total - 1 : current - 1;
      return current === total - 1 ? 0 : current + 1;
    });
  }

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ fontFamily: "'Cinzel', sans-serif", backgroundColor: "#080808" }}
    >
      {/* ── NAV ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background">
        <div className={`${pageGutterClass} relative flex items-center justify-between h-20`}>
          {/* Left nav */}
          <nav className="hidden md:flex items-center gap-6">
            {['Home', 'Shop', 'About'].map((item) => {
              const page = item.toLowerCase() as 'home' | 'shop' | 'about';
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    goToPage(item.toLowerCase() as 'home' | 'shop' | 'about');
                    setMenuOpen(false);
                  }}
                  className={`text-xs tracking-[0.18em] uppercase transition-colors duration-300 py-2 px-2 ${
                    currentPage === page ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </nav>

          {/* Logo */}
          <a
            href="#"
            className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 md:gap-2"
          >
            <img
              src="/photos/logo.PNG"
              alt="Fire and Soap"
              className="w-12 h-12 object-contain"
             />
            <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground -mt-0.5">
              Fire and Soap
            </span>
          </a>

          {/* Right nav — ml-auto keeps icons right when left nav is hidden on mobile */}
          <div className="ml-auto flex items-center gap-4 justify-end">
            <button
              type="button"
              onClick={() => goToPage("gallery")}
              className={`hidden md:block text-xs tracking-[0.18em] uppercase transition-colors duration-300 ${
                currentPage === "gallery" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Gallery
            </button>
      
            <button
              className="relative text-foreground/70 hover:text-foreground transition-colors"
              aria-label="Cart"
              onClick={() => goToPage("cart")}
            >
              <ShoppingBag size={16} strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[9px] flex items-center justify-center font-medium">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              className="md:hidden text-foreground/70 hover:text-foreground transition-colors"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* ── MOBILE MENU ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col px-5 py-8">
          <button
            className="self-end text-muted-foreground hover:text-foreground mb-10"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
          <nav className="flex flex-col gap-5">
            {['Home', 'Shop', 'Gallery', 'About'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    const page = item.toLowerCase() as 'home' | 'shop' | 'gallery' | 'about';
                    goToPage(page);
                    setMenuOpen(false);
                  }}
                  style={{ fontFamily: displayFont }}
                  className="text-2xl font-light tracking-wide text-foreground hover:text-accent transition-colors text-left"
                >
                  {item}
                </button>
              ))}
          </nav>
        </div>
      )}

      {/* ── HERO (banner) ── */}
{currentPage === "home" && (
        <section className="relative h-[60vh] md:h-[88vh] overflow-hidden">
          <img
            src="/photos/newbeachdisplayy.png"
            alt="A group of summer candles and soaps at the beach."
            className={`absolute inset-0 w-full h-full object-cover object-middle ${heroLoaded ? "opacity-100" : "opacity-0"}`}
          />
  
  {/* CHANGED: 'justify-center' to 'justify-end' and added 'pb-8 md:pb-12' */}
  <div
    className={`relative z-10 h-full flex flex-col items-center justify-end pb-8 md:pb-12 px-5 md:px-14 text-center transition-all duration-1000 delay-300 ${
      heroLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
    }`}
  >
    {/* Optional subheading container - kept intact */}
    <p className="text-sm tracking-wide text-muted-foreground mb-6 max-w-lg leading-relaxed">
      {/* optional subheading or leave empty */}
    </p>
    
    {/* FIXED: Changed 'md:flex-column' to 'md:flex-col' */}
    <div className="flex flex-col md:flex-col items-center gap-4">
      <button
        type="button"
        onClick={() => goToShopCategory("Summer Collection")}
        className="inline-flex items-center gap-3 text-xs tracking-[0.2em] uppercase text-foreground bg-black px-8 py-4 hover:bg-accent hover:text-accent-foreground transition-colors duration-300"
      >
        Explore the Summer Collection
        <ArrowRight size={12} />
      </button>
      
    </div>
          </div>
        </section>
      )}

      {/* ── DIVIDER ── */}
      <div className="hairline-divider-y" />




{/* ── SHOP / PAGES ── */}
      {currentPage === "home" ? (
        <section id="shop" className="pt-12 pb-20 md:pt-16 md:pb-28">
          <ScrollReveal className="px-5 md:px-14 text-center mb-14 space-y-5 md:space-y-6" delay={80}>
            <div className="text-center mb-14 space-y-5 md:space-y-6">
              <h2
                style={{ fontFamily: displayFont }}
                className="text-2xl md:text-3xl font-light text-foreground"
              >
                Made for the moment you finally exhale. 
              </h2>

              <p className="text-sm leading-relaxed text-muted-foreground">
                
               
                Infused with reiki energy to elevate <br></br>
                your daily rituals. <br></br>
              </p>

              <button
                type="button"
                onClick={() => goToPage("ritual")}
                className="text-sm tracking-[0.2em] uppercase text-foreground/80 hover:text-foreground transition-colors duration-300 border-b border-foreground/30 pb-px"
              >
                Find Your Aura
              </button>
            </div>

            

          </ScrollReveal>
        
          <ScrollReveal className={`${pageGutterClass} text-left mb-10 md:mb-14 mt-28 md:mt-32`} delay={120}>
            <h2
              style={{ fontFamily: displayFont }}
              className="text-3xl md:text-4xl font-light text-foreground"
            >
              Top Products
            </h2>
          </ScrollReveal>

          {productError && (
            <div className="px-5 md:px-14 mb-8 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive-foreground">
              Unable to load products from Shopify: {productError}
            </div>
          )}

          {loadingProducts && (
            <div className="px-5 md:px-14 mb-8 text-sm text-muted-foreground">
              Loading products from Shopify...
            </div>
          )}

          {!loadingProducts && !productError && homepageProducts.length === 0 && (
            <div className="px-5 md:px-14 mb-8 text-sm text-muted-foreground">
              No featured products were found in the Shopify storefront.
            </div>
          )}

          <div className={`${pageGutterClass} relative`}>
            <button
              type="button"
              onClick={() => scrollHomepageCarousel("left")}
              aria-label="Scroll featured products left"
              className="hidden md:flex absolute left-14 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center bg-card border border-border text-foreground hover:bg-foreground hover:text-background transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => scrollHomepageCarousel("right")}
              aria-label="Scroll featured products right"
              className="hidden md:flex absolute right-14 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center bg-card border border-border text-foreground hover:bg-foreground hover:text-background transition-colors"
            >
              <ChevronRight size={16} />
            </button>

            <div
              ref={homepageScrollRef}
              className={`overflow-x-auto no-scrollbar pb-8 md:pb-10 -mx-5 px-5 md:mx-0 md:px-0 ${carouselScrollInsetClass}`}
            >
              <div className="flex gap-4 items-center justify-start snap-x snap-mandatory">
                {homepageProducts.map((p, index) => (
                  <div
                    key={p.id}
                    ref={(node) => {
                      homepageCardRefs.current[index] = node;
                    }}
                    className={`flex-shrink-0 snap-center md:snap-start ${homepageCarouselMobileSlotClass} flex items-center justify-center`}
                    style={homepageSlotWidth ? { width: homepageSlotWidth } : undefined}
                  >
                    <HomepageFeaturedCard
                      product={p}
                      featured={featuredProductIndex === index}
                      addedId={addedId}
                      onAdd={addToCart}
                      onView={() => goToPage("product", p.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : currentPage === "shop" ? (
        <section className="pt-24 md:pt-28 pb-28 md:pb-36">
          <div className="px-5 md:px-14 text-center mb-10 md:mb-14">
            <div>
              <h1
                style={{ fontFamily: displayFont }}
                className="text-3xl md:text-4xl font-light text-foreground mb-6"
              >
                Products
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground mb-8">
                Every candle and soap is hand-crafted with natural ingredients, infused with Reiki energy, and created with intention.
              </p>
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => goToShopCategory(cat as ShopCategoryLabel)}
                    className={`text-[10px] tracking-[0.2em] uppercase transition-opacity duration-200 ${
                      activeCategory === cat
                        ? "text-foreground opacity-100"
                        : "text-foreground opacity-40 hover:opacity-60"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {productError && (
              <div className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive-foreground">
                Unable to load products from Shopify: {productError}
              </div>
            )}

            {loadingProducts && (
              <div className="mt-8 text-sm text-muted-foreground">Loading products from Shopify...</div>
            )}

            {!loadingProducts && !productError && filtered.length === 0 && (
              <div className="mt-8 text-sm text-muted-foreground">
                No matching products were found in the Shopify storefront.
              </div>
            )}
          </div>

          {!loadingProducts && !productError && filtered.length > 0 && (
            <div className="px-5 md:px-14">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 md:gap-x-4 gap-y-12 md:gap-y-16 justify-items-center">
                {filtered.map((p, index) => (
                  <ScrollReveal key={p.id} delay={index * 50}>
                    <ShopProductCard product={p} onView={() => goToPage("product", p.id)} centered />
                  </ScrollReveal>
                ))}
              </div>
            </div>
          )}
        </section>
      ) : currentPage === "product" ? (
        <section className="pt-24 md:pt-28 pb-28 md:pb-36">
          {selectedProduct ? (
            <div className="px-5 md:px-14">
              <button
                type="button"
                onClick={() => goToPage("shop")}
                className="mb-8 text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to shop
              </button>

              <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-start">
                {/* Image slideshow */}
                <div className="relative aspect-square bg-card overflow-hidden">
                  <img
                    src={selectedProduct.images[selectedImageIndex] ?? selectedProduct.image}
                    alt={`${selectedProduct.name} photo ${selectedImageIndex + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {selectedProduct.images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => goToProductImage(selectedProduct.images.length, "prev")}
                        aria-label="Previous product image"
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-background/80 border border-border text-foreground hover:bg-foreground hover:text-background transition-colors"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => goToProductImage(selectedProduct.images.length, "next")}
                        aria-label="Next product image"
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-background/80 border border-border text-foreground hover:bg-foreground hover:text-background transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2">
                        {selectedProduct.images.map((_, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setSelectedImageIndex(index)}
                            aria-label={`View product image ${index + 1}`}
                            className={`h-1.5 rounded-full transition-all ${
                              selectedImageIndex === index ? "w-6 bg-foreground" : "w-1.5 bg-foreground/40 hover:bg-foreground/60"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Product details */}
                <div className="lg:pt-2">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-accent mb-4">
                    {selectedProduct.category}
                  </p>
                  <h1
                    style={{ fontFamily: displayFont }}
                    className="text-3xl md:text-4xl font-light text-foreground mb-6"
                  >
                    {selectedProduct.name}
                  </h1>

                  <ProductDescription
                    description={selectedProduct.description}
                    descriptionHtml={selectedProduct.descriptionHtml}
                  />

                  {(selectedProduct.netWeight ||
                    (selectedProduct.size && selectedProduct.size !== "Standard")) && (
                    <p className="text-sm text-muted-foreground mb-4">
                      Net weight:{" "}
                      <span className="text-foreground">
                        {selectedProduct.netWeight || selectedProduct.size}
                      </span>
                    </p>
                  )}

                  <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => goToPage("ingredients")}
                      className="text-sm leading-relaxed text-muted-foreground underline underline-offset-4 decoration-foreground/30 transition-colors hover:text-foreground hover:decoration-foreground"
                    >
                      View full ingredients
                    </button>
                  </p>

                  <div className="mb-8 space-y-4 border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground">
                    <div>
                      <p className="mb-1.5 text-[10px] tracking-[0.22em] uppercase text-accent">Directions</p>
                      <p>
                        Wet bar and skin. Work into a lather, apply to the body and rinse thoroughly.
                      </p>
                    </div>
                    <div>
                      <p className="mb-1.5 text-[10px] tracking-[0.22em] uppercase text-accent">
                        Recommended caution
                      </p>
                      <p>
                        Caution: For external use only. Avoid contact with eyes. Discontinue use if irritation occurs.
                        Keep out of reach of children.
                      </p>
                    </div>
                  </div>

                  <p className="text-lg text-foreground mb-8">{selectedProduct.price}</p>

                  <div className="border-t border-border pt-6 mb-8">
                    <div className="flex items-center gap-4 mb-6">
                      <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Quantity</span>
                      <div className="inline-flex items-center border border-border">
                        <button
                          type="button"
                          onClick={() => setProductQuantity((qty) => Math.max(1, qty - 1))}
                          className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="min-w-10 text-center text-sm text-foreground">{productQuantity}</span>
                        <button
                          type="button"
                          onClick={() => setProductQuantity((qty) => qty + 1)}
                          className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => addToCart(selectedProduct, productQuantity)}
                      className="w-full inline-flex items-center justify-center gap-2 bg-black border border-foreground/20 px-6 py-4 text-[10px] tracking-[0.2em] uppercase text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <ShoppingBag size={14} strokeWidth={1.5} />
                      Add to cart
                    </button>
                  </div>
                </div>
              </div>

              {relatedProducts.length > 0 && (
                <div className="mt-20 md:mt-28 pt-12 border-t border-border">
                  <h2
                    style={{ fontFamily: displayFont }}
                    className="text-2xl md:text-3xl font-light text-foreground mb-10"
                  >
                    You may also like
                  </h2>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => scrollCarousel(relatedScrollRef, "left")}
                      aria-label="Scroll related products left"
                      className="absolute -left-2 md:left-0 top-[40%] -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center bg-card border border-border text-foreground hover:bg-foreground hover:text-background transition-colors md:hidden"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollCarousel(relatedScrollRef, "right")}
                      aria-label="Scroll related products right"
                      className="absolute -right-2 md:right-0 top-[40%] -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center bg-card border border-border text-foreground hover:bg-foreground hover:text-background transition-colors md:hidden"
                    >
                      <ChevronRight size={14} />
                    </button>

                    <div
                      ref={relatedScrollRef}
                      className="flex md:grid md:grid-cols-4 gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 md:pb-0"
                    >
                      {relatedProducts.map((product) => (
                        <div key={product.id} className="min-w-[70vw] sm:min-w-[45vw] md:min-w-0 snap-start">
                          <ShopProductCard product={product} onView={() => goToPage("product", product.id)} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card/70 p-16 text-center">
              <p className="text-sm text-muted-foreground">Product not found. Please return to the shop.</p>
              <button
                type="button"
                onClick={() => goToPage("shop")}
                className="mt-6 inline-flex items-center justify-center gap-2 border border-foreground/20 bg-black px-6 py-3 text-[10px] tracking-[0.2em] uppercase text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Back to Shop
              </button>
            </div>
          )}
        </section>
      ) : currentPage === "cart" ? (
        <section className="px-5 md:px-14 py-28 md:py-36">
          <div className="mb-10">
            <p className="text-xs tracking-[0.3em] uppercase text-accent mb-3">Your Cart</p>
            <h1
              style={{ fontFamily: displayFont }}
              className="text-3xl md:text-4xl font-light text-foreground"
            >
              Carefully selected for your ritual.
            </h1>
          </div>

          {cartItems.length === 0 ? (
            <div className="border border-border bg-card/70 p-10 text-center">
              <p className="text-sm text-muted-foreground">Your cart is empty. Add a candle or soap to begin your ritual.</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
              <div className="divide-y divide-border">
                {cartItems.map(({ product, quantity }) => (
                  <div key={product.id} className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <img src={product.image} alt={product.name} className="h-24 w-24 object-cover" />
                      <div>
                        <p className="text-[10px] tracking-[0.28em] uppercase text-accent">{product.category}</p>
                        <h2 style={{ fontFamily: displayFont }} className="text-xl font-light text-foreground">
                          {product.name}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">{product.size}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 md:justify-end">
                      <div className="flex items-center border border-border">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(product.id, -1)}
                          className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                        >
                          −
                        </button>
                        <span className="min-w-8 text-center text-sm text-foreground">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(product.id, 1)}
                          className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                        >
                          +
                        </button>
                      </div>
                      <p className="min-w-[72px] text-right text-sm font-medium text-foreground">{product.price}</p>
                      <button
                        type="button"
                        onClick={() => removeFromCart(product.id)}
                        className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <aside className="border border-border bg-background p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
                <p className="text-[10px] tracking-[0.3em] uppercase text-accent mb-6">Summary</p>
                <div className="space-y-6 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium text-foreground">Subtotal</span>
                    <span className="text-foreground">
                      {cartItems.reduce((sum, item) => sum + Number(item.product.price.replace(/[^0-9.]/g, "")) * item.quantity, 0).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium text-foreground">Shipping</span>
                    <span className="text-[10px] tracking-wide text-muted-foreground/50">Calculated at checkout</span>
                  </div>
                </div>
                <div className="mt-10 border-t border-border pt-8">
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={checkoutState === "loading"}
                    className="inline-flex w-full items-center justify-center gap-2 border border-foreground/20 bg-black px-6 py-3 text-[10px] tracking-[0.2em] uppercase text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {checkoutState === "loading" ? "Redirecting to Checkout…" : "Continue to Checkout"}
                    <ArrowRight size={12} />
                  </button>
                  {checkoutState === "error" && checkoutMessage && (
                    <p className="mt-3 text-sm text-destructive-foreground">{checkoutMessage}</p>
                  )}
                </div>
              </aside>
            </div>
          )}
        </section>
      ) : currentPage === "gallery" ? (
        <section className="px-5 md:px-14 py-28 md:py-36">
          <div className="text-center mb-12">
            <p className="text-xs tracking-[0.3em] uppercase text-accent mb-3">Visual Journal</p>
            <h1
              style={{ fontFamily: displayFont }}
              className="text-3xl md:text-4xl font-light text-foreground mb-4"
            >
              Gallery
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground max-w-2xl mx-auto mb-8">
              {galleryTab === "our"
                ? "A living look at our rituals, products, and behind-the-scenes moments."
                : "Photos shared by the people who use Fire and Soap every day."}
            </p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {(
                [
                  { id: "our" as const, label: "Our Gallery" },
                  { id: "customers" as const, label: "From Our Customers" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setGalleryTab(tab.id)}
                  className={`text-[10px] tracking-[0.2em] uppercase transition-opacity duration-200 ${
                    galleryTab === tab.id
                      ? "text-foreground opacity-100"
                      : "text-foreground opacity-40 hover:opacity-60"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loadingGallery && (
            <div className="text-center text-sm text-muted-foreground">Loading gallery...</div>
          )}

          {galleryError && (
            <div className="mb-8 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive-foreground text-center">
              Unable to load gallery: {galleryError}
            </div>
          )}

          {!loadingGallery && !galleryError && galleryImages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground">
              {galleryTab === "our"
                ? "No gallery images are available right now."
                : "No customer photos are available right now."}
            </div>
          )}

          {!loadingGallery && galleryImages.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 items-start">
              {galleryImages.map((item) => (
                <div key={item.id} className="w-full self-start">
                  <GalleryMediaTile item={item} onOpen={setSelectedGalleryItem} />
                </div>
              ))}
            </div>
          )}

          {selectedGalleryItem && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 md:p-10"
              onClick={() => setSelectedGalleryItem(null)}
              role="dialog"
              aria-modal="true"
              aria-label="Gallery preview"
            >
              <button
                type="button"
                onClick={() => setSelectedGalleryItem(null)}
                className="absolute top-4 right-4 md:top-6 md:right-6 z-10 flex h-10 w-10 items-center justify-center text-white/80 hover:text-white transition-colors"
                aria-label="Close preview"
              >
                <X size={22} strokeWidth={1.5} />
              </button>
              <div className="relative max-h-full max-w-5xl flex items-center justify-center">
                {selectedGalleryItem.mediaType === "video" && selectedGalleryItem.videoUrl ? (
                  <video
                    key={selectedGalleryItem.id}
                    src={selectedGalleryItem.videoUrl}
                    poster={selectedGalleryItem.posterUrl || selectedGalleryItem.imageUrl}
                    className="max-h-[85vh] max-w-full w-auto h-auto"
                    controls
                    playsInline
                    autoPlay
                    preload="auto"
                    onClick={(event) => event.stopPropagation()}
                    aria-label={selectedGalleryItem.alt || "Fire and Soap gallery video"}
                  />
                ) : (
                  <img
                    src={selectedGalleryItem.fullUrl || selectedGalleryItem.imageUrl}
                    alt={selectedGalleryItem.alt || "Fire and Soap gallery image"}
                    className="max-h-[85vh] max-w-full w-auto h-auto object-contain"
                    onClick={(event) => event.stopPropagation()}
                  />
                )}
              </div>
            </div>
          )}
        </section>
      ) : currentPage === "returns" ? (
        <section className="px-5 md:px-14 py-28 md:py-36">
          <div className="text-center mb-12">
            <p className="text-xs tracking-[0.3em] uppercase text-accent mb-4">Policy</p>
            <h1
              style={{ fontFamily: displayFont }}
              className="text-3xl md:text-4xl font-light text-foreground mb-2"
            >
              Return &amp; Refund Policy
            </h1>
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Fire &amp; Soap</p>
          </div>

          <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
            <p>
              All of our soaps and candles are made to order, handcrafted just for you. Because each piece is created specifically for your order, we&apos;re unable to accept returns or exchanges once production has begun.
            </p>
            <p>
              We&apos;re committed to white glove service from start to finish, so if anything about your experience doesn&apos;t feel right, please reach out — we want to know.
            </p>

            <div>
              <h2 className="text-base font-medium text-foreground mb-3">Cancellations</h2>
              <p>
                Need to cancel? You can do so within 24–48 hours of placing your order, before production starts. Once your piece is in production, we&apos;re unable to cancel or modify the order.
              </p>
            </div>

            <div>
              <h2 className="text-base font-medium text-foreground mb-3">Damaged or Defective Items</h2>
              <p className="mb-4">If something arrives damaged or defective, we&apos;ll fix it — no hassle.</p>
              <ul className="space-y-2 list-none">
                <li>• Reach out within 14 days of delivery</li>
                <li>• Send us your order number and a photo of the issue</li>
                <li>• You choose: full refund or free replacement</li>
                <li>• We cover all shipping costs related to the fix</li>
                <li>• As an apology for the inconvenience, we&apos;ll also send you a $10 credit toward your next order</li>
              </ul>
              <p className="mt-4">
                Past 14 days, contact us anyway. We&apos;ll still look at genuine damage or defect claims case-by-case, and if the product&apos;s at fault, we&apos;ll cover the cost to make it right — plus the same $10 credit.
              </p>
            </div>

            <div>
              <h2 className="text-base font-medium text-foreground mb-3">Not Eligible for Return</h2>
              <p>Products that have been used, burned, or altered — unless it&apos;s a verified defect.</p>
            </div>

            <div>
              <h2 className="text-base font-medium text-foreground mb-3">How to Start a Claim</h2>
              <p>
                Email{" "}
                <a
                  href="mailto:fireandsoapinc@gmail.com"
                  className="text-foreground underline underline-offset-4 hover:text-accent transition-colors"
                >
                  fireandsoapinc@gmail.com
                </a>{" "}
                with your order number, a quick description, and a photo.
              </p>
            </div>
          </div>
        </section>
      ) : currentPage === "ingredients" ? (
        <section className="px-5 md:px-14 py-28 md:py-36">
          <div className="text-center mb-12">
            <p className="text-xs tracking-[0.3em] uppercase text-accent mb-4">Transparency</p>
            <h1
              style={{ fontFamily: displayFont }}
              className="text-3xl md:text-4xl font-light text-foreground mb-2"
            >
              Ingredients Glossary
            </h1>
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Fire &amp; Soap</p>
          </div>

          <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
            <p>
              We believe in transparency. Here is exactly what goes into our soap bars and why it&apos;s there:
            </p>

            <div>
              <h2 className="text-base font-medium text-foreground mb-3">Soaps</h2>
              <div className="space-y-6">
                {soapIngredients.map((ingredient) => (
                  <div key={ingredient.name}>
                    <h3 className="text-base font-medium text-foreground mb-2">{ingredient.name}</h3>
                    <p>{ingredient.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-base font-medium text-foreground mb-3">Candles</h2>
              <p className="italic">
                Placeholder: candle ingredient details will be listed here in the same format as our soap glossary.
              </p>
            </div>
          </div>
        </section>
      ) : currentPage === "about" ? (
        <section className="px-5 md:px-14 py-28 md:py-36">
          <div className="text-center mb-12">
            <p className="text-xs tracking-[0.3em] uppercase text-accent mb-4">About</p>
            <h1
              style={{ fontFamily: displayFont }}
              className="text-3xl md:text-4xl font-light text-foreground mb-2"
            >
              About Fire and Soap
            </h1>
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Fire &amp; Soap</p>
          </div>

          <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
            <p>
              Fire and Soap was born out of personal necessity. After navigating heavy life challenges, I chose to
              dedicate my life to a form of wellness that rejects the performative and embraces the real. This brand is
              a personal invitation to heal every layer of yourself, to reconnect with your inner child, and to finally
              give yourself permission to simply rest. It is about weaving self love and a touch of the extraordinary
              into the quietest, most ordinary moments of your day.
            </p>
            <p>
              Because true restoration is a full sensory experience, every detail of these creations is chosen with
              meticulous care. I live for the way a product looks on your counter, how it fills a room, and the texture
              it leaves against your skin. Every item is thoughtfully handcrafted from top of the line
              ingredients, ensuring an exceptional standard that makes each creation entirely unique. To support your
              healing beyond the physical surface, every single product is infused with Reiki energy to channel a gentle
              life force into your space the exact moment you choose to take time for yourself.
            </p>
          </div>
        </section>
      ) : currentPage === "shipping" ? (
        <section className="px-5 md:px-14 py-28 md:py-36">
          <div className="text-center mb-12">
            <p className="text-xs tracking-[0.3em] uppercase text-accent mb-4">Help</p>
            <h1
              style={{ fontFamily: displayFont }}
              className="text-3xl md:text-4xl font-light text-foreground mb-2"
            >
              Shipping
            </h1>
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Fire &amp; Soap</p>
          </div>

          <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
            <p>
              This page is a temporary placeholder while we finalize our full shipping policy. Thank you for your
              patience as we put the finishing touches on our delivery details.
            </p>

            <div>
              <h2 className="text-base font-medium text-foreground mb-3">Processing Times</h2>
              <p>
                Because our candles and soaps are made to order, please allow time for your piece to be handcrafted
                before it ships. Processing details will be published here soon.
              </p>
            </div>

            <div>
              <h2 className="text-base font-medium text-foreground mb-3">Shipping Rates</h2>
              <p>Shipping is calculated at checkout based on your location and order size.</p>
            </div>

            <div>
              <h2 className="text-base font-medium text-foreground mb-3">Questions</h2>
              <p>
                Email{" "}
                <a
                  href="mailto:fireandsoapinc@gmail.com"
                  className="text-foreground underline underline-offset-4 hover:text-accent transition-colors"
                >
                  fireandsoapinc@gmail.com
                </a>{" "}
                and we&apos;ll be happy to help.
              </p>
            </div>
          </div>
        </section>
      ) : currentPage === "contact" ? (
        <ContactPage displayFont={displayFont} />
      ) : currentPage === "privacy" ? (
        <section className="px-5 md:px-14 py-28 md:py-36">
          <div className="text-center mb-12">
            <p className="text-xs tracking-[0.3em] uppercase text-accent mb-4">Policy</p>
            <h1
              style={{ fontFamily: displayFont }}
              className="text-3xl md:text-4xl font-light text-foreground mb-2"
            >
              Privacy Policy
            </h1>
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Fire &amp; Soap</p>
          </div>

          <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Last updated: June 30, 2026</p>

            <p>
              Fire and Soap Inc. operates this store and website, including all related information, content,
              features, tools, products and services, in order to provide you, the customer, with a curated shopping
              experience (the &quot;Services&quot;). Fire and Soap Inc. is powered by Shopify, which enables us to
              provide the Services to you. This Privacy Policy describes how we collect, use, and disclose your personal
              information when you visit, use, or make a purchase or other transaction using the Services or otherwise
              communicate with us. If there is a conflict between our Terms of Service and this Privacy Policy, this
              Privacy Policy controls with respect to the collection, processing, and disclosure of your personal
              information.
            </p>

            <p>
              Please read this Privacy Policy carefully. By using and accessing any of the Services, you acknowledge
              that you have read this Privacy Policy and understand the collection, use, and disclosure of your
              information as described in this Privacy Policy.
            </p>

            <div>
              <h2 className="text-base font-medium text-foreground mb-3">Personal Information We Collect or Process</h2>
              <p className="mb-4">
                When we use the term &quot;personal information,&quot; we are referring to information that identifies or
                can reasonably be linked to you or another person. Personal information does not include information that
                is collected anonymously or that has been de-identified, so that it cannot identify or be reasonably
                linked to you. We may collect or process the following categories of personal information, including
                inferences drawn from this personal information, depending on how you interact with the Services, where
                you live, and as permitted or required by applicable law:
              </p>
              <ul className="space-y-2 list-none">
                <li>
                  • <span className="text-foreground">Contact details</span> including your name, address, billing
                  address, shipping address, phone number, and email address.
                </li>
                <li>
                  • <span className="text-foreground">Financial information</span> including credit card, debit card,
                  and financial account numbers, payment card information, financial account information, transaction
                  details, form of payment, payment confirmation and other payment details.
                </li>
                <li>
                  • <span className="text-foreground">Account information</span> including your username, password,
                  security questions, preferences and settings.
                </li>
                <li>
                  • <span className="text-foreground">Transaction information</span> including the items you view, put
                  in your cart, add to your wishlist, or purchase, return, exchange or cancel and your past
                  transactions.
                </li>
                <li>
                  • <span className="text-foreground">Communications with us</span> including the information you include
                  in communications with us, for example, when sending a customer support inquiry.
                </li>
                <li>
                  • <span className="text-foreground">Device information</span> including information about your device,
                  browser, or network connection, your IP address, and other unique identifiers.
                </li>
                <li>
                  • <span className="text-foreground">Usage information</span> including information regarding your
                  interaction with the Services, including how and when you interact with or navigate the Services.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-medium text-foreground mb-3">Personal Information Sources</h2>
              <p className="mb-4">We may collect personal information from the following sources:</p>
              <ul className="space-y-2 list-none">
                <li>• Directly from you including when you create an account, visit or use the Services, communicate with us, or otherwise provide us with your personal information;</li>
                <li>• Automatically through the Services including from your device when you use our products or services or visit our websites, and through the use of cookies and similar technologies;</li>
                <li>• From our service providers including when we engage them to enable certain technology and when they collect or process your personal information on our behalf;</li>
                <li>• From our partners or other third parties.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-medium text-foreground mb-3">How We Use Your Personal Information</h2>
              <p className="mb-4">
                Depending on how you interact with us or which of the Services you use, we may use personal information
                for the following purposes:
              </p>
              <ul className="space-y-4 list-none">
                <li>
                  • <span className="text-foreground">Provide, Tailor, and Improve the Services.</span> We use your
                  personal information to provide you with the Services, including to perform our contract with you, to
                  process your payments, to fulfill your orders, to remember your preferences and items you are interested
                  in, to send notifications to you related to your account, to process purchases, returns, exchanges or
                  other transactions, to create, maintain and otherwise manage your account, to arrange for shipping, to
                  facilitate any returns and exchanges, to enable you to post reviews, and to create a customized
                  shopping experience for you, such as recommending products related to your purchases. This may include
                  using your personal information to better tailor and improve the Services.
                </li>
                <li>
                  • <span className="text-foreground">Marketing and Advertising.</span> We use your personal information
                  for marketing and promotional purposes, such as to send marketing, advertising and promotional
                  communications by email, text message or postal mail, and to show you online advertisements for products
                  or services on the Services or other websites, including based on items you previously have purchased
                  or added to your cart and other activity on the Services.
                </li>
                <li>
                  • <span className="text-foreground">Security and Fraud Prevention.</span> We use your personal
                  information to authenticate your account, to provide a secure payment and shopping experience,
                  detect, investigate or take action regarding possible fraudulent, illegal, unsafe, or malicious
                  activity, protect public safety, and to secure our services. If you choose to use the Services and
                  register an account, you are responsible for keeping your account credentials safe. We highly recommend
                  that you do not share your username, password or other access details with anyone else.
                </li>
                <li>
                  • <span className="text-foreground">Communicating with You.</span> We use your personal information
                  to provide you with customer support, to be responsive to you, to provide effective services to you
                  and to maintain our business relationship with you.
                </li>
                <li>
                  • <span className="text-foreground">Legal Reasons.</span> We use your personal information to comply
                  with applicable law or respond to valid legal process, including requests from law enforcement or
                  government agencies, to investigate or participate in civil discovery, potential or actual litigation,
                  or other adversarial legal proceedings, and to enforce or investigate potential violations of our terms
                  or policies.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-medium text-foreground mb-3">How We Disclose Personal Information</h2>
              <p className="mb-4">
                In certain circumstances, we may disclose your personal information to third parties for legitimate
                purposes subject to this Privacy Policy. Such circumstances may include:
              </p>
              <ul className="space-y-2 list-none">
                <li>
                  • With Shopify, vendors and other third parties who perform services on our behalf (e.g. IT management,
                  payment processing, data analytics, customer support, cloud storage, fulfillment and shipping).
                </li>
                <li>
                  • With business and marketing partners to provide marketing services and advertise to you. For
                  example, we use Shopify to support personalized advertising with third-party services based on your
                  online activity with different merchants and websites. Our business and marketing partners will use
                  your information in accordance with their own privacy notices. Depending on where you reside, you may
                  have a right to direct us not to share information about you to show you targeted advertisements and
                  marketing based on your online activity with different merchants and websites. You can exercise your
                  rights to opt-out of those uses{" "}
                  <a
                    href="https://privacy.shopify.com/en"
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground underline underline-offset-4 hover:text-accent transition-colors"
                  >
                    here
                  </a>
                  .
                </li>
                <li>
                  • When you direct, request us or otherwise consent to our disclosure of certain information to third
                  parties, such as to ship you products or through your use of social media widgets or login
                  integrations.
                </li>
                <li>• With our affiliates or otherwise within our corporate group.</li>
                <li>
                  • In connection with a business transaction such as a merger or bankruptcy, to comply with any
                  applicable legal obligations (including to respond to subpoenas, search warrants and similar
                  requests), to enforce any applicable terms of service or policies, and to protect or defend the
                  Services, our rights, and the rights of our users or others.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-medium text-foreground mb-3">Relationship with Shopify</h2>
              <p>
                The Services are hosted by Shopify, which collects and processes personal information about your access
                to and use of the Services in order to provide and improve the Services for you. Information you submit to
                the Services will be transmitted to and shared with Shopify as well as third parties that may be located
                in countries other than where you reside, in order to provide and improve the Services for you. In
                addition, to help protect, grow, and improve our business, we use certain Shopify enhanced features that
                incorporate data and information obtained from your interactions with our Store, along with other
                merchants and with Shopify. To provide these enhanced features, Shopify may make use of personal
                information collected about your interactions with our store, along with other merchants, and with
                Shopify. In these circumstances, Shopify is responsible for the processing of your personal information,
                including for responding to your requests to exercise your rights over use of your personal information
                for these purposes. To learn more about how Shopify uses your personal information and any rights you may
                have, you can visit the{" "}
                <a
                  href="https://privacy.shopify.com/en"
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground underline underline-offset-4 hover:text-accent transition-colors"
                >
                  Shopify Consumer Privacy Policy
                </a>
                . Depending on where you live, you may exercise certain rights with respect to your personal information{" "}
                <a
                  href="https://privacy.shopify.com/en"
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground underline underline-offset-4 hover:text-accent transition-colors"
                >
                  here
                </a>
                .
              </p>
            </div>

            <div>
              <h2 className="text-base font-medium text-foreground mb-3">Third Party Websites and Links</h2>
              <p>
                The Services may provide links to websites or other online platforms operated by third parties. If you
                follow links to sites not affiliated or controlled by us, you should review their privacy and security
                policies and other terms and conditions. We do not guarantee and are not responsible for the privacy or
                security of such sites, including the accuracy, completeness, or reliability of information found on these
                sites. Information you provide on public or semi-public venues, including information you share on
                third-party social networking platforms may also be viewable by other users of the Services and/or users
                of those third-party platforms without limitation as to its use by us or by a third party. Our inclusion
                of such links does not, by itself, imply any endorsement of the content on such platforms or of their
                owners or operators, except as disclosed on the Services.
              </p>
            </div>

            <div>
              <h2 className="text-base font-medium text-foreground mb-3">Children&apos;s Data</h2>
              <p>
                The Services are not intended to be used by children, and we do not knowingly collect any personal
                information about children under the age of majority in your jurisdiction. If you are the parent or
                guardian of a child who has provided us with their personal information, you may contact us using the
                contact details set out below to request that it be deleted. As of the Effective Date of this Privacy
                Policy, we do not have actual knowledge that we &quot;share&quot; or &quot;sell&quot; (as those terms are
                defined in applicable law) personal information of individuals under 16 years of age.
              </p>
            </div>

            <div>
              <h2 className="text-base font-medium text-foreground mb-3">Security and Retention of Your Information</h2>
              <p>
                Please be aware that no security measures are perfect or impenetrable, and we cannot guarantee
                &quot;perfect security.&quot; In addition, any information you send to us may not be secure while in
                transit. We recommend that you do not use unsecure channels to communicate sensitive or confidential
                information to us.
              </p>
              <p className="mt-4">
                How long we retain your personal information depends on different factors, such as whether we need the
                information to maintain your account, to provide you with Services, comply with legal obligations,
                resolve disputes or enforce other applicable contracts and policies.
              </p>
            </div>

            <div>
              <h2 className="text-base font-medium text-foreground mb-3">Your Rights and Choices</h2>
              <p className="mb-4">
                Depending on where you live, you may have some or all of the rights listed below in relation to your
                personal information. However, these rights are not absolute, may apply only in certain circumstances
                and, in certain cases, we may decline your request as permitted by law.
              </p>
              <ul className="space-y-2 list-none mb-4">
                <li>
                  • <span className="text-foreground">Right to Access / Know.</span> You may have a right to request
                  access to personal information that we hold about you.
                </li>
                <li>
                  • <span className="text-foreground">Right to Delete.</span> You may have a right to request that we
                  delete personal information we maintain about you.
                </li>
                <li>
                  • <span className="text-foreground">Right to Correct.</span> You may have a right to request that we
                  correct inaccurate personal information we maintain about you.
                </li>
                <li>
                  • <span className="text-foreground">Right of Portability.</span> You may have a right to receive a
                  copy of the personal information we hold about you and to request that we transfer it to a third
                  party, in certain circumstances and with certain exceptions.
                </li>
                <li>
                  • <span className="text-foreground">Right to Opt out of Sale or Sharing for Targeted Advertising.</span>{" "}
                  Depending on where you reside, you may have a right to opt out of the &quot;sale&quot; or
                  &quot;share&quot; of your personal information or to opt out of the processing of your personal
                  information for purposes considered to be &quot;targeted advertising&quot;, as defined in applicable
                  privacy laws. You can exercise your rights to opt-out of those uses{" "}
                  <a
                    href="https://privacy.shopify.com/en"
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground underline underline-offset-4 hover:text-accent transition-colors"
                  >
                    here
                  </a>
                  . Please note that if you visit our website with the Global Privacy Control opt-out preference signal
                  enabled, depending on where you are, we will automatically treat this as a request to opt-out for the
                  device and browser that you use to visit the website. If we are able to associate the device sending the
                  signal to a Shopify account, we will apply the opt out request to the account as well. To learn more
                  about Global Privacy Control, you can visit{" "}
                  <a
                    href="https://globalprivacycontrol.org/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground underline underline-offset-4 hover:text-accent transition-colors"
                  >
                    https://globalprivacycontrol.org/
                  </a>
                  . Other than the Global Privacy Control, we do not recognize other &quot;Do Not Track&quot; signals
                  that may be sent from your web browser or device.
                </li>
                <li>
                  • <span className="text-foreground">Managing Communication Preferences.</span> We may send you
                  promotional emails, and you may opt out of receiving these at any time by using the unsubscribe option
                  displayed in our emails to you. If you opt out, we may still send you non-promotional emails, such as
                  those about your account or orders that you have made.
                </li>
              </ul>
              <p className="mb-4">
                You may exercise any of these rights where indicated on the Services or by contacting us using the
                contact details provided below. To learn more about how Shopify uses your personal information and any
                rights you may have, including rights related to data processed by Shopify, you can visit{" "}
                <a
                  href="https://privacy.shopify.com/en"
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground underline underline-offset-4 hover:text-accent transition-colors"
                >
                  https://privacy.shopify.com/en
                </a>
                .
              </p>
              <p>
                We will not discriminate against you for exercising any of these rights. We may need to verify your
                identity before we can process your requests, as permitted or required under applicable law. In
                accordance with applicable laws, you may designate an authorized agent to make requests on your behalf
                to exercise your rights. Before accepting such a request from an agent, we will require that the agent
                provide proof you have authorized them to act on your behalf, and we may need you to verify your identity
                directly with us. We will respond to your request in a timely manner as required under applicable law.
              </p>
            </div>

            <div>
              <h2 className="text-base font-medium text-foreground mb-3">Complaints</h2>
              <p>
                If you have complaints about how we process your personal information, please contact us using the
                contact details provided below. Depending on where you live, you may have the right to appeal our
                decision by contacting us using the contact details set out below, or lodge your complaint with your
                local data protection authority.
              </p>
            </div>

            <div>
              <h2 className="text-base font-medium text-foreground mb-3">International Transfers</h2>
              <p>
                Please note that we may transfer, store and process your personal information outside the country you
                live in.
              </p>
              <p className="mt-4">
                If we transfer your personal information out of the European Economic Area or the United Kingdom, we
                will rely on recognized transfer mechanisms like the European Commission&apos;s Standard Contractual
                Clauses, or any equivalent contracts issued by the relevant competent authority of the UK, as relevant,
                unless the data transfer is to a country that has been determined to provide an adequate level of
                protection.
              </p>
            </div>

            <div>
              <h2 className="text-base font-medium text-foreground mb-3">Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time, including to reflect changes to our practices or
                for other operational, legal, or regulatory reasons. We will post the revised Privacy Policy on this
                website, update the &quot;Last updated&quot; date and provide notice as required by applicable law.
              </p>
            </div>

            <div>
              <h2 className="text-base font-medium text-foreground mb-3">Contact</h2>
              <p>
                Should you have any questions about our privacy practices or this Privacy Policy, or if you would like
                to exercise any of the rights available to you, please call or email us at{" "}
                <a
                  href="mailto:fireandsoapinc@gmail.com"
                  className="text-foreground underline underline-offset-4 hover:text-accent transition-colors"
                >
                  fireandsoapinc@gmail.com
                </a>{" "}
                or contact us at 228 Park Ave S, # 712217, New York, NY, 10003, US.
              </p>
            </div>
          </div>
        </section>
      ) : currentPage === "ritual" ? (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#080808] text-sm tracking-[0.2em] uppercase text-white/50">
              Opening ritual…
            </div>
          }
        >
          <MiniApp
            onExit={() => goToPage("home")}
            catalog={products}
            onViewProduct={(id) => goToPage("product", id)}
            onAddToCart={(product, quantity) => addToCart(product, quantity)}
          />
        </Suspense>
      ) : currentPage === "thank-you" ? (
        <section className="px-5 md:px-14 py-28 md:py-36">
          <div className="text-center mb-12">
            <p className="text-xs tracking-[0.3em] uppercase text-accent mb-4">Order Confirmed</p>
            <h1
              style={{ fontFamily: displayFont }}
              className="text-3xl md:text-4xl font-light text-foreground mb-2"
            >
              Thank You
            </h1>
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Fire &amp; Soap</p>
          </div>

          <div className="space-y-8 text-sm leading-relaxed text-muted-foreground text-center">
            <p>
              Your order is confirmed. We&apos;re honored you chose Fire and Soap for your ritual — you&apos;ll receive
              an email from Shopify with your receipt and order details shortly.
            </p>
            <button
              type="button"
              onClick={() => goToPage("shop")}
              className="inline-flex items-center gap-2 border border-foreground/20 bg-black px-6 py-3 text-[10px] tracking-[0.2em] uppercase text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Continue Shopping
              <ArrowRight size={12} />
            </button>
          </div>
        </section>
      ) : (
        <section className="px-5 md:px-14 py-28 md:py-36 text-center">
          <p className="text-sm text-muted-foreground">Page not found.</p>
        </section>
      )}


      {currentPage === "home" && (
        <>
          {/* ── INTRO ── */}
          <section className="px-5 md:px-14 py-20 md:py-28">
        <div className="grid md:grid-cols-2 gap-10 md:gap-12 items-center">
          <div className="space-y-8">
            <ScrollReveal delay={80}>
              <div>
                <p className="text-xs tracking-[0.3em] uppercase text-accent mb-8">
                  Our Philosophy
                </p>
                <h2
                  style={{ fontFamily: displayFont }}
                  className="text-4xl md:text-5xl font-light leading-[1.15] text-foreground"
                >
                  Scent is the oldest<br />
                  language of healing.
                </h2>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={140}>
              <div className="space-y-6">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Every candle and soap we create begins with a crystal grid and a practitioner's intention. We believe that the way something is made carries energy — and we want that energy to be one of care, clarity, and love.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Our ingredients are sourced from small farms and ethical suppliers. Our wax is a blend of coconut and apricot. Our wicks are unbleached cotton. Nothing unnecessary, nothing harmful.
                </p>
                <a
                  href="/about#about"
                  className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-foreground hover:text-accent transition-colors duration-300 border-b border-border pb-px"
                >
                  Our Story <ArrowRight size={11} />
                </a>
              </div>
            </ScrollReveal>
          </div>
          <ScrollReveal delay={180}>
            <div className="aspect-[4/5] w-full overflow-hidden border border-border bg-card">
              <img
                src="/photos/beachdisplay.png"
                alt="Fire and Soap product display"
                className="h-full w-full object-cover"
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

    

      {/* ── TESTIMONIALS ── */}
      <section className="px-5 md:px-14 pt-20 md:pt-24 pb-40 md:pb-52">
      <ScrollReveal className={`${pageGutterClass} text-left mb-10 md:mb-14 mt-28 md:mt-32`} delay={120}>
      <p className="text-xs text-center tracking-[0.3em] uppercase text-accent mb-8">
                  From our customers
                </p>
          </ScrollReveal>
        <div className="grid md:grid-cols-3 gap-12 md:gap-16">
          {[
            {
              quote: "I just recieved my soaps and candle and not only were they gorgeous but smelt amazing. My mother loved them too and was a huge fan.",
              author: "Micayla",
              location: "New York",
            },
            {
              quote: "I love these soaps! The cutest shapes and I love all the scent options! I put a couple in a small dish on my sink for hosting and got so many compliments.",
              author: "Dominique",
              location: "New York",
            },
            {
              quote: "Everyone that I showed loved the black and gold candle and the fragrances are well recieved.",
              author: "Emily",
              location: "New York",
            },
          ].map((t, index) => (
            <ScrollReveal key={t.author} delay={index * 90}>
              <div className="flex flex-col gap-8 h-full">
                <p
                  style={{ fontFamily: displayFont }}
                  className="text-xl md:text-2xl font-light text-foreground leading-relaxed"
                >
                  "{t.quote}"
                </p>
                <div className="mt-auto pt-6 border-t border-border">
                  <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">
                    {t.author} · {t.location}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── NEWSLETTER ── */}
      <section className="bg-card border-t border-border">
        <div className="px-5 md:px-14 py-24 md:py-32">
          <ScrollReveal className="max-w-xl mx-auto text-center" delay={100}>
            <div className="max-w-xl mx-auto text-center">
              <p className="text-xs tracking-[0.3em] uppercase text-accent mb-5">
                Stay Close
              </p>
              <h2
                style={{ fontFamily: displayFont }}
                className="text-3xl font-light text-foreground mb-4"
              >
                Enter the circle
              </h2>
              <p className="text-sm text-muted-foreground mb-10 leading-relaxed">
                Moon phase rituals, new releases, and invitations to our virtual ceremonies. We write slowly, and only when we have something to say.
              </p>
              <form className="flex border border-border" onSubmit={handleNewsletterSubmit}>
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(event) => setNewsletterEmail(event.target.value)}
                  placeholder="Your email address"
                  className="flex-1 bg-transparent px-5 py-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={newsletterState === "loading"}
                  className="px-6 text-xs tracking-[0.2em] uppercase bg-black text-foreground border border-foreground/20 hover:bg-accent hover:text-accent-foreground transition-colors duration-300 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {newsletterState === "loading" ? "Joining…" : "Join"}
                </button>
              </form>
              {(newsletterState === "success" || newsletterState === "error") && newsletterMessage && (
                <p
                  role="status"
                  className={`mt-4 text-sm ${newsletterState === "success" ? "text-accent-foreground" : "text-destructive-foreground"}`}
                >
                  {newsletterMessage}
                </p>
              )}
            </div>
          </ScrollReveal>
        </div>
      </section>
        </>
      )}

      {/* ── FOOTER ── */}
      <footer className="border-t border-border px-5 md:px-14 py-16">
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16 items-start">
            <ScrollReveal delay={80}>
              <div className="col-span-2 md:col-span-1 flex flex-col gap-3">
                <img
                  src="/photos/logo.PNG"
                  alt="Fire and Soap"
                  className="w-12 h-12 object-contain"
                />
                <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground">Fire and Soap</p>
                <p className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground leading-relaxed max-w-[11rem]">
                  Reiki-infused candles and soaps, handcrafted with healing intention.
                </p>
              </div>
            </ScrollReveal>
            {[
              {
                heading: "Shop",
                links: [
                  { label: "Summer Collection", onClick: () => goToShopCategory("Summer Collection") },
                  { label: "Candles", onClick: () => goToShopCategory("Candles") },
                  { label: "Soaps", onClick: () => goToShopCategory("Soaps") },
                ],
              },
              {
                heading: "About",
                links: [
                  { label: "About Us", onClick: () => goToPage("about") },
                  { label: "Ingredients", onClick: () => goToPage("ingredients") },
                  { label: "Gallery", onClick: () => goToPage("gallery") },
                ],
              },
              {
                heading: "Help",
                links: [
                  { label: "Shipping", onClick: () => goToPage("shipping") },
                  { label: "Return & Refund Policy", onClick: () => goToPage("returns") },
                  { label: "Contact", onClick: () => goToPage("contact") },
                ],
              },
            ].map((col, index) => (
              <ScrollReveal key={col.heading} delay={index * 90}>
                <div className="flex flex-col">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-accent mb-5">
                    {col.heading}
                  </p>
                  <ul className="space-y-3">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        {"onClick" in link && typeof link.onClick === "function" ? (
                          <button
                            type="button"
                            onClick={link.onClick}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
                          >
                            {link.label}
                          </button>
                        ) : (
                          <a
                            href={"href" in link && typeof link.href === "string" ? link.href : "#"}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {link.label}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            ))}
          </div>
          <div className="border-t border-border pt-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex items-center justify-center gap-5">
                {[
                  { label: "Instagram", href: getInstagramProfileUrl(instagramUsername), icon: <InstagramIcon /> },
                  { label: "Pinterest", href: "https://www.pinterest.com/fireandsoap/", icon: <PinterestIcon /> },
                  { label: "TikTok", href: "https://www.tiktok.com/@fireandsoap", icon: <TikTokIcon /> },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    target={s.href.startsWith("http") ? "_blank" : undefined}
                    rel={s.href.startsWith("http") ? "noreferrer" : undefined}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
              <p className="text-[11px] tracking-wide text-muted-foreground">
                © 2026 Fire and Soap. All rights reserved.
              </p>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                Fire and Soap Inc. · 228 Park Ave S, New York, New York 10003-1502 US · PMB #712217
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                <a
                  href="tel:+18885266004"
                  className="hover:text-foreground transition-colors"
                >
                  1-(888) 526-6004
                </a>
              </p>
              <button
                type="button"
                onClick={() => goToPage("privacy")}
                className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

function PinterestIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

function formatPlainDescription(text: string): string[] {
  const withBreaks = text
    .replace(/\r\n/g, "\n")
    .replace(/\s+(Size:|Composition:|Vessel:|Fragrance Notes:|Design:)/g, "\n\n$1")
    .trim();

  if (withBreaks.includes("\n\n")) {
    return withBreaks.split(/\n\n+/).map((part) => part.trim()).filter(Boolean);
  }

  if (withBreaks.includes("\n")) {
    return withBreaks.split(/\n+/).map((part) => part.trim()).filter(Boolean);
  }

  return withBreaks ? [withBreaks] : [];
}

function ProductDescription({
  description,
  descriptionHtml,
}: {
  description: string;
  descriptionHtml: string;
}) {
  const fallback = formatPlainDescription(
    description ||
      "Reiki-infused and made for the moment you finally exhale.",
  );

  if (descriptionHtml.trim()) {
    return (
      <div
        className="product-description text-sm leading-relaxed text-muted-foreground mb-4 space-y-4 [&_p]:mb-4 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
        dangerouslySetInnerHTML={{ __html: descriptionHtml }}
      />
    );
  }

  return (
    <div className="text-sm leading-relaxed text-muted-foreground mb-4 space-y-4">
      {fallback.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  );
}

function ShopProductCard({
  product,
  onView,
  centered = false,
}: {
  product: Product;
  onView: () => void;
  centered?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onView}
      className={`group w-full ${centered ? "text-center" : "text-left"}`}
    >
      <div className={`aspect-square bg-card overflow-hidden ${centered ? "mb-7 md:mb-8" : "mb-4"}`}>
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <h3
        style={{ fontFamily: displayFont }}
        className="text-base md:text-lg font-light text-foreground mb-1"
      >
        {product.name}
      </h3>
      <p className="text-sm text-muted-foreground">{product.price}</p>
    </button>
  );
}

function HomepageFeaturedCard({
  product,
  featured,
  addedId,
  onAdd,
  onView,
}: {
  product: Product;
  featured: boolean;
  addedId: string | null;
  onAdd: (product: Product) => void;
  onView: () => void;
}) {
  const isAdded = addedId === product.id;
  const description =
    product.description ||
    "Reiki-infused and made for the moment you finally exhale.";

  return (
    <article
      className={`flex w-full flex-col bg-background border border-border shadow-[0_12px_48px_rgba(0,0,0,0.06)] md:shadow-[0_20px_80px_rgba(0,0,0,0.08)] origin-center transition-transform duration-500 ease-out will-change-transform ${
        featured ? "scale-100" : "scale-[0.9] md:scale-[0.92]"
      }`}
    >
      <button
        type="button"
        onClick={onView}
        className="relative block w-full aspect-square overflow-hidden bg-card text-left"
        aria-label={`View details for ${product.name}`}
      >
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
        />
        {product.tag && (
          <span className="absolute top-4 left-4 text-[9px] tracking-[0.25em] uppercase bg-background/90 text-foreground px-2.5 py-1">
            {product.tag}
          </span>
        )}
      </button>

      <div className="flex flex-col p-4 md:p-6 min-h-[7.5rem] md:min-h-[9.5rem]">
        <button type="button" onClick={onView} className="text-left">
          <h3
            style={{ fontFamily: displayFont }}
            className="text-lg md:text-2xl font-light text-foreground mb-1 md:mb-2"
          >
            {product.name}
          </h3>
        </button>

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${
            featured ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2 md:line-clamp-3 mb-3 md:mb-4">{description}</p>
            <p className="text-sm text-foreground mb-4">{product.price}</p>
            <button
              type="button"
              onClick={() => onAdd(product)}
              className={`w-full py-3 text-[10px] tracking-[0.2em] uppercase transition-colors ${
                isAdded
                  ? "bg-accent text-accent-foreground"
                  : "bg-black text-foreground border border-foreground/20 hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {isAdded ? "Added" : "Add to Cart"}
            </button>
          </div>
        </div>

        <p
          className={`text-sm text-muted-foreground transition-opacity duration-500 ease-out ${
            featured ? "opacity-0 h-0 overflow-hidden" : "opacity-100"
          }`}
        >
          {product.price}
        </p>
      </div>
    </article>
  );
}

function ProductCard({
  product,
  addedId,
  onAdd,
  onView,
  mobile = false,
}: {
  product: Product;
  addedId: string | null;
  onAdd: (product: Product) => void;
  onView?: () => void;
  mobile?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const isAdded = addedId === product.id;
  const imageSrc = hovered && product.images.length > 1 ? product.images[1] : product.image;

  return (
    <div
      role={onView ? "button" : undefined}
      tabIndex={onView ? 0 : undefined}
      onClick={onView}
      onKeyDown={(event) => {
        if (!onView) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onView();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group bg-background border border-border overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.08)] flex flex-col h-full ${onView ? "cursor-pointer" : ""} ${mobile ? "min-w-[80vw] md:min-w-0 md:w-80 flex-shrink-0 snap-start" : "w-80"}`}
    >
      <div className="relative overflow-hidden aspect-square bg-card">
        <img
          src={imageSrc}
          alt={product.name}
          className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${hovered ? "scale-105" : "scale-100"}`}
        />
        {/* Overlay on hover */}
        <div
          className={`absolute inset-0 bg-background/20 transition-opacity duration-500 ${hovered ? "opacity-100" : "opacity-0"}`}
        />
        {product.tag && (
          <span className="absolute top-4 left-4 text-[9px] tracking-[0.25em] uppercase bg-background/90 text-foreground px-2.5 py-1">
            {product.tag}
          </span>
        )}
        {/* Quick-add on hover */}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onAdd(product);
          }}
          className={`absolute bottom-4 left-4 right-4 py-3 text-[10px] tracking-[0.2em] uppercase transition-all duration-300 z-10 ${
            hovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          } ${isAdded ? "bg-accent text-accent-foreground" : "bg-black text-foreground border border-foreground/20 hover:bg-accent hover:text-accent-foreground"}`}
        >
          {isAdded ? "Added" : "Add to Bag"}
        </button>
      </div>

      <div className="p-6 flex flex-col gap-2">
        <div>
          <h3
            style={{ fontFamily: displayFont }}
            className="text-xl font-light text-foreground"
          >
            {product.name}
          </h3>
          {product.size && (
            <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mt-3">
              {product.size}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
