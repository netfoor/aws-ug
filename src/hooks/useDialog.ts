'use client';

import { useState, useCallback } from 'react';

interface DialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
}

interface DialogState extends DialogOptions {
  isOpen: boolean;
  type: 'alert' | 'confirm';
  resolve?: (value: boolean) => void;
}

export function useDialog() {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    type: 'alert',
    message: '',
  });

  const alert = useCallback((message: string, options?: Omit<DialogOptions, 'message'>) => {
    return new Promise<void>((resolve) => {
      setDialogState({
        isOpen: true,
        type: 'alert',
        message,
        ...options,
        resolve: () => {
          resolve();
          return true;
        },
      });
    });
  }, []);

  const confirm = useCallback((message: string, options?: Omit<DialogOptions, 'message'>) => {
    return new Promise<boolean>((resolve) => {
      setDialogState({
        isOpen: true,
        type: 'confirm',
        message,
        confirmText: options?.confirmText || 'Confirmar',
        cancelText: options?.cancelText || 'Cancelar',
        ...options,
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    if (dialogState.resolve) {
      dialogState.resolve(false);
    }
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogState.resolve]);

  const handleConfirm = useCallback(() => {
    if (dialogState.resolve) {
      dialogState.resolve(true);
    }
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogState.resolve]);

  return {
    alert,
    confirm,
    dialogState,
    handleClose,
    handleConfirm,
  };
}
