import type { ContentStatus } from './adminApi';

// Saving content and changing its visibility are separate user intentions.
export const blogEditorState = {
  draft: { label: '草稿', detail: '未公开', saveLabel: '保存草稿', visibilityLabel: '发布文章', target: 'published' },
  published: { label: '已公开', detail: '前台可见', saveLabel: '保存更新', visibilityLabel: '隐藏文章', target: 'hidden' },
  hidden: { label: '已隐藏', detail: '前台不展示', saveLabel: '保存修改', visibilityLabel: '重新公开', target: 'published' },
} as const satisfies Record<ContentStatus, {
  label: string; detail: string; saveLabel: string; visibilityLabel: string; target: ContentStatus;
}>;

export const getBlogSaveNotice = (previous: ContentStatus, next: ContentStatus) => {
  if (previous === next) {
    if (next === 'published') return '更新已保存，文章保持公开。';
    if (next === 'hidden') return '修改已保存，文章仍为隐藏状态。';
    return '草稿已保存，尚未公开。';
  }
  if (next === 'hidden') return '文章已隐藏，前台不再展示，内容仍保留在后台。';
  if (next === 'published') return previous === 'hidden' ? '文章已重新公开。' : '文章已发布，前台可以查看。';
  return '草稿已保存，尚未公开。';
};
