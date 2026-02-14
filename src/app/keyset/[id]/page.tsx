import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EditableKeySet from '@/components/EditableKeySet'
import EditableTitle from '@/components/EditableTitle'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const keySet = await prisma.keySet.findUnique({ where: { id: parseInt(id) } })
  return { title: keySet?.name ?? 'Key Set' }
}

export default async function KeySetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const keySet = await prisma.keySet.findUnique({
    where: { id: parseInt(id) },
    include: {
      keyPresses: {
        orderBy: {
          midiNote: 'asc'
        }
      },
      song: true
    }
  })

  if (!keySet) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href={`/song/${keySet.song.id}`} className="text-blue-500 hover:text-blue-700 mb-4">
            ← Back to {keySet.song.title}
          </Link>
          <EditableTitle initialTitle={keySet.name || `Key Set ${keySet.position}`} onSave={async (name) => { 'use server'; const { updateKeySetName } = await import('./actions'); await updateKeySetName(keySet.id, keySet.song.id, name); }} />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Edit Keys</h2>
          <EditableKeySet
            keySetId={keySet.id}
            songId={keySet.song.id}
            initialNotes={keySet.keyPresses.map(kp => kp.midiNote)}
          />
        </div>
      </div>
    </div>
  )
}

