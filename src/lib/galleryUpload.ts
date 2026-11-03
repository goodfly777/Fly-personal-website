import { uploadGalleryWorkPhoto } from './adminApi';

export interface GalleryUploadItem {
  id: string;
  file: File;
  state: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

// One request per file allows a failed member to be retried without duplicating successes.
export async function uploadGalleryBatch(workId: string, items: GalleryUploadItem[], update: (item: GalleryUploadItem) => void) {
  for (const item of items) {
    update({ ...item, state: 'uploading', error: undefined });
    try {
      await uploadGalleryWorkPhoto(workId, item.file);
      update({ ...item, state: 'success', error: undefined });
    } catch (caught) {
      update({ ...item, state: 'error', error: caught instanceof Error ? caught.message : '上传失败' });
    }
  }
}
