import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const module={exports:{}};
const calls=[],events=[];
let fail=true;
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/galleryUpload.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
 module,exports:module.exports,Error,
 require:()=>({uploadGalleryWorkPhoto:async(workId,file)=>{
  calls.push([workId,file.name]);
  if(file.name==='bad.jpg' && fail) throw new Error('temporary failure');
 }}),
});
const items=['good.jpg','bad.jpg','last.jpg'].map((name,index)=>({id:String(index),file:{name},state:'pending'}));
const state=new Map();
const update=item=>{state.set(item.id,item);events.push([item.file.name,item.state]);};
await module.exports.uploadGalleryBatch('work-id',items,update);
assert.deepEqual(calls,[['work-id','good.jpg'],['work-id','bad.jpg'],['work-id','last.jpg']]);
assert.equal(state.get('0').state,'success');
assert.equal(state.get('1').error,'temporary failure');
assert.equal(state.get('2').state,'success','one failure must not discard later files');
const failures=[...state.values()].filter(item=>item.state==='error');
fail=false;
await module.exports.uploadGalleryBatch('work-id',failures,update);
assert.deepEqual(calls.slice(3),[['work-id','bad.jpg']],'retry must not re-upload successful files');
assert.equal(state.get('1').state,'success');
assert.equal(state.get('1').error,undefined);
