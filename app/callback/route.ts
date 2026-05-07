import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export function GET(request: NextRequest) {
  const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim()

  if (!convexSiteUrl) {
    return NextResponse.redirect(
      new URL("/settings?x_error=missing_convex_site", request.url)
    )
  }

  const target = new URL("/oauth/x/callback", convexSiteUrl)
  target.search = request.nextUrl.search

  return NextResponse.redirect(target)
}
