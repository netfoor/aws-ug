'use client';

import React from 'react';
import { AlertDialog } from './AlertDialog';
import { ConfirmDialog } from './ConfirmDialog';

interface DialogState {
  isOpen: boolean;
  type: 'alert' | 'confirm';
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
}

interface DialogRendererProps {
  state: DialogState;
  onClose: () => void;
  onConfirm: () => void;
}

export function DialogRenderer({ state, onClose, onConfirm }: DialogRendererProps) {
  if (state.type === 'confirm') {
    return (
      <ConfirmDialog
        isOpen={state.isOpen}
        onClose={onClose}
        onConfirm={onConfirm}
        title={state.title || 'Confirmar acción'}
        message={state.message}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
        variant={state.variant}
      />
    );
  }

  return (
    <AlertDialog
      isOpen={state.isOpen}
      onClose={onClose}
      title={state.title}
      message={state.message}
      confirmText={state.confirmText || 'Entendido'}
      variant={state.variant}
    />
  );
}
