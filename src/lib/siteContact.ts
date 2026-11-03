import type { AboutSocialLink } from './aboutApi';

export const DEFAULT_GITHUB_URL = 'https://github.com/goodfly777?tab=repositories';
const isGithub = (link: AboutSocialLink) => link.label.trim().toLowerCase() === 'github';
export const isHttpUrl = (value: string) => {
  if (!/^https?:\/\//i.test(value.trim())) return false;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
};
export const getGithubUrl = (links?: AboutSocialLink[] | null) => (
  links?.find(isGithub)?.url.trim() || DEFAULT_GITHUB_URL
);
export const withGithubUrl = (links: AboutSocialLink[] | null | undefined, url: string): AboutSocialLink[] => [
  ...(links || []).filter(link => !isGithub(link)),
  { label: 'GitHub', url: url.trim() || DEFAULT_GITHUB_URL, icon: 'github' },
];
