import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/pages/Admin.tsx', 'utf8');
assert.doesNotMatch(source, /createNewProject|selectProject|saveProject|deleteCurrentProject|ProjectEditorForm/);
assert.doesNotMatch(source, /setContentTab\('project'\)|selectedType === 'project'/);
assert.match(source, /useState<ContentTab>\('blog'\)/);
assert.match(source, /const visibleBlogPosts = posts;/, 'Selecting a blog must not hide blogs belonging to other groups.');

assert.doesNotMatch(source, /所属分组|listAdminProjects/);
