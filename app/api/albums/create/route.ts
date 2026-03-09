import { NextRequest, NextResponse } from 'next/server'
import { createAlbum } from '@/lib/github'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json()

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Album name is required' }, { status: 400 })
    }

    // Sanitize: only allow alphanumeric, spaces, hyphens, underscores
    const sanitized = name.trim().replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '-')
    if (!sanitized) {
      return NextResponse.json({ error: 'Invalid album name' }, { status: 400 })
    }

    await createAlbum(sanitized)
    return NextResponse.json({ name: sanitized, path: sanitized })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /albums/create]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
