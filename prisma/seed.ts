import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.keyPress.deleteMany()
  await prisma.keySet.deleteMany()
  await prisma.song.deleteMany()

  // Create sample song
  const songs = await prisma.song.createMany({
    data: [
      { title: "Twinkle Twinkle Little Star" },
      { title: "Autumn Leaves" },
      { title: "Blue Bossa" },
    ],
  })

  const createdSongs = await prisma.song.findMany({ orderBy: { id: 'asc' } })

  // Create key sets for the song
  const keySetSpecs: Array<{
    songId: number
    name: string
    position: number
    midiNotes: number[]
  }> = []

  const byTitle = new Map(createdSongs.map((s) => [s.title, s]))
  const twinkle = byTitle.get("Twinkle Twinkle Little Star")
  const autumn = byTitle.get("Autumn Leaves")
  const bossa = byTitle.get("Blue Bossa")

  if (!twinkle || !autumn || !bossa) throw new Error('Seed songs not found after creation')

  keySetSpecs.push(
    { songId: twinkle.id, name: "Verse 1 - C Major", position: 1, midiNotes: [60, 64, 67, 72] },
    { songId: twinkle.id, name: "Verse 2 - F Major", position: 2, midiNotes: [65, 69, 72, 77] },
    { songId: twinkle.id, name: "Bridge - G Major", position: 3, midiNotes: [67, 71, 74, 79] },
  )

  keySetSpecs.push(
    { songId: autumn.id, name: "A minor", position: 1, midiNotes: [57, 60, 64, 69] },
    { songId: autumn.id, name: "D7", position: 2, midiNotes: [62, 66, 69, 72] },
    { songId: autumn.id, name: "G major", position: 3, midiNotes: [55, 59, 62, 67] },
    { songId: autumn.id, name: "C major", position: 4, midiNotes: [60, 64, 67, 72] },
  )

  keySetSpecs.push(
    { songId: bossa.id, name: "Cm7", position: 1, midiNotes: [60, 63, 67, 70] },
    { songId: bossa.id, name: "Fm7", position: 2, midiNotes: [65, 68, 72, 75] },
    { songId: bossa.id, name: "Dm7b5", position: 3, midiNotes: [62, 65, 68, 72] },
    { songId: bossa.id, name: "G7", position: 4, midiNotes: [67, 71, 74, 77] },
    { songId: bossa.id, name: "Cm7 (repeat)", position: 5, midiNotes: [60, 63, 67, 70] },
  )

  const createdKeySets = await prisma.$transaction(
    keySetSpecs.map((spec) =>
      prisma.keySet.create({
        data: {
          name: spec.name,
          position: spec.position,
          songId: spec.songId,
        },
      }),
    ),
  )

  const keyPressRows = createdKeySets.flatMap((ks) => {
    const spec = keySetSpecs.find(
      (s) => s.songId === ks.songId && s.position === ks.position && s.name === ks.name,
    )
    if (!spec) return []
    return spec.midiNotes.map((midiNote) => ({ midiNote, keySetId: ks.id }))
  })

  // Create key presses for each key set
  if (keyPressRows.length > 0) {
    await prisma.keyPress.createMany({ data: keyPressRows })
  }

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
