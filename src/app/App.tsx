import { useState, useEffect, useRef } from "react";
import { ShoppingBag, Search, Menu, X, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

const products = [
  {
    id: 1,
    name: "Selenite & Sage",
    category: "Candle",
    price: "$68",
    size: "8 oz",
    description: "Cleansing white sage with grounding selenite energy. Purifies the space.",
    image: "https://images.unsplash.com/photo-1634114236822-9d0a72cc94a2?w=600&h=720&fit=crop&auto=format",
    tag: "BESTSELLER",
  },
  {
    id: 2,
    name: "Black Tourmaline",
    category: "Candle",
    price: "$68",
    size: "8 oz",
    description: "Protective and grounding. Dark amber, vetiver, and black pepper.",
    image: "https://images.unsplash.com/photo-1508093989287-061d64de7324?w=600&h=720&fit=crop&auto=format",
    tag: "NEW",
  },
  {
    id: 3,
    name: "Rose Quartz",
    category: "Candle",
    price: "$68",
    size: "8 oz",
    description: "Opening the heart chakra. Damask rose, pink grapefruit, and sandalwood.",
    image: "https://images.unsplash.com/photo-1720118509152-2df877673bee?w=600&h=720&fit=crop&auto=format",
    tag: "BESTSELLER",
  },
  {
    id: 4,
    name: "Sacred Smoke",
    category: "Soap",
    price: "$32",
    size: "4.5 oz",
    description: "Palo santo, activated charcoal, and frankincense. A ritual in your palm.",
    image: "https://images.unsplash.com/photo-1636846528145-46195929433c?w=600&h=720&fit=crop&auto=format",
    tag: "NEW",
  },
  {
    id: 5,
    name: "Lavender Moon",
    category: "Soap",
    price: "$32",
    size: "4.5 oz",
    description: "Lunar-charged lavender and oat. Soothes the nervous system.",
    image: "https://images.unsplash.com/photo-1652233172336-6efc037a3766?w=600&h=720&fit=crop&auto=format",
    tag: "",
  },
  {
    id: 6,
    name: "Amethyst Dreams",
    category: "Candle",
    price: "$72",
    size: "12 oz",
    description: "Deep intuition. Lavender, bergamot, and violet leaf over a cedar base.",
    image: "https://images.unsplash.com/photo-1765745520336-88acf0b84fe4?w=600&h=720&fit=crop&auto=format",
    tag: "",
  },
];

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
  const [addedId, setAddedId] = useState<number | null>(null);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHeroLoaded(true);
  }, []);

  const filtered = products.filter((p) => {
    if (activeCategory === "All") return true;
    if (activeCategory === "Candles") return p.category === "Candle";
    if (activeCategory === "Soaps") return p.category === "Soap";
    if (activeCategory === "New Arrivals") return p.tag === "NEW";
    return true;
  });

  function addToCart(id: number) {
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
      style={{ fontFamily: "'Jost', sans-serif" }}
    >
      {/* ── NAV ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between h-16">
          {/* Left nav */}
          <nav className="hidden md:flex items-center gap-8">
            {["Home", "Shop", "About"].map((item) => (
              <a
                key={item}
                href="#"
                className="text-xs tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-300"
              >
                {item}
              </a>
            ))}
          </nav>

          {/* Logo */}
          <a
            href="#"
            className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center"
          >
            <span
              style={{ fontFamily: "'Bodoni Moda', serif", fontStyle: "italic" }}
              className="text-2xl font-light tracking-wider text-foreground"
            >
              TS
            </span>
            <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground -mt-0.5">
              Ritual Studio
            </span>
          </a>

          {/* Right nav */}
          <div className="flex items-center gap-5">
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
            {["Home", "Shop", "Gallery", "About"].map((item) => (
              <a
                key={item}
                href="#"
                onClick={() => setMenuOpen(false)}
                style={{ fontFamily: "'Bodoni Moda', serif" }}
                className="text-4xl font-light text-foreground hover:text-accent transition-colors"
              >
                {item}
              </a>
            ))}
          </nav>
        </div>
      )}

      {/* ── HERO ── */}
      <section className="relative h-screen overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1634114236822-9d0a72cc94a2?w=1800&h=1200&fit=crop&auto=format"
          alt="A single candle burning against a dark background"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${heroLoaded ? "opacity-60" : "opacity-0"}`}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />

        <div
          className={`relative z-10 h-full flex flex-col justify-end pb-24 px-8 md:px-20 max-w-2xl transition-all duration-1000 delay-300 ${heroLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <p className="text-xs tracking-[0.3em] uppercase text-accent mb-6">
            Reiki-Infused · Handcrafted
          </p>
          <h1
            style={{ fontFamily: "'Bodoni Moda', serif" }}
            className="text-5xl md:text-7xl font-light leading-[1.05] text-foreground mb-8"
          >
            Made for<br />
            <em>the moment</em><br />
            you finally exhale.
          </h1>
          <p className="text-sm tracking-wide text-muted-foreground mb-10 max-w-sm leading-relaxed">
            Individually handcrafted with premium ingredients and charged with healing intention.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="#shop"
              className="inline-flex items-center gap-3 text-xs tracking-[0.2em] uppercase text-background bg-foreground px-8 py-3.5 hover:bg-accent hover:text-accent-foreground transition-colors duration-300"
            >
              Explore the Collection
              <ArrowRight size={12} />
            </a>
            <a
              href="#ritual"
              className="text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-300 border-b border-border pb-px"
            >
              Our Ritual
            </a>
          </div>
        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div className="border-y border-border py-3 bg-card flex items-center justify-center gap-6 opacity-40">
        {Array(9).fill(null).map((_, i) => (
          <span key={i} className="block w-1 h-1 rounded-full bg-foreground" />
        ))}
      </div>

      {/* ── INTRO ── */}
      <section className="max-w-7xl mx-auto px-6 md:px-20 py-28 md:py-36">
        <div className="grid md:grid-cols-2 gap-20 items-end">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-accent mb-8">
              The Philosophy
            </p>
            <h2
              style={{ fontFamily: "'Bodoni Moda', serif" }}
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

      {/* ── SHOP ── */}
      <section id="shop" className="pb-28 md:pb-36">
        <div className="max-w-7xl mx-auto px-6 md:px-20">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-6">
            <div>
              <p className="text-xs tracking-[0.3em] uppercase text-accent mb-3">
                The Collection
              </p>
              <h2
                style={{ fontFamily: "'Bodoni Moda', serif" }}
                className="text-3xl md:text-4xl font-light text-foreground"
              >
                Featured Products
              </h2>
            </div>
            {/* Category filter */}
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
        </div>

        {/* Horizontal scroll on mobile, grid on desktop */}
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
            className="md:hidden flex gap-4 overflow-x-auto scrollbar-none px-6 pb-4 snap-x snap-mandatory"
          >
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} addedId={addedId} onAdd={addToCart} mobile />
            ))}
          </div>

          <div className="hidden md:grid grid-cols-3 gap-px bg-border max-w-7xl mx-auto px-6 md:px-20">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} addedId={addedId} onAdd={addToCart} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FULL-BLEED EDITORIAL ── */}
      <section className="relative h-[70vh] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1765745520336-88acf0b84fe4?w=1800&h=900&fit=crop&auto=format"
          alt="Serene bathroom setting with candles and ritual objects"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/80" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <p className="text-xs tracking-[0.3em] uppercase text-accent mb-5">
            Ritual Objects
          </p>
          <h2
            style={{ fontFamily: "'Bodoni Moda', serif" }}
            className="text-4xl md:text-6xl font-light text-foreground max-w-2xl leading-[1.1] mb-8"
          >
            <em>Objects</em> that hold<br />the memory of intention.
          </h2>
          <a
            href="#"
            className="inline-flex items-center gap-3 text-xs tracking-[0.2em] uppercase text-foreground border border-foreground/30 px-8 py-3.5 hover:bg-foreground hover:text-background transition-colors duration-300"
          >
            Shop All
            <ArrowRight size={12} />
          </a>
        </div>
      </section>

      {/* ── RITUAL GUIDE ── */}
      <section id="ritual" className="max-w-7xl mx-auto px-6 md:px-20 py-28 md:py-36">
        <div className="mb-16">
          <p className="text-xs tracking-[0.3em] uppercase text-accent mb-4">
            The Practice
          </p>
          <h2
            style={{ fontFamily: "'Bodoni Moda', serif" }}
            className="text-3xl md:text-4xl font-light text-foreground"
          >
            How to use your candle
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-border">
          {rituals.map((r) => (
            <div key={r.number} className="bg-background p-10 md:p-12">
              <p
                style={{ fontFamily: "'Bodoni Moda', serif" }}
                className="text-5xl font-light text-border mb-8"
              >
                {r.number}
              </p>
              <h3
                style={{ fontFamily: "'Bodoni Moda', serif" }}
                className="text-xl font-light text-foreground mb-4"
              >
                {r.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {r.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── INGREDIENTS ── */}
      <section className="bg-card border-y border-border py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 md:px-20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-10">
            <div className="md:w-1/3">
              <p className="text-xs tracking-[0.3em] uppercase text-accent mb-4">
                What's Inside
              </p>
              <h2
                style={{ fontFamily: "'Bodoni Moda', serif" }}
                className="text-3xl font-light text-foreground"
              >
                Ingredients we<br />
                <em>believe in</em>
              </h2>
            </div>
            <div className="md:w-2/3 grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { name: "Coconut & Apricot Wax", note: "Clean, even burn" },
                { name: "Unbleached Cotton Wick", note: "No zinc, no lead" },
                { name: "Pure Essential Oils", note: "No synthetic fragrance" },
                { name: "Reiki Intention", note: "Set by a practitioner" },
              ].map((ing) => (
                <div key={ing.name} className="border-t border-border pt-5">
                  <p className="text-sm font-light text-foreground mb-1.5">{ing.name}</p>
                  <p className="text-[11px] tracking-[0.15em] uppercase text-muted-foreground">{ing.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="max-w-7xl mx-auto px-6 md:px-20 py-28 md:py-36">
        <div className="grid md:grid-cols-3 gap-12">
          {[
            {
              quote: "The first time I lit the Selenite & Sage candle, my entire apartment shifted. I don't have another word for it.",
              author: "Margaux D.",
              location: "New York",
            },
            {
              quote: "I've tried every luxury candle brand and nothing compares. These are the only candles that actually do something.",
              author: "Priya N.",
              location: "Los Angeles",
            },
            {
              quote: "The Sacred Smoke soap has become my morning ritual. It sets the entire tone for the day.",
              author: "Isadora T.",
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
                style={{ fontFamily: "'Bodoni Moda', serif" }}
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
        <div className="max-w-7xl mx-auto px-6 md:px-20 py-20 md:py-28">
          <div className="max-w-xl mx-auto text-center">
            <p className="text-xs tracking-[0.3em] uppercase text-accent mb-5">
              Stay Close
            </p>
            <h2
              style={{ fontFamily: "'Bodoni Moda', serif" }}
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
              <button className="px-6 text-xs tracking-[0.2em] uppercase bg-foreground text-background hover:bg-accent hover:text-accent-foreground transition-colors duration-300 whitespace-nowrap">
                Join
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border px-6 md:px-20 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:justify-between gap-12 mb-16">
            <div className="md:w-1/3">
              <div className="flex flex-col mb-5">
                <span
                  style={{ fontFamily: "'Bodoni Moda', serif", fontStyle: "italic" }}
                  className="text-3xl font-light text-foreground"
                >
                  TS
                </span>
                <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground">
                  Ritual Studio
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
              © 2025 Ritual Studio. All rights reserved.
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
  product: typeof products[0];
  addedId: number | null;
  onAdd: (id: number) => void;
  mobile?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const isAdded = addedId === product.id;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group bg-background flex flex-col ${mobile ? "min-w-[280px] snap-start" : ""}`}
    >
      <div className="relative overflow-hidden aspect-[3/4] bg-card">
        <img
          src={product.image}
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

      <div className="p-5 flex flex-col gap-1">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1">
              {product.category} · {product.size}
            </p>
            <h3
              style={{ fontFamily: "'Bodoni Moda', serif" }}
              className="text-lg font-light text-foreground"
            >
              {product.name}
            </h3>
          </div>
          <span className="text-sm text-muted-foreground pt-1">{product.price}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
          {product.description}
        </p>
      </div>
    </div>
  );
}
