import type { ReactNode } from 'react';
import styles from './Modal.module.css';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onClose: () => void;
}

export function Modal({
  open,
  title,
  children,
  confirmLabel = 'Продолжить',
  cancelLabel = 'Отмена',
  onConfirm,
  onClose,
}: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={styles.dialog}>
        <h2 id="modal-title" className={styles.title}>
          {title}
        </h2>
        <div className={styles.body}>{children}</div>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} fullWidth>
            {cancelLabel}
          </Button>
          {onConfirm ? (
            <Button onClick={onConfirm} fullWidth>
              {confirmLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
