'use client'

import { useState, useEffect, useCallback } from 'react'
import Navbar from '@/components/Navbar'
import PhotoGrid from '@/components/PhotoGrid'
import UploadModal from '@/components/UploadModal'
import type { Photo, Album } from '@/lib/types'

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)

  const fetchPhotos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/photos')
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const data: Photo[] = await res.json()
      setPhotos(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load photos')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAlbums = useCallback(async () => {
    try {
      const res = await fetch('/api/albums')
      if (res.ok) {
        const data: Album[] = await res.json()
        setAlbums(data)
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchPhotos()
    fetchAlbums()
  }, [fetchPhotos, fetchAlbums])

  const handleUploadComplete = () => {
    fetchPhotos()
    fetchAlbums()
  }

  return (
    <>
      <Navbar onUpload={() => setShowUpload(true)} />

      <main className="pt-14">
        {/* Page header */}
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gallery</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              All photos from your repository
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

        {/* Error state */}
        {error && (
          <div className="max-w-7xl mx-auto px-4 mb-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 mt-0.5">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium">Failed to load photos</p>
                <p className="text-sm opacity-80 mt-0.5">{error}</p>
                {error.includes('GITHUB_TOKEN') && (
                  <p className="text-xs mt-2 opacity-70">
                    Make sure <code className="font-mono bg-red-100 dark:bg-red-900/50 px-1 rounded">GITHUB_TOKEN</code> and{' '}
                    <code className="font-mono bg-red-100 dark:bg-red-900/50 px-1 rounded">GITHUB_REPO</code> are set in your{' '}
                    <code className="font-mono bg-red-100 dark:bg-red-900/50 px-1 rounded">.env.local</code> file.
                  </p>
                )}
              </div>
              <button
                onClick={fetchPhotos}
                className="shrink-0 text-sm underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Photo grid */}
        <div className="max-w-7xl mx-auto">
          <PhotoGrid
            photos={photos}
            loading={loading}
            emptyMessage="No photos in your repository root. Upload some or browse albums."
          />
        </div>
      </main>

      {showUpload && (
        <UploadModal
          albums={albums}
          onClose={() => setShowUpload(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}
    </>
  )
}
