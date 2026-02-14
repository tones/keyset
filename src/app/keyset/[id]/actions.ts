'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function saveKeyPresses(keySetId: number, songId: number, midiNotes: number[]) {
  // Delete all existing key presses for this key set, then create the new ones
  await prisma.$transaction([
    prisma.keyPress.deleteMany({
      where: { keySetId },
    }),
    ...midiNotes.map((midiNote) =>
      prisma.keyPress.create({
        data: { midiNote, keySetId },
      })
    ),
  ])

  revalidatePath(`/keyset/${keySetId}`)
  revalidatePath(`/song/${songId}`)
  revalidatePath('/')
}

export async function updateKeySetName(keySetId: number, songId: number, name: string) {
  await prisma.keySet.update({
    where: { id: keySetId },
    data: { name: name.trim() || null },
  })

  revalidatePath(`/keyset/${keySetId}`)
  revalidatePath(`/song/${songId}`)
}
