import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  FileText,
  FolderKanban,
  ImageIcon,
  KeyRound,
  Loader2,
  LogOut,
  MessageCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { OperationNotice } from '../components/ui/operation-notice';
import { useTransientNotice } from '../hooks/useTransientNotice';
import { Input } from '../components/ui/input';
import { DEFAULT_GITHUB_URL, getGithubUrl, isHttpUrl, withGithubUrl } from '../lib/siteContact';
import { createAboutEntry, nextAboutEntryOrder, validateAboutEntries, highlightsToText, textToHighlights } from '../lib/aboutEntryForm';
import { ProfileDetailsEditor } from '../components/admin/ProfileDetailEditor';
import { GalleryWorkEditor } from '../components/admin/GalleryWorkEditor';
import { BlogEditorActions, BlogStatusBadge } from '../components/admin/BlogEditorActions';
import { getBlogSaveNotice } from '../lib/blogEditorState';
import '../styles/gallery.css';
import '../styles/admin-about.css';
import '../styles/admin-blog.css';
import {
  type AdminUser,
  type BlogPostPayload,
  type BlogPostRecord,
  type ContentStatus,
  type GalleryWorkRecord,
  type HomeGallerySlotKey,
  type HomeGallerySlotRecord,
  type MediaAssetRecord,
  HOME_GALLERY_SLOT_KEYS,
  changeAdminPassword,
  createBlogPost,
  deleteBlogPost,
  deleteMediaAsset,
  getCurrentAdmin,
  listAdminGalleryWorks,
  listAdminHomeGallerySlots,
  listMediaAssets,
  listAdminBlogPosts,
  loginAdmin,
  logoutAdmin,
  updateAdminHomeGallerySlots,
  updateBlogPost,
  uploadAboutAsset,
  uploadHomeGallerySlotImage,
  uploadMediaAsset,
} from '../lib/adminApi';
import {
  type CommentRecord,
  type CommentStatus,
  approveAdminComment,
  deleteAdminComment,
  formatCommentDate,
  hideAdminComment,
  listAdminComments,
} from '../lib/commentsApi';
import { renderMarkdown } from '../lib/markdown';
import { getApiUrl } from '../lib/siteApi';
import { cn } from '../lib/utils';
import {
  type AboutContentPayload,
  type AboutContentRecord,
  type AboutProfileDetail,
  type AboutResumeEntry,
  type AboutResumeHighlight,
  getAdminAboutContent,
  updateAdminAboutContent,
} from '../lib/aboutApi';

type AuthState = 'checking' | 'anonymous' | 'authenticated';
type EditorMode = 'edit' | 'preview';
type ContentTab = 'blog' | 'gallery' | 'comment' | 'about';
type SelectedType = ContentTab | null;
const DEFAULT_BLOG_CATEGORY = '技术博客';
// Keep legacy API slots for reading existing data, but only edit positions used by Home.
const displayedHomeGallerySlotKeys = ['hero-polaroid', 'life-card', 'about-portrait'] as const satisfies readonly HomeGallerySlotKey[];
type DisplayedHomeGallerySlotKey = typeof displayedHomeGallerySlotKeys[number];
const homeGallerySlotMeta: Record<DisplayedHomeGallerySlotKey, { title: string; hint: string }> = {
  'hero-polaroid': {
    title: '个人介绍 · 主视觉图',
    hint: '首页“个人介绍”章节的主图，桌面端位于文字右侧。',
  },
  'life-card': {
    title: '生活与摄影 · 主图',
    hint: '“生活与摄影”章节的主要照片，与“不仅仅是代码”文案搭配展示。',
  },
  'about-portrait': {
    title: '生活与摄影 · 叠放小图',
    hint: '叠放在主图右下角，建议使用主体清晰的方形照片。',
  },
};

const emptyHomeGallerySlots = () => (
  HOME_GALLERY_SLOT_KEYS.reduce((slots, slotKey) => {
    slots[slotKey] = { slotKey, photo: null };
    return slots;
  }, {} as Record<HomeGallerySlotKey, HomeGallerySlotRecord>)
);

const homeGallerySlotsFromRecords = (slots: HomeGallerySlotRecord[]) => {
  const nextSlots = emptyHomeGallerySlots();

  slots.forEach((slot) => {
    nextSlots[slot.slotKey] = slot;
  });

  return nextSlots;
};

interface BlogEditorForm {
  id?: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  contentMarkdown: string;
  blogOrder: number;
  featuredOnHome: boolean;
  homeOrder: number;
  coverImageUrl: string;
  status: ContentStatus;
}

interface PasswordChangeForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const nextBlogOrder = (posts: BlogPostRecord[]) => {
  const scopedPosts = posts;
  const maxOrder = scopedPosts.reduce((max, post) => Math.max(max, Number(post.blogOrder) || 0), 0);
  return maxOrder + 1;
};

const emptyForm = (blogOrder = 1): BlogEditorForm => ({
  title: '',
  slug: '',
  category: DEFAULT_BLOG_CATEGORY,
  summary: '',
  contentMarkdown: '## 小标题\n\n这里写正文。',
  blogOrder,
  featuredOnHome: false,
  homeOrder: blogOrder,
  coverImageUrl: '',
  status: 'draft',
});

const emptyPasswordChangeForm = (): PasswordChangeForm => ({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const emptyAboutContent = (): AboutContentRecord => ({
  portraitImageUrl: '',
  wechatQrImageUrl: '',
  profileDetails: [
    { label: '基本信息', value: '', icon: 'user', wide: true },
    { label: '本科', value: '', icon: 'graduation-cap' },
    { label: '硕士', value: '', icon: 'graduation-cap' },
    { label: '手机', value: '', icon: 'phone', copyValue: '' },
    { label: '邮箱', value: '', icon: 'mail', copyValue: '' },
  ],
  resumeEntries: [],
  contactHeading: '联系设置',
  contactItems: [
    { label: '手机', value: '', icon: 'phone' },
    { label: '邮箱', value: '', icon: 'mail' },
  ],
  socialLinks: withGithubUrl([], DEFAULT_GITHUB_URL),
});

const emptyAboutProfileDetail = (): AboutProfileDetail => ({
  label: '新信息',
  value: '',
  icon: 'user',
  copyValue: '',
  wide: false,
});

const textToList = (value: string) => value
  .split(/[,\n，、]/)
  .map((item) => item.trim())
  .filter(Boolean);

const listToText = (values?: string[] | null) => (values ?? []).join('、');

const aboutContentToPayload = (content: AboutContentRecord): AboutContentPayload => ({
  portraitImageUrl: content.portraitImageUrl?.trim() || '',
  wechatQrImageUrl: content.wechatQrImageUrl?.trim() || '',
  profileDetails: content.profileDetails.map((item) => ({
    label: item.label.trim(),
    value: item.value.trim(),
    icon: item.icon?.trim() || 'user',
    copyValue: item.copyValue?.trim() || null,
    wide: Boolean(item.wide),
  })).filter((item) => item.label),
  resumeEntries: content.resumeEntries.map((entry, index) => ({
    category: entry.category?.trim() || '项目经历',
    title: entry.title.trim(),
    meta: entry.meta?.trim() || '',
    period: entry.period?.trim() || '',
    techStack: entry.techStack ?? [],
    descriptionLabel: entry.descriptionLabel?.trim() || '项目描述',
    description: entry.description?.trim() || '',
    highlightsLabel: entry.highlightsLabel?.trim() || '项目亮点',
    highlights: entry.highlights ?? [],
    sortOrder: Number(entry.sortOrder) || index + 1,
    hidden: Boolean(entry.hidden),
  })).filter((entry) => entry.title),
  contactHeading: content.contactHeading.trim() || '联系设置',
  contactItems: content.contactItems.map((item) => ({
    label: item.label.trim(),
    value: item.value.trim(),
    icon: item.icon?.trim() || 'mail',
  })).filter((item) => item.label),
  socialLinks: withGithubUrl(content.socialLinks, getGithubUrl(content.socialLinks)),
});

const cleanSlug = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const slugify = (value: string, fallbackPrefix = 'post') => (
  cleanSlug(value) || `${fallbackPrefix}-${Date.now().toString(36)}`
);

const getBlogSlugBase = (form: Pick<BlogEditorForm, 'title' | 'blogOrder'>) => (
  cleanSlug(form.title) || `blog-${Number(form.blogOrder) || 'post'}`
);

const getUniqueBlogSlug = (
  form: Pick<BlogEditorForm, 'id' | 'title' | 'blogOrder'>,
  posts: BlogPostRecord[]
) => {
  const baseSlug = getBlogSlugBase(form);
  const usedSlugs = new Set(
    posts
      .filter((post) => post.id !== form.id)
      .map((post) => post.slug.toLowerCase())
  );

  let candidate = baseSlug;
  let suffix = 2;

  while (usedSlugs.has(candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};

const formatBlogSaveError = (error: unknown) => {
  const message = error instanceof Error ? error.message : '';

  if (message === 'Blog post slug already exists.') {
    return '这篇博客的链接名和已有博客重复了，请刷新后再保存。';
  }

  return message || '保存失败。';
};

const copyTextToClipboard = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = value;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  textArea.style.top = '-9999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  const didCopy = document.execCommand('copy');
  textArea.remove();

  if (!didCopy) {
    throw new Error('复制失败');
  }
};

const statusLabel: Record<ContentStatus, string> = {
  draft: '草稿',
  published: '已发布',
  hidden: '隐藏',
};

const statusClassName: Record<ContentStatus, string> = {
  draft: 'bg-muted text-body',
  published: 'bg-emerald-50 text-emerald-700',
  hidden: 'bg-slate-900 text-white',
};

const StatusBadge = ({ status }: { status: ContentStatus }) => (
  <Badge className={cn('shrink-0 border-none text-[11px] font-semibold', statusClassName[status])}>
    {statusLabel[status]}
  </Badge>
);

const adminHeaderButtonClass = 'h-10 gap-2 rounded-md border-border bg-card px-3.5 text-sm font-semibold text-body shadow-sm shadow-black/20 hover:border-border hover:bg-muted hover:text-foreground disabled:shadow-none';
const adminHeaderDangerButtonClass = cn(
  adminHeaderButtonClass,
  'hover:border-red-200 hover:bg-red-50 hover:text-red-700'
);
const adminHeaderIdentityClass = 'hidden h-10 min-w-0 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-bold text-body shadow-sm shadow-black/20 sm:flex';

const commentStatusLabel: Record<CommentStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  hidden: '已隐藏',
};

const commentStatusClassName: Record<CommentStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  hidden: 'bg-slate-900 text-white',
};

const CommentStatusBadge = ({ status }: { status: CommentStatus }) => (
  <Badge className={cn('shrink-0 border-none text-[11px] font-semibold', commentStatusClassName[status])}>
    {commentStatusLabel[status]}
  </Badge>
);

const commentTargetLabel = (comment: CommentRecord, posts: BlogPostRecord[]) => {
  if (comment.targetType === 'guestbook') return '留言板';

  return posts.find((post) => post.id === comment.targetId)?.title ?? '未知博客';
};

const getSafeReturnPath = (value: string | null) => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '';
  if (value === '/admin' || value.startsWith('/admin?')) return '';

  return value;
};

const formFromPost = (post: BlogPostRecord): BlogEditorForm => ({
  id: post.id,
  title: post.title,
  slug: post.slug,
  category: post.category || DEFAULT_BLOG_CATEGORY,
  summary: post.summary,
  contentMarkdown: post.contentMarkdown,
  blogOrder: post.blogOrder,
  featuredOnHome: Boolean(post.featuredOnHome),
  homeOrder: post.homeOrder,
  coverImageUrl: post.coverImageUrl ?? '',
  status: post.status,
});

const toPayload = (form: BlogEditorForm, status: ContentStatus, slug = form.slug): BlogPostPayload => ({
  title: form.title.trim(),
  slug: (slug.trim() || getBlogSlugBase(form)).toLowerCase(),
  category: form.category.trim() || DEFAULT_BLOG_CATEGORY,
  summary: form.summary.trim(),
  contentMarkdown: form.contentMarkdown.trim(),
  blogOrder: Number(form.blogOrder) || 0,
  featuredOnHome: form.featuredOnHome,
  homeOrder: Number(form.homeOrder) || 0,
  coverImageUrl: form.coverImageUrl.trim() || null,
  status,
});

const Admin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [user, setUser] = useState<AdminUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordChangeForm, setPasswordChangeForm] = useState<PasswordChangeForm>(() => emptyPasswordChangeForm());
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [posts, setPosts] = useState<BlogPostRecord[]>([]);
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [galleryWorks, setGalleryWorks] = useState<GalleryWorkRecord[]>([]);
  const [galleryEditorKey, setGalleryEditorKey] = useState(0);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [homeGallerySlots, setHomeGallerySlots] = useState<Record<HomeGallerySlotKey, HomeGallerySlotRecord>>(() => emptyHomeGallerySlots());
  const [isHomeGallerySlotsOpen, setIsHomeGallerySlotsOpen] = useState(true);
  const [aboutContent, setAboutContent] = useState<AboutContentRecord>(() => emptyAboutContent());
  const [githubUrlDraft, setGithubUrlDraft] = useState(DEFAULT_GITHUB_URL);
  const [aboutResumeHighlightDrafts, setAboutResumeHighlightDrafts] = useState<Record<number, string>>({});
  const [isAboutAssetsOpen, setIsAboutAssetsOpen] = useState(true);
  const [isAboutProfileOpen, setIsAboutProfileOpen] = useState(true);
  const [isAboutResumeOpen, setIsAboutResumeOpen] = useState(true);
  const [isAboutContactOpen, setIsAboutContactOpen] = useState(true);
  const [commentFilter, setCommentFilter] = useState<CommentStatus | 'all'>('all');
  const [form, setForm] = useState<BlogEditorForm>(() => emptyForm());
  const [error, setError] = useState('');
  const [notice, setNotice] = useTransientNotice();
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAbout, setIsSavingAbout] = useState(false);
  const [aboutAssetUploadTarget, setAboutAssetUploadTarget] = useState<'portraitImageUrl' | 'wechatQrImageUrl' | null>(null);
  const [commentActionId, setCommentActionId] = useState<string | null>(null);
  const [homeGalleryBusySlot, setHomeGalleryBusySlot] = useState<HomeGallerySlotKey | null>(null);
  const [mediaAssets, setMediaAssets] = useState<MediaAssetRecord[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaActionId, setMediaActionId] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState('');
  const [homeGalleryError, setHomeGalleryError] = useState('');
  const [aboutError, setAboutError] = useState('');
  const [editorMode, setEditorMode] = useState<EditorMode>('edit');
  const [selectedType, setSelectedType] = useState<SelectedType>(null);
  const [contentTab, setContentTab] = useState<ContentTab>('blog');
  const [selectedBlogId, setSelectedBlogId] = useState<string | null>(null);
  const [selectedGalleryWorkId, setSelectedGalleryWorkId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const hasAppliedAdminTarget = useRef(false);
  const returnPathAfterLogin = getSafeReturnPath(searchParams.get('returnTo'));

  const homeGalleryConfiguredCount = useMemo(
    () => displayedHomeGallerySlotKeys.filter((slotKey) => Boolean(homeGallerySlots[slotKey].photo)).length,
    [homeGallerySlots]
  );

  const activePost = useMemo(
    () => posts.find((post) => post.id === selectedBlogId) ?? posts.find((post) => post.id === form.id),
    [form.id, posts, selectedBlogId]
  );
  const activeBlogPostId = selectedType === 'blog' ? form.id : '';
  const canUploadMedia = Boolean(activeBlogPostId) && !isUploadingMedia;

  const getFrontendReturnPath = useCallback(() => {
    if (returnPathAfterLogin) return returnPathAfterLogin;
    return activePost?.status === 'published' ? `/blog?post=${encodeURIComponent(activePost.slug)}` : '/blog';
  }, [activePost, returnPathAfterLogin]);

  const commentStats = useMemo(() => ({
    all: comments.length,
    pending: comments.filter((comment) => comment.status === 'pending').length,
    approved: comments.filter((comment) => comment.status === 'approved').length,
    hidden: comments.filter((comment) => comment.status === 'hidden').length,
  }), [comments]);

  const filteredComments = useMemo(() => (
    commentFilter === 'all'
      ? comments
      : comments.filter((comment) => comment.status === commentFilter)
  ), [commentFilter, comments]);

  const visibleBlogPosts = posts;

  const galleryStats = useMemo(() => ({
    all: galleryWorks.length,
    published: galleryWorks.filter((photo) => photo.status === 'published').length,
    draft: galleryWorks.filter((photo) => photo.status === 'draft').length,
    hidden: galleryWorks.filter((photo) => photo.status === 'hidden').length,
  }), [galleryWorks]);

  const refreshContent = useCallback(async () => {
    setIsLoadingContent(true);
    setError('');

    try {
      const [nextPosts, nextComments, nextGalleryWorks, nextHomeGallerySlots, nextAboutContent] = await Promise.all([
        listAdminBlogPosts(),
        listAdminComments(),
        listAdminGalleryWorks(),
        listAdminHomeGallerySlots(),
        getAdminAboutContent(),
      ]);

      setPosts(nextPosts);
      setComments(nextComments);
      setGalleryWorks(nextGalleryWorks);
      setHomeGallerySlots(homeGallerySlotsFromRecords(nextHomeGallerySlots));
      setAboutContent(nextAboutContent);
      setGithubUrlDraft(getGithubUrl(nextAboutContent.socialLinks));
      setAboutResumeHighlightDrafts({});
      setAboutError('');
      setHomeGalleryError('');
      setSelectedBlogId((current) => (
        current && nextPosts.some((post) => post.id === current) ? current : null
      ));
      setSelectedGalleryWorkId((current) => (
        current && nextGalleryWorks.some((photo) => photo.id === current) ? current : null
      ));

      setForm((current) => {
        if (current.id) {
          const freshPost = nextPosts.find((post) => post.id === current.id);
          if (freshPost) return formFromPost(freshPost);
        }


        return current;
      });

      if (!hasAppliedAdminTarget.current) {
        const targetType = searchParams.get('type');
        const targetPost = searchParams.get('post');

        if (targetType === 'blog' && targetPost) {
          const matchedPost = nextPosts.find((post) => (
            post.id === targetPost
            || post.slug === targetPost
          ));

          if (matchedPost) {
            setSelectedType('blog');
            setContentTab('blog');
            setSelectedBlogId(matchedPost.id);
            setIsCreatingNew(false);
            setEditorMode('preview');
            setForm(formFromPost(matchedPost));
          }
        } else if (targetType === 'project') {
          setContentTab('blog');
          setSelectedType(null);
        }


        hasAppliedAdminTarget.current = true;
      }
      return true;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '后台数据加载失败。');
      return false;
    } finally {
      setIsLoadingContent(false);
    }
  }, [searchParams]);

  const refreshMediaAssets = useCallback(async (blogPostId?: string | null) => {
    setMediaError('');

    if (!blogPostId) {
      setMediaAssets([]);
      return;
    }

    try {
      setMediaAssets(await listMediaAssets(blogPostId));
    } catch (loadError) {
      setMediaAssets([]);
      setMediaError(loadError instanceof Error ? loadError.message : '图片列表加载失败。');
    }
  }, []);

  const refreshCurrentContent = useCallback(async () => {
    setNotice('');

    const loaded = await refreshContent();
    await refreshMediaAssets(activeBlogPostId);

    if (loaded) {
      setNotice(activeBlogPostId ? '内容已刷新。' : '内容列表已刷新。当前未保存草稿不会被覆盖。');
    }
  }, [activeBlogPostId, refreshContent, refreshMediaAssets]);

  useEffect(() => {
    let isCurrent = true;

    getCurrentAdmin()
      .then((nextUser) => {
        if (!isCurrent) return;
        setUser(nextUser);
        setAuthState('authenticated');
      })
      .catch(() => {
        if (!isCurrent) return;
        setAuthState('anonymous');
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (authState === 'authenticated') {
      void refreshContent();
    }
  }, [authState, refreshContent]);

  useEffect(() => {
    if (authState !== 'authenticated' || selectedType !== 'blog') {
      setMediaAssets([]);
      setMediaError('');
      return;
    }

    void refreshMediaAssets(activeBlogPostId);
  }, [activeBlogPostId, authState, refreshMediaAssets, selectedType]);

  useEffect(() => {
    if (!isPasswordDialogOpen) return undefined;

    const handlePasswordDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isChangingPassword) return;

      setPasswordChangeForm(emptyPasswordChangeForm());
      setPasswordChangeError('');
      setIsPasswordDialogOpen(false);
    };

    document.addEventListener('keydown', handlePasswordDialogKeyDown);

    return () => {
      document.removeEventListener('keydown', handlePasswordDialogKeyDown);
    };
  }, [isChangingPassword, isPasswordDialogOpen]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');

    try {
      const nextUser = await loginAdmin(email, password);
      setUser(nextUser);
      setAuthState('authenticated');
      setPassword('');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : '登录失败。');
    }
  };

  const handleReturnToFrontend = () => {
    navigate(getFrontendReturnPath(), { replace: true });
  };

  const handleLogoutAdmin = async () => {
    const returnPath = getFrontendReturnPath();
    setError('');
    setNotice('');

    try {
      await logoutAdmin();
      setUser(null);
      setAuthState('anonymous');
      setPassword('');
      navigate(returnPath, { replace: true });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '退出登录失败。');
    }
  };

  const updatePasswordChangeField = (field: keyof PasswordChangeForm) => (event: ChangeEvent<HTMLInputElement>) => {
    setPasswordChangeForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const closePasswordDialog = () => {
    if (isChangingPassword) return;

    setPasswordChangeForm(emptyPasswordChangeForm());
    setPasswordChangeError('');
    setIsPasswordDialogOpen(false);
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordChangeError('');
    setNotice('');

    if (passwordChangeForm.newPassword !== passwordChangeForm.confirmPassword) {
      setPasswordChangeError('新密码和确认密码不一致。');
      return;
    }

    if (passwordChangeForm.newPassword.length < 6) {
      setPasswordChangeError('新密码至少需要 6 位。');
      return;
    }

    setIsChangingPassword(true);

    try {
      await changeAdminPassword(passwordChangeForm.currentPassword, passwordChangeForm.newPassword);
      setPasswordChangeForm(emptyPasswordChangeForm());
      setIsPasswordDialogOpen(false);
      setNotice('密码已更新，下次登录请使用新密码。');
    } catch (caughtError) {
      setPasswordChangeError(caughtError instanceof Error ? caughtError.message : '密码修改失败。');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const updateField = (
    field: keyof BlogEditorForm,
    value: string | number | boolean | ContentStatus
  ) => {
    setForm((current) => {
      const nextForm = {
        ...current,
        [field]: value,
        slug: field === 'title' && !current.id ? slugify(String(value)) : current.slug,
      };


      return nextForm;
    });
  };

  const handleInput = (field: keyof BlogEditorForm) => (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = field === 'blogOrder' || field === 'homeOrder' ? Number(event.target.value) : event.target.value;
    updateField(field, value);
  };

  const handleCheckboxInput = (field: keyof Pick<BlogEditorForm, 'featuredOnHome'>) => (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    updateField(field, event.target.checked);
  };

  const handleHomeGallerySlotUpload = (slotKey: DisplayedHomeGallerySlotKey) => async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setError('');
    setNotice('');
    setHomeGalleryError('');
    setHomeGalleryBusySlot(slotKey);

    try {
      const savedSlot = await uploadHomeGallerySlotImage(slotKey, file);
      setHomeGallerySlots((current) => ({
        ...current,
        [slotKey]: savedSlot,
      }));
      setNotice(`${homeGallerySlotMeta[slotKey].title}已上传。`);
    } catch (uploadError) {
      setHomeGalleryError(uploadError instanceof Error ? uploadError.message : '首页图片上传失败。');
    } finally {
      setHomeGalleryBusySlot(null);
      input.value = '';
    }
  };

  const resetHomeGallerySlot = async (slotKey: DisplayedHomeGallerySlotKey) => {
    setError('');
    setNotice('');
    setHomeGalleryError('');
    setHomeGalleryBusySlot(slotKey);

    try {
      const savedSlots = await updateAdminHomeGallerySlots([{ slotKey, galleryPhotoId: null }]);
      setHomeGallerySlots(homeGallerySlotsFromRecords(savedSlots));
      setNotice(`${homeGallerySlotMeta[slotKey].title}已恢复默认视觉。`);
    } catch (resetError) {
      setHomeGalleryError(resetError instanceof Error ? resetError.message : '首页图片恢复默认失败。');
    } finally {
      setHomeGalleryBusySlot(null);
    }
  };

  const updateAboutField = (
    field: keyof Pick<AboutContentRecord, 'portraitImageUrl' | 'wechatQrImageUrl'>,
    value: string
  ) => {
    setAboutContent((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleAboutAssetUpload = (
    field: keyof Pick<AboutContentRecord, 'portraitImageUrl' | 'wechatQrImageUrl'>
  ) => async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) return;

    setIsAboutAssetsOpen(true);
    setError('');
    setNotice('');
    setAboutError('');
    setAboutAssetUploadTarget(field);

    try {
      const uploaded = await uploadAboutAsset(file);
      updateAboutField(field, uploaded.url);
      setNotice(field === 'portraitImageUrl'
        ? '头像已上传，记得保存个人页。'
        : '微信二维码已上传，记得保存个人页。');
    } catch (uploadError) {
      setAboutError(uploadError instanceof Error ? uploadError.message : '图片上传失败。');
    } finally {
      setAboutAssetUploadTarget(null);
      input.value = '';
    }
  };

  const updateAboutProfileDetail = (
    index: number,
    field: keyof AboutProfileDetail,
    value: string | boolean
  ) => {
    setAboutContent((current) => ({
      ...current,
      profileDetails: current.profileDetails.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      )),
    }));
  };

  const addAboutProfileDetail = () => {
    setIsAboutProfileOpen(true);
    setAboutContent((current) => ({
      ...current,
      profileDetails: [...current.profileDetails, emptyAboutProfileDetail()],
    }));
  };

  const removeAboutProfileDetail = (index: number) => {
    setAboutContent((current) => ({
      ...current,
      profileDetails: current.profileDetails.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateAboutResumeEntry = (
    index: number,
    field: keyof AboutResumeEntry,
    value: string | number | boolean | string[] | AboutResumeHighlight[]
  ) => {
    setAboutContent((current) => ({
      ...current,
      resumeEntries: current.resumeEntries.map((entry, itemIndex) => (
        itemIndex === index ? { ...entry, [field]: value } : entry
      )),
    }));
  };

  const handleAboutResumeHighlightsChange = (index: number, value: string) => {
    setAboutResumeHighlightDrafts((current) => ({
      ...current,
      [index]: value,
    }));
    updateAboutResumeEntry(index, 'highlights', textToHighlights(value));
  };

  const addAboutResumeEntry = () => {
    setIsAboutResumeOpen(true);
    setAboutContent((current) => ({
      ...current,
      resumeEntries: [
        ...current.resumeEntries,
        createAboutEntry(nextAboutEntryOrder(current.resumeEntries)),
      ],
    }));
  };

  const removeAboutResumeEntry = (index: number) => {
    setAboutResumeHighlightDrafts((current) => {
      const nextDrafts: Record<number, string> = {};

      Object.entries(current).forEach(([draftIndexText, value]) => {
        const draftIndex = Number(draftIndexText);

        if (!Number.isInteger(draftIndex) || draftIndex === index) return;
        nextDrafts[draftIndex > index ? draftIndex - 1 : draftIndex] = value;
      });

      return nextDrafts;
    });
    setAboutContent((current) => ({
      ...current,
      resumeEntries: current.resumeEntries.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const copyMediaAssetMarkdownUrl = async (asset: MediaAssetRecord) => {
    const markdown = `![[${asset.url}|640]]`;

    try {
      await copyTextToClipboard(markdown);
      setError('');
      setNotice('Markdown URL 已复制，可粘贴到 Markdown 正文中；修改 | 后面的数字可以调整宽度。');
    } catch {
      setNotice('');
      setError(`Markdown URL 复制失败，请手动复制：${markdown}`);
    }
  };

  const setCoverImageFromAsset = (asset: MediaAssetRecord) => {
    setForm((current) => ({
      ...current,
      coverImageUrl: asset.url,
    }));
    setNotice('已设为首页博客卡片封面。');
  };

  const handleMediaUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) return;

    setMediaError('');
    setNotice('');

    if (!activeBlogPostId) {
      setMediaError('请先保存草稿，再上传这个博客的图片。');
      input.value = '';
      return;
    }

    setIsUploadingMedia(true);

    try {
      const uploaded = await uploadMediaAsset(file, activeBlogPostId);
      setMediaAssets((current) => [uploaded, ...current.filter((asset) => asset.id !== uploaded.id)]);
      setNotice('图片已上传，需要时可点击图片卡片里的“复制 Markdown URL”。');
    } catch (uploadError) {
      setMediaError(uploadError instanceof Error ? uploadError.message : '图片上传失败。');
    } finally {
      setIsUploadingMedia(false);
      input.value = '';
    }
  };

  const deleteCurrentMediaAsset = async (asset: MediaAssetRecord) => {
    const confirmed = window.confirm(`确定删除图片「${asset.fileName}」吗？如果文章里已经插入了这张图，图片链接会失效。`);
    if (!confirmed) return;

    setMediaError('');
    setNotice('');
    setMediaActionId(asset.id);

    try {
      await deleteMediaAsset(asset.id);
      setMediaAssets((current) => current.filter((item) => item.id !== asset.id));
      setNotice('图片已删除。');
    } catch (deleteError) {
      setMediaError(deleteError instanceof Error ? deleteError.message : '图片删除失败。');
    } finally {
      setMediaActionId(null);
    }
  };

  const selectPost = (post: BlogPostRecord) => {
    setError('');
    setNotice('');
    setSelectedType('blog');
    setContentTab('blog');
    setSelectedBlogId(post.id);
    setSelectedGalleryWorkId(null);
    setIsCreatingNew(false);
    setIsCreateMenuOpen(false);
    setEditorMode('preview');
    setForm(formFromPost(post));
  };

  const createNewPost = () => {

    setError('');
    setNotice('');
    setMediaError('');
    setMediaAssets([]);
    setSelectedType('blog');
    setContentTab('blog');
    setSelectedBlogId(null);
    setSelectedGalleryWorkId(null);
    setIsCreatingNew(true);
    setIsCreateMenuOpen(false);
    setEditorMode('edit');
    setForm(emptyForm(nextBlogOrder(posts)));
  };

  const showGalleryManagement = () => {
    setError('');
    setNotice('');
    setHomeGalleryError('');
    setSelectedType('gallery');
    setContentTab('gallery');
    setSelectedBlogId(null);
    setIsCreatingNew(false);
    setIsCreateMenuOpen(false);
  };

  const createNewGalleryPhoto = () => {
    if (galleryBusy) return;
    setError('');
    setNotice('');
    setHomeGalleryError('');
    setSelectedType('gallery');
    setContentTab('gallery');
    setSelectedGalleryWorkId(null);
    setSelectedBlogId(null);
    setIsCreatingNew(true);
    setIsCreateMenuOpen(false);
    setGalleryEditorKey(current => current + 1);
  };

  const selectGalleryWork = (photo: GalleryWorkRecord) => {
    if (galleryBusy) return;
    setError('');
    setNotice('');
    setHomeGalleryError('');
    setSelectedType('gallery');
    setContentTab('gallery');
    setSelectedGalleryWorkId(photo.id);
    setSelectedBlogId(null);
    setIsCreatingNew(false);
    setIsCreateMenuOpen(false);
    setGalleryEditorKey(current => current + 1);
  };

  const showCommentManagement = () => {
    setError('');
    setNotice('');
    setSelectedType('comment');
    setContentTab('comment');
    setSelectedBlogId(null);
    setSelectedGalleryWorkId(null);
    setIsCreatingNew(false);
    setIsCreateMenuOpen(false);
  };

  const showAboutManagement = () => {
    setError('');
    setNotice('');
    setAboutError('');
    setSelectedType('about');
    setContentTab('about');
    setSelectedBlogId(null);
    setSelectedGalleryWorkId(null);
    setIsCreatingNew(false);
    setIsCreateMenuOpen(false);
  };

  const saveAboutContent = async () => {
    setError('');
    setNotice('');
    setAboutError('');

    if (!isHttpUrl(githubUrlDraft.trim() || DEFAULT_GITHUB_URL)) {
      setAboutError('GitHub 链接需要是完整的 http:// 或 https:// 地址。');
      return;
    }

    const entryError = validateAboutEntries(aboutContent.resumeEntries);
    if (entryError) { setAboutError(entryError); return; }

    const payload = aboutContentToPayload({ ...aboutContent, socialLinks: withGithubUrl(aboutContent.socialLinks, githubUrlDraft) });

    if (payload.profileDetails.length === 0) {
      setAboutError('请至少保留一条个人信息。');
      return;
    }

    setIsSavingAbout(true);

    try {
      const saved = await updateAdminAboutContent(payload);
      setAboutContent(saved);
      setAboutResumeHighlightDrafts({});
      setSelectedType('about');
      setContentTab('about');
      setNotice('个人主页内容已保存，前台刷新后会展示最新内容。');
    } catch (caughtError) {
      setAboutError(caughtError instanceof Error ? caughtError.message : '个人主页内容保存失败。');
    } finally {
      setIsSavingAbout(false);
    }
  };

  const updateCommentStatus = async (comment: CommentRecord, status: Exclude<CommentStatus, 'pending'>) => {
    setError('');
    setNotice('');
    setCommentActionId(comment.id);

    try {
      if (status === 'approved') {
        await approveAdminComment(comment.id);
        setNotice('评论已通过。');
      } else {
        await hideAdminComment(comment.id);
        setNotice('评论已隐藏。');
      }

      await refreshContent();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '评论状态更新失败。');
    } finally {
      setCommentActionId(null);
    }
  };

  const deleteComment = async (comment: CommentRecord) => {
    const confirmed = window.confirm(comment.parentId ? '确定删除这条回复吗？' : '确定删除这条评论及其回复吗？');
    if (!confirmed) return;

    setError('');
    setNotice('');
    setCommentActionId(comment.id);

    try {
      await deleteAdminComment(comment.id);
      setNotice('评论已删除。');
      await refreshContent();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '评论删除失败。');
    } finally {
      setCommentActionId(null);
    }
  };

  const save = async (status: ContentStatus) => {
    setError('');
    setNotice('');


    if (!form.title.trim() || !form.summary.trim()) {
      setError('标题和摘要都需要填写。');
      return;
    }

    setIsSaving(true);

    try {
      const resolvedSlug = getUniqueBlogSlug(form, posts);
      const payload = toPayload(form, status, resolvedSlug);
      const saved = form.id
        ? await updateBlogPost(form.id, payload)
        : await createBlogPost(payload);

      setForm(formFromPost(saved));
      setSelectedType('blog');
      setContentTab('blog');
      setSelectedBlogId(saved.id);
      setIsCreatingNew(false);
      setNotice(getBlogSaveNotice(form.status, saved.status));
      if (status !== form.status) setEditorMode(status === 'published' ? 'preview' : 'edit');
      await refreshContent();
    } catch (saveError) {
      setError(formatBlogSaveError(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCurrentPost = async () => {
    if (!form.id) return;

    const confirmed = window.confirm('确定删除这篇博客吗？这个操作不能撤销。');
    if (!confirmed) return;

    setError('');
    setNotice('');
    setIsSaving(true);

    try {
      await deleteBlogPost(form.id);
        const remainingPosts = posts.filter((post) => post.id !== form.id);
      setForm(emptyForm(nextBlogOrder(remainingPosts)));
      setSelectedType('blog');
      setContentTab('blog');
      setSelectedBlogId(null);
      setIsCreatingNew(true);
      setNotice('博客已删除。');
      await refreshContent();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除失败。');
    } finally {
      setIsSaving(false);
    }
  };

  if (authState === 'checking') {
    return (
      <div className="site-admin-loading flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-3 h-5 w-5 animate-spin text-foreground" />
        正在检查登录状态
      </div>
    );
  }

  if (authState === 'anonymous') {
    return (
      <main className="site-theme site-admin-shell relative min-h-screen overflow-hidden text-foreground">
        <div className="pointer-events-none min-h-screen select-none opacity-60 blur-[1px]">
          <header className="px-4 py-4">
            <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Admin Console</p>
                <h1 className="text-xl font-semibold tracking-tight">站主后台</h1>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-10 w-20 rounded-md border border-border bg-card" />
                <div className="h-10 w-16 rounded-md bg-muted" />
              </div>
            </div>
          </header>

          <div className="mx-auto grid max-w-[1500px] gap-4 px-4 py-4 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="min-h-[420px] rounded-lg border border-border bg-card p-4">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Posts</p>
                  <div className="mt-2 h-5 w-24 rounded bg-muted" />
                </div>
                <div className="h-9 w-20 rounded-md bg-primary" />
              </div>
              <div className="mb-4 grid grid-cols-2 gap-2 rounded-md bg-muted p-1">
                <div className="h-8 rounded bg-card" />
                <div className="h-8 rounded bg-accent/60" />
              </div>
              <div className="space-y-3">
                <div className="h-20 rounded-md border border-border bg-muted" />
                <div className="h-20 rounded-md border border-border bg-muted" />
                <div className="h-20 rounded-md border border-border bg-muted" />
              </div>
            </aside>

            <section className="min-h-[520px] rounded-lg border border-border bg-card p-5">
              <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
                <div>
                  <div className="h-3 w-28 rounded bg-muted" />
                  <div className="mt-3 h-6 w-32 rounded bg-accent" />
                </div>
                <div className="flex gap-2">
                  <div className="h-10 w-24 rounded-md border border-border bg-card" />
                  <div className="h-10 w-24 rounded-md bg-slate-950" />
                </div>
              </div>
              <div className="grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,7fr)]">
                <div className="h-10 rounded-md border border-border bg-card" />
                <div className="h-10 rounded-md border border-border bg-card" />
              </div>
              <div className="mt-4 h-24 rounded-md border border-border bg-card" />
              <div className="mt-4 h-64 rounded-md bg-slate-950" />
            </section>
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/10 px-4 py-8 backdrop-blur-sm">
          <form
            onSubmit={handleLogin}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-login-title"
            className="w-full max-w-[360px] rounded-lg border border-border bg-card p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.75)]"
          >
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Admin</p>
              <h1 id="admin-login-title" className="mt-2 text-xl font-semibold tracking-tight text-foreground">站主登录</h1>
            </div>

            <label className="mb-4 block">
              <span className="mb-2 block text-sm font-bold text-body">邮箱</span>
              <Input
                value={email}
                type="email"
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="mb-5 block">
              <span className="mb-2 block text-sm font-bold text-body">密码</span>
              <Input
                value={password}
                type="password"
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}

            <Button type="submit" className="w-full bg-primary text-black hover:bg-primary/90">
              登录
            </Button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="site-theme site-admin-shell min-h-screen text-foreground">
      <header className="px-4 py-4">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Admin Console</p>
            <h1 className="text-xl font-semibold tracking-tight">站主后台</h1>
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            <div className={adminHeaderIdentityClass} aria-label={`登录账号：${user?.email ?? '未知账号'}`}>
              <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="block max-w-[220px] truncate">{user?.email}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              className={adminHeaderButtonClass}
              disabled={isLoadingContent}
              onClick={() => void refreshCurrentContent()}
            >
              <RefreshCw className={cn('h-4 w-4', isLoadingContent && 'animate-spin')} />
              刷新
            </Button>
            <Button type="button" variant="outline" className={adminHeaderButtonClass} onClick={handleReturnToFrontend}>
              <ArrowLeft className="h-4 w-4" />
              返回前台
            </Button>
            <Button
              type="button"
              variant="outline"
              className={adminHeaderButtonClass}
              aria-controls="password-dialog"
              aria-expanded={isPasswordDialogOpen}
              aria-haspopup="dialog"
              onClick={() => {
                setPasswordChangeError('');
                setIsPasswordDialogOpen(true);
              }}
            >
              <KeyRound className="h-4 w-4" />
              修改密码
            </Button>
            <Button type="button" variant="outline" className={adminHeaderDangerButtonClass} onClick={() => void handleLogoutAdmin()}>
              <LogOut className="h-4 w-4" />
              退出登录
            </Button>
          </div>
        </div>
      </header>

      {isPasswordDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" aria-hidden="true" />
          <section
            id="password-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-dialog-title"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-lg border border-border bg-card shadow-[0_30px_80px_-35px_rgba(15,23,42,0.9)]"
          >
            <form onSubmit={handleChangePassword} className="space-y-4 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Security</p>
                  <h2 id="password-dialog-title" className="mt-1 text-xl font-semibold text-foreground">
                    修改密码
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 border-border text-body hover:bg-muted hover:text-foreground"
                  disabled={isChangingPassword}
                  aria-label="关闭修改密码弹窗"
                  onClick={closePasswordDialog}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-body">当前密码</span>
                <Input
                  value={passwordChangeForm.currentPassword}
                  type="password"
                  autoComplete="current-password"
                  onChange={updatePasswordChangeField('currentPassword')}
                  disabled={isChangingPassword}
                  autoFocus
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-body">新密码</span>
                <Input
                  value={passwordChangeForm.newPassword}
                  type="password"
                  autoComplete="new-password"
                  onChange={updatePasswordChangeField('newPassword')}
                  disabled={isChangingPassword}
                  minLength={6}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-body">确认新密码</span>
                <Input
                  value={passwordChangeForm.confirmPassword}
                  type="password"
                  autoComplete="new-password"
                  onChange={updatePasswordChangeField('confirmPassword')}
                  disabled={isChangingPassword}
                  minLength={6}
                  required
                />
              </label>

              {passwordChangeError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700" aria-live="polite">
                  {passwordChangeError}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className={adminHeaderButtonClass}
                  disabled={isChangingPassword}
                  onClick={closePasswordDialog}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  className="h-10 gap-2 bg-primary text-black hover:bg-primary/90"
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  保存
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}

      <OperationNotice message={notice} />

      <div className="mx-auto grid max-w-[1500px] gap-4 px-4 py-4 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="min-h-[420px] rounded-lg border border-border bg-card lg:sticky lg:top-4 lg:max-h-[calc(100dvh-32px)]">
          <fieldset disabled={galleryBusy} className="contents">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Posts</p>
              <h2 className="font-semibold">内容管理</h2>
            </div>
            <div className="relative">
              <Button
                type="button"
                size="sm"
                className="gap-2 bg-primary text-black hover:bg-primary/90"
                onClick={() => setIsCreateMenuOpen((current) => !current)}
                aria-expanded={isCreateMenuOpen}
              >
                <Plus className="h-4 w-4" />
                新建
                <ChevronDown className={cn('h-4 w-4 transition', isCreateMenuOpen && 'rotate-180')} />
              </Button>
              {isCreateMenuOpen && (
                <div className="absolute right-0 top-11 z-30 w-40 overflow-hidden rounded-md border border-border bg-card p-1 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.55)]">
                  <button
                    type="button"
                    onClick={createNewPost}
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-bold text-body hover:bg-muted"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    新建博客
                  </button>
                  <button
                    type="button"
                    onClick={createNewGalleryPhoto}
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-bold text-body hover:bg-muted"
                  >
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    上传图册
                  </button>
                  <button
                    type="button"
                    onClick={showAboutManagement}
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-bold text-body hover:bg-muted"
                  >
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                    管理个人
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="border-b border-border p-2">
            <div className="grid grid-cols-4 gap-1 rounded-md bg-muted p-1">
              <button
                type="button"
                onClick={() => setContentTab('blog')}
                className={cn(
                  'rounded px-3 py-2 text-sm font-semibold transition',
                  contentTab === 'blog'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-body hover:text-foreground'
                )}
              >
                博客
              </button>
              <button
                type="button"
                onClick={showGalleryManagement}
                className={cn(
                  'rounded px-3 py-2 text-sm font-semibold transition',
                  contentTab === 'gallery'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-body hover:text-foreground'
                )}
              >
                图册
              </button>
              <button
                type="button"
                onClick={showCommentManagement}
                className={cn(
                  'rounded px-3 py-2 text-sm font-semibold transition',
                  contentTab === 'comment'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-body hover:text-foreground'
                )}
              >
                评论
              </button>
              <button
                type="button"
                onClick={showAboutManagement}
                className={cn(
                  'rounded px-3 py-2 text-sm font-semibold transition',
                  contentTab === 'about'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-body hover:text-foreground'
                )}
              >
                个人
              </button>
            </div>
          </div>

          <div className="max-h-[calc(100dvh-194px)] overflow-y-auto p-2">
            {contentTab === 'blog' ? (
              visibleBlogPosts.length === 0 ? (
                <div className="px-3 py-10 text-center text-sm font-bold text-muted-foreground">
                  暂无博客，点击新建博客开始
                </div>
              ) : (
                visibleBlogPosts.map((post) => {
                  const isSelected = selectedType === 'blog' && selectedBlogId === post.id;

                  return (
                    <button
                      key={post.id}
                      type="button"
                      data-status={post.status}
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={() => selectPost(post)}
                      className={cn(
                        'admin-blog-list-item mb-2 w-full rounded-md border px-3 py-3 text-left transition',
                        isSelected
                          ? 'border-slate-950 bg-slate-950 text-white shadow-sm'
                          : 'border-border bg-card hover:border-border hover:bg-muted'
                      )}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <span className="line-clamp-2 text-sm font-semibold leading-5">{post.title}</span>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <BlogStatusBadge status={post.status} />
                          {post.featuredOnHome && (
                            <Badge className="border-none bg-emerald-50 text-[10px] font-semibold text-emerald-700">
                              首页
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className={cn('space-y-1 text-xs font-bold', isSelected ? 'text-muted-foreground' : 'text-muted-foreground')}>
                        <div className="flex items-center gap-2">
                          <FolderKanban className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{post.category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{post.category || DEFAULT_BLOG_CATEGORY} / 博客{post.blogOrder || '-'}</span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )
            ) : contentTab === 'gallery' ? (
              galleryWorks.length === 0 ? (
                <div className="px-3 py-10 text-center text-sm font-bold text-muted-foreground">
                  暂无作品组，点击上传图册开始
                </div>
              ) : (
                galleryWorks.map((photo) => {
                  const isSelected = selectedType === 'gallery' && selectedGalleryWorkId === photo.id;

                  return (
                    <button
                      key={photo.id}
                      type="button"
                      disabled={galleryBusy}
                      onClick={() => selectGalleryWork(photo)}
                      className={cn(
                        'mb-2 w-full rounded-md border px-3 py-3 text-left transition',
                        isSelected
                          ? 'border-slate-950 bg-slate-950 text-white shadow-sm'
                          : 'border-border bg-card hover:border-border hover:bg-muted'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {photo.photos[0] && <img src={photo.photos[0].thumbnailUrl || photo.photos[0].url} alt="" className="h-14 w-16 shrink-0 rounded object-contain" />}
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <span className="line-clamp-2 text-sm font-semibold leading-5">{photo.title}</span>
                            <StatusBadge status={photo.status} />
                          </div>
                          <div className={cn('space-y-1 text-xs font-bold', isSelected ? 'text-muted-foreground' : 'text-muted-foreground')}>
                            <div className="truncate">{photo.location || '未填写地点'} / {photo.takenAt || '未填写日期'}</div>
                            <div>{photo.photos.length} 张照片 · 排序 {photo.sortOrder}</div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )
            ) : contentTab === 'comment' ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={showCommentManagement}
                  className={cn(
                    'w-full rounded-md border px-3 py-3 text-left transition',
                    selectedType === 'comment'
                      ? 'border-slate-950 bg-slate-950 text-white shadow-sm'
                      : 'border-border bg-card hover:border-border hover:bg-muted'
                  )}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="line-clamp-2 text-sm font-semibold leading-5">评论管理</span>
                    <Badge className="shrink-0 border-none bg-primary text-[11px] font-semibold text-black">
                      {commentStats.pending} 待审
                    </Badge>
                  </div>
                  <div className={cn('space-y-1 text-xs font-bold', selectedType === 'comment' ? 'text-muted-foreground' : 'text-muted-foreground')}>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>全部 {commentStats.all} 条</span>
                    </div>
                    <div>已通过 {commentStats.approved} · 已隐藏 {commentStats.hidden}</div>
                  </div>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={showAboutManagement}
                  className={cn(
                    'w-full rounded-md border px-3 py-3 text-left transition',
                    selectedType === 'about'
                      ? 'border-slate-950 bg-slate-950 text-white shadow-sm'
                      : 'border-border bg-card hover:border-border hover:bg-muted'
                  )}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="line-clamp-2 text-sm font-semibold leading-5">个人主页内容</span>
                    <Badge className="shrink-0 border-none bg-primary text-[11px] font-semibold text-black">
                      可编辑
                    </Badge>
                  </div>
                  <div className={cn('space-y-1 text-xs font-bold', selectedType === 'about' ? 'text-muted-foreground' : 'text-muted-foreground')}>
                    <div className="flex items-center gap-2">
                      <UserRound className="h-3.5 w-3.5 shrink-0" />
                      <span>{aboutContent.profileDetails.length} 条个人信息</span>
                    </div>
                    <div>{aboutContent.resumeEntries.length} 条项目/论文记录</div>
                  </div>
                </button>
              </div>
            )}
          </div>
          </fieldset>
        </aside>

        <div className="min-w-0">
          {selectedType === null ? (
            <section className="flex min-h-[520px] items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
              <div className="max-w-md">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-md bg-muted text-body">
                  <FileText className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">还没有选择内容</h2>
                <p className="mt-3 text-sm font-bold leading-6 text-body">
                  从左侧选择博客、图册、评论或个人内容，或者点击新建开始编辑。
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Button type="button" variant="outline" className="gap-2" onClick={createNewPost}>
                    <FileText className="h-4 w-4" />
                    新建博客
                  </Button>
                  <Button type="button" variant="outline" className="gap-2" onClick={createNewGalleryPhoto}>
                    <ImageIcon className="h-4 w-4" />
                    上传图册
                  </Button>
                  <Button type="button" variant="outline" className="gap-2" onClick={showCommentManagement}>
                    <MessageCircle className="h-4 w-4" />
                    管理评论
                  </Button>
                  <Button type="button" variant="outline" className="gap-2" onClick={showAboutManagement}>
                    <UserRound className="h-4 w-4" />
                    管理个人
                  </Button>
                </div>
              </div>
            </section>
          ) : selectedType === 'about' ? (
            <section className="admin-about-editor min-w-0 overflow-hidden rounded-lg border border-border bg-card">
              <div className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">About Content</p>
                    <h2 className="font-semibold">个人主页内容</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-muted-foreground">
                      <span>{aboutContent.profileDetails.length} 条个人信息</span>
                      <span>{aboutContent.resumeEntries.length} 条项目/论文记录</span>
                      <span>GitHub / 微信配置</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-nowrap items-center justify-end gap-2">
                    <Button type="button" variant="outline" className="gap-2" onClick={() => void refreshContent()}>
                      <RefreshCw className={cn('h-4 w-4', isLoadingContent && 'animate-spin')} />
                      刷新
                    </Button>
                    <Button
                      type="button"
                      className="gap-2 bg-primary text-black hover:bg-primary/90"
                      disabled={isSavingAbout}
                      onClick={() => void saveAboutContent()}
                    >
                      {isSavingAbout ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      保存个人页
                    </Button>
                  </div>
                </div>
              </div>

              {aboutError && <p className="mx-4 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{aboutError}</p>}
              {error && <p className="mx-4 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}

              <div className="admin-about-sections">
                <section className="admin-about-section">
                  <div className={cn('flex flex-wrap items-center justify-between gap-3', isAboutAssetsOpen && 'mb-3')}>
                    <button
                      type="button"
                      className="flex min-w-0 items-center gap-2 rounded-md text-left transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                      onClick={() => setIsAboutAssetsOpen((current) => !current)}
                      aria-expanded={isAboutAssetsOpen}
                      aria-controls="about-basic-assets"
                    >
                      <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition', !isAboutAssetsOpen && '-rotate-90')} />
                      <p className="text-sm font-semibold text-body">基础资源</p>
                    </button>
                  </div>
                  {isAboutAssetsOpen && (
                    <div id="about-basic-assets" className="grid gap-3 md:grid-cols-2 xl:max-w-3xl">
                    <div className="flex items-center gap-3 rounded-md border border-border bg-muted p-2.5">
                      {aboutContent.portraitImageUrl ? (
                        <img
                          src={getApiUrl(aboutContent.portraitImageUrl)}
                          alt="头像预览"
                          className="h-14 w-14 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-card text-muted-foreground">
                          <UserRound className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-body">头像图片</p>
                        <p className="truncate text-xs font-bold text-muted-foreground">{aboutContent.portraitImageUrl ? '已上传头像' : '未上传头像'}</p>
                      </div>
                      <label className={cn(
                        'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-semibold text-body transition hover:border-border hover:bg-muted',
                        aboutAssetUploadTarget && 'pointer-events-none opacity-70'
                      )}>
                        {aboutAssetUploadTarget === 'portraitImageUrl' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        从本地上传
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/gif,image/webp"
                          className="sr-only"
                          disabled={Boolean(aboutAssetUploadTarget)}
                          onChange={(event) => void handleAboutAssetUpload('portraitImageUrl')(event)}
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-3 rounded-md border border-border bg-muted p-2.5">
                      {aboutContent.wechatQrImageUrl ? (
                        <img
                          src={getApiUrl(aboutContent.wechatQrImageUrl)}
                          alt="微信二维码预览"
                          className="h-14 w-14 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-card text-muted-foreground">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-body">微信二维码（页尾“联系我”）</p>
                        <p className="truncate text-xs font-bold text-muted-foreground">{aboutContent.wechatQrImageUrl ? '已上传二维码' : '未上传二维码'}</p>
                      </div>
                      <label className={cn(
                        'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-semibold text-body transition hover:border-border hover:bg-muted',
                        aboutAssetUploadTarget && 'pointer-events-none opacity-70'
                      )}>
                        {aboutAssetUploadTarget === 'wechatQrImageUrl' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        从本地上传
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/gif,image/webp"
                          className="sr-only"
                          disabled={Boolean(aboutAssetUploadTarget)}
                          onChange={(event) => void handleAboutAssetUpload('wechatQrImageUrl')(event)}
                        />
                      </label>
                    </div>
                    </div>
                  )}
                </section>

                <section className="admin-about-section">
                  <div className={cn('flex flex-wrap items-center justify-between gap-3', isAboutProfileOpen && 'mb-4')}>
                    <button
                      type="button"
                      className="flex min-w-0 items-center gap-2 rounded-md text-left transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                      onClick={() => setIsAboutProfileOpen((current) => !current)}
                      aria-expanded={isAboutProfileOpen}
                      aria-controls="about-profile-details"
                    >
                      <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition', !isAboutProfileOpen && '-rotate-90')} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-body">个人信息</p>
                      </div>
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" className="gap-2" onClick={addAboutProfileDetail}>
                        <Plus className="h-4 w-4" />
                        添加信息
                      </Button>
                    </div>
                  </div>

                  {isAboutProfileOpen && (
                    <div id="about-profile-details">
                      <ProfileDetailsEditor
                        details={aboutContent.profileDetails}
                        onChange={updateAboutProfileDetail}
                        onRemove={removeAboutProfileDetail}
                      />
                    </div>
                  )}
                </section>

                <section className="admin-about-section">
                  <div className={cn('flex flex-wrap items-center justify-between gap-3', isAboutResumeOpen && 'mb-4')}>
                    <button
                      type="button"
                      className="flex min-w-0 items-center gap-2 rounded-md text-left transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                      onClick={() => setIsAboutResumeOpen((current) => !current)}
                      aria-expanded={isAboutResumeOpen}
                      aria-controls="about-resume-entries"
                    >
                      <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition', !isAboutResumeOpen && '-rotate-90')} />
                      <p className="text-sm font-semibold text-body">项目 / 论文</p>
                    </button>
                    <Button type="button" variant="outline" className="gap-2" onClick={addAboutResumeEntry}>
                      <Plus className="h-4 w-4" />
                      添加项目 / 论文
                    </Button>
                  </div>

                  {isAboutResumeOpen && (
                    <div id="about-resume-entries" className="space-y-4">
                      <p className="admin-entry-help">标有“示例”的浅色文字仅用于填写提示，不会保存。新记录只预设分类、栏目名称和排序；其余内容请按真实情况填写，保存个人页后生效。</p>
                      {aboutContent.resumeEntries.map((entry, index) => (
                        <article key={index} className={cn('admin-about-entry rounded-lg border border-border bg-muted p-4', entry.hidden && 'opacity-70')}>
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">{entry.title || '待填写标题的项目／论文'}</p>
                              {entry.hidden && (
                                <Badge className="border-none bg-slate-900 text-[11px] font-semibold text-white">
                                  已隐藏
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 text-xs font-bold text-muted-foreground">排序 {entry.sortOrder ?? index + 1}</p>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => updateAboutResumeEntry(index, 'hidden', !entry.hidden)}>
                              <EyeOff className="h-3.5 w-3.5" />
                              {entry.hidden ? '显示' : '隐藏'}
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50" onClick={() => removeAboutResumeEntry(index)}>
                              <Trash2 className="h-3.5 w-3.5" />
                              删除
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-3 xl:grid-cols-[180px_minmax(0,1fr)_180px_120px]">
                          <label>
                            <span className="mb-2 block text-xs font-semibold text-body">分类<span className="admin-entry-default">默认：项目经历，可修改</span></span>
                            <Input value={entry.category || ''} onChange={(event) => updateAboutResumeEntry(index, 'category', event.target.value)} placeholder="留空使用默认分类：项目经历" />
                          </label>
                          <label>
                            <span className="mb-2 block text-xs font-semibold text-body">标题（必填）</span>
                            <Input required placeholder="示例：多模态客服系统" value={entry.title} onChange={(event) => updateAboutResumeEntry(index, 'title', event.target.value)} />
                          </label>
                          <label>
                            <span className="mb-2 block text-xs font-semibold text-body">时间（可选）</span>
                            <Input value={entry.period || ''} onChange={(event) => updateAboutResumeEntry(index, 'period', event.target.value)} placeholder="示例：2024.06 – 至今" />
                          </label>
                          <label>
                            <span className="mb-2 block text-xs font-semibold text-body">排序<span className="admin-entry-default">默认排在新增记录末尾</span></span>
                            <Input type="number" value={entry.sortOrder ?? index + 1} onChange={(event) => updateAboutResumeEntry(index, 'sortOrder', Number(event.target.value))} />
                          </label>
                        </div>

                        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(240px,360px)_minmax(0,1fr)]">
                          <label>
                            <span className="mb-2 block text-xs font-semibold text-body">角色 / 身份（可选）</span>
                            <Input value={entry.meta || ''} onChange={(event) => updateAboutResumeEntry(index, 'meta', event.target.value)} placeholder="示例：独立开发 / 第一作者" />
                          </label>
                          <label>
                            <span className="mb-2 block text-xs font-semibold text-body">技术栈 / 研究方向（可选）</span>
                            <Input value={listToText(entry.techStack)} onChange={(event) => updateAboutResumeEntry(index, 'techStack', textToList(event.target.value))} placeholder="示例：Python、FastAPI、RAG" />
                          </label>
                        </div>

                        <div className="mt-3 grid gap-3 xl:grid-cols-[180px_minmax(0,1fr)]">
                          <label>
                            <span className="mb-2 block text-xs font-semibold text-body">描述栏目名称<span className="admin-entry-default">默认：项目描述，可修改</span></span>
                            <Input value={entry.descriptionLabel || ''} onChange={(event) => updateAboutResumeEntry(index, 'descriptionLabel', event.target.value)} placeholder="留空使用默认名称：项目描述" />
                          </label>
                          <label>
                            <span className="mb-2 block text-xs font-semibold text-body">描述内容（可选）</span>
                            <textarea
                              placeholder="示例：介绍项目背景、你的职责或论文研究内容。"
                              value={entry.description || ''}
                              onChange={(event) => updateAboutResumeEntry(index, 'description', event.target.value)}
                              rows={3}
                              className="w-full resize-y rounded-md border border-border px-3 py-2 text-sm font-medium leading-6 text-body focus:outline-none focus:ring-2 focus:ring-slate-950"
                            />
                          </label>
                        </div>

                        <div className="mt-3 grid gap-3 xl:grid-cols-[180px_minmax(0,1fr)]">
                          <label>
                            <span className="mb-2 block text-xs font-semibold text-body">亮点栏目名称<span className="admin-entry-default">默认：项目亮点，可修改</span></span>
                            <Input value={entry.highlightsLabel || ''} onChange={(event) => updateAboutResumeEntry(index, 'highlightsLabel', event.target.value)} placeholder="留空使用默认名称：项目亮点" />
                          </label>
                          <label>
                            <span className="mb-2 block text-xs font-semibold text-body">亮点列表（可选）</span>
                            <textarea
                              value={aboutResumeHighlightDrafts[index] ?? highlightsToText(entry.highlights)}
                              onChange={(event) => handleAboutResumeHighlightsChange(index, event.target.value)}
                              rows={6}
                              className="w-full resize-y rounded-md border border-border px-3 py-2 text-sm font-medium leading-6 text-body focus:outline-none focus:ring-2 focus:ring-slate-950"
                              aria-label="亮点列表（可选）"
                              placeholder="填写亮点内容，可直接输入文字并换行。"
                            />
                          </label>
                        </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section className="admin-about-section">
                  <button type="button" className="flex min-h-11 items-center gap-2 text-sm font-semibold" onClick={() => setIsAboutContactOpen(current => !current)} aria-expanded={isAboutContactOpen} aria-controls="about-footer-contact">
                    <ChevronDown className={cn('h-4 w-4 transition', !isAboutContactOpen && '-rotate-90')} />页尾联系设置
                  </button>
                  {isAboutContactOpen && <div id="about-footer-contact" className="mt-4 max-w-3xl space-y-3">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold">GitHub 链接</span>
                      <Input type="url" value={githubUrlDraft} onChange={event => setGithubUrlDraft(event.target.value)} placeholder={DEFAULT_GITHUB_URL} aria-describedby="github-link-help" />
                    </label>
                    <p id="github-link-help" className="admin-entry-help">填写完整的 http:// 或 https:// 地址，保存个人页后用于首页及各页页尾；留空使用默认 GitHub 地址。</p>
                    <p className="admin-entry-help">微信二维码在上方“基础资源”中上传，保存个人页后，访客点击页尾“联系我”即可查看。未上传时显示明确提示。</p>
                  </div>}
                </section>
              </div>
            </section>
          ) : selectedType === 'gallery' ? (
            <section className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
              <div className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gallery Photos</p>
                    <h2 className="font-semibold">{selectedGalleryWorkId ? '编辑摄影作品组' : '新建摄影作品组'}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-muted-foreground">
                      <span>全部 {galleryStats.all}</span>
                      <span>已发布 {galleryStats.published}</span>
                      <span>草稿 {galleryStats.draft}</span>
                      <span>隐藏 {galleryStats.hidden}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-nowrap items-center justify-end gap-2">
                    <Button type="button" variant="outline" className="gap-2" onClick={createNewGalleryPhoto}>
                      <Plus className="h-4 w-4" />
                      新建作品组
                    </Button>
                    <Button type="button" variant="outline" className="gap-2" onClick={() => void refreshContent()}>
                      <RefreshCw className={cn('h-4 w-4', isLoadingContent && 'animate-spin')} />
                      刷新图册
                    </Button>
                  </div>
                </div>
              </div>

              {error && <p className="mx-4 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}
              {homeGalleryError && <p className="mx-4 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{homeGalleryError}</p>}

              <section className="mx-4 mt-4 rounded-md border border-border bg-muted p-4 md:mx-5">
                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-stretch">
                  <div className="flex min-h-10 items-center">
                    <p className="text-sm font-semibold text-foreground">首页图片设置</p>
                  </div>
                  <p className="flex h-10 items-center rounded-md border border-border bg-card px-3.5 text-xs font-semibold text-body">
                    已上传 {homeGalleryConfiguredCount} / {displayedHomeGallerySlotKeys.length}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 gap-1.5 rounded-md bg-card px-3.5 text-xs font-semibold text-body"
                    aria-controls="home-gallery-slot-panel"
                    aria-expanded={isHomeGallerySlotsOpen}
                    aria-label={isHomeGallerySlotsOpen ? '收起首页图片设置' : '展开首页图片设置'}
                    onClick={() => setIsHomeGallerySlotsOpen((isOpen) => !isOpen)}
                  >
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isHomeGallerySlotsOpen && 'rotate-180')} />
                    {isHomeGallerySlotsOpen ? '收起' : '展开'}
                  </Button>
                </div>

                {!isHomeGallerySlotsOpen && (
                  <div className="mt-4 rounded-md border border-dashed border-border bg-card px-3 py-3 text-xs font-bold text-muted-foreground">
                    首页图片设置已折叠，当前已上传 {homeGalleryConfiguredCount} 张。
                  </div>
                )}

                {isHomeGallerySlotsOpen && (
                  <div id="home-gallery-slot-panel" className="mt-4 grid gap-3 lg:grid-cols-2">
                    {displayedHomeGallerySlotKeys.map((slotKey) => {
                      const slot = homeGallerySlots[slotKey];
                      const selectedPhoto = slot.photo;
                      const isBusy = homeGalleryBusySlot === slotKey;

                      return (
                        <div key={slotKey} className="rounded-md border border-border bg-card p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <span className="block text-sm font-semibold text-body">{homeGallerySlotMeta[slotKey].title}</span>
                              <span className="mt-1 block text-xs font-bold text-muted-foreground">{homeGallerySlotMeta[slotKey].hint}</span>
                            </div>
                            {selectedPhoto && (
                              <Button
                                type="button"
                                variant="outline"
                                className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"
                                disabled={Boolean(homeGalleryBusySlot)}
                                aria-label={`恢复${homeGallerySlotMeta[slotKey].title}的默认视觉`}
                                onClick={() => void resetHomeGallerySlot(slotKey)}
                              >
                                {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                恢复默认
                              </Button>
                            )}
                          </div>
                          {selectedPhoto && (
                            <div className="mt-3 flex items-center gap-3 rounded-md bg-muted p-2">
                              <img src={selectedPhoto.thumbnailUrl || selectedPhoto.url} alt={`${homeGallerySlotMeta[slotKey].title}预览`} className="h-14 w-20 shrink-0 rounded object-cover" />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-body">{homeGallerySlotMeta[slotKey].title}</p>
                                <p className="mt-1 text-[11px] font-bold text-muted-foreground">
                                  {selectedPhoto.fileName || '已上传，首页可见'}
                                </p>
                              </div>
                            </div>
                          )}

                          {!selectedPhoto && (
                            <div className="mt-3 flex min-h-[72px] items-center justify-center rounded-md border border-dashed border-border bg-muted px-3 text-center">
                              <p className="text-xs font-bold text-muted-foreground">未上传，使用默认视觉</p>
                            </div>
                          )}

                          <label className={cn(
                            'mt-3 inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-slate-950 px-3 text-xs font-semibold text-white transition hover:bg-slate-800',
                            homeGalleryBusySlot && 'pointer-events-none opacity-70'
                          )}>
                            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                            从本地上传
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/gif,image/webp"
                              className="sr-only"
                              disabled={Boolean(homeGalleryBusySlot)}
                              aria-label={`上传${homeGallerySlotMeta[slotKey].title}`}
                              onChange={(event) => void handleHomeGallerySlotUpload(slotKey)(event)}
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <GalleryWorkEditor
                key={galleryEditorKey}
                work={galleryWorks.find(work => work.id === selectedGalleryWorkId)}
                onBusyChange={setGalleryBusy}
                onChanged={async id => {
                  const freshWorks = await listAdminGalleryWorks();
                  setGalleryWorks(freshWorks);
                  setSelectedGalleryWorkId(id);
                  if (id === null) setGalleryEditorKey(current => current + 1);
                }}
              />
            </section>
          ) : selectedType === 'comment' ? (
            <section className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
              <div className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Comments</p>
                    <h2 className="font-semibold">评论管理</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-muted-foreground">
                      <span>全部 {commentStats.all}</span>
                      <span>待审核 {commentStats.pending}</span>
                      <span>已通过 {commentStats.approved}</span>
                      <span>已隐藏 {commentStats.hidden}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-nowrap items-center justify-end gap-2">
                    <Button type="button" variant="outline" className="gap-2" onClick={() => void refreshContent()}>
                      <RefreshCw className={cn('h-4 w-4', isLoadingContent && 'animate-spin')} />
                      刷新评论
                    </Button>
                  </div>
                </div>
              </div>

              {error && <p className="mx-4 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}

              <div className="space-y-4 p-4 md:p-5">
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: 'all', label: '全部', count: commentStats.all },
                    { value: 'pending', label: '待审核', count: commentStats.pending },
                    { value: 'approved', label: '已通过', count: commentStats.approved },
                    { value: 'hidden', label: '已隐藏', count: commentStats.hidden },
                  ] as Array<{ value: CommentStatus | 'all'; label: string; count: number }>).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setCommentFilter(option.value)}
                      className={cn(
                        'rounded-full px-4 py-2 text-xs font-semibold transition',
                        commentFilter === option.value
                          ? 'bg-slate-950 text-white'
                          : 'bg-muted text-body hover:bg-accent hover:text-foreground'
                      )}
                    >
                      {option.label} {option.count}
                    </button>
                  ))}
                </div>

                {isLoadingContent && (
                  <div className="rounded-md bg-muted px-4 py-8 text-center text-sm font-bold text-muted-foreground">
                    正在加载评论...
                  </div>
                )}

                {!isLoadingContent && filteredComments.length === 0 && (
                  <div className="rounded-md border border-dashed border-border px-4 py-12 text-center">
                    <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 text-sm font-bold text-muted-foreground">暂无评论。</p>
                  </div>
                )}

                {!isLoadingContent && filteredComments.length > 0 && (
                  <div className="space-y-3">
                    {filteredComments.map((comment) => {
                      const isActionBusy = commentActionId === comment.id;

                      return (
                        <article key={comment.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-foreground">{comment.authorName}</span>
                                <CommentStatusBadge status={comment.status} />
                                {comment.parentId && (
                                  <Badge variant="secondary" className="border-none bg-muted font-semibold text-body">
                                    回复
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-muted-foreground">
                                <span>{comment.targetType === 'blog' ? '博客评论' : '留言板'}</span>
                                <span>/</span>
                                <span>{commentTargetLabel(comment, posts)}</span>
                                <span>/</span>
                                <span>{formatCommentDate(comment.createdAt)}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap justify-end gap-2">
                              {comment.status !== 'approved' && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                  disabled={Boolean(commentActionId)}
                                  onClick={() => void updateCommentStatus(comment, 'approved')}
                                >
                                  {isActionBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                  通过
                                </Button>
                              )}
                              {comment.status !== 'hidden' && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5 text-body hover:bg-muted hover:text-foreground"
                                  disabled={Boolean(commentActionId)}
                                  onClick={() => void updateCommentStatus(comment, 'hidden')}
                                >
                                  {isActionBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
                                  隐藏
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                disabled={Boolean(commentActionId)}
                                onClick={() => void deleteComment(comment)}
                              >
                                {isActionBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                删除
                              </Button>
                            </div>
                          </div>

                          <p className="mt-4 whitespace-pre-wrap rounded-md bg-muted px-4 py-3 text-sm font-medium leading-6 text-body">
                            {comment.content}
                          </p>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="admin-blog-editor min-w-0 overflow-hidden rounded-lg border border-border bg-card">
              <div className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="blog-editor-eyebrow text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {editorMode === 'preview' ? 'Preview' : 'Blog Editor'}
                    </p>
                    <div className="admin-blog-heading">
                      <h2 className="font-semibold">{editorMode === 'preview' ? '预览博客' : isCreatingNew || !form.id ? '新建博客' : '编辑博客'}</h2>
                      <BlogStatusBadge status={form.status} detailed />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="border-none bg-muted font-semibold text-body">
                        {form.category || DEFAULT_BLOG_CATEGORY}
                      </Badge>
                      <span className="text-xs font-bold text-muted-foreground">
                        {form.id ? `博客 ${form.blogOrder || '-'}` : '新的博客草稿'}
                      </span>
                    </div>
                  </div>

                  <BlogEditorActions
                    status={form.status}
                    isSaving={isSaving}
                    isPreview={editorMode === 'preview'}
                    onTogglePreview={() => setEditorMode((mode) => mode === 'edit' ? 'preview' : 'edit')}
                    onSave={(status) => void save(status)}
                    onDelete={form.id ? () => void deleteCurrentPost() : undefined}
                  />
                </div>
              </div>

              {error && <p className="mx-4 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}

              {editorMode === 'preview' ? (
                <div className="p-4 md:p-5">
                  <article className="mx-auto max-w-4xl rounded-md border border-border bg-card px-6 py-7 md:px-10 md:py-9">
                    <div className="mb-5 flex flex-wrap items-center gap-2">
                      {form.category && (
                        <Badge variant="secondary" className="border-none bg-muted px-3 py-1 font-semibold text-body">
                          {form.category}
                        </Badge>
                      )}
                      <BlogStatusBadge status={form.status} />
                    </div>

                    <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
                      {form.title || '未命名博客'}
                    </h1>
                    <div className="mt-9 space-y-6 border-t border-border pt-8">
                      {renderMarkdown(form.contentMarkdown || '')}
                    </div>
                  </article>
                </div>
              ) : (
                <div className="p-4 md:p-5">
                  <div className="space-y-5">
                    <div className="grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,7fr)]">
                      <label>
                        <span className="mb-2 block text-sm font-bold text-body">博客序号</span>
                        <Input type="number" value={form.blogOrder} onChange={handleInput('blogOrder')} />
                      </label>
                      <label>
                        <span className="mb-2 block text-sm font-bold text-body">标题</span>
                        <Input value={form.title} onChange={handleInput('title')} />
                      </label>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,7fr)]">
                      <label>
                        <span className="mb-2 block text-sm font-bold text-body">博客标签</span>
                        <Input
                          value={form.category}
                          onChange={handleInput('category')}
                          placeholder={DEFAULT_BLOG_CATEGORY}
                        />
                      </label>
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-card px-4 py-3">
                      <label className="inline-flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={form.featuredOnHome}
                          onChange={handleCheckboxInput('featuredOnHome')}
                          className="h-4 w-4 rounded border-border accent-brand"
                        />
                        <span className="text-sm font-semibold text-foreground">精选到首页</span>
                      </label>
                      {form.featuredOnHome && (
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          精选排序
                          <Input aria-label="首页精选排序" type="number" min={0} className="w-20" value={form.homeOrder} onChange={handleInput('homeOrder')} />
                        </label>
                      )}
                    </div>
                    {form.featuredOnHome && <p className="text-xs leading-6 text-muted-foreground">保存后生效；文章公开时才会展示。首页按精选排序展示前 3 篇，数字越小越靠前。</p>}

                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-body">摘要</span>
                      <textarea
                        value={form.summary}
                        onChange={handleInput('summary')}
                        rows={3}
                        className="w-full resize-y rounded-md border border-border px-3 py-2 text-sm font-medium leading-6 text-body focus:outline-none focus:ring-2 focus:ring-slate-950"
                      />
                    </label>

                    <section className="rounded-md border border-border bg-muted p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4 text-body" />
                          <span className="text-sm font-semibold text-body">图片</span>
                        </div>
                        <label className={cn(
                          'inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-semibold text-body transition hover:border-border hover:bg-muted',
                          !canUploadMedia && 'pointer-events-none opacity-60'
                        )}>
                          {isUploadingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          上传图片
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/gif,image/webp"
                            className="sr-only"
                            disabled={!canUploadMedia}
                            onChange={(event) => void handleMediaUpload(event)}
                          />
                        </label>
                      </div>

                      {!activeBlogPostId && (
                        <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">
                          请先保存草稿，保存后上传的图片会只属于这篇博客。
                        </p>
                      )}

                      {mediaError && (
                        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{mediaError}</p>
                      )}

                      {mediaAssets.length > 0 ? (
                        <div className="h-56 overflow-y-auto pr-1">
                          <div className="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {mediaAssets.slice(0, 12).map((asset) => (
                              <article
                                key={asset.id}
                                className="group overflow-hidden rounded-md border border-border bg-card transition hover:border-slate-950"
                              >
                                <div className="relative">
                                  <img src={asset.url} alt={asset.fileName} className="aspect-video w-full bg-muted object-cover" />
                                  <button
                                    type="button"
                                    className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-card/95 text-body shadow-sm transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    title="删除图片"
                                    disabled={mediaActionId === asset.id}
                                    onClick={() => void deleteCurrentMediaAsset(asset)}
                                  >
                                    {mediaActionId === asset.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                  </button>
                                </div>
                                <div className="p-2">
                                  <p className="truncate text-xs font-semibold text-body">{asset.fileName}</p>
                                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                    <button
                                      type="button"
                                      className="text-[11px] font-bold text-muted-foreground transition hover:text-foreground"
                                      onClick={() => void copyMediaAssetMarkdownUrl(asset)}
                                    >
                                      复制 Markdown URL
                                    </button>
                                    <button
                                      type="button"
                                      className="text-[11px] font-bold text-muted-foreground transition hover:text-foreground"
                                      onClick={() => setCoverImageFromAsset(asset)}
                                    >
                                      设为封面
                                    </button>
                                  </div>
                                </div>
                              </article>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="flex h-56 items-center rounded-md border border-dashed border-border bg-muted px-3 text-sm font-bold text-muted-foreground">
                          暂无已上传图片。
                        </p>
                      )}
                    </section>

                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-body">Markdown 正文</span>
                      <textarea
                        value={form.contentMarkdown}
                        onChange={handleInput('contentMarkdown')}
                        rows={33}
                        className="min-h-[830px] w-full resize-y rounded-md border border-border bg-slate-950 px-4 py-3 font-mono text-sm leading-6 text-white focus:outline-none focus:ring-2 focus:ring-brand"
                        spellCheck={false}
                      />
                    </label>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
};

export default Admin;
