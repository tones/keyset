import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.keyPress.deleteMany()
  await prisma.keySet.deleteMany()
  await prisma.song.deleteMany()

  // Create sample song
  const song = await prisma.song.create({
    data: {
      title: "Twinkle Twinkle Little Star"
    }
  })

  // Create key sets for the song
  const keySet1 = await prisma.keySet.create({
    data: {
      name: "Verse 1 - C Major",
      position: 1,
      songId: song.id
    }
  })

  const keySet2 = await prisma.keySet.create({
    data: {
      name: "Verse 2 - F Major", 
      position: 2,
      songId: song.id
    }
  })

  const keySet3 = await prisma.keySet.create({
    data: {
      name: "Bridge - G Major",
      position: 3, 
      songId: song.id
    }
  })

  // Create key presses for each key set
  await prisma.keyPress.createMany({
    data: [
      // Key set 1 - C Major (C, E, G, C)
      { midiNote: 60, keySetId: keySet1.id }, // C4
      { midiNote: 64, keySetId: keySet1.id }, // E4  
      { midiNote: 67, keySetId: keySet1.id }, // G4
      { midiNote: 72, keySetId: keySet1.id }, // C5
      
      // Key set 2 - F Major (F, A, C, F)
      { midiNote: 65, keySetId: keySet2.id }, // F4
      { midiNote: 69, keySetId: keySet2.id }, // A4
      { midiNote: 72, keySetId: keySet2.id }, // C5
      { midiNote: 77, keySetId: keySet2.id }, // F5
      
      // Key set 3 - G Major (G, B, D, G)
      { midiNote: 67, keySetId: keySet3.id }, // G4
      { midiNote: 71, keySetId: keySet3.id }, // B4
      { midiNote: 74, keySetId: keySet3.id }, // D5
      { midiNote: 79, keySetId: keySet3.id }, // G5
    ]
  })

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
