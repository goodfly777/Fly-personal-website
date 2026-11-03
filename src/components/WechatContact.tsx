import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { MessageCircle, X } from 'lucide-react';
import { getApiUrl } from '../lib/siteApi';
import '../styles/wechat-contact.css';

export const WechatContact = ({ imageUrl, loading = false, loadError = false, compact = false }: {
  imageUrl?: string | null; loading?: boolean; loadError?: boolean; compact?: boolean;
}) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const src = imageUrl?.startsWith('/') ? getApiUrl(imageUrl) : imageUrl;
  return <Dialog.Root>
    <Dialog.Trigger asChild>
      <button type="button" className={compact ? 'site-footer-wechat' : 'site-contact-action'}>联系我<MessageCircle size={18} aria-hidden="true" /></button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="wechat-contact-overlay" />
      <Dialog.Content className="wechat-contact-dialog">
        <Dialog.Close asChild><button type="button" className="wechat-contact-close" aria-label="关闭微信二维码弹窗"><X size={20} aria-hidden="true" /></button></Dialog.Close>
        <p className="wechat-contact-eyebrow">WeChat</p>
        <Dialog.Title>微信添加好友</Dialog.Title>
        <Dialog.Description>扫一扫站主上传的二维码，添加微信好友。</Dialog.Description>
        {loading ? <p role="status">正在读取微信二维码…</p>
          : loadError ? <p role="status">微信联系信息暂时无法读取，请刷新页面后重试。</p>
          : !src ? <p role="status">暂未上传微信二维码，请稍后再来。</p>
          : failedUrl === src ? <div role="status"><p>二维码暂时无法加载。</p><button type="button" className="wechat-contact-retry" onClick={() => setFailedUrl(null)}>重新加载</button></div>
          : <img key={src} src={src} alt="站主上传的微信二维码" decoding="async" onError={() => setFailedUrl(src)} />}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
};
