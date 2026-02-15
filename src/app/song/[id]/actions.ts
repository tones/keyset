'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function updateSongTitle(songId: number, title: string) {
  if (!title.trim()) {
    throw new Error('Title cannot be empty')
  }

  await prisma.song.update({
    where: { id: songId },
    data: { title: title.trim() },
  })

  revalidatePath(`/song/${songId}`)
  revalidatePath('/')
}

export async function reorderKeySets(songId: number, orderedKeySetIds: number[]) {
  // Two-phase update to avoid @@unique([songId, position]) constraint violations:
  // Phase 1: set all positions to negative temp values
  // Phase 2: set final positions
  await prisma.$transaction([
    ...orderedKeySetIds.map((id, index) =>
      prisma.keySet.update({
        where: { id },
        data: { position: -(index + 1) },
      })
    ),
    ...orderedKeySetIds.map((id, index) =>
      prisma.keySet.update({
        where: { id },
        data: { position: index + 1 },
      })
    ),
  ])

  revalidatePath(`/song/${songId}`)
}

export async function createKeySet(songId: number) {
  const lastKeySet = await prisma.keySet.findFirst({
    where: { songId },
    orderBy: { position: 'desc' },
  })
  const nextPosition = (lastKeySet?.position ?? 0) + 1

  const keySet = await prisma.keySet.create({
    data: {
      songId,
      position: nextPosition,
    },
  })

  revalidatePath(`/song/${songId}`)
  revalidatePath('/')
  return keySet
}

export async function toggleKeyPress(keySetId: number, midiNote: number, songId: number) {
  const existing = await prisma.keyPress.findFirst({
    where: { keySetId, midiNote },
  })

  if (existing) {
    await prisma.keyPress.delete({ where: { id: existing.id } })
  } else {
    await prisma.keyPress.create({ data: { keySetId, midiNote } })
  }

  revalidatePath(`/song/${songId}`)
}

export async function updateKeySetName(keySetId: number, name: string, songId: number) {
  await prisma.keySet.update({
    where: { id: keySetId },
    data: { name: name.trim() || null },
  })

  revalidatePath(`/song/${songId}`)
  revalidatePath('/')
}

export async function deleteKeySet(keySetId: number, songId: number) {
  await prisma.keySet.delete({
    where: { id: keySetId },
  })

  revalidatePath(`/song/${songId}`)
  revalidatePath('/')
}
