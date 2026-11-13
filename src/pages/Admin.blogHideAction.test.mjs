import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const load = (file, mocks = {}) => {
  const module = { exports: {} };
  const output = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, require: name => mocks[name] ?? require(name) });
  return module.exports;
};
const state = load('src/lib/blogEditorState.ts');
const Button = () => null;
const { BlogEditorActions, BlogStatusBadge } = load('src/components/admin/BlogEditorActions.tsx', {
  '../../lib/blogEditorState': state, '../ui/button': { Button },
});
const descendants = element => {
  if (!element || typeof element !== 'object') return [];
  return [element, ...[element.props?.children].flat(Infinity).flatMap(descendants)];
};
for (const [status, label, target, visibility] of [
  ['draft', '保存草稿', 'published', '发布文章'],
  ['published', '保存更新', 'hidden', '隐藏文章'],
  ['hidden', '保存修改', 'published', '重新公开'],
]) {
  const calls = [];
  for (const isPreview of [false, true]) {
    const tree = BlogEditorActions({ status, isPreview, isSaving: false, onTogglePreview() {}, onSave: value => calls.push(value) });
    const buttons = descendants(tree).filter(element => element.type === Button);
    assert.equal(buttons.length, 3, 'New drafts have no delete action.');
    assert.ok(buttons[1].props.children.includes(label));
    assert.ok(buttons[2].props.children.includes(visibility));
    buttons[1].props.onClick();
    buttons[2].props.onClick();
    assert.deepEqual(calls.slice(-2), [status, target], 'Save must preserve current visibility in edit and preview.');
  }
  const busy = descendants(BlogEditorActions({ status, isPreview: false, isSaving: true, onSave() {}, onTogglePreview() {}, onDelete() {} }));
  assert.equal(busy.filter(element => element.type === Button && element.props.disabled).length, 3, 'Save, visibility and delete are disabled while saving.');
  const badge = BlogStatusBadge({ status, detailed: true });
  assert.equal(badge.props['data-status'], status);
  assert.ok(badge.props.title.includes(state.blogEditorState[status].detail));
}
assert.match(state.getBlogSaveNotice('published', 'published'), /保持公开/);
assert.match(state.getBlogSaveNotice('hidden', 'hidden'), /仍为隐藏/);
assert.match(state.getBlogSaveNotice('published', 'hidden'), /前台不再展示/);
assert.match(state.getBlogSaveNotice('hidden', 'published'), /重新公开/);
