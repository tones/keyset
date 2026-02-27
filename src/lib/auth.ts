import crypto from 'crypto'
import { cookies } from 'next/headers'

function signToken(password: string): string {
  return crypto.createHmac('sha256', password).update('keyset-auth').digest('hex')
}

/** Check if the current request has a valid auth session. Safe to call from server components and server actions. */
export async function isAuthenticated(): Promise<boolean> {
  const password = process.env.AUTH_PASSWORD
  if (!password) return true // No password set = everyone is authenticated (dev mode)

  const cookieStore = await cookies()
  const session = cookieStore.get('auth_session')
  return session?.value === signToken(password)
}

/** Throw if not authenticated. Call at the top of mutating server actions. */
export async function requireAuth(): Promise<void> {
  if (!(await isAuthenticated())) {
    throw new Error('Unauthorized')
  }
}
