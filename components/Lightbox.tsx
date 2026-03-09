'use client'

import { useEffect, useCallback } from 'react'
import type { Photo } from '@/lib/types'

interface LightboxProps {
  photos: Photo[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Lightbox({ photos, currentIndex, onClose, onNavigate }: LightboxProps) {
  const photo = photos[currentIndex]
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < photos.length - 1

  const prev = useCallback(() => {
    if (hasPrev) onNavigate(currentIndex - 1)
  }, [hasPrev, currentIndex, onNavigate])

  const next = useCallback(() => {
    if (hasNext) onNavigate(currentIndex + 1)
  }, [hasNext, currentIndex, onNavigate])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, prev, next])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!photo) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

      {/* Content */}
      <div
        className="relative z-10 flex flex-col items-center max-w-[95vw] max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors p-1"
          aria-label="Close"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
          </svg>
        </button>

        {/* Image */}
        <div className="relative animate-scale-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.downloadUrl}
            alt={photo.name}
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
            loading="lazy"
          />
        </div>

        {/* Info bar */}
        <div className="mt-3 flex items-center gap-4 text-white/80 text-sm">
          <span className="font-medium">{photo.name}</span>
          <span className="text-white/40">·</span>
          <span>{formatBytes(photo.size)}</span>
          {photo.album && (
            <>
              <span className="text-white/40">·</span>
              <span className="text-indigo-300">{photo.album}</span>
            </>
          )}
          <span className="text-white/40">·</span>
          <span>{currentIndex + 1} / {photos.length}</span>
        </div>
      </div>

      {/* Prev arrow */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); prev() }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
          aria-label="Previous photo"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59z"/>
          </svg>
        </button>
      )}

      {/* Next arrow */}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); next() }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
          aria-label="Next photo"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"/>
          </svg>
        </button>
      )}
    </div>
  )
}
