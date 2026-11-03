import type { GalleryWorkRecord } from './adminApi';

export function sortGalleryWorks(works: GalleryWorkRecord[]) {
  return [...works].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)).map(work => ({
    ...work, photos: [...work.photos].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
  }));
}

export function publicGalleryWorks(works: GalleryWorkRecord[]) {
  return sortGalleryWorks(works.filter(work => work.status === 'published').map(work => ({
    ...work, photos: work.photos.filter(photo => photo.status === 'published'),
  }))).filter(work => work.photos.length > 0);
}

export function gallerySequence(works: GalleryWorkRecord[]) {
  return publicGalleryWorks(works).flatMap(work => work.photos.map((photo, index) => ({ work, photo, index })));
}
