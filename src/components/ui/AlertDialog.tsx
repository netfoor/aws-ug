'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { Button } from './Button';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  icon?: React.ReactNode;
}

export function AlertDialog({
  isOpen,
  onClose,
  title,
  message,
  confirmText = 'Entendido',
  variant = 'info',
  icon,
}: AlertDialogProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    if (icon) return icon;

    switch (variant) {
      case 'danger':
        return <XCircle className="w-12 h-12 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-12 h-12 text-amber-500" />;
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      default:
        return <Info className="w-12 h-12 text-blue-500" />;
    }
  };

  const getTitle = () => {
    if (title) return title;

    switch (variant) {
      case 'danger':
        return 'Error';
      case 'warning':
        return 'Atención';
      case 'success':
        return '¡Éxito!';
      default:
        return 'Información';
    }
  };

  const dialogContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface rounded-lg shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          {getIcon()}
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-text-primary text-center mb-3">
          {getTitle()}
        </h2>

        {/* Message */}
        <p className="text-text-secondary text-center mb-6 whitespace-pre-line">
          {message}
        </p>

        {/* Action */}
        <Button
          variant={variant === 'danger' ? 'danger' : 'accent'}
          onClick={onClose}
          className="w-full"
        >
          {confirmText}
        </Button>
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(dialogContent, document.body);
}
