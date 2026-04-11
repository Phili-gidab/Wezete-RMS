import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { useUploadImage } from '../api/hooks';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function ImageUpload({ value, onChange, label = 'Image' }: ImageUploadProps) {
  const [preview, setPreview] = useState<string>(value || '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadImage();

  const resolveUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview immediately
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setUploading(true);

    try {
      const result = await upload.mutateAsync(file);
      const url = result.url; // e.g. "/api/v1/uploads/files/1234.jpg"
      onChange(url);
      setPreview(resolveUrl(url));
      toast.success('Image uploaded');
    } catch {
      toast.error('Failed to upload image');
      setPreview(value || '');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemove = () => {
    onChange('');
    setPreview('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const displayUrl = preview || resolveUrl(value);

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>

      {displayUrl ? (
        <div className="relative w-full h-32 rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
          <img
            src={displayUrl}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={() => setPreview('')}
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full h-32 rounded-lg border-2 border-dashed border-slate-300 hover:border-[#0A3D39] flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-[#0A3D39] transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
          ) : (
            <>
              <Upload className="w-6 h-6" />
              <span className="text-xs font-medium">Click to upload image</span>
              <span className="text-[10px] text-slate-400">JPEG, PNG, GIF, WebP (max 5MB)</span>
            </>
          )}
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}
