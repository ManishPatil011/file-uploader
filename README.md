# File Uploader

A React app for uploading multiple files with live progress, queue-aware concurrency (up to 3 at a time), cancel/retry support, validation, persistence-aware recovery, and toast notifications.

## Live Application

You can access the deployed application here:

https://file-uploader-omega-ten.vercel.app/

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- npm (comes with Node.js)

## Instructions to run the app

### 1. Install dependencies

From the project root:

```bash
npm install
```

### 2. Start the app (development)

```bash
npm run dev
```

Vite prints a local URL (usually `http://localhost:5173`). Open it in your browser to use the app.

### 3. Other commands

| Command | Description |
|---------|-------------|
| `npm run build` | Create a production build in the `dist/` folder |
| `npm run preview` | Serve the production build locally (run `build` first) |
| `npm run lint` | Run ESLint on the codebase |

---

## How to use the app

### Upload files

You can add files in either way:

1. **Click** the dashed upload area and choose one or more files from the file picker.
2. **Drag and drop** files onto the upload area (it highlights while you drag).

You can upload multiple files in one go. New batches can be added anytime; uploads keep running in the background.

### While files upload

Each file appears as a row in the list below the upload area with explicit lifecycle states:

- **Name and size** on the left
- **Progress bar and percentage** in the middle (only while uploading)
- **Status** on the right (`queued`, `retrying`, `uploading`, `success`, `error`, `cancelled`, `interrupted`)

Up to **three files upload at the same time**. Extra files stay in a visible **Queued** state and start automatically when a slot is free.
You also get a **global summary panel** with:
- `uploading/total` count
- overall progress bar
- queued/success/failed/cancelled/interrupted counters

### Cancel an upload

If a file is **Uploading…** (or **Retrying…**), click **Cancel** on that row. The upload switches immediately to **Cancelled**.

### If an upload fails

Uploads are simulated and may fail randomly (~20% of the time) with a **Network error**.

When a file fails:

- The row shows **Failed** and a short error message
- A toast appears: `Failed to upload {filename} — {error message}`
- Click **Retry** on that row to try again

### Validation & duplicate handling

Before enqueueing files, the app validates:

- non-empty files only
- max file size: **500MB**
- allowed types: `image/*`, `video/*`, `audio/*`, `application/pdf`, `text/plain`
- duplicate detection (existing uploads and within the selected batch)

Rejected files are skipped with toast feedback.

### Refresh behavior (persistence)

- Upload history metadata is persisted in local storage.
- On refresh, previously active uploads (`queued/uploading/retrying`) are restored as **Interrupted**.
- Completed/error/cancelled rows are retained as history.
- Interrupted rows cannot be retried without re-selecting the source file (browser file handles do not survive refresh).

### When an upload succeeds

- The row shows a green **Done** checkmark
- A toast appears: `File {filename} uploaded successfully`

### Tips

- The drop zone stays available while other files are uploading, so you can add more files without waiting.
- To upload the same file again after picking it once, select it again from the file picker (the input resets after each selection).
- Toasts appear in the **top-right** and disappear after a few seconds.

---

### File Uploader App — Architecture Overview

The application is designed with a modular and scalable architecture, separating UI, state management, and upload logic for clarity and extensibility.

**1. Component Layer (UI)**

* `FileUploader` acts as the container component, handling layout and composition.
* `DropZone` manages file selection via drag-and-drop and file input.
* `FileItem` represents each file with its upload state, progress, and actions (retry/cancel).

This layer is purely presentational and delegates all business logic to hooks.

**2. State & Logic Layer (Custom Hook)**

* `useUploadManager` is the core of the application.
* It manages file state (progress, status, errors) using React state.
* Handles upload lifecycle: enqueue, start, progress updates, success, failure, retry, and cancel.
* Encapsulates side effects and ensures the UI remains clean and declarative.

**3. Upload Handling (Service Layer)**

* `uploadService` simulates an asynchronous upload process.
* Supports:

  * Progressive updates (via callbacks)
  * Failure scenarios
  * Cancellation using `AbortController`
* Abstracted to allow easy replacement with a real API (e.g., S3, Firebase).

**4. Concurrency Control**

* A custom `ConcurrencyQueue` limits the number of parallel uploads (e.g., 3 at a time).
* Prevents browser/network overload when multiple large files are selected.
* Ensures smooth and predictable performance.

**5. User Feedback**

* Each file displays real-time status: queued, retrying, uploading, success, error, cancelled, or interrupted.
* Toast notifications are triggered from the upload manager to inform users of success and failure events.

**6. Key Design Considerations**

* Separation of concerns between UI, logic, and services
* Extensibility for real backend integration
* Robust handling of async operations and edge cases (retry, cancel)
* Scalable handling of multiple large file uploads

This architecture ensures the application is maintainable, testable, and easily adaptable for production use.
