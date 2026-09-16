import { NextResponse, type NextRequest } from "next/server";

const targets: Readonly<Record<string, string>> = {
  "/index.html": "/", "/privacy.html": "/privacy", "/cookies.html": "/privacy#cookies",
};
export function proxy(request: NextRequest) {
  const target = targets[request.nextUrl.pathname];
  if (!target || !["GET", "HEAD"].includes(request.method)) return NextResponse.next();
  // Fixed paths discard legacy queries; no personal values are imported.
  return NextResponse.redirect(new URL(target, request.url), 308);
}
export const config = { matcher: ["/index.html", "/privacy.html", "/cookies.html"] };
