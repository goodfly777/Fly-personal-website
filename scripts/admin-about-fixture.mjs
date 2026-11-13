import { createServer } from 'node:http';

// Local UI verification only. Data and saves are held in memory, never in a database.
let about = {
  portraitImageUrl: null, wechatQrImageUrl: null,
  profileDetails: [
    { label: '基本信息', value: '【测试夹具】开发者 · 内容创作者', icon: 'user', wide: true },
    { label: '教育背景', value: '【测试夹具】软件工程', icon: 'graduation-cap' },
    { label: '研究方向', value: '【测试夹具】人工智能应用', icon: 'graduation-cap' },
    { label: '电话', value: '仅用于本地验收', icon: 'phone', copyValue: 'fixture-phone' },
    { label: '邮箱', value: 'preview@example.test', icon: 'mail', copyValue: 'preview@example.test' },
  ],
  resumeEntries: [], contactHeading: '联系信息', contactItems: [], socialLinks: [],
};
let saves = 0;
let uploadedAsset = null;
let assetMime = 'image/jpeg';
let uploads = 0;
const versions = [{ id: 'fixture-resume', label: '【测试夹具】简历', fileName: 'fixture.pdf', sizeBytes: 1024, createdAt: '2026-11-01T00:00:00Z', url: '/fixture.pdf', active: true }];
let showVersion = false;
// Include an uploaded legacy slot so UI checks can verify it is excluded from the count.
const homeSlots = ['hero-polaroid', 'resume-card', 'life-card', 'about-portrait'].map(slotKey => ({
  slotKey,
  photo: slotKey === 'about-portrait' ? null : {
    title: '【测试夹具】首页图片', url: '/src/assets/night-placeholder.svg',
    thumbnailUrl: '/src/assets/night-placeholder.svg', fileName: 'fixture.svg',
  },
}));

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const respond = data => res.end(JSON.stringify(data));
  if (url.pathname === '/uploads/__qa/wechat') {
    if (!uploadedAsset) { res.statusCode = 404; respond({ error: 'No QA upload.' }); return; }
    res.setHeader('Content-Type', assetMime); res.end(uploadedAsset); return;
  }
  if (url.pathname === '/api/admin/about/assets' && req.method === 'POST') {
    const chunks=[]; for await (const chunk of req) chunks.push(chunk);
    const raw=Buffer.concat(chunks), boundary=req.headers['content-type'].match(/boundary=(?:"([^"]+)"|([^;]+))/).slice(1).find(Boolean);
    const headersEnd=raw.indexOf('\r\n\r\n'), end=raw.lastIndexOf('\r\n--'+boundary);
    const header=raw.subarray(0,headersEnd).toString();
    uploadedAsset=raw.subarray(headersEnd+4,end); uploads++;
    assetMime=header.match(/Content-Type:\s*([^\r\n]+)/i)?.[1] || 'image/jpeg';
    respond({url:'/uploads/__qa/wechat',fileName:'qa-upload',mimeType:assetMime,sizeBytes:uploadedAsset.length}); return;
  }
  if (url.pathname === '/__qa') {
    if (url.searchParams.has('versions')) showVersion = url.searchParams.get('versions') === '1';
    if (url.searchParams.get('qr') === 'missing') about.wechatQrImageUrl = '';
    if (url.searchParams.get('qr') === 'broken') about.wechatQrImageUrl = '/uploads/__qa/not-found';
    respond({ saves, uploads, about, showVersion }); return;
  }
  if (url.pathname === '/api/admin/about' && req.method === 'PUT') {
    let body = '';
    for await (const chunk of req) body += chunk;
    about = JSON.parse(body); saves++; respond(about); return;
  }
  if (req.method !== 'GET') { res.statusCode = 405; respond({ error: 'Fixture only accepts an in-memory about save.' }); return; }
  if (url.pathname === '/api/auth/me') { respond({ email: 'preview@example.test', role: 'ADMIN' }); return; }
  if (url.pathname === '/api/admin/about' || url.pathname === '/api/about') { respond(about); return; }
  if (['/api/projects','/api/blog-posts','/api/blog-posts/home-featured','/api/gallery-works'].includes(url.pathname)) { respond({items:[]}); return; }
  if (url.pathname === '/api/admin/resume-versions') { respond({ items: showVersion ? versions : [] }); return; }
  if (url.pathname === '/api/admin/home-gallery-slots' || url.pathname === '/api/home-gallery-slots') { respond({ items: homeSlots }); return; }
  if (url.pathname.startsWith('/api/admin/')) { respond({ items: [] }); return; }
  res.statusCode = 404; respond({ error: 'Local fixture endpoint only.' });
}).listen(18083, '127.0.0.1', () => console.log('Admin UI fixture: http://127.0.0.1:18083 (in-memory test data only)'));
