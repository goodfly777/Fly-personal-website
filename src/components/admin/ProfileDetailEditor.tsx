import { useId, useState } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import type { AboutProfileDetail } from '../../lib/aboutApi';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface ProfileDetailEditorProps {
  detail: AboutProfileDetail;
  index: number;
  onChange: (key: keyof AboutProfileDetail, value: string | boolean) => void;
  onRemove: () => void;
  expanded: boolean;
  onToggle: () => void;
}

function ProfileDetailEditor({ detail, index, onChange, onRemove, expanded, onToggle }: ProfileDetailEditorProps) {
  const settingsId = useId();
  const rowName = `第 ${index + 1} 条个人信息`;

  return (
    <div className="admin-profile-row" role="group" aria-label={rowName}>
      <div className="admin-profile-fields">
        <label>
          <span className="admin-profile-label">标签</span>
          <Input aria-label={`${rowName}标签`} value={detail.label} onChange={event => onChange('label', event.target.value)} />
        </label>
        <label>
          <span className="admin-profile-label">内容</span>
          <Input aria-label={`${rowName}内容`} value={detail.value} onChange={event => onChange('value', event.target.value)} />
        </label>
        <div className="admin-profile-actions">
          <button
            type="button"
            className="admin-profile-settings"
            aria-label={`${rowName}设置`}
            aria-expanded={expanded}
            aria-controls={settingsId}
            onClick={onToggle}
          >
            设置<ChevronDown size={14} aria-hidden="true" className={expanded ? 'rotate-180' : undefined} />
          </button>
          <Button type="button" variant="ghost" size="icon" className="admin-profile-delete" aria-label={`删除${rowName}`} onClick={onRemove}>
            <Trash2 size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div id={settingsId} className="admin-profile-options" hidden={!expanded}>
        <label>
          <span>图标</span>
          <Input value={detail.icon || ''} onChange={event => onChange('icon', event.target.value)} placeholder="例如 user、mail" />
        </label>
        <label>
          <span>双击复制值</span>
          <Input value={detail.copyValue || ''} onChange={event => onChange('copyValue', event.target.value)} placeholder="不需要复制可留空" />
        </label>
        <label className="admin-profile-wide">
          <input type="checkbox" checked={Boolean(detail.wide)} onChange={event => onChange('wide', event.target.checked)} />
          独占一行
        </label>
      </div>
    </div>
  );
}

interface ProfileDetailsEditorProps {
  details: AboutProfileDetail[];
  onChange: (index: number, key: keyof AboutProfileDetail, value: string | boolean) => void;
  onRemove: (index: number) => void;
}

export function ProfileDetailsEditor({ details, onChange, onRemove }: ProfileDetailsEditorProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  return <>
    <div className="admin-profile-heading" aria-hidden="true">
      <span>标签</span><span>内容</span><span className="text-right">操作</span>
    </div>
    {details.map((detail, index) => (
      <ProfileDetailEditor
        key={index}
        detail={detail}
        index={index}
        expanded={expandedIndex === index}
        onToggle={() => setExpandedIndex(current => current === index ? null : index)}
        onChange={(field, value) => onChange(index, field, value)}
        onRemove={() => {
          setExpandedIndex(current => current === null || current === index ? null : current > index ? current - 1 : current);
          onRemove(index);
        }}
      />
    ))}
  </>;
}
