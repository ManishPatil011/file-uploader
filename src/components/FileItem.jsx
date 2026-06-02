import { STATUS } from '../types/File_Types'
import { formatFileSize } from '../utils/formatFileSize'

function SpinnerIcon() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-violet-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 text-emerald-600"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function ProgressBar({ progress, visible }) {
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-gray-100 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      role="progressbar"
      aria-label="File upload progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      aria-hidden={!visible}
    >
      <div
        className="h-full rounded-full bg-violet-500 transition-[width] duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

function StatusActions({ file, onRetry, onCancel }) {
  const { status, error } = file

  if (status === STATUS.UPLOADING || status === STATUS.RETRYING) {
    return (
      <div className="flex min-w-[88px] flex-col items-end gap-2">
        <div className="flex items-center gap-1.5 text-sm text-violet-600">
          <SpinnerIcon />
          <span>{status === STATUS.RETRYING ? 'Retrying…' : 'Uploading…'}</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label={`Cancel upload for ${file.file?.name ?? file.name ?? 'file'}`}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          Cancel
        </button>
      </div>
    )
  }

  if (status === STATUS.SUCCESS) {
    return (
      <div className="flex min-w-[88px] items-center justify-end gap-1.5 text-sm font-medium text-emerald-600">
        <CheckIcon />
        <span>Done</span>
      </div>
    )
  }

  if (status === STATUS.ERROR) {
    return (
      <div className="flex min-w-[88px] flex-col items-end gap-2">
        <span className="text-sm font-medium text-red-600">Failed</span>
        {error && error !== 'Upload cancelled' && (
          <p className="max-w-[140px] truncate text-right text-xs text-red-500" title={error}>
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={onRetry}
          aria-label={`Retry upload for ${file.file?.name ?? file.name ?? 'file'}`}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-violet-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (status === STATUS.CANCELLED) {
    return (
      <div className="flex min-w-[88px] flex-col items-end gap-2">
        <span className="text-sm font-medium text-amber-600">Cancelled</span>
        <button
          type="button"
          onClick={onRetry}
          aria-label={`Retry upload for ${file.file?.name ?? file.name ?? 'file'}`}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-violet-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (status === STATUS.INTERRUPTED) {
    return (
      <div className="flex min-w-[88px] flex-col items-end gap-1">
        <span className="text-sm font-medium text-orange-600">Interrupted</span>
        <span className="max-w-[140px] text-right text-xs text-orange-500">
          Refresh interrupted this upload
        </span>
      </div>
    )
  }

  return (
    <div className="flex min-w-[88px] items-center justify-end">
      <span className="text-sm text-gray-400">Queued</span>
    </div>
  )
}

export default function FileItem({ file, onRetry, onCancel }) {
  const isUploading =
    file.status === STATUS.UPLOADING || file.status === STATUS.RETRYING
  const fileName = file.file?.name ?? file.name ?? 'Unknown file'
  const fileSize = file.file?.size ?? file.size ?? 0

  return (
    <li className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 shadow-sm">
      <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_minmax(0,140px)_auto]">
        <div className="min-w-0">
          <p
            className="truncate font-medium text-gray-900"
            title={fileName}
          >
            {fileName}
          </p>
          <p className="mt-0.5 text-sm text-gray-500">
            {formatFileSize(fileSize)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <ProgressBar progress={file.progress} visible={isUploading} />
          </div>
          <span
            className={`w-10 shrink-0 text-right text-sm tabular-nums text-gray-600 ${
              isUploading ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {file.progress}%
          </span>
        </div>

        <StatusActions file={file} onRetry={onRetry} onCancel={onCancel} />
      </div>
    </li>
  )
}
