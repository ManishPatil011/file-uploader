import { Toaster } from 'react-hot-toast'
import FileUploader from './components/FileUploader'

function App() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      <header className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          File Uploader
        </h1>
        <p className="mt-2 text-gray-500">
          Upload multiple files with progress, retry, and cancel support.
        </p>
      </header>

      <FileUploader />
    </div>
  )
}

export default App
