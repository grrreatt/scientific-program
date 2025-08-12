import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = new URL(request.url)
  // Route group `(admin)` is not part of the URL. If someone visits /admin/..., redirect to the non-prefixed route.
  if (url.pathname.startsWith('/admin/')) {
    url.pathname = url.pathname.replace(/^\/admin(\/|$)/, '/')
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}


