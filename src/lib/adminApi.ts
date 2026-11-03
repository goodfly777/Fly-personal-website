import { createNetworkErrorMessage, getApiUrl, readApiError, readCsrfToken, requestJson } from './siteApi';

const uploadFetch = async (path: string, body: FormData, errorMessage: string) => {
  const csrfToken = readCsrfToken();
  let response: Response;

  try {
    response = await fetch(getApiUrl(path), {
      method: 'POST',
      credentials: 'include',
      headers: csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {},
      body,
    });
  } catch {
    throw new Error(createNetworkErrorMessage(path));
  }

  if (!response.ok) {
    throw new Error(await readApiError(response, errorMessage));
  }

  return response;
};

export type ContentStatus = 'draft' | 'published' | 'hidden';

export interface AdminUser {
  email: string;
  role: string;
}

export interface BlogPostRecord {
  id: string;
  projectId?: string | null;
  projectSlug: string;
  projectTitle: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  contentMarkdown: string;
  blogOrder: number;
  featuredOnHome: boolean;
  homeOrder: number;
  coverImageUrl?: string | null;
  status: ContentStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostPayload {
  projectId?: string | null;
  title: string;
  slug: string;
  category: string;
  summary: string;
  contentMarkdown: string;
  blogOrder: number;
  featuredOnHome: boolean;
  homeOrder: number;
  coverImageUrl?: string | null;
  status: ContentStatus;
}

export interface MediaAssetRecord {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  blogPostId?: string | null;
  createdAt: string;
}

export interface GalleryPhotoRecord {
  workId?: string;
  id: string;
  title: string;
  description: string;
  location: string;
  takenAt: string;
  sortOrder: number;
  status: ContentStatus;
  url: string;
  thumbnailUrl?: string | null;
  mediumUrl?: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryWorkRecord {
  id: string;
  title: string;
  description: string;
  location: string;
  takenAt: string;
  sortOrder: number;
  status: ContentStatus;
  photos: GalleryPhotoRecord[];
}

export type GalleryWorkPayload = Omit<GalleryWorkRecord, 'id' | 'photos'>;

export const listGalleryWorks = async () => (await requestJson<ListResponse<GalleryWorkRecord>>('/api/gallery-works')).items;
export const listAdminGalleryWorks = async () => (await requestJson<ListResponse<GalleryWorkRecord>>('/api/admin/gallery-works')).items;
export const createGalleryWork = (payload: GalleryWorkPayload) => requestJson<GalleryWorkRecord>('/api/admin/gallery-works', { method: 'POST', body: JSON.stringify(payload) });
export const updateGalleryWork = (id: string, payload: GalleryWorkPayload) => requestJson<GalleryWorkRecord>(`/api/admin/gallery-works/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteGalleryWork = (id: string) => requestJson<void>(`/api/admin/gallery-works/${id}`, { method: 'DELETE' });
export const reorderGalleryWorkPhotos = (id: string, photoIds: string[]) => requestJson<GalleryWorkRecord>(`/api/admin/gallery-works/${id}/photos/order`, { method: 'PUT', body: JSON.stringify(photoIds) });
export const uploadGalleryWorkPhoto = async (id: string, file: File) => {
  const body = new FormData(); body.append('file', file);
  const response = await uploadFetch(`/api/admin/gallery-works/${id}/photos`, body, '照片上传失败，请重试。');
  return response.json() as Promise<GalleryPhotoRecord>;
};

export interface GalleryPhotoPayload {
  title: string;
  description: string;
  location: string;
  takenAt: string;
  sortOrder: number;
  status: ContentStatus;
}

export const HOME_GALLERY_SLOT_KEYS = [
  'hero-polaroid',
  'resume-card',
  'life-card',
  'about-portrait',
] as const;

export type HomeGallerySlotKey = typeof HOME_GALLERY_SLOT_KEYS[number];

export interface HomeGallerySlotPhotoRecord extends Omit<GalleryPhotoRecord, 'id'> {
  id?: string | null;
}

export interface HomeGallerySlotRecord {
  slotKey: HomeGallerySlotKey;
  photo: HomeGallerySlotPhotoRecord | null;
}

export interface HomeGallerySlotPayload {
  slotKey: HomeGallerySlotKey;
  galleryPhotoId?: string | null;
}

export interface AboutAssetRecord {
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

interface ListResponse<T> {
  items: T[];
}

export const getCurrentAdmin = () => requestJson<AdminUser>('/api/auth/me');

export const loginAdmin = (email: string, password: string) => requestJson<AdminUser>('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
});

export const logoutAdmin = () => requestJson<void>('/api/auth/logout', {
  method: 'POST',
});

export const changeAdminPassword = (currentPassword: string, newPassword: string) => requestJson<void>('/api/auth/password', {
  method: 'PUT',
  body: JSON.stringify({ currentPassword, newPassword }),
});

export const listAdminBlogPosts = async () => (
  await requestJson<ListResponse<BlogPostRecord>>('/api/admin/blog-posts')
).items;

export const createBlogPost = (payload: BlogPostPayload) => requestJson<BlogPostRecord>('/api/admin/blog-posts', {
  method: 'POST',
  body: JSON.stringify(payload),
});

export const updateBlogPost = (id: string, payload: BlogPostPayload) => requestJson<BlogPostRecord>(`/api/admin/blog-posts/${id}`, {
  method: 'PUT',
  body: JSON.stringify(payload),
});

export const deleteBlogPost = (id: string) => requestJson<void>(`/api/admin/blog-posts/${id}`, {
  method: 'DELETE',
});

export const listMediaAssets = async (blogPostId?: string) => {
  const query = blogPostId ? `?blogPostId=${encodeURIComponent(blogPostId)}` : '';
  return (await requestJson<ListResponse<MediaAssetRecord>>(`/api/admin/media-assets${query}`)).items;
};

export const deleteMediaAsset = (id: string) => requestJson<void>(`/api/admin/media-assets/${id}`, {
  method: 'DELETE',
});

export const uploadMediaAsset = async (file: File, blogPostId: string) => {
  const body = new FormData();
  body.append('file', file);
  body.append('blogPostId', blogPostId);
  const response = await uploadFetch('/api/admin/media-assets', body, '图片上传失败，请稍后再试。');
  return response.json() as Promise<MediaAssetRecord>;
};

export const listGalleryPhotos = async () => (
  await requestJson<ListResponse<GalleryPhotoRecord>>('/api/gallery-photos')
).items;

export const listHomeGallerySlots = async () => (
  await requestJson<ListResponse<HomeGallerySlotRecord>>('/api/home-gallery-slots')
).items;

export const listAdminGalleryPhotos = async () => (
  await requestJson<ListResponse<GalleryPhotoRecord>>('/api/admin/gallery-photos')
).items;

export const listAdminHomeGallerySlots = async () => (
  await requestJson<ListResponse<HomeGallerySlotRecord>>('/api/admin/home-gallery-slots')
).items;

export const updateAdminHomeGallerySlots = async (slots: HomeGallerySlotPayload[]) => (
  await requestJson<ListResponse<HomeGallerySlotRecord>>('/api/admin/home-gallery-slots', {
    method: 'PUT',
    body: JSON.stringify({ slots }),
  })
).items;

export const uploadHomeGallerySlotImage = async (slotKey: HomeGallerySlotKey, file: File) => {
  const body = new FormData();
  body.append('file', file);
  const response = await uploadFetch(`/api/admin/home-gallery-slots/${slotKey}/image`, body, '首页图片上传失败，请稍后再试。');
  return response.json() as Promise<HomeGallerySlotRecord>;
};

export const updateGalleryPhoto = (id: string, payload: GalleryPhotoPayload) => (
  requestJson<GalleryPhotoRecord>(`/api/admin/gallery-photos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
);

export const replaceGalleryPhotoImage = async (id: string, file: File) => {
  const body = new FormData();
  body.append('file', file);
  const response = await uploadFetch(`/api/admin/gallery-photos/${id}/image`, body, '图册图片更换失败，请稍后再试。');
  return response.json() as Promise<GalleryPhotoRecord>;
};

export const deleteGalleryPhoto = (id: string) => requestJson<void>(`/api/admin/gallery-photos/${id}`, {
  method: 'DELETE',
});

export const uploadGalleryPhoto = async (file: File, payload: GalleryPhotoPayload) => {
  const body = new FormData();
  body.append('file', file);
  body.append('title', payload.title);
  body.append('description', payload.description);
  body.append('location', payload.location);
  body.append('takenAt', payload.takenAt);
  body.append('sortOrder', String(payload.sortOrder));
  body.append('status', payload.status);
  const response = await uploadFetch('/api/admin/gallery-photos', body, '图册图片上传失败，请稍后再试。');
  return response.json() as Promise<GalleryPhotoRecord>;
};

export const uploadAboutAsset = async (file: File) => {
  const body = new FormData();
  body.append('file', file);
  const response = await uploadFetch('/api/admin/about/assets', body, '图片上传失败，请稍后再试。');
  return response.json() as Promise<AboutAssetRecord>;
};
