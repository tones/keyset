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

export async function createSong() {
  const song = await prisma.song.create({
    data: {
      title: 'Untitled Song',
    },
  })

  revalidatePath('/')
  redirect(`/song/${song.id}`)
}
