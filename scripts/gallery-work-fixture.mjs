import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

// Local in-memory UI fixture. No production credentials, database, or user uploads.
let serial = 0;
const photo = (workId, shape, order) => ({ id: `photo-${++serial}`, workId, title: '测试照片', description: '', location: '', takenAt: '2026', sortOrder: order, status: 'published',
  url: `/uploads/__fixture/${shape}.svg`, thumbnailUrl: `/uploads/__fixture/${shape}.svg`, mediumUrl: `/uploads/__fixture/${shape}.svg`, fileName: `${shape}.jpg`, mimeType: 'image/jpeg', sizeBytes: 1000, createdAt: '', updatedAt: '' });
let works = [
  { id: 'a', title: '【测试夹具】同名作品', description: '原始比例展示横图与竖图。左右切换到下一组时，信息会同步更新。', location: '第一组 · 湖边', takenAt: '2026', sortOrder: 1, status: 'published', photos: [photo('a','wide',1), photo('a','tall',2)] },
  { id: 'b', title: '【测试夹具】同名作品', description: '', location: '第二组 · 城市', takenAt: '2025', sortOrder: 2, status: 'published', photos: [photo('b','square',1)] },
  { id: 'hidden', title: '【不应公开】隐藏作品', description: '', location: '', takenAt: '', sortOrder: 3, status: 'hidden', photos: [{...photo('hidden','wide',1),status:'hidden'}] },
];
const attempts = new Map(), calls = [];
const body = async req => { const chunks=[]; for await (const chunk of req) chunks.push(chunk); return Buffer.concat(chunks); };

createServer(async (req,res) => {
  const url = new URL(req.url,'http://127.0.0.1');
  const respond = (data,code=200) => { res.statusCode=code; res.setHeader('Content-Type','application/json; charset=utf-8'); res.end(data === undefined ? '' : JSON.stringify(data)); };
  if (url.pathname.startsWith('/uploads/__fixture/')) {
    const shape=url.pathname.split('/').pop().split('.')[0]; const [w,h]=shape==='tall'?[800,1200]:shape==='square'?[1000,1000]:[1600,900];
    res.setHeader('Content-Type','image/svg+xml');
    res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#8499ac"/><stop offset="1" stop-color="#314453"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><rect x="20" y="20" width="${w-40}" height="${h-40}" fill="none" stroke="#e7e7db" stroke-width="8"/><circle cx="${w*.68}" cy="${h*.28}" r="${Math.min(w,h)*.12}" fill="#ecdbc0"/><path d="M0 ${h*.8} L${w*.4} ${h*.4} L${w} ${h} H0Z" fill="#243a41"/><text x="${w*.08}" y="${h*.2}" font-family="sans-serif" font-size="${Math.min(w,h)*.06}" fill="white">TEST ${shape} ${w} x ${h}</text></svg>`);return;
  }
  if(url.pathname==='/__qa') { respond({works,calls,attempts:[...attempts]});return; }
  if(url.pathname==='/api/auth/me'){respond({email:'preview@example.test',role:'ADMIN'});return;}
  if(url.pathname==='/api/admin/about'){respond({profileDetails:[],resumeEntries:[],contactHeading:'',contactItems:[],socialLinks:[]});return;}
  if(url.pathname==='/api/admin/gallery-works' && req.method==='POST') {
    const data=JSON.parse((await body(req)).toString()); const work={...data,id:randomUUID(),photos:[]};works.push(work);respond(work,201);return;
  }
  if(url.pathname==='/api/gallery-works' || url.pathname==='/api/admin/gallery-works') {
    respond({items:works.filter(work=>url.pathname.includes('/admin/') || work.status==='published' && work.photos.length>0)});return;
  }
  const workMatch=url.pathname.match(/^\/api\/admin\/gallery-works\/([^/]+)(.*)$/);
  if(workMatch){
    const work=works.find(work=>work.id===workMatch[1]);if(!work){respond({error:'Work not found'},404);return;}
    const suffix=workMatch[2];
    if(suffix==='/photos' && req.method==='POST') {
      const bytes=await body(req);const name=bytes.toString('latin1').match(/filename="([^"]+)"/)?.[1]||'upload.jpg';
      const count=(attempts.get(name)||0)+1;attempts.set(name,count);calls.push({action:'upload',workId:work.id,name,count});
      if(name.includes('fail') && count===1){respond({error:'测试夹具：首次上传失败，可重试'},503);return;}
      const added={...photo(work.id,'wide',work.photos.length+1),fileName:name,status:work.status};work.photos.push(added);respond(added,201);return;
    }
    if(suffix==='/photos/order' && req.method==='PUT') {
      const ids=JSON.parse((await body(req)).toString());work.photos=ids.map((id,index)=>({...work.photos.find(photo=>photo.id===id),sortOrder:index+1}));calls.push({action:'order',workId:work.id,ids});respond(work);return;
    }
    if(!suffix && req.method==='PUT') {Object.assign(work,JSON.parse((await body(req)).toString()));work.photos=work.photos.map(photo=>({...photo,status:work.status}));respond(work);return;}
    if(!suffix && req.method==='DELETE'){works=works.filter(item=>item.id!==work.id);respond(undefined,204);return;}
  }
  const photoMatch=url.pathname.match(/^\/api\/admin\/gallery-photos\/([^/]+)(\/image)?$/);
  if(photoMatch){
    const work=works.find(work=>work.photos.some(photo=>photo.id===photoMatch[1]));
    const current=work?.photos.find(photo=>photo.id===photoMatch[1]);if(!current){respond({error:'Photo not found'},404);return;}
    if(req.method==='DELETE'){work.photos=work.photos.filter(photo=>photo.id!==current.id);respond(undefined,204);return;}
    if(photoMatch[2] && req.method==='POST'){await body(req);Object.assign(current,{url:'/uploads/__fixture/tall.svg',mediumUrl:'/uploads/__fixture/tall.svg',thumbnailUrl:'/uploads/__fixture/tall.svg'});respond(current);return;}
  }
  if(url.pathname.startsWith('/api/')){respond({items:[]});return;}
  respond({error:'Fixture endpoint only'},404);
}).listen(18085,'127.0.0.1',()=>console.log('Gallery UI fixture: http://127.0.0.1:18085 (in-memory test data only)'));
