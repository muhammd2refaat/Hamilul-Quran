/**
 * File uploader component using react-dropzone
 */

import { useCallback } from 'react';
import { useDropzone, type Accept } from 'react-dropzone';
import { Upload, X, File, Image, Video, AlertCircle } from 'lucide-react';
import { cn, formatFileSize } from '../../utils';
import { FILE_UPLOAD } from '../../constants';

interface FileUploaderProps {
  /** Accepted file types */
  accept?: Accept;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Allow multiple files */
  multiple?: boolean;
  /** Uploaded files */
  files: File[];
  /** File change callback */
  onChange: (files: File[]) => void;
  /** Error message */
  error?: string;
  /** Label */
  label?: string;
  /** Helper text */
  helperText?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Show previews */
  showPreviews?: boolean;
  /** Custom preview renderer */
  previewRenderer?: (file: File) => React.ReactNode;
}

export function FileUploader({
  accept,
  maxSize = FILE_UPLOAD.MAX_SIZE,
  multiple = false,
  files,
  onChange,
  error,
  label,
  helperText,
  disabled = false,
  showPreviews = true,
}: FileUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (multiple) {
        onChange([...files, ...acceptedFiles]);
      } else {
        onChange(acceptedFiles.slice(0, 1));
      }
    },
    [files, multiple, onChange]
  );

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onChange(newFiles);
  };

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple,
    disabled,
  });

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return Image;
    if (file.type.startsWith('video/')) return Video;
    return File;
  };

  const getFilePreview = (file: File) => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}

      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer',
          'flex flex-col items-center justify-center gap-2',
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : error
            ? 'border-danger-300 bg-danger-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <Upload
          className={cn(
            'h-10 w-10',
            isDragActive ? 'text-primary-500' : 'text-gray-400'
          )}
        />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            or click to browse (max {formatFileSize(maxSize)})
          </p>
        </div>
      </div>

      {/* File rejections */}
      {fileRejections.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-danger-50 rounded-lg">
          <AlertCircle className="h-4 w-4 text-danger-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-danger-700">
            {fileRejections.map(({ file, errors }) => (
              <div key={file.name}>
                <span className="font-medium">{file.name}:</span>{' '}
                {errors.map((e) => e.message).join(', ')}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-danger-600">{error}</p>
      )}

      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}

      {/* File previews */}
      {showPreviews && files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
          {files.map((file, index) => {
            const FileIcon = getFileIcon(file);
            const preview = getFilePreview(file);

            return (
              <div
                key={`${file.name}-${index}`}
                className="relative group border border-gray-200 rounded-lg overflow-hidden"
              >
                {preview ? (
                  <img
                    src={preview}
                    alt={file.name}
                    className="w-full h-24 object-cover"
                  />
                ) : (
                  <div className="w-full h-24 flex items-center justify-center bg-gray-50">
                    <FileIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-700 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="absolute top-1 right-1 p-1 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FileUploader;
