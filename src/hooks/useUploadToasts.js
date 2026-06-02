import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { STATUS } from '../types/File_Types'

const CANCELLED_ERROR = 'Upload cancelled'

export function useUploadToasts(files) {
  const statusMapRef = useRef(new Map())

  useEffect(() => {
    for (const file of files) {
      const prevStatus = statusMapRef.current.get(file.id)

      if (
        prevStatus === STATUS.UPLOADING &&
        file.status === STATUS.SUCCESS
      ) {
        toast.success(`File ${file.file.name} uploaded successfully`)
      }

      if (
        prevStatus === STATUS.UPLOADING &&
        file.status === STATUS.ERROR &&
        file.error !== CANCELLED_ERROR
      ) {
        toast.error(`Failed to upload ${file.file.name} — ${file.error}`)
      }

      statusMapRef.current.set(file.id, file.status)
    }
  }, [files])
}
