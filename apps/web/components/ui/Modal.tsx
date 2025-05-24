// components/ui/Modal.tsx
'use client';
import { Button } from '@ezstart/ez-tag';
import { MouseEvent, ReactNode } from 'react';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  disableCloseButton?: boolean;
  disableClickOut?: boolean;
};

export function Modal({
  open,
  onClose,
  children,
  disableCloseButton = false,
  disableClickOut = false,
}: ModalProps) {
  if (!open) return null;

  function handleOverlayClick(e: MouseEvent<HTMLDivElement>) {
    if (disableClickOut) return;
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className='fixed inset-0 bg-background/40 backdrop-blur flex items-center justify-center z-50'
      onClick={handleOverlayClick}
    >
      <div className='bg-background border rounded-xl shadow-xl p-8 min-w-[340px] relative'>
        {!disableCloseButton && (
          <Button
            variant={'ghost'}
            className='absolute top-2 right-2'
            onClick={onClose}
            aria-label='Close modal'
          >
            &times;
          </Button>
        )}
        {children}
      </div>
    </div>
  );
}
