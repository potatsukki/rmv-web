import { Camera, Video, PenTool, Image } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/shared/FileUpload';

const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff,.heic,.heif,.svg';
const VIDEO_ACCEPT = '.mp4,.mov,.m4v,.webm,.avi,.mkv';
const IMAGE_OR_PDF_ACCEPT = `${IMAGE_ACCEPT},.pdf`;

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
    const total = photoKeys.length + videoKeys.length + sketchKeys.length + referenceImageKeys.length;
    if (total === 0) return null;

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {photoKeys.length > 0 && (
          <Card className="rounded-xl border-gray-100 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-gray-700">
                <Camera className="h-4 w-4 text-[#6e6e73]" />
                Site Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload folder="visit-photos" accept={IMAGE_ACCEPT} maxSizeMB={10} maxFiles={20}
                existingKeys={photoKeys} onUploadComplete={() => {}} readOnly />
            </CardContent>
          </Card>
        )}
        {videoKeys.length > 0 && (
          <Card className="rounded-xl border-gray-100 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-gray-700">
                <Video className="h-4 w-4 text-blue-500" />
                Videos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload folder="visit-videos" accept={VIDEO_ACCEPT} maxSizeMB={50} maxFiles={5}
                existingKeys={videoKeys} onUploadComplete={() => {}} readOnly />
            </CardContent>
          </Card>
        )}
        {sketchKeys.length > 0 && (
          <Card className="rounded-xl border-gray-100 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-gray-700">
                <PenTool className="h-4 w-4 text-emerald-500" />
                Sketches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload folder="visit-sketches" accept={IMAGE_OR_PDF_ACCEPT} maxSizeMB={10} maxFiles={10}
                existingKeys={sketchKeys} onUploadComplete={() => {}} readOnly />
            </CardContent>
          </Card>
        )}
        {referenceImageKeys.length > 0 && (
          <Card className="rounded-xl border-gray-100 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-gray-700">
                <Image className="h-4 w-4 text-purple-500" />
                Reference Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload folder="visit-references" accept={IMAGE_OR_PDF_ACCEPT} maxSizeMB={10} maxFiles={10}
                existingKeys={referenceImageKeys} onUploadComplete={() => {}} readOnly />
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Site Photos */}
      <Card className="rounded-xl border-gray-100 shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-gray-700">
            <Camera className="h-4 w-4 text-[#6e6e73]" />
            Site Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload
            folder="visit-photos"
            accept={IMAGE_ACCEPT}
            maxSizeMB={10}
            maxFiles={20}
            existingKeys={photoKeys}
            onUploadComplete={onPhotoKeysChange}
            label="Upload photos"
          />
        </CardContent>
      </Card>

      {/* Videos */}
      <Card className="rounded-xl border-gray-100 shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-gray-700">
            <Video className="h-4 w-4 text-blue-500" />
            Videos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload
            folder="visit-videos"
            accept={VIDEO_ACCEPT}
            maxSizeMB={50}
            maxFiles={5}
            existingKeys={videoKeys}
            onUploadComplete={onVideoKeysChange}
            label="Upload videos"
          />
        </CardContent>
      </Card>

      {/* Sketches */}
      <Card className="rounded-xl border-gray-100 shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-gray-700">
            <PenTool className="h-4 w-4 text-emerald-500" />
            Sketches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload
            folder="visit-sketches"
            accept={IMAGE_OR_PDF_ACCEPT}
            maxSizeMB={10}
            maxFiles={10}
            existingKeys={sketchKeys}
            onUploadComplete={onSketchKeysChange}
            label="Upload sketches"
          />
        </CardContent>
      </Card>

      {/* Reference Images */}
      <Card className="rounded-xl border-gray-100 shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-gray-700">
            <Image className="h-4 w-4 text-purple-500" />
            Reference Images
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload
            folder="visit-references"
            accept={IMAGE_OR_PDF_ACCEPT}
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
