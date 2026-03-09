'use client'

import type { SortField, SortOrder } from '@/lib/types'

interface FilterBarProps {
  sortField: SortField
  sortOrder: SortOrder
  search: string
  total: number
  onSortField: (f: SortField) => void
  onSortOrder: (o: SortOrder) => void
  onSearch: (s: string) => void
}

export default function FilterBar({
  sortField,
  sortOrder,
  search,
  total,
  onSortField,
  onSortOrder,
  onSearch,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
      {/* Search */}
      <div className="relative flex-1 min-w-[160px] max-w-xs">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search photos..."
          className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Sort field */}
      <select
        value={sortField}
        onChange={(e) => onSortField(e.target.value as SortField)}
        className="px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="name">Name</option>
        <option value="size">Size</option>
      </select>

      {/* Sort order */}
      <button
        onClick={() => onSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title={sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
      >
        {sortOrder === 'asc' ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z"/>
          </svg>
        )}
      </button>

      {/* Count */}
      <span className="ml-auto text-xs text-gray-400 dark:text-gray-600 whitespace-nowrap">
        {total} photo{total !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
