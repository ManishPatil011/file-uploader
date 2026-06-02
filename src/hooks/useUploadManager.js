import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ConcurrencyQueue } from '../utils/ConcurrencyQueue';
import { uploadFile } from '../services/uploadService';
import { STATUS } from '../types/File_Types';

const MAX_FILE_BYTES = 500 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/'];
const ALLOWED_EXACT_TYPES = ['application/pdf', 'text/plain'];

const getFileFingerprint = (file) =>
  `${file.name}:${file.size}:${file.lastModified}`;

const isAllowedFileType = (file) => {
  if (!file.type) return true;

  if (ALLOWED_EXACT_TYPES.includes(file.type)) return true;

  return ALLOWED_MIME_PREFIXES.some((prefix) => file.type.startsWith(prefix));
};

export const useUploadManager = () => {
  const [files, setFiles] = useState([]);
  const queueRef = useRef(new ConcurrencyQueue(3));
  const filesRef = useRef([]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    return () => {
      filesRef.current.forEach((file) => {
        file.controller?.abort();
      });
    };
  }, []);

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    const existingFingerprints = new Set(
      filesRef.current.map((item) => getFileFingerprint(item.file)),
    );
    const currentBatchFingerprints = new Set();

    const validFiles = [];
    let duplicateCount = 0;
    let invalidTypeCount = 0;
    let tooLargeCount = 0;
    let emptyCount = 0;

    incoming.forEach((file) => {
      const fingerprint = getFileFingerprint(file);

      if (
        existingFingerprints.has(fingerprint) ||
        currentBatchFingerprints.has(fingerprint)
      ) {
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

      currentBatchFingerprints.add(fingerprint);
      validFiles.push(file);
    });

    if (duplicateCount > 0) {
      toast.error(`${duplicateCount} duplicate file(s) skipped.`);
    }

    if (emptyCount > 0) {
      toast.error(`${emptyCount} empty file(s) skipped.`);
    }

    if (tooLargeCount > 0) {
      toast.error(
        `${tooLargeCount} file(s) exceeded ${
          MAX_FILE_BYTES / (1024 * 1024)
        }MB and were skipped.`,
      );
    }

    if (invalidTypeCount > 0) {
      toast.error(`${invalidTypeCount} unsupported file type(s) skipped.`);
    }

    if (validFiles.length === 0) return;

    const newFiles = validFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: STATUS.QUEUED,
      error: null,
      controller: new AbortController()
    }));

    setFiles(prev => [...prev, ...newFiles]);

    newFiles.forEach(f => enqueueUpload(f));
  };

  const enqueueUpload = (fileObj) => {
    queueRef.current.add(() => uploadSingle(fileObj));
  };

  const uploadSingle = async (fileObj) => {
    updateFile(fileObj.id, { status: STATUS.UPLOADING });

    try {
      await uploadFile(
        fileObj.file,
        (progress) => {
          updateFile(fileObj.id, { progress });
        },
        fileObj.controller.signal
      );

      updateFile(fileObj.id, {
        status: STATUS.SUCCESS,
        error: null
      });
      toast.success(`${fileObj.file.name} uploaded successfully`);
    } catch (err) {
      const errorMessage = err?.message ?? 'Upload failed';
      updateFile(fileObj.id, {
        status: STATUS.ERROR,
        error: errorMessage
      });

      if (errorMessage !== 'Upload cancelled') {
        toast.error(`Failed to upload ${fileObj.file.name} — ${errorMessage}`);
      }
    }
  };

  const updateFile = (id, updates) => {
    setFiles(prev =>
      prev.map(f =>
        f.id === id ? { ...f, ...updates } : f
      )
    );
  };

  const retry = (id) => {
    const file = filesRef.current.find(f => f.id === id);
    if (!file) return;

    file.controller?.abort();

    const resetFile = {
      ...file,
      progress: 0,
      status: STATUS.QUEUED,
      error: null,
      controller: new AbortController()
    };

    updateFile(id, resetFile);
    enqueueUpload(resetFile);
  };

  const cancel = (id) => {
    const file = filesRef.current.find(f => f.id === id);
    if (!file) return;

    updateFile(id, {
      status: STATUS.ERROR,
      error: 'Upload cancelled'
    });

    file.controller?.abort();
  };

  return { files, addFiles, retry, cancel };
};