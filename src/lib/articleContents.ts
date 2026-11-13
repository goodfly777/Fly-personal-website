import type { MarkdownHeading } from './markdown';

export function articleContents(headings: MarkdownHeading[], activeId?: string) {
  const roots = headings.filter(heading => heading.level === 1);
  const primaryLevel = roots.length === 1 && headings.some(heading => heading.level === 2) ? 2 : 1;
  const activeIndex = Math.max(0, headings.findIndex(heading => heading.id === activeId));
  let section = -1;
  for (let index = 0; index <= activeIndex; index++) {
    if (headings[index]?.level === primaryLevel) section = index;
  }
  let parent = -1;
  const entries = headings.flatMap((heading, index) => {
    if (heading.level === primaryLevel) parent = index;
    const depth = heading.level - primaryLevel;
    return depth === 0 || (depth === 1 && section >= 0 && parent === section)
      ? [{ heading, depth, index }] : [];
  });
  const current = entries.filter(entry => entry.index <= activeIndex).at(-1)?.heading.id;
  return entries.map(entry => ({ ...entry, current: entry.heading.id === current }));
}
