import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Comments } from '../components/Comments';
import { BackToTopButton } from '../components/BackToTopButton';
import { renderMarkdown, renderInlineMarkdown, renderMarkdownDocument, type MarkdownHeading } from '../lib/markdown';
import { requestJson } from '../lib/siteApi';
import '../styles/blog.css';
import { articleContents } from '../lib/articleContents';

interface ListResponse<T> {
  items: T[];
}

interface BlogPost {
  id?: string;
  slug: string;
  fileSlug: string;
  projectSlug: string;
  projectTitle: string;
  projectDescription: string;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  category: string;
  readingTime: string;
  order?: number;
  body: string;
}

interface PublishedBlogPostRecord {
  id: string;
  projectSlug: string;
  projectTitle: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  contentMarkdown: string;
  blogOrder: number;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

const estimateReadingTime = (body: string) => {
  const cjkChars = body.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const latinWords = body.replace(/[\u4e00-\u9fff]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const units = cjkChars + latinWords;
  return `${Math.max(1, Math.ceil(units / 450))} min`;
};

const toDateString = (value?: string | null) => {
  if (!value) return new Date().toISOString().slice(0, 10);

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);

  return parsed.toISOString().slice(0, 10);
};

const formatPostDate = (date: string) => {
  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(parsed);
};

const toBlogPostFromRecord = (
  post: PublishedBlogPostRecord
): BlogPost => {
  const body = post.contentMarkdown || '';

  return {
    id: post.id,
    slug: post.slug,
    fileSlug: post.slug,
    projectSlug: post.projectSlug,
    projectTitle: '',
    projectDescription: '',
    title: post.title,
    date: toDateString(post.publishedAt || post.createdAt),
    summary: post.summary,
    tags: [],
    category: post.category,
    readingTime: estimateReadingTime(body),
    order: Number.isFinite(post.blogOrder) ? post.blogOrder : undefined,
    body,
  };
};

const getPostKey = (post: BlogPost) => `${post.projectSlug}/${post.slug}`;

const getPublicBlogPosts = (posts: PublishedBlogPostRecord[]) => posts.map(post => toBlogPostFromRecord(post));
const comparePostDates = (first: BlogPost, second: BlogPost) => (
  (Date.parse(second.date) || 0) - (Date.parse(first.date) || 0) || getPostKey(first).localeCompare(getPostKey(second))
);

function ArticleContents({ headings }: { headings: MarkdownHeading[] }) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(headings[0]?.id);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (headings.length < 2) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = headings[0]?.id;
      for (const heading of headings) {
        const target = document.getElementById(heading.id);
        if (target && target.getBoundingClientRect().top <= 160) current = heading.id;
      }
      setActiveId(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, [headings]);
  if (headings.length < 2) return null;
  const jump = (heading: MarkdownHeading) => {
    const target = document.getElementById(heading.id);
    setOpen(false);
    requestAnimationFrame(() => {
      target?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      target?.focus({ preventScroll: true });
    });
  };
  const items = <ol>{articleContents(headings, activeId).map(({ heading, depth, current }) => <li key={heading.id} data-depth={depth}><button type="button" aria-current={current ? 'location' : undefined} onClick={() => jump(heading)}>{heading.text}</button></li>)}</ol>;
  return <aside className="blog-contents" aria-label="文章目录" onKeyDown={event => { if (event.key === 'Escape' && open) { setOpen(false); toggleRef.current?.focus(); } }}>
    <div className="blog-contents-desktop"><p>文章目录</p><nav aria-label="章节导航">{items}</nav></div>
    <div className="blog-contents-mobile"><button ref={toggleRef} className="blog-contents-toggle" type="button" aria-expanded={open} aria-controls="blog-contents-list" onClick={() => setOpen(value => !value)}>文章目录 <span aria-hidden="true">{open ? '−' : '+'}</span></button><nav id="blog-contents-list" aria-label="章节导航" hidden={!open}>{items}</nav></div>
  </aside>;
}

const Blog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [publishedPosts, setPublishedPosts] = useState<BlogPost[]>([]);
  const [isLoadingPublishedContent, setIsLoadingPublishedContent] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const requestPending = useRef(true);
  const activePostSlug = searchParams.get('post');

  useEffect(() => {
    let isCurrent = true;
    const controller = new AbortController();
    requestPending.current = true;
    setIsLoadingPublishedContent(true);
    setLoadError(false);
    void requestJson<ListResponse<PublishedBlogPostRecord>>('/api/blog-posts', { signal: controller.signal }).then(postsResponse => {
      if (!isCurrent) return;
      setPublishedPosts(getPublicBlogPosts(postsResponse.items));
    }).catch(() => {
      if (!isCurrent) return;
      setPublishedPosts([]);
      setLoadError(true);
    }).finally(() => {
      if (!isCurrent) return;
      requestPending.current = false;
      setIsLoadingPublishedContent(false);
    });
    return () => { isCurrent = false; controller.abort(); };
  }, [reload]);

  const allBlogPosts = useMemo(() => [...publishedPosts].sort(comparePostDates), [publishedPosts]);
  const activePost = allBlogPosts.find(post => [post.slug, post.fileSlug].includes(activePostSlug || ''));
  const document = useMemo(() => renderMarkdownDocument(activePost?.body || '', activePost?.title), [activePost?.body, activePost?.title]);
  const position = allBlogPosts.findIndex(post => post.slug === activePost?.slug);
  const previous = position > 0 ? allBlogPosts[position - 1] : undefined;
  const next = position >= 0 ? allBlogPosts[position + 1] : undefined;
  const listedPosts = allBlogPosts;
  const postUrl = (post: BlogPost) => `/blog?post=${encodeURIComponent(post.fileSlug)}`;
  const listUrl = '/blog';
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [activePostSlug]);
  const retry = () => {
    if (requestPending.current) return;
    requestPending.current = true;
    setIsLoadingPublishedContent(true);
    setLoadError(false);
    setReload(value => value + 1);
  };

  return <Layout footerVariant="compact">
    <div className={`blog-page${activePostSlug ? ' blog-page-reading' : ''}`}>
      {!activePostSlug && <header className="site-page-heading blog-list-header"><h1>技术博客</h1><p>记录 AI 应用开发中的实现、取舍与复盘。</p></header>}
      {isLoadingPublishedContent ? <div className="blog-status" role="status" aria-live="polite"><p>正在加载文章…</p><div className="blog-loading-line" />{reload > 0 && <button type="button" className="blog-retry" disabled>重新加载中…</button>}</div>
        : loadError ? <div className="blog-status" role="status"><h2>文章暂时无法加载，请稍后重试</h2><button type="button" className="blog-retry" disabled={isLoadingPublishedContent} onClick={retry}><RefreshCw size={16} aria-hidden="true" />重新加载</button></div>
        : (activePostSlug && !activePost) ? <div className="blog-status"><h1>文章不存在或暂未公开</h1><Link to="/blog" className="blog-inline-link">返回全部文章 <ArrowRight size={16} aria-hidden="true" /></Link></div>
        : activePost ? <>
          <Link to={listUrl} className="blog-back"><ArrowLeft size={16} aria-hidden="true" />返回文章列表</Link>
          <div className={`blog-reading-layout${document.headings.length >= 2 ? ' has-contents' : ''}`}>
            <ArticleContents key={getPostKey(activePost)} headings={document.headings} />
            <article className="blog-article" aria-labelledby="blog-post-title">
              <header className="blog-article-header">{activePost.category && <p className="blog-category">{activePost.category}</p>}<h1 id="blog-post-title">{activePost.title}</h1><div className="blog-meta"><time dateTime={activePost.date}>{formatPostDate(activePost.date)}</time><span>约 {activePost.readingTime.replace(' min', ' 分钟')}</span></div></header>
              <div className="blog-prose">{document.blocks}</div>
              {(previous || next) && <nav className="blog-adjacent" aria-label="相邻文章">{previous && <Link to={postUrl(previous)} rel="prev"><span><ArrowLeft size={14} aria-hidden="true" />上一篇</span>{previous.title}</Link>}{next && <Link to={postUrl(next)} rel="next"><span>下一篇<ArrowRight size={14} aria-hidden="true" /></span>{next.title}</Link>}</nav>}
              <Link to={listUrl} className="blog-inline-link">返回文章列表 <ArrowRight size={16} aria-hidden="true" /></Link>
              <Comments key={getPostKey(activePost)} className="mt-12 border-t border-border pt-8" postSlug={activePost.slug} postProjectSlug={activePost.projectSlug} postId={activePost.id} />
            </article>
          </div>
        </> : <>
          <p id="blog-result-count" className="blog-result-count" role="status">{listedPosts.length} 篇文章<span>按发布时间</span></p>
          {listedPosts.length === 0 ? <div className="blog-status"><p>暂时还没有公开文章。</p></div> : <div className="blog-post-list">{listedPosts.map(post => <article key={getPostKey(post)} className="blog-post-row">{post.category && <p className="blog-category">{post.category}</p>}<h2><Link to={postUrl(post)}>{post.title}</Link></h2>{post.summary && <p className="blog-summary">{renderInlineMarkdown(post.summary, getPostKey(post))}</p>}<div className="blog-meta"><time dateTime={post.date}>{formatPostDate(post.date)}</time><span>约 {post.readingTime.replace(' min', ' 分钟')}</span></div></article>)}</div>}
        </>}
    </div>
    <BackToTopButton />
  </Layout>;
};
export default Blog;
