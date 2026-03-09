export interface Photo {
  name: string
  path: string
  sha: string
  downloadUrl: string
  size: number
  album?: string
}

export interface Album {
  name: string
  path: string
  photoCount: number
  coverUrl: string | null
}

export type SortField = 'name' | 'size'
export type SortOrder = 'asc' | 'desc'

export interface UploadFile {
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

export interface ApiError {
  error: string
  details?: string
}
