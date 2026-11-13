import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Eye, EyeOff, FileText, Loader2, MoreHorizontal, PencilLine, Save, Send, Trash2 } from 'lucide-react';
import type { ContentStatus } from '../../lib/adminApi';
import { blogEditorState } from '../../lib/blogEditorState';
import { Button } from '../ui/button';

export const BlogStatusBadge = ({ status, detailed = false }: { status: ContentStatus; detailed?: boolean }) => {
  const state = blogEditorState[status];
  const Icon = status === 'published' ? Eye : status === 'hidden' ? EyeOff : FileText;
  return (
    <span className="blog-status-badge" data-status={status} title={`${state.label} · ${state.detail}`}>
      <Icon size={13} aria-hidden="true" />
      {state.label}{detailed && <span> · {state.detail}</span>}
    </span>
  );
};

interface Props {
  status: ContentStatus;
  isSaving: boolean;
  isPreview: boolean;
  onTogglePreview: () => void;
  onSave: (status: ContentStatus) => void;
  onDelete?: () => void;
}

export const BlogEditorActions = ({ status, isSaving, isPreview, onTogglePreview, onSave, onDelete }: Props) => {
  const state = blogEditorState[status];
  return (
    <div className="blog-editor-actions" role="group" aria-label="文章操作">
      <Button type="button" variant="outline" className="blog-action blog-action-preview" onClick={onTogglePreview}>
        {isPreview ? <PencilLine size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        {isPreview ? '继续编辑' : '查看预览'}
      </Button>
      <Button type="button" variant="outline" className="blog-action blog-action-save" disabled={isSaving} onClick={() => onSave(status)}>
        {isSaving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
        {state.saveLabel}
      </Button>
      <Button type="button" variant="outline" className={`blog-action blog-action-${state.target === 'hidden' ? 'hide' : 'publish'}`} disabled={isSaving} onClick={() => onSave(state.target)}>
        {state.target === 'hidden' ? <EyeOff size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
        {state.visibilityLabel}
      </Button>
      {onDelete && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button type="button" variant="outline" size="icon" className="blog-action blog-action-more" aria-label="更多文章操作" disabled={isSaving}>
              <MoreHorizontal size={18} aria-hidden="true" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="blog-editor-menu" align="end" sideOffset={8}>
              <DropdownMenu.Item className="blog-editor-delete" onSelect={onDelete}>
                <Trash2 size={16} aria-hidden="true" />删除文章…
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </div>
  );
};
