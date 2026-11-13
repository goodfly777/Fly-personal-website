import { createServer } from 'node:http';

// Opt-in QA server only: no database writes and no production fallback imports.
const projects = [{slug:'reading-fixture',title:'【测试夹具】阅读体验',summary:'仅用于本地验收'}, {slug:'second-fixture',title:'【测试夹具】另一项目'}, {slug:'empty-fixture',title:'【测试夹具】无文章项目'}];
const body = `# 中文与 **格式标题**
这是明确标注的测试文章，不是实际发布内容。用于检验阅读宽度、目录、代码、表格与手机布局。\n\n${'开发者需要先理解问题，再查看实现和验证结果。'.repeat(35)}
## 重复标题
这里保留文字、**加粗重点**和[示例链接](https://example.com)。\n\n行内长代码：\`${'very_long_identifier_'.repeat(28)}\`。
\`\`\`text
# 代码里的伪标题
${'long_code_line_'.repeat(30)}
\`\`\`
## 重复标题
这里是第二个同名章节，用于确认标题 ID 不重复。
| 字段 | 内容 |
| --- | --- |
| 完整说明 | ${'完整表格内容不应该被三行截断。'.repeat(18)} |
| 第二行 | 验证手机横向滚动容器 |
\`\`\`mermaid
flowchart LR
 A[输入] --> B[验证] --> C[结果]
\`\`\`
### 结果与边界
${'这是测试夹具内容，不能用作真实后端的验收证据。'.repeat(32)}
## 最后一个章节
感谢阅读。`;
const post = (id, projectSlug, slug, title, publishedAt, blogOrder) => ({id,projectSlug,slug,title,projectTitle:projects.find(p=>p.slug===projectSlug)?.title || '隐藏项目',category:'验收',summary:'这是一段【测试夹具】摘要。'.repeat(22),contentMarkdown:body,publishedAt,createdAt:publishedAt,updatedAt:publishedAt,blogOrder});
const posts = [post('one','reading-fixture','first','【测试夹具】01 阅读排版与目录','2026-10-01T00:00:00Z',1), post('two','reading-fixture','second','【测试夹具】02 状态与导航','2026-10-03T00:00:00Z',2),post('three','second-fixture','another','【测试夹具】另一项目文章','2026-10-03T00:00:00Z',1),post('hidden','private-project','secret','【不应显示】隐藏项目文章','2026-10-05T00:00:00Z',1)];
let mode = 'success', delay = 0, calls = 0;
createServer(async (req,res) => {
 const url = new URL(req.url,'http://localhost');
 res.setHeader('Content-Type','application/json; charset=utf-8');
 if (url.pathname==='/__qa') { mode=url.searchParams.get('mode')||mode;delay=Number(url.searchParams.get('delay')||0);res.end(JSON.stringify({mode,delay,calls}));return; }
 if (url.pathname==='/api/projects'||url.pathname==='/api/blog-posts') {
  calls++; const responseMode=mode; const responseDelay=delay;
  if(responseDelay) await new Promise(resolve=>setTimeout(resolve,responseDelay));
  if(responseMode==='error'){res.statusCode=503;res.end(JSON.stringify({error:'fixture internal address must not be shown'}));return;}
  const fixturePosts = responseMode === 'edges'
   ? posts.map((post, index) => ({ ...post, title: `${post.title} ${'超长技术标题与边界情况'.repeat(6)} ${'UnbrokenIdentifier'.repeat(10)}`, summary: index === 0 ? '' : post.summary, category: index === 0 ? '' : post.category }))
   : responseMode === 'layout' ? posts.map(post => ({ ...post,
       title: '【测试夹具】一个 RAG Agent 离生产还多远：Redis、Milvus、MinIO、MongoDB、MySQL 应该放哪里',
       contentMarkdown: body + '\n\n## 多列宽表格\n| '+Array.from({length:16},(_,i)=>'字段'+(i+1)).join(' | ')+' |\n| '+Array(16).fill('---').join(' | ')+' |\n| '+Array(16).fill('验证局部横向滚动').join(' | ')+' |\n\n## 图片比例\n![仅用于验收的横向图形](/uploads/__qa-image.svg)\n',
     }))
   : responseMode === 'short' ? posts.map(post => ({ ...post, contentMarkdown: '# 单一标题\n短文测试。' })) : posts;
  res.end(JSON.stringify({items:responseMode==='empty'?[]:url.pathname==='/api/projects'?projects:fixturePosts}));return;
 }
 if(url.pathname==='/uploads/__qa-image.svg'){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#252238"/><path d="M0 0L1600 900M1600 0L0 900" stroke="#c4b5fd" stroke-width="4"/><text x="800" y="450" text-anchor="middle" fill="#f2f4f8" font-size="48">QA 1600 × 900</text></svg>');return;}
 if(url.pathname.includes('/comments')){res.end(JSON.stringify({items:[],total:0}));return;}
 if(url.pathname==='/api/auth/me'){res.statusCode=401;res.end(JSON.stringify({error:'not authenticated'}));return;}
 res.statusCode=404;res.end(JSON.stringify({error:'QA fixture does not provide this endpoint'}));
}).listen(18082,'127.0.0.1',()=>console.log('QA fixture API: http://127.0.0.1:18082 (test data only)'));
