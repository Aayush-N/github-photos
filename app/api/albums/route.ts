import { NextResponse } from 'next/server'
import { listAlbums } from '@/lib/github'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const albums = await listAlbums()
    return NextResponse.json(albums)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /albums]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
