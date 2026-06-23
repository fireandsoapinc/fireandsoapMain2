import { useState, useEffect, useRef } from "react";
import { ShoppingBag, Search, Menu, X, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchShopifyProducts, ShopifyProduct } from "@/lib/shopify";

type Product = ShopifyProduct;

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

const categories = ["All", "Candles", "Soaps", "New Arrivals"];

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [cartCount, setCartCount] = useState(0);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<"home" | "shop" | "about">("home");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHeroLoaded(true);

    fetchShopifyProducts(12)
      .then((items) => setProducts(items))
      .catch((error) => setProductError(error instanceof Error ? error.message : String(error)))
      .finally(() => setLoadingProducts(false));
  }, []);

  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash.replace("#", "").toLowerCase();
      if (hash === "home" || hash === "shop" || hash === "about") {
        setCurrentPage(hash);
      } else {
        setCurrentPage("home");
      }
    };

    parseHash();
    window.addEventListener("hashchange", parseHash);
    return () => window.removeEventListener("hashchange", parseHash);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  const filtered = products.filter((p) => {
    if (activeCategory === "All") return true;
    if (activeCategory === "Candles") return p.category.toLowerCase().includes("candle");
    if (activeCategory === "Soaps") return p.category.toLowerCase().includes("soap");
    if (activeCategory === "New Arrivals") return p.tag === "NEW";
    return true;
  });

  const homepageProducts = (() => {
    const featured = products.filter((p) => p.tag === "NEW" || p.tag === "BESTSELLER");
    return featured.length > 0 ? featured.slice(0, 8) : products.slice(0, 8);
  })();

  function addToCart(id: string) {
    setCartCount((c) => c + 1);
    setAddedId(id);
    setTimeout(() => setAddedId(null), 1200);
  }

  function scrollProducts(dir: "left" | "right") {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -340 : 340, behavior: "smooth" });
  }

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ fontFamily: "'Cinzel', sans-serif" }}
    >
      {/* ── NAV ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-2 md:px-8 flex items-center justify-between h-20">
          {/* Left nav */}
          <nav className="hidden md:flex items-center gap-6">
            {['Home', 'Shop', 'About'].map((item) => {
              const page = item.toLowerCase() as 'home' | 'shop' | 'about';
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    window.location.hash = page === "home" ? "#home" : `#${page}`;
                    setCurrentPage(page);
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

          {/* Right nav */}
          <div className="flex items-center gap-4 justify-end">
            <button className="hidden md:block text-xs tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-300">
              Gallery
            </button>
            <button className="text-foreground/70 hover:text-foreground transition-colors">
              <Search size={16} strokeWidth={1.5} />
            </button>
            <button
              className="relative text-foreground/70 hover:text-foreground transition-colors"
              aria-label="Cart"
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
            >
              <Menu size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* ── MOBILE MENU ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col p-8">
          <button
            className="self-end text-muted-foreground hover:text-foreground mb-12"
            onClick={() => setMenuOpen(false)}
          >
            <X size={20} strokeWidth={1.5} />
          </button>
          <nav className="flex flex-col gap-8">
            {['Home', 'Shop', 'Gallery', 'About'].map((item) =>
              item === 'Gallery' ? (
                <a
                  key={item}
                  href="#"
                  onClick={() => setMenuOpen(false)}
                  style={{ fontFamily: "'Playfair Display', serif" }}
                  className="text-4xl font-light text-foreground hover:text-accent transition-colors"
                >
                  {item}
                </a>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    const page = item.toLowerCase() as 'home' | 'shop' | 'about';
                    window.location.hash = page === "home" ? "#home" : `#${page}`;
                    setCurrentPage(page);
                    setMenuOpen(false);
                  }}
                  style={{ fontFamily: "'Playfair Display', serif" }}
                  className="text-4xl font-light text-foreground hover:text-accent transition-colors text-left"
                >
                  {item}
                </button>
              ),
            )}
          </nav>
        </div>
      )}

      {/* ── HERO (banner) ── */}
{currentPage === "home" && (
        <section className="relative h-[60vh] md:h-[88vh] overflow-hidden">
          <img
            src="/photos/summersoaps.png"
            alt="A group of summer candles and soaps at the beach."
            className={`absolute inset-0 w-full h-full object-cover object-middle ${heroLoaded ? "opacity-100" : "opacity-0"}`}
          />
  
  {/* CHANGED: 'justify-center' to 'justify-end' and added 'pb-8 md:pb-12' */}
  <div
    className={`relative z-10 h-full flex flex-col items-center justify-end pb-8 md:pb-12 px-6 md:px-20 text-center transition-all duration-1000 delay-300 ${
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
        onClick={() => {
          window.location.hash = "#shop";
          setCurrentPage("shop");
        }}
        className="inline-flex items-center gap-3 text-xs tracking-[0.2em] uppercase text-foreground bg-black px-6 py-3 hover:bg-accent hover:text-accent-foreground transition-colors duration-300"
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
        <section id="shop" className="pt-6 pb-12 md:pt-8 md:pb-16">
          <div className="max-w-5xl mx-auto px-5 md:px-12 text-center mb-10 space-y-5 md:space-y-6">
            <h2
              style={{ fontFamily: "'Playfair Display', serif" }}
              className="text-2xl md:text-3xl font-light text-foreground"
            >
              Immerse your space in our signature scents. 
            </h2>

            <p className="text-sm leading-relaxed text-muted-foreground">
              Crafted exclusively from ethically sourced, premium organic ingredients and wild-harvested botanicals. <br></br>
              Free from synthetics and fillers, our collection pairs clean elemental science with conscious luxury to cleanse the skin, ground the mind, and elevate your daily rituals.
            </p>

            <a
              href="#ritual"
              className="text-sm tracking-[0.2em] uppercase text-foreground/80 hover:text-foreground transition-colors duration-300 border-b border-foreground/30 pb-px"
            >
              Our Virtual Rituals
            </a>
          </div>
        
          <div className="max-w-5xl mx-auto px-5 md:px-12 text-center mb-10 mt-20">
            <h2
              style={{ fontFamily: "'Playfair Display', serif" }}
              className="text-1xl md:text-2xl font-light text-foreground"
            >
              Top Products 
            </h2>
          </div>

          {productError && (
            <div className="max-w-5xl mx-auto px-5 md:px-12 mb-8 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive-foreground">
              Unable to load products from Shopify: {productError}
            </div>
          )}

          {loadingProducts && (
            <div className="max-w-7xl mx-auto px-4 md:px-14 mb-8 text-sm text-muted-foreground">
              Loading products from Shopify...
            </div>
          )}

          {!loadingProducts && !productError && homepageProducts.length === 0 && (
            <div className="max-w-7xl mx-auto px-4 md:px-14 mb-8 text-sm text-muted-foreground">
              No featured products were found in the Shopify storefront.
            </div>
          )}

          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="overflow-x-auto no-scrollbar pb-10">
              <div className="flex gap-8 items-stretch justify-start snap-x snap-mandatory px-2 md:px-0">
                {homepageProducts.map((p) => (
                  <ProductCard key={p.id} product={p} addedId={addedId} onAdd={addToCart} mobile />
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : currentPage === "shop" ? (
        <section className="pt-20 md:pt-24 pb-28 md:pb-36">
          <div className="max-w-7xl mx-auto px-6 md:px-20">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-6">
              <div>
                <p className="text-xs tracking-[0.3em] uppercase text-accent mb-3">
                  The Collection
                </p>
                <h2
                  style={{ fontFamily: "'Playfair Display', serif" }}
                  className="text-3xl md:text-4xl font-light text-foreground"
                >
                  Featured Products
                </h2>
              </div>
              <div className="flex items-center gap-0 border border-border">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`text-[10px] tracking-[0.2em] uppercase px-5 py-2.5 transition-colors duration-200 ${
                      activeCategory === cat
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {productError && (
              <div className="max-w-7xl mx-auto mb-8 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive-foreground">
                Unable to load products from Shopify: {productError}
              </div>
            )}

            {loadingProducts && (
              <div className="max-w-7xl mx-auto mb-8 text-sm text-muted-foreground">
                Loading products from Shopify...
              </div>
            )}

            {!loadingProducts && !productError && filtered.length === 0 && (
              <div className="max-w-7xl mx-auto mb-8 text-sm text-muted-foreground">
                No matching products were found in the Shopify storefront.
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => scrollProducts("left")}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center bg-card border border-border text-foreground hover:bg-foreground hover:text-background transition-colors md:hidden"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => scrollProducts("right")}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center bg-card border border-border text-foreground hover:bg-foreground hover:text-background transition-colors md:hidden"
            >
              <ChevronRight size={14} />
            </button>

            <div
              ref={scrollRef}
              className="md:hidden flex gap-4 overflow-x-auto scrollbar-none px-0 pb-4 snap-x snap-mandatory"
            >
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} addedId={addedId} onAdd={addToCart} mobile />
              ))}
            </div>

            <div className="hidden md:grid md:grid-cols-3 xl:grid-cols-4 gap-8 px-6 md:px-20 py-10">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} addedId={addedId} onAdd={addToCart} />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="max-w-5xl mx-auto px-6 md:px-20 py-28 md:py-36 text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-accent mb-4">About</p>
          <h1
            style={{ fontFamily: "'Playfair Display', serif" }}
            className="text-4xl md:text-5xl font-light text-foreground mb-6"
          >
            About Fire and Soap
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground max-w-2xl mx-auto">
            This page is a placeholder for the Fire and Soap story, rituals, ingredients, and brand experience. We are working on a beautiful, slow-crafted About page to share the heart behind the products.
          </p>
        </section>
      )}


      {currentPage === "home" && (
        <>
          {/* ── INTRO ── */}
          <section className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="grid md:grid-cols-1 gap-16 items-center justify-items-center text-center">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-accent mb-8">
              Our Philosophy
            </p>
            <h2
              style={{ fontFamily: "'Playfair Display', serif" }}
              className="text-4xl md:text-5xl font-light leading-[1.1] text-foreground"
            >
              Scent is the oldest<br />
              <em>language of healing.</em>
            </h2>
          </div>
          <div className="space-y-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Every candle and soap we create begins with a crystal grid and a practitioner's intention. We believe that the way something is made carries energy — and we want that energy to be one of care, clarity, and love.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Our ingredients are sourced from small farms and ethical suppliers. Our wax is a blend of coconut and apricot. Our wicks are unbleached cotton. Nothing unnecessary, nothing harmful.
            </p>
            <a
              href="#"
              className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-foreground hover:text-accent transition-colors duration-300 border-b border-border pb-px"
            >
              Our Story <ArrowRight size={11} />
            </a>
          </div>
        </div>
      </section>

    

      {/* ── TESTIMONIALS ── */}
      <section className="max-w-6xl mx-auto px-6 md:px-14 py-20 md:py-24">
        <div className="grid md:grid-cols-3 gap-10">
          {[
            {
              quote: "This is a placeholder for a real testimonial. The actual testimonial will be added soon.",
              author: "Name Here",
              location: "New York",
            },
            {
              quote: "This is a placeholder for a real testimonial. The actual testimonial will be added soon.",
              author: "Name Here",
              location: "Los Angeles",
            },
            {
              quote: "This is a placeholder for a real testimonial. The actual testimonial will be added soon.",
              author: "Name Here",
              location: "London",
            },
          ].map((t) => (
            <div key={t.author} className="flex flex-col gap-6">
              <div className="flex gap-1">
                {Array(5).fill(null).map((_, i) => (
                  <span key={i} className="text-accent text-xs">★</span>
                ))}
              </div>
              <p
                style={{ fontFamily: "'Playfair Display', serif" }}
                className="text-lg font-light italic text-foreground leading-relaxed"
              >
                "{t.quote}"
              </p>
              <div className="mt-auto pt-4 border-t border-border">
                <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">
                  {t.author} · {t.location}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── NEWSLETTER ── */}
      <section className="bg-card border-t border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24">
          <div className="max-w-xl mx-auto text-center">
            <p className="text-xs tracking-[0.3em] uppercase text-accent mb-5">
              Stay Close
            </p>
            <h2
              style={{ fontFamily: "'Playfair Display', serif" }}
              className="text-3xl font-light text-foreground mb-4"
            >
              Enter the circle
            </h2>
            <p className="text-sm text-muted-foreground mb-10 leading-relaxed">
              Moon phase rituals, new releases, and invitations to our virtual ceremonies. We write slowly, and only when we have something to say.
            </p>
            <div className="flex border border-border">
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 bg-transparent px-5 py-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button className="px-6 text-xs tracking-[0.2em] uppercase bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-300 whitespace-nowrap">
                Join
              </button>
            </div>
          </div>
        </div>
      </section>
        </>
      )}

      {/* ── FOOTER ── */}
      <footer className="border-t border-border px-6 md:px-20 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:justify-between gap-12 mb-16">
            <div className="md:w-1/3">
              <div className="flex flex-col mb-5 gap-2 items-center md:items-start">
                
                  <img
                    src="/photos/logo.PNG"
                    alt="Fire and Soap"
                    className="w-14 h-14 object-contain"
                  />
                
                <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground">
                  <p className="padding-10px">Fire and Soap</p>
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                Reiki-infused candles and soaps, handcrafted with healing intention.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-10 md:w-2/3">
              {[
                { heading: "Shop", links: ["Candles", "Soaps", "Gift Sets", "New Arrivals"] },
                { heading: "About", links: ["Our Story", "The Ritual", "Ingredients", "Gallery"] },
                { heading: "Help", links: ["Shipping", "Returns", "FAQ", "Contact"] },
              ].map((col) => (
                <div key={col.heading}>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-accent mb-5">
                    {col.heading}
                  </p>
                  <ul className="space-y-3">
                    {col.links.map((l) => (
                      <li key={l}>
                        <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                          {l}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-t border-border pt-8">
            <p className="text-[11px] tracking-wide text-muted-foreground">
              © 2026 Fire and Soap. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              {["Instagram", "Pinterest", "TikTok"].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="text-[11px] tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProductCard({
  product,
  addedId,
  onAdd,
  mobile = false,
}: {
  product: Product;
  addedId: string | null;
  onAdd: (id: string) => void;
  mobile?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const isAdded = addedId === product.id;
  const imageSrc = hovered && product.images.length > 1 ? product.images[1] : product.image;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group bg-background border border-border overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.08)] flex flex-col h-full ${mobile ? "min-w-[80vw] md:min-w-0 md:w-80 flex-shrink-0 snap-start" : "w-80"}`}
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
          onClick={() => onAdd(product.id)}
          className={`absolute bottom-4 left-4 right-4 py-3 text-[10px] tracking-[0.2em] uppercase transition-all duration-300 ${
            hovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          } ${isAdded ? "bg-accent text-accent-foreground" : "bg-foreground text-background hover:bg-accent hover:text-accent-foreground"}`}
        >
          {isAdded ? "Added" : "Add to Bag"}
        </button>
      </div>

      <div className="p-6 flex flex-col gap-2">
        <div>
          <h3
            style={{ fontFamily: "'Bodoni Moda', serif" }}
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
