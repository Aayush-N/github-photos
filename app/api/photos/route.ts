import { NextRequest, NextResponse } from 'next/server'
import { listPhotos } from '@/lib/github'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const album = req.nextUrl.searchParams.get('album') ?? ''
    const photos = await listPhotos(album)
    return NextResponse.json(photos)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /photos]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
