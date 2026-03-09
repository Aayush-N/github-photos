'use client'

import { useState, useMemo } from 'react'
import type { Photo, SortField, SortOrder } from '@/lib/types'
import Lightbox from './Lightbox'
import FilterBar from './FilterBar'

interface PhotoGridProps {
  photos: Photo[]
  loading?: boolean
  emptyMessage?: string
}

export default function PhotoGrid({ photos, loading, emptyMessage }: PhotoGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let result = [...photos]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((p) => p.name.toLowerCase().includes(q))
    }

    result.sort((a, b) => {
      let cmp = 0
      if (sortField === 'name') cmp = a.name.localeCompare(b.name)
      if (sortField === 'size') cmp = a.size - b.size
      return sortOrder === 'asc' ? cmp : -cmp
    })

    return result
  }, [photos, sortField, sortOrder, search])

  if (loading) {
    return (
      <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-2 p-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="break-inside-avoid mb-2 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse"
            style={{ height: `${150 + (i % 4) * 60}px` }}
          />
        ))}
      </div>
    )
  }

  return (
    <>
      <FilterBar
        sortField={sortField}
        sortOrder={sortOrder}
        search={search}
        onSortField={setSortField}
        onSortOrder={setSortOrder}
        onSearch={setSearch}
        total={filtered.length}
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-gray-600">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="mb-3 opacity-40">
            <path d="M21 3H3a2 2 0 00-2 2v14a2 2 0 002 2h18a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H3V5h18v14zm-5-7l-3 3.72L10 13l-4 5h12l-3-3z"/>
          </svg>
          <p className="text-sm">{emptyMessage ?? 'No photos found'}</p>
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-2 p-4">
          {filtered.map((photo, idx) => (
            <button
              key={photo.sha + photo.path}
              onClick={() => setLightboxIndex(idx)}
              className="break-inside-avoid mb-2 w-full block group relative overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.downloadUrl}
                alt={photo.name}
                loading="lazy"
                className="w-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-[1.03]"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-xl flex items-end p-2 opacity-0 group-hover:opacity-100">
                <p className="text-white text-xs font-medium truncate drop-shadow">
                  {photo.name}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          photos={filtered}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  )
}
