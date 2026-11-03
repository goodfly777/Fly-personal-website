import type { GalleryPhotoRecord, GalleryWorkRecord } from '../../lib/adminApi';
import { gallerySequence } from '../../lib/gallery';

interface Props {
  works: GalleryWorkRecord[];
  onSelect: (photo: GalleryPhotoRecord, trigger: HTMLButtonElement) => void;
}

export function GalleryWorkGrid({ works, onSelect }: Props) {
  return <div className="photography-grid">{gallerySequence(works).map(({ work, photo }) => {
    const title = photo.title || work.title;
    return <figure className="photography-card content-card-frame" key={photo.id}>
      <button type="button" onClick={event => onSelect(photo, event.currentTarget)} aria-label={`查看照片：${title}`}>
        <img src={photo.thumbnailUrl || photo.url} alt={title} loading="lazy" decoding="async" />
        <span className="photo-caption">{title}</span>
      </button>
    </figure>;
  })}</div>;
}
