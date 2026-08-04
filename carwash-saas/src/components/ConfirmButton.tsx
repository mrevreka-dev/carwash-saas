'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import Modal from './Modal';

/**
 * Professional button that opens a confirmation modal, then runs a Server
 * Action with the provided hidden fields. Used for state changes (activate /
 * deactivate) and deletions.
 */
export default function ConfirmButton({
  triggerLabel,
  triggerClass = 'btn btn-ghost btn-sm',
  triggerIcon,
  title,
  message,
  confirmLabel,
  confirmClass = 'btn btn-primary',
  action,
  fields = {}
}: {
  triggerLabel: string;
  triggerClass?: string;
  triggerIcon?: string;
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass?: string;
  action: (formData: FormData) => Promise<void> | void;
  fields?: Record<string, string>;
}) {
  const tc = useTranslations('common');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  function run() {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    setError(false);
    start(async () => {
      try {
        await action(fd);
        setOpen(false);
        router.refresh();
      } catch {
        setError(true);
      }
    });
  }

  return (
    <>
      <button type="button" className={triggerClass} onClick={() => setOpen(true)}>
        {triggerIcon && <span aria-hidden>{triggerIcon}</span>}
        {triggerLabel}
      </button>

      <Modal open={open} onClose={() => !pending && setOpen(false)} title={title} maxWidth="max-w-md">
        <p className="text-sm text-slate-600">{message}</p>
        {error && <p className="text-sm text-red-600 mt-2">{tc('error')}</p>}
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => setOpen(false)}>
            {tc('cancel')}
          </button>
          <button type="button" className={confirmClass} disabled={pending} onClick={run}>
            {pending ? '…' : confirmLabel}
          </button>
        </div>
      </Modal>
    </>
  );
}
