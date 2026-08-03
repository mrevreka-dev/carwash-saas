import type { ReactNode } from 'react';

/**
 * A dependency-free "add / edit" panel built on the native <details> element,
 * so it expands/collapses without any client-side JavaScript. The form posts
 * to a Server Action which revalidates the page.
 */
export default function FormPanel({
  title,
  action,
  submitLabel,
  children,
  open = false,
  icon = '＋',
  compact = false
}: {
  title: string;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  children: ReactNode;
  open?: boolean;
  icon?: string;
  compact?: boolean;
}) {
  return (
    <details className={compact ? 'panel' : 'panel card'} open={open}>
      <summary
        className={
          compact
            ? 'text-brand-600 text-xs font-semibold'
            : 'px-4 py-3 font-semibold text-sm flex items-center gap-2'
        }
      >
        {compact ? title : <><span className="text-brand-600">{icon}</span> {title}</>}
      </summary>
      <form action={action} className="p-4 pt-0 border-t border-slate-100">
        <div className="grid gap-3 sm:grid-cols-2 mt-3">{children}</div>
        <div className="mt-4">
          <button type="submit" className="btn btn-primary">
            {submitLabel}
          </button>
        </div>
      </form>
    </details>
  );
}

export function Field({
  label,
  children,
  full = false
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
