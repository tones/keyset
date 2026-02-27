import { NextResponse } from 'next/server'

// Public read-only access: all pages are visible to everyone.
// Authentication is checked server-side in mutating server actions via requireAuth().
// The login page at /login sets the auth_session cookie for edit access.
export function proxy() {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
