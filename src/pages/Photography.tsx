import { useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, Camera, MapPin, Calendar, X } from 'lucide-react';
import { Layout } from '../components/Layout';
import { GalleryWorkGrid } from '../components/photography/GalleryWorkGrid';
import { listGalleryWorks, type GalleryWorkRecord } from '../lib/adminApi';
import { gallerySequence, publicGalleryWorks } from '../lib/gallery';
import '../styles/gallery.css';

export default function Photography() {
  const [works, setWorks] = useState<GalleryWorkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const visibleWorks = useMemo(() => publicGalleryWorks(works), [works]);
  const sequence = useMemo(() => gallerySequence(works), [works]);
  const position = sequence.findIndex(entry => entry.photo.id === selectedId);
  const current = sequence[position];

  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    void listGalleryWorks().then(items => { if (active) setWorks(items); })
      .catch(() => { if (active) { setWorks([]); setError(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  const move = (direction: number) => {
    const entry = sequence[position + direction];
    if (entry) { setSelectedId(entry.photo.id); setFailedId(null); }
  };

  return <Layout>
    <section className="photography-page">
      <header className="site-page-heading photography-header">
        <span className="photography-eyebrow"><Camera size={16} aria-hidden="true" />PHOTOGRAPHY</span>
        <h1>镜头下的时光</h1>
        <p>留意生活里的小瞬间，光影起落，心事与时光都藏在照片里。</p>
      </header>
      {loading ? <p className="photography-status" role="status">正在加载摄影作品…</p>
        : error ? <div className="photography-status" role="alert"><p>摄影作品暂时无法加载。</p><button type="button" onClick={() => setReload(value => value + 1)}>重新加载</button></div>
        : visibleWorks.length === 0 ? <p className="photography-status">暂时没有公开的摄影作品。</p>
        : <GalleryWorkGrid works={visibleWorks} onSelect={(photo, trigger) => {
          triggerRef.current = trigger; setFailedId(null); setSelectedId(photo.id);
        }} />}
    </section>

    <Dialog.Root open={Boolean(current)} onOpenChange={open => { if (!open) setSelectedId(null); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="photo-dialog-overlay" />
        <Dialog.Content
          className="photo-dialog"
          aria-describedby={undefined}
          onOpenAutoFocus={event => { event.preventDefault(); closeRef.current?.focus(); }}
          onCloseAutoFocus={event => { event.preventDefault(); triggerRef.current?.focus(); }}
          onKeyDown={event => {
            if (event.altKey || event.metaKey || event.ctrlKey || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
            if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
            if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
          }}
        >
          {current && <>
            <Dialog.Close ref={closeRef} className="photo-dialog-close" aria-label="关闭照片详情"><X size={20} /></Dialog.Close>
            <div className="photo-dialog-image" aria-busy={loadedId !== current.photo.id && failedId !== current.photo.id}>
              {failedId === current.photo.id ? <p role="status">照片暂时无法加载，请切换后重试。</p> : <>
                {loadedId !== current.photo.id && <p className="photo-image-loading" role="status">正在加载照片…</p>}
                <img key={current.photo.id} src={current.photo.mediumUrl || current.photo.url} alt={current.photo.title || current.work.title} decoding="async"
                  style={{ opacity: loadedId === current.photo.id ? 1 : 0 }}
                  onLoad={() => setLoadedId(current.photo.id)} onError={() => setFailedId(current.photo.id)} />
              </>}
            </div>
            <div className="photo-dialog-info" role="region" aria-label="作品信息" tabIndex={0}>
              <Dialog.Title>{current.photo.title || current.work.title}</Dialog.Title>
              <div className="photo-dialog-meta">{current.work.location && <span><MapPin size={15} aria-hidden="true" />{current.work.location}</span>}{current.work.takenAt && <span><Calendar size={15} aria-hidden="true" />{current.work.takenAt}</span>}</div>
              {current.work.description.trim() && <p className="photo-dialog-description">{current.work.description}</p>}
              <nav className="photo-dialog-controls" aria-label="照片切换">
                <p role="status" aria-live="polite">{current.index + 1} / {current.work.photos.length}<span>当前作品组</span></p>
                <div>{sequence.length > 1 && <>
                  <button type="button" aria-label="上一张照片" disabled={position === 0} onClick={() => move(-1)}><ArrowLeft size={18} /></button>
                  <button type="button" aria-label="下一张照片" disabled={position === sequence.length - 1} onClick={() => move(1)}><ArrowRight size={18} /></button>
                </>}</div>
              </nav>
              <a className="photo-original-link" href={current.photo.url} target="_blank" rel="noopener noreferrer">查看原文件<span className="sr-only">（在新标签页打开）</span></a>
            </div>
          </>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </Layout>;
}
