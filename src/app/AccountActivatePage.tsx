import { useMemo, useState, type FormEvent } from "react";
import {
  activateCustomerByUrl,
  decodeActivationUrlParam,
  type CustomerUserError,
} from "@/lib/shopify";

const fieldClass =
  "w-full border-0 border-b border-foreground/25 bg-transparent px-0 py-2.5 text-sm text-foreground placeholder:text-foreground/45 focus:outline-none focus:border-accent/55";
const labelClass = "mb-1.5 block text-[11px] tracking-[0.18em] uppercase text-foreground/70";

type Status = "idle" | "loading" | "success" | "error";

type AccountActivatePageProps = {
  displayFont: string;
  onActivated?: () => void;
  onGoToLogin?: () => void;
};

function readActivationUrlFromWindow(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return decodeActivationUrlParam(params.get("activationUrl") ?? params.get("activation_url"));
}

function formatCustomerErrors(errors: CustomerUserError[]): string {
  const messages = errors.map((error) => error.message).filter(Boolean);
  return messages.length > 0
    ? messages.join(" ")
    : "Unable to activate your account. Please try again or request a new activation email.";
}

export function AccountActivatePage({ displayFont, onActivated, onGoToLogin }: AccountActivatePageProps) {
  const activationUrl = useMemo(() => readActivationUrlFromWindow(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activationUrl) {
      setStatus("error");
      setErrorMessage("This activation link is missing or invalid. Open the link from your email and try again.");
      return;
    }

    if (password.length < 5) {
      setStatus("error");
      setErrorMessage("Password must be at least 5 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("error");
      setErrorMessage("Passwords do not match.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const result = await activateCustomerByUrl(activationUrl, password);
      if (!result.ok) {
        setStatus("error");
        setErrorMessage(formatCustomerErrors(result.errors));
        return;
      }

      setStatus("success");
      onActivated?.();

      // Brief success beat, then send the shopper to login.
      window.setTimeout(() => {
        onGoToLogin?.();
      }, 1200);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong activating your account. Please try again.",
      );
    }
  }

  return (
    <section className="px-5 md:px-14 py-28 md:py-36">
      <div className="text-center mb-12">
        <p className="text-xs tracking-[0.3em] uppercase text-accent mb-4">Account</p>
        <h1
          style={{ fontFamily: displayFont }}
          className="text-3xl md:text-4xl font-light text-foreground mb-2"
        >
          Activate your account
        </h1>
        <p className="text-[10px] tracking-[0.3em] uppercase text-foreground/55">Fire &amp; Soap</p>
      </div>

      <div className="mx-auto max-w-md space-y-7 text-sm leading-relaxed text-foreground/85">
        {!activationUrl ? (
          <div className="space-y-4 text-center">
            <p role="alert" className="text-sm text-destructive-foreground">
              This activation link is missing or invalid. Please use the link from your email, or contact us for a new
              one.
            </p>
            {onGoToLogin && (
              <button
                type="button"
                onClick={onGoToLogin}
                className="text-xs tracking-[0.2em] uppercase text-foreground underline underline-offset-4 hover:text-accent transition-colors"
              >
                Go to login
              </button>
            )}
          </div>
        ) : status === "success" ? (
          <div className="space-y-3 text-center">
            <p className="text-foreground/90">Your account is active.</p>
            <p className="text-foreground/60">Redirecting you to login…</p>
          </div>
        ) : (
          <>
            <p className="text-center">
              Choose a password to finish setting up your Fire &amp; Soap account.
            </p>

            <form className="space-y-5 text-left text-foreground" onSubmit={onSubmit} noValidate>
              <div>
                <label htmlFor="activate-password" className={labelClass}>
                  Password
                </label>
                <input
                  id="activate-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={5}
                  value={password}
                  disabled={status === "loading"}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (status === "error") {
                      setStatus("idle");
                      setErrorMessage("");
                    }
                  }}
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="activate-password-confirm" className={labelClass}>
                  Confirm password
                </label>
                <input
                  id="activate-password-confirm"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={5}
                  value={confirmPassword}
                  disabled={status === "loading"}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (status === "error") {
                      setStatus("idle");
                      setErrorMessage("");
                    }
                  }}
                  className={fieldClass}
                />
              </div>

              <div className="flex flex-col items-start gap-3 pt-1">
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="inline-flex items-center gap-2 border border-foreground/20 bg-black px-7 py-3 text-[10px] tracking-[0.28em] uppercase text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === "loading" ? (
                    <>
                      <span
                        className="inline-block h-3 w-3 animate-spin rounded-full border border-foreground/30 border-t-foreground"
                        aria-hidden
                      />
                      Activating…
                    </>
                  ) : (
                    "Activate account"
                  )}
                </button>

                {errorMessage && (
                  <p role="alert" className="text-sm leading-relaxed text-destructive-foreground">
                    {errorMessage}
                  </p>
                )}
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  );
}

export default AccountActivatePage;
