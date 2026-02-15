import 'dotenv/config'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../generated/prisma/client'

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? 'file:./dev.db' })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Clear existing data
  await prisma.keyPress.deleteMany()
  await prisma.keySet.deleteMany()
  await prisma.song.deleteMany()

  // Reset autoincrement sequences so IDs are predictable
  await prisma.$executeRawUnsafe("DELETE FROM sqlite_sequence WHERE name IN ('Song', 'KeySet', 'KeyPress')")

  // Songs 1–3: filler songs with 2 key sets each (key set ids 1–6)
  const song1 = await prisma.song.create({ data: {
    title: "Autumn Leaves",
    analysis: "Key: A minor\n\n1. \"A minor\" — A minor triad\n2. \"D7\" — D dominant 7\n\nClassic ii-V progression.",
    analysisUpdatedAt: new Date('2026-01-10T08:00:00Z'),
  } })
  const song2 = await prisma.song.create({ data: { title: "Blue Bossa" } })
  const song3 = await prisma.song.create({ data: {
    title: "Fly Me to the Moon",
    analysis: "Key: A minor\n\n1. \"Am7\" — A minor 7\n2. \"Dm7\" — D minor 7\n\nClassic jazz standard progression.",
    analysisUpdatedAt: new Date('2026-01-12T09:00:00Z'),
  } })

  // Song 4: the main test song (key set ids 7–9)
  const song4 = await prisma.song.create({ data: {
    title: "Tim's Beautiful Song",
    analysis: "Key: C major\n\n1. \"Verse 1 - C Major\" (C4, E4, G4, C5) — C major triad\n2. \"Verse 2 - F Major\" (F4, A4, C5, F5) — F major triad\n3. \"Bridge - G Major\" (G4, B4, D5, G5) — G major triad\n\nThis is a classic I-IV-V progression in C major.",
    analysisUpdatedAt: new Date('2026-01-15T10:30:00Z'),
  } })

  // Song 5: empty song (no key sets — used by "no key sets yet" test)
  await prisma.song.create({ data: { title: "Empty Song" } })

  // Key sets for songs 1–3 (ids 1–6)
  const fillerKeySets = [
    { songId: song1.id, position: 1, type: 'chord' as const, midiNotes: [57, 60, 64, 69] },
    { songId: song1.id, position: 2, type: 'chord' as const, midiNotes: [62, 66, 69, 72] },
    { songId: song2.id, position: 1, type: 'chord' as const, midiNotes: [60, 63, 67, 70] },
    { songId: song2.id, position: 2, type: 'chord' as const, midiNotes: [65, 68, 72, 75] },
    { songId: song3.id, position: 1, type: 'chord' as const, midiNotes: [57, 60, 64, 67] },
    { songId: song3.id, position: 2, type: 'chord' as const, midiNotes: [62, 65, 69, 72] },
  ]

  // Key sets for song 4 (ids 7–10)
  const testKeySets = [
    { songId: song4.id, position: 1, type: 'chord' as const, midiNotes: [60, 64, 67, 72] },
    { songId: song4.id, position: 2, type: 'chord' as const, midiNotes: [65, 69, 72, 77] },
    { songId: song4.id, position: 3, type: 'chord' as const, midiNotes: [67, 71, 74, 79] },
    { songId: song4.id, position: 4, type: 'flourish' as const, midiNotes: [60, 62, 64, 65, 67] },
  ]

  const allSpecs = [...fillerKeySets, ...testKeySets]

  // Create key sets in order so autoincrement IDs are predictable
  const createdKeySets = []
  for (const spec of allSpecs) {
    const ks = await prisma.keySet.create({
      data: { position: spec.position, type: spec.type, songId: spec.songId },
    })
    createdKeySets.push(ks)
  }

  // Create key presses for each key set
  const keyPressRows = createdKeySets.flatMap((ks, i) =>
    allSpecs[i].midiNotes.map((midiNote) => ({ midiNote, keySetId: ks.id })),
  )
  await prisma.keyPress.createMany({ data: keyPressRows })

  console.log('Database seeded successfully!')
  console.log(`  Songs: ${await prisma.song.count()}`)
  console.log(`  Key Sets: ${await prisma.keySet.count()}`)
  console.log(`  Key Presses: ${await prisma.keyPress.count()}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
