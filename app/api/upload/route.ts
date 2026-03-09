import { NextRequest, NextResponse } from 'next/server'
import { uploadFile, isImage } from '@/lib/github'

export const dynamic = 'force-dynamic'

// Max file size: 25MB (GitHub API limit for file content)
const MAX_SIZE_MB = 25
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { filename, content, album } = body as {
      filename: string
      content: string   // base64-encoded file content
      album?: string
    }

    if (!filename || !content) {
      return NextResponse.json(
        { error: 'filename and content are required' },
        { status: 400 }
      )
    }

    if (!isImage(filename)) {
      return NextResponse.json(
        { error: 'Only image files are supported' },
        { status: 400 }
      )
    }

    // Estimate decoded size (base64 is ~4/3 of original)
    const estimatedBytes = (content.length * 3) / 4
    if (estimatedBytes > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_SIZE_MB}MB` },
        { status: 413 }
      )
    }

    // Sanitize filename: remove path traversal chars
    const safeName = filename.replace(/[^a-zA-Z0-9.\-_ ]/g, '').trim()
    if (!safeName) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    const path = album ? `${album}/${safeName}` : safeName

    await uploadFile(path, content, `Upload: ${safeName}`)

    return NextResponse.json({ success: true, path })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API /upload]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
