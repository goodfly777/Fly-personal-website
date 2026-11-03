import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync('src/pages/Admin.tsx', 'utf8');
assert.match(source, /const visibleBlogPosts = posts;/, 'The unified blog list must include all groups.');
const list = source.slice(source.indexOf("{contentTab === 'blog' ? ("), source.indexOf(") : contentTab === 'gallery' ? ("));
assert.match(list, /visibleBlogPosts\.map\(\(post\) =>/);
assert.doesNotMatch(list, /posts\.filter/);
