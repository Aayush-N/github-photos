'use client'

import Link from 'next/link'
import type { Album } from '@/lib/types'

interface AlbumGridProps {
  albums: Album[]
  loading?: boolean
}

export default function AlbumGrid({ albums, loading }: AlbumGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-800 animate-pulse aspect-square" />
        ))}
      </div>
    )
  }

  if (albums.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-gray-600">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="mb-3 opacity-40">
          <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/>
        </svg>
        <p className="text-sm">No albums yet</p>
        <p className="text-xs mt-1">Create your first album when uploading photos</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
      {albums.map((album) => (
        <Link
          key={album.path}
          href={`/albums/${encodeURIComponent(album.name)}`}
          className="group block rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all hover:shadow-lg dark:hover:shadow-indigo-950/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {/* Cover photo */}
          <div className="aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
            {album.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={album.coverUrl}
                alt={album.name}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 3H3a2 2 0 00-2 2v14a2 2 0 002 2h18a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H3V5h18v14zm-5-7l-3 3.72L10 13l-4 5h12l-3-3z"/>
                </svg>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="px-3 py-2.5">
            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
              {album.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
              {album.photoCount} photo{album.photoCount !== 1 ? 's' : ''}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}
