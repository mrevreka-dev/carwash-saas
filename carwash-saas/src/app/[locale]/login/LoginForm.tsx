'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { loginAction, type LoginState } from './actions';

export default function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations('auth');
  const action = loginAction.bind(null, locale);
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    action,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">
          {t('email')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          placeholder="admin@example.com"
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          {t('password')}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="input"
          placeholder="••••••••"
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600 font-medium">{t('invalid')}</p>
      )}

      <button type="submit" className="btn btn-primary w-full justify-center" disabled={pending}>
        {pending ? '…' : t('signIn')}
      </button>
    </form>
  );
}
