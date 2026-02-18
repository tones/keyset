'use server'

import crypto from 'crypto'
import { cookies } from 'next/headers'

function signToken(password: string): string {
  return crypto.createHmac('sha256', password).update('keyset-auth').digest('hex')
}

export async function login(formData: FormData): Promise<{ error?: string } | undefined> {
  const password = process.env.AUTH_PASSWORD
  if (!password) return undefined // No auth required

  const submitted = formData.get('password') as string
  if (submitted !== password) {
    return { error: 'Incorrect password' }
  }

  const cookieStore = await cookies()
  cookieStore.set('auth_session', signToken(password), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })

  return undefined
}
