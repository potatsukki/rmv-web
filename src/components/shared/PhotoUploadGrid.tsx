import { Camera, PenTool, Image } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/shared/FileUpload';

const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff,.heic,.heif,.svg';
const VIDEO_ACCEPT = '.mp4,.mov,.m4v,.webm,.avi,.mkv';
const IMAGE_OR_PDF_ACCEPT = `${IMAGE_ACCEPT},.pdf`;
const GALLERY_ACCEPT = `${IMAGE_ACCEPT},${VIDEO_ACCEPT}`;
const MAX_GALLERY_PHOTOS = 20;
const MAX_GALLERY_VIDEOS = 5;
const VIDEO_KEY = /\.(mp4|mov|m4v|webm|avi|mkv)$/i;

/** Splits one gallery upload back into the photo and video lists the reports store. */
export function splitGalleryKeys(keys: string[]) {
  const videoKeys = keys.filter((key) => VIDEO_KEY.test(key));
  const photoKeys = keys.filter((key) => !VIDEO_KEY.test(key));
  return {
    photoKeys: photoKeys.slice(0, MAX_GALLERY_PHOTOS),
    videoKeys: videoKeys.slice(0, MAX_GALLERY_VIDEOS),
    droppedPhotos: Math.max(0, photoKeys.length - MAX_GALLERY_PHOTOS),
    droppedVideos: Math.max(0, videoKeys.length - MAX_GALLERY_VIDEOS),
  };
}

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
  showSketches?: boolean;
}

/** One upload for site photos and videos; keeps them as separate key lists. */
export function GalleryUpload({ photoKeys, videoKeys, onChange, onUploadingChange }: {
  photoKeys: string[];
  videoKeys: string[];
  onChange: (photoKeys: string[], videoKeys: string[]) => void;
  onUploadingChange?: (active: boolean) => void;
}) {
  return (
    <FileUpload
      folder="visit-photos"
      accept={GALLERY_ACCEPT}
      maxSizeMB={50}
      maxFiles={MAX_GALLERY_PHOTOS + MAX_GALLERY_VIDEOS}
      existingKeys={[...photoKeys, ...videoKeys]}
      onUploadComplete={(keys) => {
        const gallery = splitGalleryKeys(keys);
        if (gallery.droppedPhotos) toast.error(`Up to ${MAX_GALLERY_PHOTOS} photos. Extra photos were not added.`);
        if (gallery.droppedVideos) toast.error(`Up to ${MAX_GALLERY_VIDEOS} videos. Extra videos were not added.`);
        onChange(gallery.photoKeys, gallery.videoKeys);
      }}
      onUploadingChange={onUploadingChange}
      label="Upload photos and videos"
    />
  );
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
  showSketches = true,
}: PhotoUploadGridProps) {
  if (disabled) {
    const total = photoKeys.length + videoKeys.length + (showSketches ? sketchKeys.length : 0) + referenceImageKeys.length;
    if (total === 0) return null;

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {photoKeys.length + videoKeys.length > 0 && (
          <Card className="rounded-xl border-gray-100 dark:border-slate-700 dark:bg-slate-900/90 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
                <Camera className="h-4 w-4 text-[#6e6e73] dark:text-slate-400" />
                Gallery
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload folder="visit-photos" accept={GALLERY_ACCEPT} maxSizeMB={50} maxFiles={MAX_GALLERY_PHOTOS + MAX_GALLERY_VIDEOS}
                existingKeys={[...photoKeys, ...videoKeys]} onUploadComplete={() => {}} readOnly />
            </CardContent>
          </Card>
        )}
        {showSketches && sketchKeys.length > 0 && (
          <Card className="rounded-xl border-gray-100 dark:border-slate-700 dark:bg-slate-900/90 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
                <PenTool className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
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
          <Card className="rounded-xl border-gray-100 dark:border-slate-700 dark:bg-slate-900/90 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
                <Image className="h-4 w-4 text-purple-500 dark:text-purple-300" />
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
      {/* Gallery: site photos (required) and videos (optional) in one upload */}
      <Card className="rounded-xl border-gray-100 dark:border-slate-700 dark:bg-slate-900/90 shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
            <Camera className="h-4 w-4 text-[#6e6e73] dark:text-slate-400" />
            Gallery
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Add site photos and videos from your gallery. At least one photo is required; videos are optional
            (up to {MAX_GALLERY_PHOTOS} photos and {MAX_GALLERY_VIDEOS} videos).
          </p>
        </CardHeader>
        <CardContent>
          <GalleryUpload
            photoKeys={photoKeys}
            videoKeys={videoKeys}
            onChange={(photos, videos) => {
              onPhotoKeysChange(photos);
              onVideoKeysChange(videos);
            }}
          />
        </CardContent>
      </Card>

      {/* Sketches */}
      {showSketches && <Card className="rounded-xl border-gray-100 dark:border-slate-700 dark:bg-slate-900/90 shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
            <PenTool className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
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
      </Card>}

      {/* Reference Images */}
      <Card className="rounded-xl border-gray-100 dark:border-slate-700 dark:bg-slate-900/90 shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
            <Image className="h-4 w-4 text-purple-500 dark:text-purple-300" />
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
