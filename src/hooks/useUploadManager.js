import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ConcurrencyQueue } from '../utils/ConcurrencyQueue';
import { uploadFile } from '../services/uploadService';
import { STATUS } from '../types/File_Types';

const STORAGE_KEY = 'file-uploader-history-v1';
const MAX_FILE_BYTES = 500 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/'];
const ALLOWED_EXACT_TYPES = ['application/pdf', 'text/plain'];

const UPLOADABLE_STATUSES = new Set([
  STATUS.QUEUED,
  STATUS.RETRYING,
  STATUS.UPLOADING,
]);

const getFileFingerprint = (file) =>
  `${file.name}:${file.size}:${file.lastModified ?? 0}`;

const getDisplayName = (entry) => entry.file?.name ?? entry.name ?? 'Unknown file';
const getDisplaySize = (entry) => entry.file?.size ?? entry.size ?? 0;

const isAllowedFileType = (file) => {
  if (!file.type) return true;
  if (ALLOWED_EXACT_TYPES.includes(file.type)) return true;
  return ALLOWED_MIME_PREFIXES.some((prefix) => file.type.startsWith(prefix));
};

const createPersistedSnapshot = (entry) => ({
  id: entry.id,
  name: getDisplayName(entry),
  size: getDisplaySize(entry),
  type: entry.file?.type ?? entry.type ?? '',
  progress: entry.progress ?? 0,
  status: entry.status,
  error: entry.error,
  updatedAt: Date.now(),
});

const loadPersistedFiles = () => {
  if (typeof window === 'undefined') return { files: [], interruptedCount: 0 };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { files: [], interruptedCount: 0 };

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { files: [], interruptedCount: 0 };

    let interruptedCount = 0;
    const restored = parsed.map((item) => {
      const wasActive = UPLOADABLE_STATUSES.has(item.status);
      if (wasActive) interruptedCount += 1;

      return {
        id: item.id ?? crypto.randomUUID(),
        file: null,
        name: item.name ?? 'Unknown file',
        size: item.size ?? 0,
        type: item.type ?? '',
        progress: item.progress ?? 0,
        status: wasActive ? STATUS.INTERRUPTED : item.status,
        error: wasActive ? 'Upload interrupted by page refresh' : item.error ?? null,
        controller: null,
        isRestored: true,
      };
    });

    return { files: restored, interruptedCount };
  } catch {
    return { files: [], interruptedCount: 0 };
  }
};

export const useUploadManager = () => {
  const [initialLoad] = useState(loadPersistedFiles);
  const [files, setFiles] = useState(initialLoad.files);
  const queueRef = useRef(new ConcurrencyQueue(3));
  const filesRef = useRef(initialLoad.files);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    if (initialLoad.interruptedCount > 0) {
      toast(`Recovered ${initialLoad.interruptedCount} interrupted upload(s).`);
    }
  }, [initialLoad.interruptedCount]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const snapshot = files.map(createPersistedSnapshot);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [files]);

  useEffect(() => {
    return () => {
      filesRef.current.forEach((entry) => entry.controller?.abort());
    };
  }, []);

  const updateFile = (id, updates) => {
    setFiles((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const enqueueUpload = (fileObj) => {
    queueRef.current.add(async () => {
      updateFile(fileObj.id, { status: STATUS.UPLOADING, error: null });
      await uploadSingle(fileObj);
    });
  };

  const uploadSingle = async (fileObj) => {
    try {
      await uploadFile(
        fileObj.file,
        (progress) => {
          updateFile(fileObj.id, { progress });
        },
        fileObj.controller.signal,
      );

      updateFile(fileObj.id, {
        status: STATUS.SUCCESS,
        progress: 100,
        error: null,
      });
      toast.success(`${fileObj.file.name} uploaded successfully`);
    } catch (err) {
      const message = err?.message ?? 'Upload failed';

      const cancelled = message === 'Upload cancelled';
      updateFile(fileObj.id, {
        status: cancelled ? STATUS.CANCELLED : STATUS.ERROR,
        error: message,
      });

      if (!cancelled) {
        toast.error(`Failed to upload ${fileObj.file.name} — ${message}`);
      }
    }
  };

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    const existingFingerprints = new Set(
      filesRef.current.map((entry) => getFileFingerprint(entry.file ?? entry)),
    );
    const batchFingerprints = new Set();

    const accepted = [];
    let duplicateCount = 0;
    let invalidTypeCount = 0;
    let tooLargeCount = 0;
    let emptyCount = 0;

    incoming.forEach((file) => {
      const fingerprint = getFileFingerprint(file);
      if (existingFingerprints.has(fingerprint) || batchFingerprints.has(fingerprint)) {
        duplicateCount += 1;
        return;
      }
      if (file.size === 0) {
        emptyCount += 1;
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        tooLargeCount += 1;
        return;
      }
      if (!isAllowedFileType(file)) {
        invalidTypeCount += 1;
        return;
      }

      batchFingerprints.add(fingerprint);
      accepted.push(file);
    });

    if (duplicateCount) toast.error(`${duplicateCount} duplicate file(s) skipped.`);
    if (emptyCount) toast.error(`${emptyCount} empty file(s) skipped.`);
    if (tooLargeCount) {
      toast.error(
        `${tooLargeCount} file(s) exceeded ${MAX_FILE_BYTES / (1024 * 1024)}MB and were skipped.`,
      );
    }
    if (invalidTypeCount) toast.error(`${invalidTypeCount} unsupported file type(s) skipped.`);
    if (accepted.length === 0) return;

    const newEntries = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: STATUS.QUEUED,
      error: null,
      controller: new AbortController(),
      isRestored: false,
    }));

    setFiles((prev) => [...prev, ...newEntries]);
    newEntries.forEach(enqueueUpload);
  };

  const retry = (id) => {
    const item = filesRef.current.find((entry) => entry.id === id);
    if (!item) return;

    if (!item.file) {
      toast.error(`Cannot retry ${getDisplayName(item)} after refresh. Re-select the file.`);
      return;
    }

    item.controller?.abort();

    const nextEntry = {
      ...item,
      progress: 0,
      error: null,
      status: STATUS.RETRYING,
      controller: new AbortController(),
      isRestored: false,
    };

    updateFile(id, nextEntry);
    updateFile(id, { status: STATUS.QUEUED });
    enqueueUpload(nextEntry);
  };

  const cancel = (id) => {
    const item = filesRef.current.find((entry) => entry.id === id);
    if (!item) return;

    updateFile(id, {
      status: STATUS.CANCELLED,
      error: 'Upload cancelled',
    });
    item.controller?.abort();
  };

  const summary = useMemo(() => {
    const totalCount = files.length;
    const queuedCount = files.filter((f) => f.status === STATUS.QUEUED).length;
    const uploadingCount = files.filter((f) => f.status === STATUS.UPLOADING).length;
    const successCount = files.filter((f) => f.status === STATUS.SUCCESS).length;
    const errorCount = files.filter((f) => f.status === STATUS.ERROR).length;
    const cancelledCount = files.filter((f) => f.status === STATUS.CANCELLED).length;
    const retryingCount = files.filter((f) => f.status === STATUS.RETRYING).length;
    const interruptedCount = files.filter((f) => f.status === STATUS.INTERRUPTED).length;

    const weightedTotal = files.reduce((sum, f) => sum + Math.max(getDisplaySize(f), 1), 0);
    const weightedDone = files.reduce(
      (sum, f) => sum + (Math.max(getDisplaySize(f), 1) * (f.progress ?? 0)) / 100,
      0,
    );
    const overallProgress = weightedTotal ? Math.round((weightedDone / weightedTotal) * 100) : 0;

    const terminalCount = successCount + errorCount + cancelledCount + interruptedCount;
    const allComplete = totalCount > 0 && terminalCount === totalCount;
    const allFailed = totalCount > 0 && successCount === 0 && terminalCount === totalCount;

    return {
      totalCount,
      queuedCount,
      uploadingCount,
      successCount,
      errorCount,
      cancelledCount,
      retryingCount,
      interruptedCount,
      activeCount: uploadingCount,
      overallProgress,
      allComplete,
      allFailed,
    };
  }, [files]);

  return { files, addFiles, retry, cancel, summary };
};