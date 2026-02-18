import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

function signToken(password: string): string {
  return crypto.createHmac('sha256', password).update('keyset-auth').digest('hex')
}

export function proxy(request: NextRequest) {
  const password = process.env.AUTH_PASSWORD
  if (!password) return NextResponse.next() // No password set = no auth required (dev mode)

  const { pathname } = request.nextUrl

  // Allow login page and its POST action through
  if (pathname === '/login') return NextResponse.next()

  // Check for valid session cookie
  const sessionCookie = request.cookies.get('auth_session')
  if (sessionCookie?.value === signToken(password)) {
    return NextResponse.next()
  }

  // Redirect to login page
  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = '/login'
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
