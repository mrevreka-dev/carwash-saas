'use client';

import { useTranslations } from 'next-intl';

/**
 * Small delete control: a form bound to a Server Action, guarded by a native
 * confirm dialog so no extra state management is needed.
 */
export default function DeleteForm({
  action,
  id,
  label
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  label?: string;
}) {
  const t = useTranslations('common');
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(t('confirmDelete'))) e.preventDefault();
      }}
      style={{ display: 'inline' }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn btn-danger" style={{ padding: '0.3rem 0.6rem' }}>
        {label ?? t('delete')}
      </button>
    </form>
  );
}
