'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function saveKeySets(songId: number, keySets: { type: string; keyPresses: { midiNote: number; color: string }[] }[], analysis?: { text: string | null; updatedAt: string | null }) {
  await prisma.$transaction(async (tx) => {
    // Delete all existing key sets (cascade deletes key presses)
    await tx.keySet.deleteMany({ where: { songId } })

    // Recreate all key sets with their key presses
    for (let i = 0; i < keySets.length; i++) {
      await tx.keySet.create({
        data: {
          songId,
          position: i + 1,
          type: keySets[i].type,
          keyPresses: {
            create: keySets[i].keyPresses.map((kp) => ({
              midiNote: kp.midiNote,
              color: kp.color,
            })),
          },
        },
      })
    }

    // Persist analysis if provided
    if (analysis !== undefined) {
      await tx.song.update({
        where: { id: songId },
        data: {
          analysis: analysis.text,
          analysisUpdatedAt: analysis.updatedAt ? new Date(analysis.updatedAt) : null,
        },
      })
    }
  })

  revalidatePath('/')
}

export async function updateYoutubeUrl(songId: number, url: string | null) {
  await prisma.song.update({
    where: { id: songId },
    data: { youtubeUrl: url || null },
  })
  revalidatePath(`/song/${songId}`)
}

export async function updateSongTitle(songId: number, title: string) {
  if (!title.trim()) {
    throw new Error('Title cannot be empty')
  }

  await prisma.song.update({
    where: { id: songId },
    data: { title: title.trim(), imageUrl: null },
  })

  revalidatePath(`/song/${songId}`)
  revalidatePath('/')
}

export async function updateCompactView(songId: number, compact: boolean) {
  await prisma.song.update({
    where: { id: songId },
    data: { compactView: compact },
  })
}

export async function refreshAlbumArt(songId: number, title: string): Promise<string | null> {
  const { fetchAlbumArt } = await import('@/lib/albumArt')
  const url = await fetchAlbumArt(title)
  if (url) {
    await prisma.song.update({ where: { id: songId }, data: { imageUrl: url } })
    revalidatePath(`/song/${songId}`)
    revalidatePath('/')
  }
  return url
}

