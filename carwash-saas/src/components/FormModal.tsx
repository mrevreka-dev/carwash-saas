'use client';

import { useRef, useState, useTransition, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import Modal from './Modal';

/**
 * A professional modal form. The trigger button opens a dialog with the form
 * fields; submitting asks for an explicit confirmation before the Server Action
 * runs. On success the modal closes and the page refreshes.
 */
export default function FormModal({
  triggerLabel,
  triggerClass = 'btn btn-ghost btn-sm',
  triggerIcon,
  title,
  submitLabel,
  action,
  children,
  maxWidth = 'max-w-xl'
}: {
  triggerLabel: string;
  triggerClass?: string;
  triggerIcon?: string;
  title: string;
  submitLabel: string;
  action: (formData: FormData) => Promise<void> | void;
  children: ReactNode;
  maxWidth?: string;
}) {
  const tc = useTranslations('common');
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  function close() {
    if (pending) return;
    setOpen(false);
    setConfirming(false);
    setError(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current?.reportValidity()) return;
    setError(false);
    setConfirming(true);
  }

  function confirmSubmit() {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    setError(false);
    start(async () => {
      try {
        await action(fd);
        setOpen(false);
        setConfirming(false);
        router.refresh();
      } catch {
        setError(true);
        setConfirming(false);
      }
    });
  }

  return (
    <>
      <button type="button" className={triggerClass} onClick={() => setOpen(true)}>
        {triggerIcon && <span aria-hidden>{triggerIcon}</span>}
        {triggerLabel}
      </button>

      <Modal open={open} onClose={close} title={title} maxWidth={maxWidth}>
        <form ref={formRef} onSubmit={onSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">{children}</div>

          {error && (
            <p className="text-sm text-red-600 mt-3">{tc('error')}</p>
          )}

          {!confirming ? (
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" className="btn btn-ghost" onClick={close}>
                {tc('cancel')}
              </button>
              <button type="submit" className="btn btn-primary">
                {submitLabel}
              </button>
            </div>
          ) : (
            <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm text-amber-900 mb-3">{tc('confirmSave')}</p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={pending}
                  onClick={() => setConfirming(false)}
                >
                  {tc('cancel')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={pending}
                  onClick={confirmSubmit}
                >
                  {pending ? '…' : tc('confirm')}
                </button>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </>
  );
}
