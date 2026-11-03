import type { AboutResumeEntry, AboutResumeHighlight } from './aboutApi';

export const nextAboutEntryOrder = (entries: AboutResumeEntry[]) => (
  Math.max(0, ...entries.map((entry, index) => Number(entry.sortOrder) || index + 1)) + 1
);

export const createAboutEntry = (sortOrder: number): AboutResumeEntry => ({
  category: '项目经历', title: '', meta: '', period: '', techStack: [],
  descriptionLabel: '项目描述', description: '',
  highlightsLabel: '项目亮点', highlights: [], sortOrder, hidden: false,
});

export const highlightsToText = (highlights?: AboutResumeHighlight[] | null) => (
  (highlights ?? []).map(item => item.title && item.detail ? `${item.title}：${item.detail}` : item.title || item.detail).join('\n')
);

export const textToHighlights = (value: string): AboutResumeHighlight[] => value
  .split('\n')
  .map(line => line.trim())
  .filter(Boolean)
  .map(line => ({ title: line, detail: '' }));

export const validateAboutEntries = (entries: AboutResumeEntry[]) => {
  for (const [index, entry] of entries.entries()) {
    if (!entry.title.trim()) return `第 ${index + 1} 条项目／论文记录尚未填写标题。输入框中的示例不会自动保存，请填写或删除该空白记录。`;
  }
  return '';
};
