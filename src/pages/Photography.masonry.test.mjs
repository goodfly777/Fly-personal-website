import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/gallery.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {module,exports:module.exports});
const {publicGalleryWorks,gallerySequence} = module.exports;
const photo = (id,sortOrder,status='published') => ({id,sortOrder,status});
const works = [
 {id:'b',title:'同名',sortOrder:2,status:'published',photos:[photo('b1',1)]},
 {id:'hidden',title:'隐藏组',sortOrder:0,status:'hidden',photos:[photo('secret',1)]},
 {id:'a',title:'同名',sortOrder:1,status:'published',photos:[photo('a2',2),photo('hidden-photo',0,'hidden'),photo('a1',1)]},
 {id:'empty',title:'空组',sortOrder:3,status:'published',photos:[]},
];
const visible=publicGalleryWorks(works);
assert.deepEqual(Array.from(visible,w=>w.id),['a','b'],'same titles must remain independent works');
const sequence=gallerySequence(works);
assert.deepEqual(Array.from(sequence,e=>e.photo.id),['a1','a2','b1'],'sequence follows work order then photo order and excludes hidden content');
assert.equal(sequence[1].work.id,'a');
assert.equal(sequence[2].work.id,'b','next after the end of a work crosses to the next work');
assert.equal(sequence[2].index,0);
assert.equal(sequence[1].work.photos.length,2);
assert.deepEqual(Array.from(gallerySequence([{...works[1]}])),[]);
assert.deepEqual(Array.from(works[2].photos,p=>p.id),['a2','hidden-photo','a1'],'sorting must not mutate source data');
