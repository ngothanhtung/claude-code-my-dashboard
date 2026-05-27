'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, FileIcon, X, CheckCircle2, AlertCircle, Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'success' | 'error' | 'pending';
  link?: string;
  error?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: { client_id: string; scope: string; callback: (response: { access_token?: string; error?: string }) => void }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

let tokenClient: { requestAccessToken: () => void } | null = null;

function getTokenClient(onSuccess: (token: string) => void, onError: (msg: string) => void) {
  if (!tokenClient) {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID;
    if (!clientId) {
      onError('Thiếu NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID. Vui lòng cấu hình .env.local');
      return null;
    }

    if (!window.google?.accounts?.oauth2) {
      onError('Google Identity Services chưa tải xong. Vui lòng đợi và thử lại.');
      return null;
    }

    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (response) => {
        if (response.access_token) {
          onSuccess(response.access_token);
        } else {
          onError(response.error || 'Không lấy được token Drive');
        }
      },
    });
  }
  return tokenClient;
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isGisLoaded, setIsGisLoaded] = useState(false);
  const [isRequestingToken, setIsRequestingToken] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentAccessToken = useRef<string | null>(null);

  // Load Google Identity Services script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setIsGisLoaded(true);
    script.onerror = () => console.error('Failed to load GIS script');
    document.head.appendChild(script);
  }, []);

  const uploadFileWithToken = useCallback(async (file: File, accessToken: string) => {
    const id = Math.random().toString(36).slice(2);

    setFiles((prev) => [...prev, { id, name: file.name, size: file.size, progress: 0, status: 'uploading' }]);

    const formData = new FormData();
    formData.append('file', file);

    const progressInterval = setInterval(() => {
      setFiles((prev) => prev.map((f) => (f.id === id && f.status === 'uploading' && f.progress < 90 ? { ...f, progress: f.progress + Math.random() * 15 } : f)));
    }, 300);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'X-Access-Token': accessToken },
        body: formData,
      });

      clearInterval(progressInterval);

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Upload thất bại');

      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, progress: 100, status: 'success', link: data.link } : f)));
    } catch (err: any) {
      clearInterval(progressInterval);
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, progress: 0, status: 'error', error: err.message } : f)));
    }
  }, []);

  const handleFiles = useCallback(
    (fileList: File[]) => {
      if (!isGisLoaded) return;

      const client = getTokenClient(
        (token) => {
          currentAccessToken.current = token;
          fileList.forEach((file) => uploadFileWithToken(file, token));
        },
        (msg) => {
          setFiles((prev) => prev.map((f) => (f.status === 'pending' ? { ...f, status: 'error', error: msg } : f)));
        },
      );

      // Mark files as pending while waiting for token
      const pendingFiles = fileList.map((file) => ({
        id: Math.random().toString(36).slice(2),
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'pending' as const,
      }));
      setFiles((prev) => [...prev, ...pendingFiles]);

      setIsRequestingToken(true);
      client?.requestAccessToken();
      setIsRequestingToken(false);
    },
    [isGisLoaded, uploadFileWithToken],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      handleFiles(droppedFiles);
    },
    [handleFiles],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      handleFiles(selectedFiles);
      e.target.value = '';
    },
    [handleFiles],
  );

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const completedCount = files.filter((f) => f.status === 'success').length;
  const errorCount = files.filter((f) => f.status === 'error').length;

  return (
    <div className='@container/main px-4 lg:px-6'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Upload Files</h1>
        <p className='text-muted-foreground mt-1'>Tải file lên Google Drive của bạn</p>
      </div>

      {/* Drop Zone */}
      <div
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors cursor-pointer',
          isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50',
          isRequestingToken && 'opacity-50 pointer-events-none',
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isRequestingToken && inputRef.current?.click()}
      >
        <input ref={inputRef} type='file' multiple className='hidden' onChange={handleFileInput} aria-label='Chọn file để tải lên' />

        <div className={cn('flex h-16 w-16 items-center justify-center rounded-full', isDragging ? 'bg-primary/10' : 'bg-muted')}>
          {isRequestingToken ? <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' /> : <Upload className={cn('h-8 w-8 transition-colors', isDragging ? 'text-primary' : 'text-muted-foreground')} />}
        </div>

        <p className='mt-4 text-base font-medium'>{isRequestingToken ? 'Đang yêu cầu quyền Drive...' : isDragging ? 'Thả file vào đây' : 'Kéo thả file hoặc nhấn để chọn'}</p>
        <p className='mt-1 text-sm text-muted-foreground'>{isRequestingToken ? 'Vui lòng chờ...' : 'Hỗ trợ mọi loại file'}</p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className='space-y-3'>
          {/* Summary */}
          {(completedCount > 0 || errorCount > 0) && (
            <div className='flex items-center gap-4 text-sm'>
              {completedCount > 0 && (
                <span className='flex items-center gap-1.5 text-green-600 dark:text-green-400'>
                  <CheckCircle2 className='h-4 w-4' />
                  {completedCount} file đã tải lên
                </span>
              )}
              {errorCount > 0 && (
                <span className='flex items-center gap-1.5 text-destructive'>
                  <AlertCircle className='h-4 w-4' />
                  {errorCount} file thất bại
                </span>
              )}
            </div>
          )}

          {/* Files */}
          <div className='rounded-lg border bg-card'>
            {files.map((file, index) => (
              <div key={file.id} className={cn('flex items-center gap-4 p-4', index !== files.length - 1 && 'border-b')}>
                {/* Icon */}
                <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted'>
                  <FileIcon className='h-5 w-5 text-muted-foreground' />
                </div>

                {/* Info */}
                <div className='flex-1 min-w-0'>
                  <p className='truncate text-sm font-medium'>{file.name}</p>
                  <div className='flex items-center gap-2 mt-1'>
                    <span className='text-xs text-muted-foreground'>{formatBytes(file.size)}</span>
                    {file.status === 'uploading' && <span className='text-xs text-muted-foreground'>{Math.round(file.progress)}%</span>}
                    {file.status === 'pending' && <span className='text-xs text-muted-foreground'>Đang chờ quyền...</span>}
                    {file.status === 'success' && <span className='text-xs text-green-600 dark:text-green-400'>Đã tải lên</span>}
                    {file.status === 'error' && <span className='text-xs text-destructive truncate max-w-xs'>{file.error}</span>}
                  </div>
                  {file.status === 'uploading' && <Progress value={file.progress} className='mt-2 h-1' />}
                </div>

                {/* Actions */}
                <div className='flex items-center gap-2 shrink-0'>
                  {file.status === 'success' && file.link && (
                    <Button variant='ghost' size='sm' asChild>
                      <a href={file.link} target='_blank' rel='noopener noreferrer' aria-label={`Mở file ${file.name} trên Google Drive`}>
                        <Link2 className='h-4 w-4' />
                      </a>
                    </Button>
                  )}
                  {file.status !== 'uploading' && file.status !== 'pending' && (
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8'
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id);
                      }}
                    >
                      <X className='h-4 w-4' />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
