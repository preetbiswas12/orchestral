// File persistence shared types

export const OUTPUTS_SUBDIR = 'outputs'
export const FILE_COUNT_LIMIT = 1000
export const DEFAULT_UPLOAD_CONCURRENCY = 4

export type TurnStartTime = number

export interface PersistedFile {
  filename: string
  file_id: string
}

export interface FailedPersistence {
  filename: string
  error: string
}

export interface FilesPersistedEventData {
  files: PersistedFile[]
  failed: FailedPersistence[]
}

// Legacy/stub exports kept for compatibility
export interface FileMetadata {
  id: string
  name: string
  size: number
  type: string
}

export interface FilePersistence {
  save(file: unknown): Promise<FileMetadata>
  load(id: string): Promise<unknown>
  delete(id: string): Promise<void>
}
