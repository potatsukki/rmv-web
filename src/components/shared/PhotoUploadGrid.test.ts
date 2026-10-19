import { expect, it } from 'vitest';
import { splitGalleryKeys } from './PhotoUploadGrid';

it('splits one gallery upload into photos and videos', () => {
  expect(splitGalleryKeys(['visit-photos/a.jpg', 'visit-photos/b.MP4', 'visit-photos/c.heic', 'visit-photos/d.mov'])).toEqual({
    photoKeys: ['visit-photos/a.jpg', 'visit-photos/c.heic'],
    videoKeys: ['visit-photos/b.MP4', 'visit-photos/d.mov'],
    droppedPhotos: 0,
    droppedVideos: 0,
  });
});

it('keeps at most five videos', () => {
  const videos = Array.from({ length: 7 }, (_, index) => `visit-photos/v${index}.mp4`);
  const result = splitGalleryKeys(['visit-photos/a.jpg', ...videos]);
  expect(result.videoKeys).toEqual(videos.slice(0, 5));
  expect(result.droppedVideos).toBe(2);
});
