'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { createBookingAction, type BookingState } from './actions';

interface ServiceOption {
  id: string;
  name: string;
  price: string;
  durationMin: number;
}

export default function BookingForm({
  slug,
  services,
  defaultStart
}: {
  slug: string;
  services: ServiceOption[];
  defaultStart: string;
}) {
  const t = useTranslations('booking');
  const action = createBookingAction.bind(null, slug);
  const [state, formAction, pending] = useActionState<BookingState, FormData>(
    action,
    {}
  );

  if (state.ok) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
        ✓ {t('success')}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label">{t('chooseService')}</label>
        <select name="serviceId" required className="input">
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.price} ({s.durationMin} dk)
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">{t('chooseTime')}</label>
        <input name="startAt" type="datetime-local" required className="input" defaultValue={defaultStart} />
      </div>
      <div>
        <label className="label">{t('yourName')}</label>
        <input name="contactName" required className="input" />
      </div>
      <div>
        <label className="label">{t('yourPhone')}</label>
        <input name="contactPhone" required className="input" />
      </div>
      {state.error && (
        <p className="text-sm text-red-600">⚠︎</p>
      )}
      <button type="submit" className="btn btn-primary w-full justify-center" disabled={pending}>
        {pending ? '…' : t('submit')}
      </button>
    </form>
  );
}
