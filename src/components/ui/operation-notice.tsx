import { CheckCircle2 } from 'lucide-react';
import '../../styles/operation-notice.css';

export const OperationNotice = ({ message }: { message: string }) => (
  <div className="operation-notice-region" role="status" aria-live="polite" aria-atomic="true">
    {message && (
      <div className="operation-notice">
        <CheckCircle2 size={18} aria-hidden="true" />
        <span>{message}</span>
      </div>
    )}
  </div>
);
