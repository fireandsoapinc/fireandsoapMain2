import { useEffect } from "react";
import { SHOPIFY_CUSTOMER_ACCOUNT_URL } from "@/lib/customerAccounts";

type AccountLoginPageProps = {
  displayFont: string;
  onGoHome?: () => void;
};

/**
 * Legacy /account/login deep link — redirect to hosted New Customer Accounts.
 */
export function AccountLoginPage({ displayFont }: AccountLoginPageProps) {
  useEffect(() => {
    window.location.replace(SHOPIFY_CUSTOMER_ACCOUNT_URL);
  }, []);

  return (
    <section className="px-5 md:px-14 py-28 md:py-36">
      <div className="text-center mb-12">
        <p className="text-xs tracking-[0.3em] uppercase text-accent mb-4">Account</p>
        <h1
          style={{ fontFamily: displayFont }}
          className="text-3xl md:text-4xl font-light text-foreground mb-2"
        >
          My Orders
        </h1>
        <p className="text-[10px] tracking-[0.3em] uppercase text-foreground/55">Fire &amp; Soap</p>
      </div>

      <div className="mx-auto max-w-md space-y-6 text-center text-sm leading-relaxed text-foreground/85">
        <p>Taking you to My Orders…</p>
        <a
          href={SHOPIFY_CUSTOMER_ACCOUNT_URL}
          className="inline-flex items-center border border-foreground/20 bg-black px-7 py-3 text-[10px] tracking-[0.28em] uppercase text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Continue
        </a>
      </div>
    </section>
  );
}

export default AccountLoginPage;
