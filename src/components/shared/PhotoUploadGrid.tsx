import { Camera, Video, PenTool, Image } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/shared/FileUpload';

interface PhotoUploadGridProps {
  photoKeys: string[];
  videoKeys: string[];
  sketchKeys: string[];
  referenceImageKeys: string[];
  onPhotoKeysChange: (keys: string[]) => void;
  onVideoKeysChange: (keys: string[]) => void;
  onSketchKeysChange: (keys: string[]) => void;
  onReferenceImageKeysChange: (keys: string[]) => void;
  disabled?: boolean;
}

export function PhotoUploadGrid({
  photoKeys,
  videoKeys,
  sketchKeys,
  referenceImageKeys,
  onPhotoKeysChange,
  onVideoKeysChange,
  onSketchKeysChange,
  onReferenceImageKeysChange,
  disabled = false,
}: PhotoUploadGridProps) {
  if (disabled) {
    // Read-only summary
    const total = photoKeys.length + videoKeys.length + sketchKeys.length + referenceImageKeys.length;
    if (total === 0) return null;

    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {photoKeys.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 border border-gray-100">
            <Camera className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{photoKeys.length} photo{photoKeys.length > 1 ? 's' : ''}</span>
          </div>
        )}
        {videoKeys.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 border border-gray-100">
            <Video className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{videoKeys.length} video{videoKeys.length > 1 ? 's' : ''}</span>
          </div>
        )}
        {sketchKeys.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 border border-gray-100">
            <PenTool className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{sketchKeys.length} sketch{sketchKeys.length > 1 ? 'es' : ''}</span>
          </div>
        )}
        {referenceImageKeys.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 border border-gray-100">
            <Image className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{referenceImageKeys.length} reference{referenceImageKeys.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Site Photos */}
      <Card className="rounded-xl border-gray-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-gray-700">
            <Camera className="h-4 w-4 text-orange-500" />
            Site Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload
            folder="visit-photos"
            accept="image/*"
            maxSizeMB={10}
            maxFiles={20}
            existingKeys={photoKeys}
            onUploadComplete={onPhotoKeysChange}
            label="Upload photos"
          />
        </CardContent>
      </Card>

      {/* Videos */}
      <Card className="rounded-xl border-gray-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-gray-700">
            <Video className="h-4 w-4 text-blue-500" />
            Videos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload
            folder="visit-videos"
            accept="video/*"
            maxSizeMB={50}
            maxFiles={5}
            existingKeys={videoKeys}
            onUploadComplete={onVideoKeysChange}
            label="Upload videos"
          />
        </CardContent>
      </Card>

      {/* Sketches */}
      <Card className="rounded-xl border-gray-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-gray-700">
            <PenTool className="h-4 w-4 text-emerald-500" />
            Sketches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload
            folder="visit-sketches"
            accept="image/*,.pdf"
            maxSizeMB={10}
            maxFiles={10}
            existingKeys={sketchKeys}
            onUploadComplete={onSketchKeysChange}
            label="Upload sketches"
          />
        </CardContent>
      </Card>

      {/* Reference Images */}
      <Card className="rounded-xl border-gray-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-gray-700">
            <Image className="h-4 w-4 text-purple-500" />
            Reference Images
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload
            folder="visit-references"
            accept="image/*,.pdf"
            maxSizeMB={10}
            maxFiles={10}
            existingKeys={referenceImageKeys}
            onUploadComplete={onReferenceImageKeysChange}
            label="Upload references"
          />
        </CardContent>
      </Card>
    </div>
  );
}
