import { useCallback, useRef, useState } from 'react'
import { useUploadManager } from '../hooks/useUploadManager'
import FileItem from './FileItem'

function UploadIcon() {
  return (
    <svg
      className="mx-auto h-10 w-10 text-gray-400"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 4.243A4.502 4.502 0 0118.75 19.5H6.75z"
      />
    </svg>
  )
}

function DropZone({ onFilesSelected, isDragActive, onDragActiveChange }) {
  const inputRef = useRef(null)
  const dragCounterRef = useRef(0)

  const handleFiles = useCallback(
    (fileList) => {
      if (fileList?.length) {
        onFilesSelected(fileList)
      }
    },
    [onFilesSelected] // ✅ fixed
  )

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleInputChange = (e) => {
    handleFiles(e.target.files)
    e.target.value = ''
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    dragCounterRef.current += 1
    onDragActiveChange(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    dragCounterRef.current -= 1
    if (dragCounterRef.current === 0) {
      onDragActiveChange(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    dragCounterRef.current = 0
    onDragActiveChange(false)
    handleFiles(e.dataTransfer.files)
  }

  const zoneClasses = isDragActive
    ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200'
    : 'border-gray-300 bg-white hover:border-violet-400 hover:bg-gray-50'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${zoneClasses}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />
      <UploadIcon />
      <p className="mt-3 text-center text-sm font-medium text-gray-700">
        Drag & drop files here or click to upload
      </p>
      <p className="mt-1 text-center text-xs text-gray-500">
        Multiple files supported
      </p>
    </div>
  )
}

export default function FileUploader() {
  const { files, addFiles, retry, cancel } = useUploadManager()
  const [isDragActive, setIsDragActive] = useState(false)

  const handleFilesSelected = useCallback(
    (fileList) => {
      addFiles(fileList)
    },
    [addFiles] // ✅ fixed
  )

  return (
    <div className="w-full max-w-[640px] mx-auto">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 space-y-6">
        <DropZone
          onFilesSelected={handleFilesSelected}
          isDragActive={isDragActive}
          onDragActiveChange={setIsDragActive}
        />

        {files.length > 0 && (
          <ul className="space-y-3" role="list">
            {files.map((item) => (
              <FileItem
                key={item.id}
                file={item}
                onRetry={() => retry(item.id)}
                onCancel={() => cancel(item.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}