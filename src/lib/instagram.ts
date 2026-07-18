/** Minimal Instagram helpers kept for footer social links only. */

export function getInstagramProfileUrl(username: string): string {
  return `https://www.instagram.com/${username.replace(/^@/, "")}/`;
}
