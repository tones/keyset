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

export async function toggleKeyPress(keySetId: number, midiNote: number, songId: number, color: string = 'red') {
  const existing = await prisma.keyPress.findFirst({
    where: { keySetId, midiNote },
  })

  if (existing && existing.color === color) {
    // Same color: toggle off
    await prisma.keyPress.delete({ where: { id: existing.id } })
  } else if (existing) {
    // Different color: update
    await prisma.keyPress.update({ where: { id: existing.id }, data: { color } })
  } else {
    // New note
    await prisma.keyPress.create({ data: { keySetId, midiNote, color } })
  }

  revalidatePath(`/song/${songId}`)
}

export async function shiftOctave(keySetId: number, songId: number, direction: 'up' | 'down') {
  const keyPresses = await prisma.keyPress.findMany({ where: { keySetId } })
  const delta = direction === 'up' ? 12 : -12

  // Check all notes stay in valid MIDI range (0–127)
  const allValid = keyPresses.every((kp) => {
    const newNote = kp.midiNote + delta
    return newNote >= 0 && newNote <= 127
  })
  if (!allValid) return

  await prisma.$transaction(
    keyPresses.map((kp) =>
      prisma.keyPress.update({
        where: { id: kp.id },
        data: { midiNote: kp.midiNote + delta },
      })
    )
  )

  revalidatePath(`/song/${songId}`)
}

export async function updateKeySetType(keySetId: number, songId: number, type: 'chord' | 'flourish') {
  await prisma.keySet.update({
    where: { id: keySetId },
    data: { type },
  })
  revalidatePath(`/song/${songId}`)
}

export async function deleteKeySet(keySetId: number, songId: number) {
  await prisma.keySet.delete({
    where: { id: keySetId },
  })

  revalidatePath(`/song/${songId}`)
  revalidatePath('/')
}
