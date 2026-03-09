import type { Photo, Album } from './types'

const GITHUB_API = 'https://api.github.com'

interface GHConfig {
  token: string
  owner: string
  repo: string
  branch: string
}

interface GHItem {
  name: string
  path: string
  sha: string
  size: number
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  download_url: string | null
  url: string
  html_url: string
  git_url: string
}

const IMAGE_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.gif',
  '.webp', '.svg', '.bmp', '.tiff', '.avif', '.heic',
])

export function isImage(filename: string): boolean {
  const dot = filename.lastIndexOf('.')
  if (dot === -1) return false
  return IMAGE_EXT.has(filename.slice(dot).toLowerCase())
}

function getConfig(): GHConfig {
  const token = process.env.GITHUB_TOKEN
  const repoEnv = process.env.GITHUB_REPO
  const branch = process.env.GITHUB_BRANCH ?? 'main'

  if (!token) throw new Error('GITHUB_TOKEN environment variable is not set')
  if (!repoEnv) throw new Error('GITHUB_REPO environment variable is not set')

  const [owner, repo] = repoEnv.split('/')
  if (!owner || !repo) {
    throw new Error('GITHUB_REPO must be in "owner/repo" format')
  }

  return { token, owner, repo, branch }
}

function ghHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
}

export async function listContents(path = ''): Promise<GHItem[]> {
  const { token, owner, repo, branch } = getConfig()
  const encodedPath = path ? `/${encodeURIComponent(path).replace(/%2F/g, '/')}` : ''
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents${encodedPath}?ref=${branch}`

  const res = await fetch(url, {
    headers: ghHeaders(token),
    cache: 'no-store',
  })

  if (res.status === 404) return []
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub API error ${res.status}: ${text}`)
  }

  const data = await res.json()
  return Array.isArray(data) ? data : [data]
}

export async function listPhotos(album = ''): Promise<Photo[]> {
  const items = await listContents(album)
  return items
    .filter((item) => item.type === 'file' && isImage(item.name) && item.download_url)
    .map((item) => ({
      name: item.name,
      path: item.path,
      sha: item.sha,
      downloadUrl: item.download_url!,
      size: item.size,
      album: album || undefined,
    }))
}

export async function listAlbums(): Promise<Album[]> {
  const items = await listContents('')
  const dirs = items.filter((item) => item.type === 'dir')

  const albums = await Promise.allSettled(
    dirs.map(async (dir): Promise<Album> => {
      const photos = await listPhotos(dir.path)
      return {
        name: dir.name,
        path: dir.path,
        photoCount: photos.length,
        coverUrl: photos[0]?.downloadUrl ?? null,
      }
    })
  )

  return albums
    .filter((r): r is PromiseFulfilledResult<Album> => r.status === 'fulfilled')
    .map((r) => r.value)
}

export async function uploadFile(
  path: string,
  contentBase64: string,
  message: string
): Promise<void> {
  const { token, owner, repo } = getConfig()
  const encodedPath = encodeURIComponent(path).replace(/%2F/g, '/')
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodedPath}`

  // Check for existing file to get SHA (needed for updates)
  let sha: string | undefined
  try {
    const check = await fetch(url, { headers: ghHeaders(token) })
    if (check.ok) {
      const data = await check.json()
      sha = data.sha
    }
  } catch {
    // File doesn't exist, that's fine
  }

  const body: Record<string, string> = { message, content: contentBase64 }
  if (sha) body.sha = sha

  const res = await fetch(url, {
    method: 'PUT',
    headers: ghHeaders(token),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Upload failed (${res.status}): ${text}`)
  }
}

export async function createAlbum(name: string): Promise<void> {
  // GitHub doesn't support empty directories, create a .gitkeep
  await uploadFile(`${name}/.gitkeep`, '', `Create album: ${name}`)
}
