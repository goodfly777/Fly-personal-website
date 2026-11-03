import React, { type FormEvent, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowUpRight, Loader2, LogIn } from 'lucide-react';
import { WechatContact } from './WechatContact';
import { getAboutContent, type AboutContentRecord } from '../lib/aboutApi';
import { DEFAULT_GITHUB_URL, getGithubUrl, isHttpUrl } from '../lib/siteContact';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { loginAdmin } from '../lib/adminApi';
import { getAdminNavigationState } from '../lib/adminNavigation';
import { useSiteAdmin } from '../lib/siteAdmin';
import { cn } from '../lib/utils';
import '../styles/footer.css';

const Navigation = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = React.useState(false);
  const [isAdminLoginSubmitting, setIsAdminLoginSubmitting] = React.useState(false);
  const [adminEmail, setAdminEmail] = React.useState('');
  const [adminPassword, setAdminPassword] = React.useState('');
  const [adminLoginError, setAdminLoginError] = React.useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthReady, isOwner, refreshAdmin } = useSiteAdmin();
  const adminNavState = getAdminNavigationState({ isAuthReady, isOwner });
  useEffect(() => { setIsOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      document.querySelector<HTMLButtonElement>('[aria-controls="site-route-menu"]')?.focus();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);
  const navItems = [
    { name: '首页', path: '/', code: 'HOME' },
    { name: '技术博客', path: '/blog', code: '01' },
    { name: '摄影作品', path: '/photography', code: '02' },
    { name: '留言', path: '/conversation', code: '03' },
    { name: '关于我', path: '/about', code: '04' },
    { name: adminNavState.label, path: '/admin', code: 'ADM', requiresLogin: true },
  ];
  const isActivePath = (path: string) => location.pathname === path;

  const getAdminPathWithReturn = () => {
    const currentPath = `${location.pathname}${location.search}${location.hash}`;
    const returnTo = currentPath === '/admin' || currentPath.startsWith('/admin?') ? '/' : currentPath;

    return `/admin?returnTo=${encodeURIComponent(returnTo)}`;
  };

  const openAdminLogin = () => {
    if (!adminNavState.canUseAction) return;

    setIsOpen(false);

    if (isOwner) {
      navigate(getAdminPathWithReturn());
      return;
    }

    setAdminLoginError('');
    setIsAdminLoginOpen(true);
  };

  const closeAdminLogin = () => {
    if (isAdminLoginSubmitting) return;
    setIsAdminLoginOpen(false);
    setAdminPassword('');
    setAdminLoginError('');
  };

  const handleAdminLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsAdminLoginSubmitting(true);
    setAdminLoginError('');

    try {
      await loginAdmin(adminEmail, adminPassword);
      await refreshAdmin();
      setAdminPassword('');
      setIsAdminLoginOpen(false);
      navigate(getAdminPathWithReturn());
    } catch (caughtError) {
      setAdminLoginError(caughtError instanceof Error ? caughtError.message : '登录失败。');
    } finally {
      setIsAdminLoginSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isOwner) return;

    setIsAdminLoginOpen(false);
    setAdminPassword('');
    setAdminLoginError('');
  }, [isOwner]);

  const renderNavItems = () => (
    <>
      {navItems.map((item) => {
        const current = isActivePath(item.path) ? 'page' as const : undefined;
        const label = <><span className="chapter-tab-code">{item.code}</span><span>{item.name}</span></>;
        return item.requiresLogin ? (
          <button key={item.path} type="button" className="chapter-tab"
            aria-current={current} aria-busy={!isAuthReady || undefined}
            aria-haspopup={!isAuthReady || isOwner ? undefined : 'dialog'}
            disabled={!adminNavState.canUseAction} onClick={openAdminLogin}>
            {!isAuthReady && <Loader2 className="h-3 w-3 animate-spin" />}{label}
          </button>
        ) : (
          <Link key={item.path} to={item.path} className="chapter-tab" aria-current={current}
            onClick={() => setIsOpen(false)}>{label}</Link>
        );
      })}
    </>
  );

  return (
    <nav className="site-route-nav" aria-label="网站导航">
      <div className="site-route-desktop">
        <Link to="/" className="site-brand" aria-label="陈杰，返回首页"><span className="site-brand-mark">C<span>.</span></span><span>陈杰<small>DEVELOPER & CREATOR</small></span></Link>
        <div className="site-route-links">{renderNavItems()}</div>
      </div>
      <div className="site-route-mobile-bar">
        <Link to="/" className="site-brand"><span className="site-brand-mark">C<span>.</span></span><span>陈杰<small>DEVELOPER & CREATOR</small></span></Link>
        <button type="button" className="chapter-tab" aria-label={isOpen ? '关闭导航菜单' : '打开导航菜单'}
          aria-expanded={isOpen} aria-controls="site-route-menu" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={16} /> : <Menu size={16} />}<span>导航</span>
        </button>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div id="site-route-menu" className="site-route-menu"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}>
            <div className="site-route-menu-grid">{renderNavItems()}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdminLoginOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/20 px-4 py-8 backdrop-blur-sm"
            onClick={closeAdminLogin}
          >
            <motion.form
              initial={{ scale: 0.94, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 16 }}
              onSubmit={(event) => void handleAdminLogin(event)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="nav-admin-login-title"
              className="relative w-full max-w-[360px] rounded-lg border border-border bg-card p-5 text-left shadow-[0_24px_80px_-48px_rgba(15,23,42,0.75)]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                aria-label="关闭登录"
                className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                disabled={isAdminLoginSubmitting}
                onClick={closeAdminLogin}
              >
                <X className="h-4 w-4" />
              </button>
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Admin</p>
                <h1 id="nav-admin-login-title" className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                  站主登录
                </h1>
              </div>

              <label className="mb-4 block">
                <span className="mb-2 block text-sm font-bold text-body">邮箱</span>
                <Input
                  value={adminEmail}
                  type="email"
                  autoComplete="email"
                  disabled={isAdminLoginSubmitting}
                  onChange={(event) => setAdminEmail(event.target.value)}
                  required
                />
              </label>

              <label className="mb-5 block">
                <span className="mb-2 block text-sm font-bold text-body">密码</span>
                <Input
                  value={adminPassword}
                  type="password"
                  autoComplete="current-password"
                  disabled={isAdminLoginSubmitting}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  required
                />
              </label>

              {adminLoginError && (
                <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                  {adminLoginError}
                </p>
              )}

              <Button
                type="submit"
                className="w-full bg-primary text-black hover:bg-primary/90"
                disabled={isAdminLoginSubmitting}
              >
                {isAdminLoginSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                {isAdminLoginSubmitting ? '登录中...' : '登录并进入后台'}
              </Button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export const SiteFooter = ({ embedded = false, variant = 'default' }: { embedded?: boolean; variant?: 'default' | 'compact' }) => {
  const [contact, setContact] = React.useState<AboutContentRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(false);
  useEffect(() => {
    let active = true;
    getAboutContent().then(value => { if (active) setContact(value); })
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const configuredGithub = getGithubUrl(contact?.socialLinks);
  const githubUrl = isHttpUrl(configuredGithub) ? configuredGithub : DEFAULT_GITHUB_URL;
  const wechat = <WechatContact compact={variant === 'compact'} imageUrl={contact?.wechatQrImageUrl} loading={loading} loadError={loadError} />;
  return variant === 'compact' ? (
  <footer className="site-footer site-footer-compact"><p>© {new Date().getFullYear()} 陈杰</p><nav aria-label="页尾链接"><a href={githubUrl} target="_blank" rel="noopener noreferrer">GitHub<span className="sr-only">（在新标签页打开）</span></a>{wechat}</nav></footer>
) : (
  <footer className={`site-contact ${embedded ? 'cosmic-footer-screen' : 'site-footer'}`} aria-label="保持联系">
    <div className="site-contact-inner">
      <div className="site-contact-message">
        <p className="site-contact-eyebrow">KEEP IN TOUCH</p>
        <h2 className="site-contact-title">保持好奇，<span>也保持联系。</span></h2>
        <p className="site-contact-copy">关于代码、摄影，或一个值得尝试的想法。</p>
        {wechat}
        <nav className="site-contact-socials" aria-label="社交链接">
          {[
            { label: 'GitHub', href: githubUrl },
          ].map(link => (
            <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">
              {link.label}<ArrowUpRight size={14} aria-hidden="true" /><span className="sr-only">（在新标签页打开）</span>
            </a>
          ))}
        </nav>
      </div>
      <div className="site-contact-colophon">
        <p>© {new Date().getFullYear()} 陈杰</p>
        <p>写代码，也记录生活。</p>
      </div>
    </div>
  </footer>
  );
};

export const Layout = ({ children, theme = 'default', footerVariant = 'default' }: { children: React.ReactNode; theme?: 'default' | 'cosmic'; footerVariant?: 'default' | 'compact' }) => {
  const { pathname } = useLocation();
  useEffect(() => {
    if (theme !== 'cosmic') return;
    const html = document.documentElement, body = document.body;
    const oldHtmlOverflow = html.style.overflow, oldBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden'; body.style.overflow = 'hidden';
    window.scrollTo(0, 0);
    return () => { html.style.overflow = oldHtmlOverflow; body.style.overflow = oldBodyOverflow; };
  }, [theme]);
  return (
    <div className={theme === 'cosmic' ? 'cosmic-layout min-h-screen relative' : cn('site-theme min-h-screen relative', footerVariant === 'compact' ? 'site-blog-layout' : 'overflow-x-hidden')}>
      <Navigation />

      {theme === 'cosmic' ? <main>{children}</main> : <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={false}
          animate={{ x: 0 }}
          exit={{ x: -20 }}
          transition={{ duration: footerVariant === 'compact' ? 0 : 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          className="site-content relative z-10"
        >
          <main>{children}</main>
        </motion.div>
      </AnimatePresence>}

      {theme !== 'cosmic' && <SiteFooter variant={footerVariant} />}

    </div>
  );
};
