import { createServer } from 'node:http';
import fs from 'node:fs';
// Isolated verification, no database or user file mutations.
const articles = JSON.parse(fs.readFileSync('docs/migrations/legacy-case-articles.json','utf8'));
const projects = articles.map((a,i)=>({id:`group-${i}`,slug:a.group,title:a.title.split('：')[0],summary:a.summary,descriptionMarkdown:'',status:'published',techStack:[],sortOrder:i}));
const posts = articles.map((a,i)=>({...a,id:`post-${i}`,projectId:projects[i].id,projectSlug:a.group,projectTitle:projects[i].title,category:'项目总览',status:'published',featuredOnHome:true,homeOrder:2-i,blogOrder:1,createdAt:'2026-11-01T00:00:00Z',updatedAt:'2026-11-01T00:00:00Z',publishedAt:'2026-11-01T00:00:00Z'}));
posts.push({...posts[0],id:'hidden-post',slug:'hidden-case',title:'【验收夹具】隐藏文章',status:'hidden'});
const saves=[]; let mode='normal';
const visible = ()=>posts.filter(p=>p.status==='published' && projects.find(g=>g.id===p.projectId)?.status==='published');
createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1'), pathname=url.pathname;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  const send=data=>res.end(JSON.stringify(data));
  if(pathname==='/__qa'){mode=url.searchParams.get('mode')||mode; return send({mode,saves,posts,projects});}
  if(req.method==='PUT' && /^\/api\/admin\/(projects|blog-posts)\//.test(pathname)) {
    let body='';for await(const chunk of req)body+=chunk;
    const collection=pathname.includes('/projects/')?projects:posts, item=collection.find(p=>p.id===pathname.split('/').at(-1));
    if(!item){res.statusCode=404;return send({error:'Unknown fixture item'});}
    Object.assign(item,JSON.parse(body));saves.push({id:item.id,status:item.status,homeOrder:item.homeOrder,blogOrder:item.blogOrder});return send(item);
  }
  if(req.method!=='GET'){res.statusCode=405;return send({error:'Fixture operation unsupported'});}
  if(pathname==='/api/auth/me')return send({email:'preview@example.test',role:'ADMIN'});
  if(pathname==='/api/projects')return send({items:projects.filter(p=>p.status==='published')});
  if(pathname==='/api/blog-posts')return send({items:visible()});
  if(pathname==='/api/blog-posts/home-featured'){
    if(mode==='error'){res.statusCode=503;return send({error:'Fixture offline'});}
    return send({items:mode==='empty'?[]:visible().filter(p=>p.featuredOnHome).sort((a,b)=>a.homeOrder-b.homeOrder).slice(0,3)});
  }
  if(pathname==='/api/admin/projects')return send({items:projects});
  if(pathname==='/api/admin/blog-posts')return send({items:posts});
  if(pathname==='/api/admin/about')return send({profileDetails:[],resumeEntries:[],contactItems:[],socialLinks:[]});
  if(pathname.startsWith('/api/'))return send({items:[]});
  res.statusCode=404;send({error:'Fixture endpoint only'});
}).listen(18087,'127.0.0.1',()=>console.log('Blog merge verification: http://127.0.0.1:18087 (in-memory only)'));
