'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import PhotoGrid from '@/components/PhotoGrid'
import UploadModal from '@/components/UploadModal'
import type { Photo, Album } from '@/lib/types'

export default function AlbumPage() {
  const params = useParams()
  const albumName = decodeURIComponent(params.album as string)

  const [photos, setPhotos] = useState<Photo[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)

  const fetchPhotos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/photos?album=${encodeURIComponent(albumName)}`)
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
  }, [albumName])

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
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <Link href="/albums" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              Albums
            </Link>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="opacity-40">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"/>
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">{albumName}</span>
          </nav>

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{albumName}</h1>
              {!loading && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {photos.length} photo{photos.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-colors shadow-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/>
              </svg>
              Upload to album
            </button>
          </div>
        </div>

        {error && (
          <div className="max-w-7xl mx-auto px-4 mb-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400">
              <p className="text-sm flex-1">{error}</p>
              <button onClick={fetchPhotos} className="text-sm underline underline-offset-2 shrink-0">
                Retry
              </button>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto">
          <PhotoGrid
            photos={photos}
            loading={loading}
            emptyMessage={`No photos in the "${albumName}" album yet. Upload some!`}
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
