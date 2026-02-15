import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const password = process.env.AUTH_PASSWORD
  if (!password) return NextResponse.next() // No password set = no auth required (dev mode)

  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ')
    if (scheme === 'Basic' && encoded) {
      const decoded = atob(encoded)
      const [, pwd] = decoded.split(':')
      if (pwd === password) return NextResponse.next()
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Keysets"' },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
