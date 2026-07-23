import type { RitualDraft } from "./types";

export type SavedRitualResult = {
  id: string;
  draft: Pick<RitualDraft, "element" | "hz" | "warmth" | "botanical" | "sanctuary" | "productPair">;
  createdAt: string;
};

/**
 * Only call at the end of the ritual (optional share/save).
 * Never poll — mockup can skip this entirely and stay fully local.
 */
export async function saveRitualResult(
  draft: RitualDraft,
): Promise<SavedRitualResult | null> {
  if (!draft.element || !draft.productPair) return null;

  try {
    const response = await fetch("/api/miniapp/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        element: draft.element,
        hz: draft.hz,
        warmth: draft.warmth,
        botanical: draft.botanical,
        sanctuary: draft.sanctuary,
        productPair: draft.productPair,
      }),
    });
    if (!response.ok) return null;
    return (await response.json()) as SavedRitualResult;
  } catch {
    return null;
  }
}
