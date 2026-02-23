'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function deleteSong(songId: number) {
  await prisma.song.delete({
    where: { id: songId },
  })

  revalidatePath('/')
}

export async function duplicateSong(songId: number) {
  const song = await prisma.song.findUnique({
    where: { id: songId },
    include: {
      keySets: {
        include: { keyPresses: true },
        orderBy: { position: 'asc' },
      },
    },
  })

  if (!song) throw new Error('Song not found')

  await prisma.song.create({
    data: {
      title: `${song.title} (copy)`,
      youtubeUrl: song.youtubeUrl,
      keySets: {
        create: song.keySets.map((ks) => ({
          position: ks.position,
          type: ks.type,
          name: ks.name,
          keyPresses: {
            create: ks.keyPresses.map((kp) => ({
              midiNote: kp.midiNote,
              color: kp.color,
            })),
          },
        })),
      },
    },
  })

  revalidatePath('/')
}

export async function createSong() {
  const song = await prisma.song.create({
    data: {
      title: 'Untitled Song',
    },
  })

  revalidatePath('/')
  redirect(`/song/${song.id}`)
}
