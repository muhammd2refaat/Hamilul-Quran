/**
 * Confirm dialog component for delete and destructive operations
 */

import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { Modal } from '../Modal';
import { Button } from '../Button';

type DialogVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Dialog title */
  title: string;
  /** Dialog message */
  message: string;
  /** Confirm button text */
  confirmText?: string;
  /** Confirm button label (alias for confirmText) */
  confirmLabel?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Callback when confirmed */
  onConfirm: () => void;
  /** Callback when cancelled */
  onCancel: () => void;
  /** Callback when dialog is closed (alias for onCancel) */
  onClose?: () => void;
  /** Dialog variant */
  variant?: DialogVariant;
  /** Dialog type (alias for variant) */
  type?: DialogVariant;
  /** Loading state for confirm action */
  isLoading?: boolean;
}

const variantConfig: Record<
  DialogVariant,
  {
    icon: typeof AlertTriangle;
    iconBgColor: string;
    iconColor: string;
    confirmButtonVariant: 'danger' | 'primary';
  }
> = {
  danger: {
    icon: AlertTriangle,
    iconBgColor: 'bg-red-100',
    iconColor: 'text-red-600',
    confirmButtonVariant: 'danger',
  },
  warning: {
    icon: AlertCircle,
    iconBgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    confirmButtonVariant: 'primary',
  },
  info: {
    icon: Info,
    iconBgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    confirmButtonVariant: 'primary',
  },
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText,
  confirmLabel,
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  onClose,
  variant,
  type,
  isLoading = false,
}: ConfirmDialogProps) {
  const actualVariant = variant || type || 'danger';
  const actualConfirmText = confirmText || confirmLabel || 'Confirm';
  const handleClose = onClose || onCancel;
  const config = variantConfig[actualVariant];
  const Icon = config.icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="sm"
      showCloseButton={false}
      footer={
        <>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={config.confirmButtonVariant}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {actualConfirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-full ${config.iconBgColor} flex items-center justify-center`}
        >
          <Icon className={`h-6 w-6 ${config.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
