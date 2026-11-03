import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(source, mocks={}) {
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,require:name=>mocks[name] || require(name)});
 return module.exports;
}
const markdown=load(fs.readFileSync('src/lib/markdown.tsx','utf8'),{'../components/MermaidDiagram':{MermaidDiagram:()=>null}});
const input='# **中文** [链接](https://example.com)\n\n```js\n# 非标题\n```\n## 重复\n```mermaid\n# 图内文本\n```\n## 重复\n### 细节\n#### 不进目录';
const doc=markdown.renderMarkdownDocument(input);
assert.deepEqual(Array.from(doc.headings,h=>h.text),['中文 链接','重复','重复','细节']);
assert.equal(new Set(doc.headings.map(h=>h.id)).size,4);
assert.deepEqual(Array.from(doc.headings,h=>h.id),['blog-heading-0','blog-heading-5','blog-heading-9','blog-heading-10']);
assert.equal(doc.blocks[0].type,'h2');
assert.equal(markdown.renderMarkdown('# 旧调用')[0].type,'h1');
assert.equal(markdown.renderMarkdownDocument('无标题正文').headings.length,0);
const duplicate=markdown.renderMarkdownDocument('# **Same title**\n\nIntro.\n\n## Section', 'Same title');
assert.equal(duplicate.blocks[0].type,'span');
assert.equal(duplicate.blocks[0].props.id,'blog-heading-0','Duplicate title anchors must survive.');
assert.equal(duplicate.headings.length,1);
assert.equal(duplicate.headings[0].level,1);
assert.equal(duplicate.blocks[2].type,'h2');
assert.equal(markdown.renderMarkdownDocument('# Different title', 'Article title').blocks[0].type,'h2');
const {articleContents}=load(fs.readFileSync('src/lib/articleContents.ts','utf8'));
const headings=[{id:'a',text:'A',level:1},{id:'a1',text:'A1',level:2},{id:'deep',text:'Deep',level:3},{id:'b',text:'B',level:1},{id:'b1',text:'B1',level:2}];
assert.deepEqual(Array.from(articleContents(headings,'deep'),e=>e.heading.id),['a','a1','b']);
assert.equal(articleContents(headings,'deep').find(e=>e.current).heading.id,'a1');
assert.deepEqual(Array.from(articleContents(headings,'b1'),e=>e.heading.id),['a','b','b1']);
assert.deepEqual(Array.from(articleContents(headings.slice(0,3),'deep'),e=>e.heading.id),['a1','deep']);
assert.equal(articleContents([],undefined).length,0);
const source=fs.readFileSync('src/pages/Blog.tsx','utf8').split('function ArticleContents')[0].replace(/^import .*;\r?\n/gm,'');
const data=load(source+'\nexport { getPublicBlogPosts, comparePostDates };');
const projects=[{slug:'public',title:'公开项目',summary:''}];
const post=(slug,projectSlug,order,date)=>({id:slug,slug,projectSlug,title:slug,summary:'',contentMarkdown:'正文',category:'技术',blogOrder:order,publishedAt:date,createdAt:date});
const posts=data.getPublicBlogPosts([post('b','public',2,'2026-01-02'),post('a','public',1,'2026-01-02'),post('c','public',0,'2026-01-01')],projects);
assert.equal(posts.length,3,'Articles must not require a project record.');
assert.deepEqual(Array.from([...posts].sort(data.comparePostDates),p=>p.slug),['a','b','c']);
assert.equal(data.getPublicBlogPosts([post('independent','',0,'2026-01-03')]).length,1);
// Pause is a rendering decision, not just a visual opacity change.
let environment={frameloop:'always',active:true,pixelRatio:1};
const scene=load(fs.readFileSync('src/components/background/StarfieldScene.tsx','utf8'),{
 '@react-three/fiber':{Canvas:'canvas'}, '@react-three/drei/core/Points':{}, '@react-three/drei/core/PointMaterial':{},
 './starfieldConfig':{starfieldConfig:{camera:{}}}, './starfieldMotion':{},
 './useStarfieldEnvironment':{useStarfieldEnvironment:()=>environment},
});
const paused=scene.default({paused:true,onFailure:()=>{}});
assert.equal(paused.props.frameloop,'demand');
assert.equal(paused.props.children[1].props.active,false);
const resumed=scene.default({paused:false,onFailure:()=>{}});
assert.equal(resumed.props.frameloop,'always');
assert.equal(resumed.props.children[1].props.active,true);
environment={frameloop:'never',active:false,pixelRatio:1};
assert.equal(scene.default({paused:true,onFailure:()=>{}}).props.frameloop,'never');
environment={frameloop:'demand',active:false,pixelRatio:1};
assert.equal(scene.default({paused:false,onFailure:()=>{}}).props.children[1].props.active,false);

assert.equal(markdown.renderMarkdownDocument('## 现有文章二级开篇').blocks[0].type,'h2');
assert.equal(markdown.renderMarkdownDocument('## `my_func`').headings[0].text,'my_func');
