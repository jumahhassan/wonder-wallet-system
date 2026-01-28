import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2, Image, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  label: string;
  accept?: string;
  bucket: string;
  folder?: string;
  value?: string;
  onChange: (url: string | null) => void;
  className?: string;
  hint?: string;
  showPreview?: boolean;
}

export default function FileUpload({
  label,
  accept = 'image/*',
  bucket,
  folder = '',
  value,
  onChange,
  className,
  hint,
  showPreview = true,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      onChange(urlData.publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const isImage = value?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  return (
    <div className={cn('space-y-2', className)}>
      <Label>{label}</Label>
      
      {value ? (
        <div className="relative">
          {showPreview && isImage ? (
            <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border">
              <img
                src={value}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={handleRemove}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/50">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm truncate flex-1">File uploaded</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleRemove}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div
          className={cn(
            'flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
            'hover:border-primary/50 hover:bg-muted/50',
            error ? 'border-destructive' : 'border-border'
          )}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Click to upload</span>
            </>
          )}
          <Input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </div>
      )}
      
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
