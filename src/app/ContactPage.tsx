import { useState, type FormEvent } from "react";

const CONTACT_EMAIL = "fireandsoapinc@gmail.com";
const CONTACT_PHONE = "1-(888) 526-6004";
const CONTACT_PHONE_TEL = "+18885266004";
const WEB3FORMS_ACCESS_KEY = "2bd2ae15-8cd0-4012-b6c8-b96fc65809f7";

type CareOption = "" | "yes" | "no" | "prefer-not";

type ContactFormState = {
  name: string;
  email: string;
  phone: string;
  productName: string;
  datePurchased: string;
  lotNumber: string;
  description: string;
  noticedDate: string;
  medicalCare: CareOption;
  photoLink: string;
};

const INITIAL_FORM: ContactFormState = {
  name: "",
  email: "",
  phone: "",
  productName: "",
  datePurchased: "",
  lotNumber: "",
  description: "",
  noticedDate: "",
  medicalCare: "",
  photoLink: "",
};

const fieldClass =
  "w-full border-0 border-b border-foreground/25 bg-transparent px-0 py-2.5 text-sm text-foreground placeholder:text-foreground/45 focus:outline-none focus:border-accent/55 [color-scheme:dark]";
const labelClass = "mb-1.5 block text-[11px] tracking-[0.18em] uppercase text-foreground/70";

export function ContactPage({ displayFont }: { displayFont: string }) {
  const [form, setForm] = useState<ContactFormState>(INITIAL_FORM);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState("");

  function update<K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (status !== "idle") {
      setStatus("idle");
      setResult("");
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim();
    const productName = form.productName.trim();
    const description = form.description.trim();

    if (!name || !email || !email.includes("@") || !productName || !description) {
      setStatus("error");
      setResult("Please fill in your name, a valid email, the product, and a short note about what happened.");
      return;
    }

    setStatus("loading");
    setResult("");

    try {
      const formData = new FormData(event.target as HTMLFormElement);
      formData.append("access_key", WEB3FORMS_ACCESS_KEY);

      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setStatus("success");
        setResult("Thank you — your message was sent. We’ll be in touch soon.");
        setForm(INITIAL_FORM);
      } else {
        setStatus("error");
        setResult("Something went wrong sending your message. Please try again, or email us directly.");
      }
    } catch {
      setStatus("error");
      setResult("Something went wrong sending your message. Please try again, or email us directly.");
    }
  }

  return (
    <section className="px-5 md:px-14 py-28 md:py-36">
      <div className="text-center mb-12">
        <p className="text-xs tracking-[0.3em] uppercase text-accent mb-4">Help</p>
        <h1
          style={{ fontFamily: displayFont }}
          className="text-3xl md:text-4xl font-light text-foreground mb-2"
        >
          Contact Us
        </h1>
        <p className="text-[10px] tracking-[0.3em] uppercase text-foreground/55">Fire &amp; Soap</p>
      </div>

      <div className="mx-auto max-w-2xl space-y-7 text-sm leading-relaxed text-foreground/85 text-center">
        <p>
          For questions about an order, something about a product that didn&apos;t feel right, or just want to say hello. We read every note.
        </p>

        <form className="space-y-5 text-left text-foreground" onSubmit={onSubmit} noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="contact-name" className={labelClass}>
                Full name
              </label>
              <input
                id="contact-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="contact-email" className={labelClass}>
                Email
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="contact-phone" className={labelClass}>
                Phone <span className="normal-case tracking-normal text-foreground/45">(optional)</span>
              </label>
              <input
                id="contact-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="contact-product" className={labelClass}>
              Which product?
            </label>
            <input
              id="contact-product"
              name="productName"
              type="text"
              required
              placeholder="e.g. Sanctum Noir Candle"
              value={form.productName}
              onChange={(e) => update("productName", e.target.value)}
              className={fieldClass}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-purchased" className={labelClass}>
                When did you purchase it? <span className="normal-case tracking-normal text-foreground/45">(optional)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="contact-purchased"
                  name="datePurchased"
                  type="date"
                  value={form.datePurchased}
                  onChange={(e) => update("datePurchased", e.target.value)}
                  className={`${fieldClass} flex-1`}
                />
                {form.datePurchased && (
                  <button
                    type="button"
                    onClick={() => update("datePurchased", "")}
                    className="shrink-0 text-xs text-foreground/55 underline underline-offset-2 hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-foreground/45">Leave blank if unsure</p>
            </div>

            <div>
              <label htmlFor="contact-lot" className={labelClass}>
                Lot / batch number <span className="normal-case tracking-normal text-foreground/45">(optional)</span>
              </label>
              <input
                id="contact-lot"
                name="lotNumber"
                type="text"
                placeholder="If it’s on the packaging"
                value={form.lotNumber}
                onChange={(e) => update("lotNumber", e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="contact-description" className={labelClass}>
              What happened? Tell us in your own words
            </label>
            <textarea
              id="contact-description"
              name="message"
              required
              rows={4}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className={`${fieldClass} resize-y min-h-[6.5rem]`}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-noticed" className={labelClass}>
                When did you first notice this? <span className="normal-case tracking-normal text-foreground/45">(optional)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="contact-noticed"
                  name="noticedDate"
                  type="date"
                  value={form.noticedDate}
                  onChange={(e) => update("noticedDate", e.target.value)}
                  className={`${fieldClass} flex-1`}
                />
                {form.noticedDate && (
                  <button
                    type="button"
                    onClick={() => update("noticedDate", "")}
                    className="shrink-0 text-xs text-foreground/55 underline underline-offset-2 hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-foreground/45">Leave blank if unsure</p>
            </div>

            <div>
              <label htmlFor="contact-care" className={labelClass}>
                Did you speak with a doctor or get care?{" "}
                <span className="normal-case tracking-normal text-foreground/45">(optional)</span>
              </label>
              <select
                id="contact-care"
                name="medicalCare"
                value={form.medicalCare}
                onChange={(e) => update("medicalCare", e.target.value as CareOption)}
                className={`${fieldClass} appearance-none`}
              >
                <option value="" className="bg-background text-foreground">
                  Prefer to skip
                </option>
                <option value="yes" className="bg-background text-foreground">
                  Yes
                </option>
                <option value="no" className="bg-background text-foreground">
                  No
                </option>
                <option value="prefer-not" className="bg-background text-foreground">
                  Prefer not to say
                </option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="contact-photos" className={labelClass}>
              Link to photos <span className="normal-case tracking-normal text-foreground/45">(optional)</span>
            </label>
            <input
              id="contact-photos"
              name="photoLink"
              type="url"
              placeholder="Google Drive, iCloud, Dropbox…"
              value={form.photoLink}
              onChange={(e) => update("photoLink", e.target.value)}
              className={fieldClass}
            />
            <p className="mt-1.5 text-xs leading-relaxed text-foreground/55">
              If you&apos;d like to include photos, add a shareable link here.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 pt-1">
            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex items-center border border-foreground/20 bg-black px-7 py-3 text-[10px] tracking-[0.28em] uppercase text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "loading" ? "Sending…" : "Send message"}
            </button>

            {result && (
              <p
                role="status"
                className={`text-sm leading-relaxed ${
                  status === "error" ? "text-destructive-foreground" : "text-foreground/80"
                }`}
              >
                {result}
              </p>
            )}

            <p className="text-xs text-foreground/55">
              Prefer a blank email? Contact us directly at{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-foreground underline underline-offset-4 hover:text-accent transition-colors"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
        </form>

        <address className="not-italic text-xs leading-relaxed text-foreground/65 space-y-1 text-left">
          <p className="text-foreground/80">Fire and Soap Inc.</p>
          <p>228 Park Ave S</p>
          <p>New York, New York 10003-1502 US</p>
          <p>PMB #712217</p>
          <p>
            <a
              href={`tel:${CONTACT_PHONE_TEL}`}
              className="text-foreground underline underline-offset-4 hover:text-accent transition-colors"
            >
              {CONTACT_PHONE}
            </a>
          </p>
        </address>
      </div>
    </section>
  );
}

export default ContactPage;
