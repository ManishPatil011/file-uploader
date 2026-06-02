const LARGE_FILE_BYTES = 50 * 1024 * 1024

export const uploadFile = (file, onProgress, signal) => {
  return new Promise((resolve, reject) => {
    let uploaded = 0
    const total = file.size || 1_000_000

    // Simulate chunk-like uploads: large files progress in smaller steps.
    const stepPercent = total > LARGE_FILE_BYTES ? 2 : 10
    const stepBytes = total * (stepPercent / 100)

    const intervalMs = 300
    const interval = setInterval(() => {
      if (signal?.aborted) {
        clearInterval(interval)
        reject(new Error('Upload cancelled'))
        return
      }

      uploaded += stepBytes

      const progress = Math.min(
        Math.round((uploaded / total) * 100),
        100,
      )

      onProgress(progress)

      if (progress >= 100) {
        clearInterval(interval)

        // simulate random failure
        if (Math.random() < 0.2) {
          reject(new Error('Network error'))
        } else {
          resolve()
        }
      }
    }, intervalMs)
  })
}