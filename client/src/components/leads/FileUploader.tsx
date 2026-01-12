import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import Papa from 'papaparse';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface FileUploadState {
  progress: number;
  status: UploadStatus;
  fileName?: string;
  error?: string;
}

interface FileUploaderProps {
  onFileSelect: (data: any[], columns: string[], fileName: string) => void;
  acceptedFormats?: string[];
  maxSize?: number; // in MB
}

export function FileUploader({
  onFileSelect,
  acceptedFormats = ['.csv', '.json'],
  maxSize = 10
}: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<FileUploadState>({
    progress: 0,
    status: 'idle'
  });
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    clearProgressInterval();
    setUploadState({ progress: 0, status: 'idle' });
    setFile(null);
  }, [clearProgressInterval]);

  const processFile = useCallback(async (file: File) => {
    setUploadState({ progress: 0, status: 'uploading', fileName: file.name });

    progressIntervalRef.current = setInterval(() => {
      setUploadState(prev => {
        if (prev.progress >= 90) {
          clearProgressInterval();
          return { ...prev, progress: 90 };
        }
        return { ...prev, progress: prev.progress + 10 };
      });
    }, 100);

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            clearProgressInterval();
            setUploadState(prev => ({ ...prev, progress: 100 }));

            setTimeout(() => {
              if (results.data && results.data.length > 0) {
                const columns = Object.keys(results.data[0] as any);
                onFileSelect(results.data, columns, file.name);
                setUploadState(prev => ({ ...prev, status: 'success' }));
              } else {
                setUploadState(prev => ({ 
                  ...prev, 
                  status: 'error', 
                  error: 'CSV file is empty or invalid' 
                }));
              }
            }, 300);
          },
          error: (error) => {
            clearProgressInterval();
            setUploadState(prev => ({ 
              ...prev, 
              status: 'error', 
              error: `Error parsing CSV: ${error.message}`,
              progress: 0
            }));
          }
        });
      } else if (fileExtension === 'json') {
        const text = await file.text();
        setUploadState(prev => ({ ...prev, progress: 70 }));

        const data = JSON.parse(text);
        setUploadState(prev => ({ ...prev, progress: 90 }));

        const arrayData = Array.isArray(data) ? data : [data];

        clearProgressInterval();
        setUploadState(prev => ({ ...prev, progress: 100 }));

        setTimeout(() => {
          if (arrayData.length > 0) {
            const columns = Object.keys(arrayData[0]);
            onFileSelect(arrayData, columns, file.name);
            setUploadState(prev => ({ ...prev, status: 'success' }));
          } else {
            setUploadState(prev => ({ 
              ...prev, 
              status: 'error', 
              error: 'JSON file is empty or invalid' 
            }));
          }
        }, 300);
      } else {
        clearProgressInterval();
        setUploadState({ 
          progress: 0, 
          status: 'error', 
          error: 'Unsupported file format' 
        });
      }
    } catch (err) {
      clearProgressInterval();
      setUploadState({ 
        progress: 0, 
        status: 'error', 
        error: err instanceof Error ? err.message : 'Error processing file' 
      });
    }
  }, [onFileSelect, clearProgressInterval]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      setUploadState({ 
        progress: 0, 
        status: 'error', 
        error: `File size exceeds ${maxSize}MB limit` 
      });
      return;
    }

    setFile(file);
    processFile(file);
  }, [maxSize, processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFormats.reduce((acc, format) => ({ ...acc, [format]: [] }), {}),
    maxFiles: 1,
    multiple: false,
    disabled: uploadState.status === 'uploading'
  });

  const removeFile = () => {
    setFile(null);
    setUploadState({ progress: 0, status: 'idle' });
  };

  const isUploading = uploadState.status === 'uploading';
  const isSuccess = uploadState.status === 'success';
  const isError = uploadState.status === 'error';

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent/50",
          file && "border-solid border-primary bg-primary/5",
          isUploading && "cursor-not-allowed opacity-60"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            "rounded-full p-4",
            file ? "bg-primary/10" : "bg-accent"
          )}>
            {file ? (
              <File className="h-8 w-8 text-primary" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          {file ? (
            <div className="space-y-2">
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024).toFixed(2)} KB
              </p>
              {isUploading && (
                <p className="text-sm text-primary">Processing file...</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragActive ? "Drop file here" : "Drag & drop your file here"}
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supported formats: {acceptedFormats.join(', ')} (max {maxSize}MB)
              </p>
            </div>
          )}
        </div>
      </div>

      {isUploading && (
        <div className="w-full space-y-2 animate-fade-in">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground truncate max-w-[200px]">
              {uploadState.fileName}
            </span>
            <span className="text-muted-foreground">{uploadState.progress}%</span>
          </div>
          <Progress value={uploadState.progress} className="h-2" />
          <button
            type="button"
            onClick={handleCancel}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {isSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-lg">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">Upload complete</span>
        </div>
      )}

      {file && !isUploading && !isError && (
        <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
          <div className="flex items-center gap-3">
            <File className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={removeFile}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {isError && uploadState.error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">{uploadState.error}</p>
        </div>
      )}
    </div>
  );
}
