'use client'

import { useState, useEffect, useCallback } from 'react'
import Navbar from '@/components/Navbar'
import AlbumGrid from '@/components/AlbumGrid'
import UploadModal from '@/components/UploadModal'
import type { Album } from '@/lib/types'

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)

  const fetchAlbums = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/albums')
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const data: Album[] = await res.json()
      setAlbums(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load albums')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlbums()
  }, [fetchAlbums])

  return (
    <>
      <Navbar onUpload={() => setShowUpload(true)} />

      <main className="pt-14">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Albums</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Browse photos by folder
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-colors shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/>
            </svg>
            Upload
          </button>
        </div>

        {error && (
          <div className="max-w-7xl mx-auto px-4 mb-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400">
              <p className="text-sm flex-1">{error}</p>
              <button onClick={fetchAlbums} className="text-sm underline underline-offset-2 shrink-0">
                Retry
              </button>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto">
          <AlbumGrid albums={albums} loading={loading} />
        </div>
      </main>

      {showUpload && (
        <UploadModal
          albums={albums}
          onClose={() => setShowUpload(false)}
          onUploadComplete={fetchAlbums}
        />
      )}
    </>
  )
}
