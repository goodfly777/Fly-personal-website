import { createServer } from 'node:http';

// Local verification only: all edits are stored in memory, never in the real database.
const project = { id: 'qa-project', title: '【验收夹具】技术实践', slug: 'qa-project', summary: '本地测试', descriptionMarkdown: '', techStack: [], sortOrder: 1, status: 'published' };
let posts = ['draft', 'published', 'hidden'].map((status, index) => ({
  id: `qa-${status}`, projectId: project.id, projectSlug: project.slug, projectTitle: project.title,
  title: `【验收夹具】${{ draft: '草稿文章', published: '公开文章', hidden: '隐藏文章' }[status]}`,
  slug: `qa-${status}`, category: '工程实践', summary: '仅用于测试配色与文章状态，不会写入真实内容。',
  contentMarkdown: '## 验收内容\n\n保存文章内容时应保留当前公开或隐藏状态。',
  blogOrder: index + 1, featuredOnHome: false, homeOrder: 0, status,
  createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z',
}));
const saves = [];
createServer(async (req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const send = value => res.end(JSON.stringify(value));
  if (path === '/__qa') return send({ posts, saves });
  if (path.startsWith('/api/admin/blog-posts/') && req.method === 'PUT') {
    let body = ''; for await (const chunk of req) body += chunk;
    const id = path.split('/').at(-1), payload = JSON.parse(body);
    const post = posts.find(post => post.id === id);
    if (!post) { res.statusCode = 404; return send({ message: 'Unknown test article.' }); }
    Object.assign(post, payload); saves.push({ id, status: post.status }); return send(post);
  }
  if (req.method !== 'GET') { res.statusCode = 405; return send({ message: 'Fixture operation not supported.' }); }
  if (path === '/api/auth/me') return send({ email: 'preview@example.test', role: 'ADMIN' });
  if (path === '/api/admin/projects') return send({ items: [project] });
  if (path === '/api/admin/blog-posts') return send({ items: posts });
  if (path === '/api/admin/about') return send({ profileDetails: [], resumeEntries: [], contactItems: [], socialLinks: [] });
  if (path.startsWith('/api/admin/')) return send({ items: [] });
  res.statusCode = 404; send({ message: 'Local fixture endpoint only.' });
}).listen(18086, '127.0.0.1', () => console.log('Blog editor fixture: http://127.0.0.1:18086 (in-memory only)'));
