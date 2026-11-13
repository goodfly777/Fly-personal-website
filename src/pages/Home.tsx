import { useEffect, useState, type SyntheticEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BookOpen, Camera, Cat, Footprints, Sun, RefreshCw } from 'lucide-react';
import { Layout, SiteFooter } from '../components/Layout';
import { ScrollChapter, ChapterPhoto, ChapterStage, ExploreNext } from '../components/home/ScrollChapter';
import { listHomeGallerySlots, type HomeGallerySlotKey } from '../lib/adminApi';
import { requestJson } from '../lib/siteApi';
import placeholder from '../assets/night-placeholder.svg';
import '../styles/home.css';
interface HomeBlogPostRecord {
  id: string; projectSlug: string; title: string; slug: string; category: string; summary: string; projectTitle: string;
  coverImageUrl?: string | null; publishedAt?: string | null; createdAt: string;
}
const Home = () => {
  const [currentChapter, setCurrentChapter] = useState(0);
  const [posts, setPosts] = useState<HomeBlogPostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsError, setPostsError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [images, setImages] = useState<Partial<Record<HomeGallerySlotKey, string>>>({});
  const [failedHeroSrc, setFailedHeroSrc] = useState<string | null>(null);
  const heroSrc = images['hero-polaroid'];
  const showHeroPhoto = !!heroSrc && heroSrc !== failedHeroSrc;
  const reduced = useReducedMotion();
  useEffect(() => {
    let active = true;
    void listHomeGallerySlots().then(slots => {
      if (!active) return;
      setImages(slots.reduce<Partial<Record<HomeGallerySlotKey, string>>>((result, slot) => {
        if (slot.photo?.url) result[slot.slotKey] = slot.photo.mediumUrl || slot.photo.url;
        return result;
      }, {}));
    }).catch(() => { /* Keep local artwork when the API is offline. */ });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setPostsError(false);
    void requestJson<{ items: HomeBlogPostRecord[] }>('/api/blog-posts/home-featured')
      .then(response => { if (active) setPosts(response.items); })
      .catch(() => { if (active) { setPosts([]); setPostsError(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);
  const image = (key: HomeGallerySlotKey) => images[key] || placeholder;
  const fallback = (event: SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.onerror = null;
    if (event.currentTarget.src !== new URL(placeholder, window.location.href).href) event.currentTarget.src = placeholder;
  };
  return (
    <Layout theme="cosmic">
      <div className="cosmic-home">
        <ChapterStage current={currentChapter} onChange={setCurrentChapter}>
        <ScrollChapter index={0} id="introduction" label="个人介绍">
          <div className="cosmic-split cosmic-hero">
            <div>
              <p className="cosmic-eyebrow"><span className="cosmic-status" /> CHEN JIE / PERSONAL SPACE</p>
              <h1><span className="cosmic-greeting">你好，我是陈杰。</span><br />用代码探索未知<br /><span className="cosmic-accent">用镜头记录生活</span></h1>
              <p className="cosmic-hero-line">AI 开发者，也是一名摄影爱好者。</p>
              <p className="cosmic-copy">这里记录我的创作、灵感与成长，也分享那些值得珍藏的日常。</p>
              <div className="cosmic-actions"><Link className="cosmic-button" to="/blog">阅读技术博客 <ArrowUpRight size={18} /></Link><Link className="cosmic-button cosmic-button-outline" to="/photography"><Camera size={17} /> 看看我的照片</Link></div>
              <div className="cosmic-hero-index"><span>01 — AI 与开发</span><span>02 — 生活与摄影</span></div>
            </div>
            <div className={`cosmic-hero-photo${showHeroPhoto ? '' : ' is-artwork'}`}>
              {showHeroPhoto && <img key={heroSrc} src={heroSrc} alt="镜头记录的生活瞬间"
                decoding="async" onError={() => setFailedHeroSrc(heroSrc)} />}
              {!showHeroPhoto && <div className="cosmic-artwork" aria-hidden="true"><div className="cosmic-artwork-grid" /><span className="cosmic-artwork-top">IDEAS INTO REALITY ↗</span><div className="cosmic-artwork-orbit orbit-one" /><div className="cosmic-artwork-orbit orbit-two" /><div className="cosmic-artwork-core" /><span className="cosmic-artwork-type">Hello,<br /><em>world.</em></span><span className="cosmic-artwork-bottom">保持好奇 · 持续创造<span>CODE / CAPTURE / CREATE</span></span></div>}
              {showHeroPhoto && <span className="cosmic-photo-caption">THROUGH MY LENS <Camera size={14} /></span>}
            </div>
          </div>
          <ExploreNext />
        </ScrollChapter>
        <ScrollChapter index={1} id="featured-blog" label="精选博客">
          <div className="cosmic-heading"><div><p className="cosmic-eyebrow">01 / SELECTED POSTS</p><h2 id="cosmic-blog-heading">精选<span className="cosmic-muted">博客。</span></h2></div><Link className="cosmic-text-link" to="/blog">全部文章 <ArrowUpRight size={17} /></Link></div>
          <p className="cosmic-copy cosmic-blog-intro">关于项目实现、架构取舍与开发复盘的精选记录。</p>
          <div className="cosmic-blog-grid" aria-busy={loading}>
            {loading ? Array.from({ length: 3 }, (_, i) => <div key={i} className="cosmic-skeleton" role="status"><span className="sr-only">正在加载文章</span></div>) : posts.map((post, i) => {
              const date = new Date(post.publishedAt || post.createdAt);
              return <motion.article key={post.id} initial={reduced ? false : { opacity: 1, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : Math.min(i, 4) * 0.08 }} className="cosmic-blog-card">
                <Link to={`/blog?post=${encodeURIComponent(post.slug)}`}>
                  {post.coverImageUrl && <div className="cosmic-blog-cover"><img src={post.coverImageUrl} onError={fallback} alt="" loading="lazy" /></div>}
                  <div className="cosmic-blog-meta"><span>{post.category}</span>{!Number.isNaN(date.getTime()) && <time dateTime={date.toISOString()}>{date.toISOString().slice(0, 10)}</time>}</div>
                  <h3>{post.title}<ArrowUpRight size={18} /></h3>
                  {post.summary && <p className="cosmic-blog-summary">{post.summary}</p>}

                </Link>
              </motion.article>;
            })}
          </div>
          {!loading && posts.length === 0 && <div className="cosmic-empty" role={postsError ? 'status' : undefined}><BookOpen size={28} /><p>{postsError ? '文章暂时未能加载' : '暂时没有精选文章，可以前往技术博客查看全部内容。'}</p>{postsError ? <button type="button" className="cosmic-text-link" onClick={() => setReloadKey(key => key + 1)}><RefreshCw size={16} /> 重新加载</button> : <Link className="cosmic-text-link" to="/blog">前往博客 <ArrowUpRight size={17} /></Link>}</div>}
        </ScrollChapter>
        <ScrollChapter index={2} id="about-life" label="生活与摄影">
          <div className="cosmic-split cosmic-life">
            <div className="cosmic-life-photos">
              <ChapterPhoto src={image('life-card')} alt={images['life-card'] ? '镜头记录的生活瞬间' : '等待摄影作品的星空画框'} lazy />
              <img className="cosmic-cat-photo" src={image('about-portrait')} onError={fallback} alt={images['about-portrait'] ? '生活与摄影补充照片' : '星空插画占位'} loading="lazy" />
              <span className="cosmic-image-label">A LITTLE SLICE OF MY LIFE ↗</span>
            </div>
            <div><p className="cosmic-eyebrow">02 / BEYOND THE SCREEN</p><h2>记录<span className="cosmic-muted">美好生活</span></h2>
              <p className="cosmic-copy">平时喜欢撸猫、健身、徒步、接触大自然，这让我感到放松，也能给我带来新的灵感。</p>
              <p className="cosmic-copy">用镜头收藏心动的瞬间，也在平凡的日子里，寻找属于自己的光。</p>
              <div className="cosmic-tags cosmic-hobbies"><span><Cat size={15} /> 撸猫</span><span><Footprints size={15} /> 健身</span><span><Sun size={15} /> 徒步与大自然</span></div>
              <div className="cosmic-actions"><Link className="cosmic-button" to="/photography">进入个人摄影展 <ArrowUpRight size={18} /></Link><Link className="cosmic-text-link" to="/about">读我的故事 <ArrowUpRight size={17} /></Link></div>
            </div>
          </div>
        </ScrollChapter>
        <ScrollChapter index={3} id="site-footer" label="保持联系">
          <SiteFooter embedded />
        </ScrollChapter>
        </ChapterStage>
      </div>
    </Layout>
  );
};
export default Home;
