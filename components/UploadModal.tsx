'use client'

import { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import type { Album, UploadFile } from '@/lib/types'

// ─── Constants ──────────────────────────────────────────────────────────────
const MAX_FILES = 50
const MAX_SIZE_MB = 25
const CONCURRENCY = 5      // simultaneous GitHub API calls
const ACCEPTED_TYPES = {
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif', '.heic'],
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface Props {
  albums: Album[]
  onClose: () => void
  onUploadComplete: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function UploadModal({ albums, onClose, onUploadComplete }: Props) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [selectedAlbum, setSelectedAlbum] = useState('')
  const [albumMode, setAlbumMode] = useState<'select' | 'create'>('select')
  const [newAlbumName, setNewAlbumName] = useState('')
  const [creatingAlbum, setCreatingAlbum] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [localAlbums, setLocalAlbums] = useState<Album[]>(albums)

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isUploading) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, isUploading])

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => files.forEach((f) => URL.revokeObjectURL(f.preview))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Dropzone ──────────────────────────────────────────────────────────────
  const onDrop = useCallback((accepted: File[], rejected: { file: File }[]) => {
    if (rejected.length > 0) {
      // silently ignore unsupported files
    }
    setFiles((prev) => {
      const remaining = MAX_FILES - prev.length
      const batch = accepted.slice(0, remaining).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        status: 'pending' as const,
      }))
      return [...prev, ...batch]
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: true,
    maxFiles: MAX_FILES,
    maxSize: MAX_SIZE_MB * 1024 * 1024,
  })

  // ── File management ───────────────────────────────────────────────────────
  const removeFile = (index: number) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const clearAll = () => {
    files.forEach((f) => URL.revokeObjectURL(f.preview))
    setFiles([])
  }

  const clearFailed = () => {
    setFiles((prev) => {
      prev.filter((f) => f.status === 'error').forEach((f) => URL.revokeObjectURL(f.preview))
      return prev.filter((f) => f.status !== 'error')
    })
  }

  const retryFailed = () => {
    setFiles((prev) =>
      prev.map((f) => (f.status === 'error' ? { ...f, status: 'pending', error: undefined } : f))
    )
  }

  // ── Album creation ────────────────────────────────────────────────────────
  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim() || creatingAlbum) return
    setCreatingAlbum(true)
    try {
      const res = await fetch('/api/albums/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAlbumName }),
      })
      const data = await res.json()
      if (res.ok) {
        const created: Album = { name: data.name, path: data.name, photoCount: 0, coverUrl: null }
        setLocalAlbums((prev) => [...prev, created])
        setSelectedAlbum(data.name)
        setAlbumMode('select')
        setNewAlbumName('')
        onUploadComplete()
      } else {
        alert(data.error ?? 'Failed to create album')
      }
    } finally {
      setCreatingAlbum(false)
    }
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (isUploading) return

    // Snapshot which indices need uploading
    const pending = files
      .map((f, i) => ({ f, i }))
      .filter(({ f }) => f.status === 'pending')
      .map(({ f, i }) => ({ i, file: f.file }))

    if (pending.length === 0) return

    setIsUploading(true)
    let successCount = 0
    let pointer = 0

    const updateStatus = (
      index: number,
      status: UploadFile['status'],
      error?: string
    ) => {
      setFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, status, error } : f))
      )
    }

    const uploadOne = async (index: number, file: File) => {
      updateStatus(index, 'uploading')
      try {
        const content = await fileToBase64(file)
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            content,
            album: selectedAlbum || undefined,
          }),
        })
        const data = await res.json()
        if (res.ok) {
          successCount++
          updateStatus(index, 'done')
        } else {
          updateStatus(index, 'error', data.error ?? 'Upload failed')
        }
      } catch {
        updateStatus(index, 'error', 'Network error')
      }
    }

    // Worker pool — CONCURRENCY workers share a queue
    const worker = async () => {
      while (pointer < pending.length) {
        const item = pending[pointer++]
        await uploadOne(item.i, item.file)
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

    setIsUploading(false)
    if (successCount > 0) onUploadComplete()
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const total = files.length
  const doneCount = files.filter((f) => f.status === 'done').length
  const errorCount = files.filter((f) => f.status === 'error').length
  const pendingCount = files.filter((f) => f.status === 'pending').length
  const uploadingCount = files.filter((f) => f.status === 'uploading').length
  const allDone = total > 0 && doneCount === total
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0
  const canUpload = pendingCount > 0 && !isUploading
  const hasFiles = total > 0
  const atLimit = total >= MAX_FILES

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !isUploading && onClose()}
      />

      {/* Modal — wider for bulk */}
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-scale-in">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Bulk Upload</h2>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
              Up to {MAX_FILES} photos · {MAX_SIZE_MB}MB each · {CONCURRENCY} concurrent
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">

          {/* ── Album selector ── */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              Destination album
            </label>

            {albumMode === 'select' ? (
              <div className="flex gap-2">
                <select
                  value={selectedAlbum}
                  onChange={(e) => setSelectedAlbum(e.target.value)}
                  disabled={isUploading}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                >
                  <option value="">📁 Root (no album)</option>
                  {localAlbums.map((a) => (
                    <option key={a.path} value={a.path}>
                      📂 {a.name} ({a.photoCount} photos)
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setAlbumMode('create')}
                  disabled={isUploading}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60 transition-colors whitespace-nowrap"
                >
                  + New album
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                    placeholder="Album name (e.g. Vacation 2024)"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateAlbum()}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleCreateAlbum}
                    disabled={!newAlbumName.trim() || creatingAlbum}
                    className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                  >
                    {creatingAlbum ? 'Creating…' : 'Create'}
                  </button>
                  <button
                    onClick={() => { setAlbumMode('select'); setNewAlbumName('') }}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-600">
                  Letters, numbers, hyphens and underscores only. Spaces become hyphens.
                </p>
              </div>
            )}
          </div>

          {/* ── Dropzone ── */}
          <div
            {...getRootProps()}
            className={[
              'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
              atLimit
                ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 cursor-not-allowed opacity-60'
                : isDragActive
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 scale-[1.01]'
                : 'border-gray-300 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-800/50',
            ].join(' ')}
          >
            <input {...getInputProps()} disabled={atLimit} />
            <div className="flex items-center justify-center gap-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"
                className="text-gray-300 dark:text-gray-600 shrink-0">
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
              </svg>
              <div className="text-left">
                {atLimit ? (
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Limit reached ({MAX_FILES} files max)
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {isDragActive ? 'Drop your photos here' : 'Drag & drop photos here'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      or click to browse · JPG, PNG, GIF, WebP, AVIF, HEIC
                      {total > 0 && ` · ${MAX_FILES - total} more allowed`}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── File grid ── */}
          {hasFiles && (
            <div>
              {/* Batch action bar */}
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{total}</span> selected
                  {doneCount > 0 && <> · <span className="text-green-600 dark:text-green-400">{doneCount} done</span></>}
                  {uploadingCount > 0 && <> · <span className="text-indigo-500">{uploadingCount} uploading</span></>}
                  {errorCount > 0 && <> · <span className="text-red-500">{errorCount} failed</span></>}
                </p>
                <div className="flex gap-1.5">
                  {errorCount > 0 && !isUploading && (
                    <>
                      <button
                        onClick={retryFailed}
                        className="text-xs px-2 py-1 rounded text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                      >
                        Retry failed
                      </button>
                      <button
                        onClick={clearFailed}
                        className="text-xs px-2 py-1 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        Clear failed
                      </button>
                    </>
                  )}
                  {!isUploading && (
                    <button
                      onClick={clearAll}
                      className="text-xs px-2 py-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* Thumbnail grid */}
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-1.5 max-h-[320px] overflow-y-auto pr-1">
                {files.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden group bg-gray-100 dark:bg-gray-800">
                    {/* Preview image */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.preview}
                      alt={f.file.name}
                      className="w-full h-full object-cover"
                    />

                    {/* Status overlays */}
                    {f.status === 'uploading' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <svg className="animate-spin text-white" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                        </svg>
                      </div>
                    )}
                    {f.status === 'done' && (
                      <div className="absolute inset-0 bg-green-500/40 flex items-center justify-center">
                        <svg className="text-white drop-shadow" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                        </svg>
                      </div>
                    )}
                    {f.status === 'error' && (
                      <div className="absolute inset-0 bg-red-500/60 flex flex-col items-center justify-center p-1" title={f.error}>
                        <svg className="text-white drop-shadow" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                        </svg>
                      </div>
                    )}

                    {/* Remove button — pending only */}
                    {f.status === 'pending' && !isUploading && (
                      <button
                        onClick={() => removeFile(i)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        title="Remove"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                        </svg>
                      </button>
                    )}

                    {/* Filename tooltip on hover */}
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {f.file.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0 space-y-3">
          {/* Progress bar — visible during / after upload */}
          {(isUploading || doneCount > 0) && total > 0 && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>
                  {allDone ? 'Complete' : isUploading ? 'Uploading…' : 'Paused'}
                </span>
                <span>{doneCount} / {total}</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            {/* Summary */}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {!hasFiles && 'No files selected'}
              {hasFiles && !isUploading && !allDone && (
                <>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{pendingCount}</span>
                  {' '}photo{pendingCount !== 1 ? 's' : ''} ready · {' '}
                  {formatBytes(files.filter(f => f.status === 'pending').reduce((s, f) => s + f.file.size, 0))}
                </>
              )}
              {allDone && (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  All {doneCount} uploaded ✓
                </span>
              )}
            </p>

            <div className="flex gap-2 shrink-0">
              <button
                onClick={onClose}
                disabled={isUploading}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {allDone ? 'Done' : 'Cancel'}
              </button>

              {!allDone && (
                <button
                  onClick={handleUpload}
                  disabled={!canUpload}
                  className="px-5 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium transition-colors min-w-[120px] text-center"
                >
                  {isUploading
                    ? `Uploading ${uploadingCount}…`
                    : pendingCount > 0
                    ? `Upload ${pendingCount} photo${pendingCount !== 1 ? 's' : ''}`
                    : 'Upload'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
