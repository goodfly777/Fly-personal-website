import { useRef, useState, type ChangeEvent } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Plus, Save, Trash2, Upload } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { uploadGalleryBatch, type GalleryUploadItem } from '../../lib/galleryUpload';
import {
  type GalleryWorkRecord, type GalleryWorkPayload, type ContentStatus,
  createGalleryWork, updateGalleryWork, deleteGalleryWork,
  reorderGalleryWorkPhotos, replaceGalleryPhotoImage, deleteGalleryPhoto,
} from '../../lib/adminApi';

type UploadItem = GalleryUploadItem;
interface Props { work?: GalleryWorkRecord; onChanged: (id: string | null) => Promise<void>; onBusyChange: (busy: boolean) => void }

export function GalleryWorkEditor({ work, onChanged, onBusyChange }: Props) {
  const [draft, setDraft] = useState<GalleryWorkPayload>(() => work ? {
    title: work.title, description: work.description, location: work.location, takenAt: work.takenAt, sortOrder: work.sortOrder, status: work.status,
  } : { title: '', description: '', location: '', takenAt: '', sortOrder: 0, status: 'draft' });
  const [workId, setWorkId] = useState(work?.id);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const photos = work?.photos || [];
  const field = <K extends keyof GalleryWorkPayload>(key: K, value: GalleryWorkPayload[K]) => setDraft(current => ({ ...current, [key]: value }));
  const run = async (action: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true; setBusy(true); onBusyChange(true); setError(''); setMessage('');
    try { await action(); } catch (caught) { setError(caught instanceof Error ? caught.message : '操作失败，请重试。'); }
    finally { pending.current = false; setBusy(false); onBusyChange(false); }
  };
  const save = async (status = draft.status) => {
    if (!draft.title.trim()) throw new Error('请先填写作品标题。');
    if (!Number.isInteger(draft.sortOrder) || draft.sortOrder < 0) throw new Error('展示顺序需为正整数，留空可自动排序。');
    const payload = { ...draft, title: draft.title.trim(), status };
    const saved = workId ? await updateGalleryWork(workId, payload) : await createGalleryWork(payload);
    setWorkId(saved.id); setDraft({ title: saved.title, description: saved.description, location: saved.location,
      takenAt: saved.takenAt, sortOrder: saved.sortOrder, status: saved.status });
    return saved.id;
  };
  const batch = async (items: UploadItem[]) => run(async () => {
    // Persist group once before sending any files; retries always use this same ID.
    let id: string;
    try { id = await save(); }
    catch (caught) {
      const reason = caught instanceof Error ? caught.message : '作品组保存失败';
      const itemIds = new Set(items.map(item => item.id));
      setUploads(current => current.map(item => itemIds.has(item.id) ? { ...item, state: 'error', error: reason } : item));
      throw caught;
    }
    await uploadGalleryBatch(id, items, item => setUploads(current => current.map(row => row.id === item.id ? item : row)));
    await onChanged(id);
    setMessage('上传队列已处理，失败项可单独重试。');
  });
  const chooseFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files || []); event.currentTarget.value = '';
    if (!files.length) return;
    const items: UploadItem[] = files.map(file => ({ id: crypto.randomUUID(), file, state: 'pending' }));
    setUploads(current => [...current, ...items]); void batch(items);
  };
  const move = (index: number, direction: number) => run(async () => {
    const ordered = [...photos]; [ordered[index], ordered[index + direction]] = [ordered[index + direction], ordered[index]];
    await reorderGalleryWorkPhotos(workId!, ordered.map(photo => photo.id)); await onChanged(workId!);
  });

  return <div className="gallery-work-editor">
    <fieldset disabled={busy} className="gallery-work-form">
      <label>作品标题<Input value={draft.title} maxLength={120} onChange={e => field('title', e.target.value)} required placeholder="例如：长治·漳泽湖公园" /></label>
      <label>展示顺序<Input type="number" min={1} value={draft.sortOrder || ''} onChange={e => field('sortOrder', Number(e.target.value))} placeholder="自动排序" /></label>
      <label>地点<Input value={draft.location} maxLength={120} onChange={e => field('location', e.target.value)} /></label>
      <label>日期<Input value={draft.takenAt} maxLength={40} onChange={e => field('takenAt', e.target.value)} placeholder="2024 或 2024-05" /></label>
      <label className="gallery-work-description">作品描述<textarea value={draft.description} maxLength={1000} rows={3} onChange={e => field('description', e.target.value)} placeholder="可留空，同组照片共用这段描述。" /></label>
      <div className="gallery-work-actions">
        <Button type="button" onClick={() => void run(async () => { const id = await save(); await onChanged(id); setMessage('作品信息已保存。'); })}><Save size={16} />{workId ? '保存作品' : '创建作品组'}</Button>
        {workId && <>
          <Button type="button" variant="outline" onClick={() => void run(async () => { const id = await save('published'); await onChanged(id); setMessage('整组作品已发布。'); })}>发布整组</Button>
          <Button type="button" variant="outline" onClick={() => void run(async () => { const id = await save(draft.status === 'hidden' ? 'published' : 'hidden'); await onChanged(id); setMessage(draft.status === 'hidden' ? '整组作品已显示。' : '整组作品已隐藏。'); })}>{draft.status === 'hidden' ? '显示整组' : '隐藏整组'}</Button>
          <Button type="button" variant="ghost" className="gallery-danger" onClick={() => {
            if (window.confirm(`删除整组作品「${draft.title}」及其中 ${photos.length} 张照片？此操作不可撤销。`)) void run(async () => { await deleteGalleryWork(workId); await onChanged(null); });
          }}><Trash2 size={16} />删除整组作品</Button>
        </>}
      </div>
    </fieldset>
    <div className="gallery-work-upload">
      <h3>组内照片 <span>{photos.length} 张 · 首张作为封面</span></h3>
      <label className="gallery-upload-button">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}添加多张照片
        <input type="file" multiple accept="image/png,image/jpeg,image/gif,image/webp" disabled={busy || !draft.title.trim()} onChange={chooseFiles} aria-label="添加多张照片到作品组" className="sr-only" />
      </label>
      <p>原文件保留，预览图另行生成，每张最多 10MB。{draft.status === 'published' ? '当前作品组已公开，新增照片上传成功后会立即展示。' : '填写标题后可直接批量上传，发布整组后前台可见。'}</p>
    </div>
    {busy && <p role="status">正在处理，请等待当前操作完成…</p>}
    {error && <p className="gallery-error" role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {uploads.length > 0 && <ul className="gallery-upload-results" aria-live="polite">{uploads.map(item => <li key={item.id}>
      <span>{item.file.name}</span><span>{({ pending: '等待上传', uploading: '上传中', success: '上传成功', error: '上传失败' })[item.state]}</span>
      {item.state === 'error' && <><span className="gallery-error">{item.error}</span><Button type="button" variant="outline" disabled={busy} onClick={() => void batch([item])}>重试 {item.file.name}</Button></>}
    </li>)}</ul>}
    <div className="gallery-work-photos">{photos.map((photo, index) => <article key={photo.id}>
      <img src={photo.thumbnailUrl || photo.url} alt={`${draft.title} · 第 ${index + 1} 张`} loading="lazy" />
      <p>{index === 0 ? '封面 · ' : ''}{index + 1} / {photos.length}</p><p className="gallery-photo-filename">{photo.fileName}</p>
      <div className="gallery-photo-actions">
        <Button type="button" variant="ghost" size="icon" disabled={busy || index === 0} aria-label={`前移第 ${index + 1} 张照片`} onClick={() => void move(index, -1)}><ArrowLeft size={16} /></Button>
        <Button type="button" variant="ghost" size="icon" disabled={busy || index === photos.length - 1} aria-label={`后移第 ${index + 1} 张照片`} onClick={() => void move(index, 1)}><ArrowRight size={16} /></Button>
        <label className="gallery-replace-button"><Upload size={14} />更换<input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" disabled={busy} aria-label={`更换第 ${index + 1} 张照片`} onChange={e => {
          const file = e.currentTarget.files?.[0]; e.currentTarget.value = '';
          if (file) void run(async () => { await replaceGalleryPhotoImage(photo.id, file); await onChanged(workId!); setMessage('照片已更换，组信息与顺序保持不变。'); });
        }} /></label>
        <Button type="button" variant="ghost" size="icon" className="gallery-danger" disabled={busy} aria-label={`删除当前照片：第 ${index + 1} 张`} onClick={() => {
          if (window.confirm(`仅删除第 ${index + 1} 张照片？其他照片与作品信息会保留。`)) void run(async () => { await deleteGalleryPhoto(photo.id); await onChanged(workId!); });
        }}><Trash2 size={16} /></Button>
      </div>
    </article>)}</div>
  </div>;
}
