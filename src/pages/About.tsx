import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout';
import { Mail, GraduationCap, Phone, UserRound } from 'lucide-react';
import { type AboutContentRecord, type AboutProfileDetail, getAboutContent } from '../lib/aboutApi';

const profileIconByName = {
  user: UserRound,
  'user-round': UserRound,
  'graduation-cap': GraduationCap,
  phone: Phone,
  mail: Mail,
};

const defaultAboutContent: AboutContentRecord = {
  portraitImageUrl: '',
  wechatQrImageUrl: '',
  profileDetails: [
    { label: '基本信息', value: '', icon: 'user', wide: true },
    { label: '本科', value: '', icon: 'graduation-cap' },
    { label: '硕士', value: '', icon: 'graduation-cap' },
    { label: '手机', value: '', icon: 'phone', copyValue: '' },
    { label: '邮箱', value: '', icon: 'mail', copyValue: '' },
  ],
  resumeEntries: [],
  contactHeading: '',
  contactItems: [
    { label: '手机', value: '', icon: 'phone' },
    { label: '邮箱', value: '', icon: 'mail' },
  ],
  socialLinks: [],
};

const resolveAboutContent = (content: AboutContentRecord): AboutContentRecord => ({
  ...content,
  portraitImageUrl: content.portraitImageUrl?.trim() || '',
  wechatQrImageUrl: content.wechatQrImageUrl?.trim() || '',
  profileDetails: Array.isArray(content.profileDetails) ? content.profileDetails : defaultAboutContent.profileDetails,
  resumeEntries: Array.isArray(content.resumeEntries) ? content.resumeEntries : defaultAboutContent.resumeEntries,
  contactHeading: content.contactHeading?.trim() || defaultAboutContent.contactHeading,
  contactItems: Array.isArray(content.contactItems) ? content.contactItems : defaultAboutContent.contactItems,
  socialLinks: Array.isArray(content.socialLinks) ? content.socialLinks : [],
});

const getProfileIcon = (detail: AboutProfileDetail) => (
  profileIconByName[(detail.icon || '').toLowerCase() as keyof typeof profileIconByName] ?? UserRound
);

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

const About = () => {
  const [copiedProfileDetail, setCopiedProfileDetail] = useState<string | null>(null);
  const [aboutContent, setAboutContent] = useState<AboutContentRecord>(defaultAboutContent);

  useEffect(() => {
    let isCurrent = true;

    getAboutContent()
      .then((content) => {
        if (isCurrent) setAboutContent(resolveAboutContent(content));
      })
      .catch(() => {
        if (isCurrent) setAboutContent(defaultAboutContent);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const orderedResumeEntries = useMemo(() => (
    [...aboutContent.resumeEntries]
      .filter((entry) => !entry.hidden)
      .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
  ), [aboutContent.resumeEntries]);

  const copyProfileDetail = async (label: string, value?: string | null) => {
    if (!value) return;

    await copyText(value);
    setCopiedProfileDetail(label);
    window.setTimeout(() => {
      setCopiedProfileDetail((current) => (current === label ? null : current));
    }, 1600);
  };

  return (
    <Layout>
      <section className="pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Intro Section */}
          <div className="site-page-heading relative mb-20 grid items-center gap-12 md:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.6fr)]">
            <div className="relative mx-auto h-64 w-64 shrink-0 self-center md:mx-0">
              <div className="absolute inset-0 bg-primary rounded-[28px] rotate-6 opacity-20" />
              {aboutContent.portraitImageUrl && <img
                src={aboutContent.portraitImageUrl}
                className="w-full h-full rounded-[28px] object-cover object-[center_60%] border-[3px] border-white shadow-xl relative z-10 hover:rotate-0 transition-transform duration-500"
              />}
            </div>
            <div className="w-full self-center text-center md:text-left">
              <div className="grid gap-3 sm:grid-cols-2">
                {aboutContent.profileDetails.map((detail) => {
                  const { label, value, copyValue, wide } = detail;
                  const Icon = getProfileIcon(detail);
                  const isCopyable = Boolean(copyValue);
                  const isCopied = copiedProfileDetail === label;
                  const cardClassName = `flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card/90 p-3 text-left shadow-sm shadow-black ${wide ? 'sm:col-span-2' : ''} ${isCopyable ? 'cursor-copy select-text transition hover:-translate-y-0.5 hover:border-border hover:bg-card active:scale-[0.99]' : ''}`;

                  return (
                    <div
                      key={label}
                      role={isCopyable ? 'button' : undefined}
                      tabIndex={isCopyable ? 0 : undefined}
                      title={isCopyable ? '双击复制' : undefined}
                      onDoubleClick={() => void copyProfileDetail(label, copyValue)}
                      onKeyDown={(event) => {
                        if (isCopyable && (event.key === 'Enter' || event.key === ' ')) {
                          event.preventDefault();
                          void copyProfileDetail(label, copyValue);
                        }
                      }}
                      className={cardClassName}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-[hsl(var(--primary-foreground))] shadow-sm shadow-brand/30">
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                          {label}
                          {isCopied && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] tracking-normal text-emerald-700">
                              已复制
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block break-words text-sm font-semibold leading-snug text-foreground">{value}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Resume Sections */}
          {orderedResumeEntries.length > 0 && (
            <div className="space-y-24">
              {orderedResumeEntries.map((entry) => (
                <motion.div
                  key={`${entry.title}-${entry.sortOrder ?? 0}`}
                  initial={{ y: 40 }}
                  whileInView={{ y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  className="content-card-frame group relative overflow-hidden rounded-[28px] border border-border bg-card p-6 shadow-lg shadow-black transition-all duration-300 ease-out hover:-translate-y-1 hover:border-brand/80 hover:shadow-[0_28px_72px_-38px_rgba(15,23,42,0.48)] md:p-8"
                >
                  <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-brand to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100" />

                  <div className="relative z-10 border-b border-border pb-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        {entry.category || 'Project Resume'}
                      </p>
                      <h2 className="mt-2 text-xl font-semibold leading-snug text-foreground md:text-2xl">
                        {entry.title}
                      </h2>
                      {(entry.meta || entry.period) && (
                        <div className={`mt-2 flex flex-col gap-1 sm:flex-row sm:items-center ${entry.meta ? 'sm:justify-between' : 'sm:justify-end'}`}>
                          {entry.meta && (
                            <p className="text-sm font-bold text-body">{entry.meta}</p>
                          )}
                          {entry.period && (
                            <p className="shrink-0 text-sm font-semibold text-body sm:ml-4 sm:text-right">{entry.period}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative z-10 mt-5 space-y-4 text-sm leading-relaxed text-body md:text-base">
                    {entry.techStack && entry.techStack.length > 0 && (
                      <p>
                        <span className="font-semibold text-foreground">技术栈：</span>
                        <span className="font-semibold">{entry.techStack.join('、')}</span>
                      </p>
                    )}
                    {entry.description && (
                      <p>
                        <span className="font-semibold text-foreground">{entry.descriptionLabel || '项目描述'}：</span>
                        {entry.description}
                      </p>
                    )}
                    {entry.highlights && entry.highlights.length > 0 && (
                      <div>
                        <p className="font-semibold text-foreground">{entry.highlightsLabel || '项目亮点'}：</p>
                        <ul className="mt-3 space-y-3">
                          {entry.highlights.map((item) => (
                            <li key={`${entry.title}-${item.title}`} className="grid grid-cols-[0.75rem_1fr] gap-3">
                              <span aria-hidden="true" className="mt-[0.65rem] h-1.5 w-1.5 rounded-full bg-body" />
                              <p>
                                {item.title && item.detail ? (
                                  <><span className="font-semibold text-foreground">{item.title}：</span><span className="font-medium text-body">{item.detail}</span></>
                                ) : (
                                  <span className="font-medium text-body">{item.title || item.detail}</span>
                                )}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}


        </div>
      </section>

    </Layout>
  );
};
export default About;
