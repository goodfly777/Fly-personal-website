import React, { Suspense, lazy } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Starfield } from './components/background/Starfield';
import './styles/background.css';
import './styles/content-cards.css';

// 懒加载页面组件以优化性能
const Home = lazy(() => import('./pages/Home'));
const Photography = lazy(() => import('./pages/Photography'));
const Blog = lazy(() => import('./pages/Blog'));
const About = lazy(() => import('./pages/About'));
const Conversation = lazy(() => import('./pages/Conversation'));
const Admin = lazy(() => import('./pages/Admin'));

const App = () => {
  const { pathname, search } = useLocation();
  const isReading = pathname === '/blog' && new URLSearchParams(search).has('post');
  return (
    <div className="site-universe" data-content-cards={pathname !== "/" ? true : undefined} data-background-density={isReading ? "reading" : pathname === "/" ? "normal" : "quiet"}>
    <Starfield />
    <div className="site-page">
    <Suspense fallback={
      <div className={`${pathname === '/' ? 'min-h-screen' : 'site-loading-card content-card'} flex flex-col items-center justify-center`}>
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-[6px] border-white/15 rounded-full"></div>
          <div className="absolute inset-0 border-[6px] border-white border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(255,255,255,0.3)]"></div>
        </div>
        <p className="mt-8 text-white font-medium tracking-widest">正在进入陈杰的世界...</p>
      </div>
    }>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/photography" element={<Photography />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/about" element={<About />} />
        <Route path="/conversation" element={<Conversation />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<main className="mx-auto max-w-xl px-5 py-24 text-center"><h1 className="text-2xl font-semibold">页面不存在</h1><Link to="/" className="mt-6 inline-block underline underline-offset-4">返回首页</Link></main>} />
      </Routes>
    </Suspense>
    </div>
    </div>
  );
};


export default App;
